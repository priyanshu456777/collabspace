import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/room', '/settings'];
const AUTH_PAGES = ['/login', '/signup'];

// Renamed from `middleware` to `proxy` per the Next.js 16 convention.
// This does a cheap, edge-friendly check (cookie presence only) to avoid
// a flash of protected content; the real signature/expiry check happens
// server-side via /api/auth/me, which AuthContext calls on every load.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has('token');

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (isProtected && !hasToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && hasToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/room/:path*', '/settings/:path*', '/login', '/signup'],
};
