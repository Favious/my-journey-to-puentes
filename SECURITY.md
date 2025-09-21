# Security Implementation

## Middleware-Based Slug Protection

This implementation uses Next.js middleware to protect against slug enumeration attacks and provide rate limiting.

### How It Works

1. **Middleware Layer** (`middleware.ts`)
   - Runs at the edge before pages load
   - Validates slug format (alphanumeric, hyphens, underscores only)
   - Implements rate limiting (10 requests per minute per IP)
   - Validates slugs against Firestore database
   - Caches validation results for 5 minutes

2. **API Route** (`/api/validate-slug`)
   - Validates slugs against Firestore
   - Uses `limit(1)` to minimize database queries
   - Caches results to reduce database load

3. **Page Component** (`/[slug]/page.tsx`)
   - Simplified since middleware handles validation
   - Includes client-side caching for engineer data
   - Only loads if slug is valid

### Security Features

- **Rate Limiting**: 10 requests per minute per IP address
- **Input Validation**: Only allows valid slug formats
- **Database Protection**: Minimal queries with caching
- **Automatic Redirects**: Invalid slugs redirect to home
- **Caching**: Reduces database load and improves performance

### Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Production Considerations

1. **Use Redis**: Replace in-memory caching with Redis for production
2. **IP Tracking**: Consider using a more sophisticated IP tracking system
3. **Monitoring**: Add logging and monitoring for suspicious activity
4. **CDN**: Consider using a CDN for additional protection

### Testing

- Valid slugs: `yoursite.com/john-doe` → Shows profile
- Invalid slugs: `yoursite.com/invalid-slug` → Redirects to home
- Rate limiting: Try 11+ requests in a minute → Gets blocked
- Malformed slugs: `yoursite.com/invalid@slug` → Redirects to home
