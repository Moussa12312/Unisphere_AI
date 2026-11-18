import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware Next.js :
 * La sécurité fine par rôle et vérification de session est assurée côté client
 * par RoleLayout (qui synchronise localStorage et les cookies).
 * Le middleware transmet la requête de manière fluide pour éviter tout blocage
 * ou boucle de redirection intempestive lors du rafraîchissement des pages.
 */
export function middleware(request: NextRequest) {
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
