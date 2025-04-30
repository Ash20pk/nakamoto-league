import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminMiddleware } from './src/middleware/adminMiddleware';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/register',
  '/tournaments',
  '/dojos',
  '/warriors',
  '/admin/login'
];

export async function middleware(req: NextRequest) {
  // First, check for admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    return adminMiddleware(req);
  }
  
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Check auth status
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Get the pathname
  const path = req.nextUrl.pathname;

  // Handle protected routes
  if (!PUBLIC_ROUTES.includes(path) && !session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};