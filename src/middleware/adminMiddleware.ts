import { NextRequest, NextResponse } from 'next/server';

export async function adminMiddleware(request: NextRequest) {
  // Skip the middleware for the login page and API routes
  if (
    request.nextUrl.pathname === '/admin/login' ||
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // Check if the request is for an admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check for admin authentication cookie
    const adminToken = request.cookies.get('admin_token')?.value;
    
    // If no admin token, redirect to login
    if (!adminToken) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Continue to the admin page if token exists
    // The API will validate the token when the page loads
    return NextResponse.next();
  }

  // For non-admin routes, just proceed
  return NextResponse.next();
}
