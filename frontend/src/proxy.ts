import { NextRequest, NextResponse } from 'next/server';

// NOTE: In production the auth cookie lives on the backend's domain
// (Render), not the frontend's (Vercel) - so requests to frontend routes
// never actually carry the cookie here, even when the user is fully
// logged in. That makes a cookie-presence check at this layer unreliable
// for protected-route redirects, so that responsibility now lives
// client-side in `(app)/layout.tsx`, which checks the real session via
// /api/auth/me. This proxy is kept minimal: it no longer redirects based
// on cookie presence, since doing so incorrectly bounces logged-in users
// back to /login in production.
export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/room/:path*', '/settings/:path*', '/login', '/signup'],
};