import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes d'administration et d'espaces protégés
const PROTECTED_PREFIXES = [
  '/admin',
  '/secretary',
  '/teacher',
  '/student',
  '/censeur',
  '/accountant',
  '/guard',
  '/superadmin',
  '/alumni',
  '/scan-session',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));

  if (isProtected) {
    const token = request.cookies.get('unisphere_token')?.value;

    // Si aucune session valide n'est détectée, redirection automatique immédiate vers le site public ('/')
    if (!token) {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/secretary/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/censeur/:path*',
    '/accountant/:path*',
    '/guard/:path*',
    '/superadmin/:path*',
    '/alumni/:path*',
    '/scan-session/:path*',
  ],
};

