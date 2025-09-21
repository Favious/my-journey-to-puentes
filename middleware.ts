import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting storage (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Slug validation cache
const slugValidationCache = new Map<string, { isValid: boolean; timestamp: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const CACHE_DURATION = 300000; // 5 minutes

// Slug validation
const isValidSlugFormat = (slug: string): boolean => {
  // Only allow alphanumeric characters, hyphens, and underscores
  const slugRegex = /^[a-zA-Z0-9-_]+$/;
  return slugRegex.test(slug) && slug.length >= 2 && slug.length <= 50;
};

// Rate limiting check
const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const current = rateLimitMap.get(ip);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  current.count++;
  return false;
};

// Get client IP
const getClientIP = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return request.ip || 'unknown';
};

// Validate slug against database
const validateSlug = async (slug: string): Promise<boolean> => {
  // Check cache first
  const cached = slugValidationCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.isValid;
  }
  
  try {
    // Call our API to validate the slug
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/validate-slug?slug=${encodeURIComponent(slug)}`);
    
    if (!response.ok) {
      console.error('Failed to validate slug:', response.status);
      return false;
    }
    
    const data = await response.json();
    const isValid = data.isValid;
    
    // Cache the result
    slugValidationCache.set(slug, { isValid, timestamp: Date.now() });
    
    return isValid;
  } catch (error) {
    console.error('Error validating slug:', error);
    return false;
  }
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only apply to dynamic slug routes
  if (!pathname.startsWith('/') || pathname === '/') {
    return NextResponse.next();
  }
  
  // Extract slug from pathname
  const slug = pathname.slice(1); // Remove leading slash
  
  // Skip if it's a known static route
  const staticRoutes = ['adding-test', 'api', '_next', 'favicon.ico'];
  if (staticRoutes.some(route => pathname.startsWith(`/${route}`))) {
    return NextResponse.next();
  }
  
  // Get client IP for rate limiting
  const clientIP = getClientIP(request);
  
  // Check rate limiting
  if (isRateLimited(clientIP)) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too many requests', 
        message: 'Please wait a moment before trying again.' 
      }),
      { 
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      }
    );
  }
  
  // Validate slug format
  if (!isValidSlugFormat(slug)) {
    console.warn(`Invalid slug format: ${slug} from IP: ${clientIP}`);
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Validate slug against database
  const isValidSlug = await validateSlug(slug);
  if (!isValidSlug) {
    console.warn(`Invalid slug: ${slug} from IP: ${clientIP}`);
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - adding-test (known static route)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|adding-test).*)',
  ],
};
