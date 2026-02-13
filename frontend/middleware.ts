import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];

// Role -> allowed path prefixes
const ROLE_ROUTES: Record<string, string[]> = {
  facility_staff: ['/facility-'],
  pharmacist: ['/upload', '/validate', '/submit', '/results', '/pharm-', '/submission-results', '/encounters', '/indicators', '/individuals', '/exemptions', '/bulk-history', '/providers', '/locations'],
  nurse_manager: ['/nm-'],
  org_admin: ['/facility-', '/pharm-', '/nm-', '/upload', '/validate', '/submit', '/results', '/submission-results', '/encounters', '/indicators', '/individuals', '/exemptions', '/bulk-history', '/providers', '/locations'],
  super_admin: ['/facility-', '/pharm-', '/nm-', '/upload', '/validate', '/submit', '/results', '/submission-results', '/encounters', '/indicators', '/individuals', '/exemptions', '/bulk-history', '/providers', '/locations'],
};

// Role -> default landing page
const ROLE_HOME: Record<string, string> = {
  facility_staff: '/facility-dashboard',
  pharmacist: '/pharm-dashboard',
  nurse_manager: '/nm-dashboard',
  org_admin: '/upload',
  super_admin: '/upload',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Use base64url decoding: replace URL-safe chars and pad as needed
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return payload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths and static files
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = (payload.role as string) || '';
  const allowedPrefixes = ROLE_ROUTES[role];

  // Unknown role -> login
  if (!allowedPrefixes) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Root path -> redirect to role home
  if (pathname === '/') {
    return NextResponse.redirect(new URL(ROLE_HOME[role] || '/login', request.url));
  }

  // Check if path is allowed for this role
  const isAllowed = allowedPrefixes.some(prefix => pathname.startsWith(prefix));
  if (!isAllowed) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] || '/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
