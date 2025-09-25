import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

// Cache for valid slugs (in production, use Redis or similar)
const slugCache = new Map<string, { isValid: boolean; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }
  
  // Check cache first
  const cached = slugCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json({ 
      isValid: cached.isValid,
      cached: true 
    });
  }
  
  try {
    // Query Firestore to check if slug exists
    const engineersRef = collection(db, 'engineers');
    const q = query(
      engineersRef, 
      where('slug', '==', slug),
      limit(1) // Only need to know if it exists, not get the full document
    );
    
    const querySnapshot = await getDocs(q);
    const isValid = !querySnapshot.empty;
    
    // Cache the result
    slugCache.set(slug, { isValid, timestamp: Date.now() });
    
    return NextResponse.json({ 
      isValid,
      cached: false 
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to validate slug' 
    }, { status: 500 });
  }
}
