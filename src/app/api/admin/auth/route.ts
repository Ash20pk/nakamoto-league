import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

// Rate limiting setup
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

// Simple in-memory rate limiting
// In production, use Redis or another distributed store
const attemptTracker: Record<string, { count: number, resetAt: number }> = {};

// Check if IP is rate limited
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  
  // Clean up expired entries
  Object.keys(attemptTracker).forEach(key => {
    if (attemptTracker[key].resetAt < now) {
      delete attemptTracker[key];
    }
  });
  
  // Check if IP exists in tracker
  if (!attemptTracker[ip]) {
    attemptTracker[ip] = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW
    };
  }
  
  // Reset if window expired
  if (attemptTracker[ip].resetAt < now) {
    attemptTracker[ip] = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW
    };
  }
  
  // Increment count
  attemptTracker[ip].count++;
  
  // Check if over limit
  return attemptTracker[ip].count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limiting
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    );
  }
  
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  try {
    // Get request body
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }
    
    // Verify admin credentials using the database function
    const { data: verifyResult, error: verifyError } = await supabase.rpc('verify_password', {
      input_username: username,
      input_password: password
    });
    
    if (verifyError) {
      console.error('Error verifying admin password:', verifyError);
      return NextResponse.json({ error: 'Authentication failed: ' + verifyError.message }, { status: 500 });
    }
    
    if (!verifyResult) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Get admin user details
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, username')
      .eq('username', username)
      .eq('is_active', true)
      .single();
    
    if (adminError) {
      console.error('Error fetching admin user:', adminError);
      return NextResponse.json({ error: 'Failed to fetch admin user: ' + adminError.message }, { status: 500 });
    }
    
    if (!adminUser) {
      console.error('Admin user not found in database for username:', username);
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }
    
    // Update last login timestamp
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', adminUser.id);
    
    // Generate a secure token for the admin session
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4); // 4 hour expiry
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Admin authentication successful',
      admin: {
        id: adminUser.id,
        username: adminUser.username
      }
    });
    
    // Set cookies in the response
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/'
    });
    
    response.cookies.set('admin_username', adminUser.username, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Error in admin authentication:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const cookiesInstance = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookiesInstance });
  
  try {
    // Check if admin token cookie exists
    const adminToken = request.cookies.get('admin_token')?.value;
    const adminUsername = request.cookies.get('admin_username')?.value;
    
    if (!adminToken || !adminUsername) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    // Verify admin exists and is active
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, username')
      .eq('username', adminUsername)
      .eq('is_active', true)
      .single();
    
    if (adminError) {
      console.error('Error fetching admin user:', adminError);
      return NextResponse.json({ authenticated: false, error: 'Failed to fetch admin user: ' + adminError.message }, { status: 500 });
    }
    
    if (!adminUser) {
      // Clear invalid cookies
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.delete('admin_token');
      response.cookies.delete('admin_username');
      return response;
    }
    
    return NextResponse.json({
      authenticated: true,
      admin: {
        id: adminUser.id,
        username: adminUser.username
      }
    });
  } catch (error) {
    console.error('Error checking admin authentication:', error);
    return NextResponse.json({ authenticated: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Logout - clear admin cookies
  const response = NextResponse.json({
    success: true,
    message: 'Admin logged out successfully'
  });
  
  response.cookies.delete('admin_token');
  response.cookies.delete('admin_username');
  
  return response;
}
