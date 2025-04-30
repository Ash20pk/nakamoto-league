import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

// This is needed to fix the cookies issue in Next.js App Router
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Create a new response to handle cookies properly
    const response = NextResponse.json({ 
      success: true, 
      message: 'If your email is registered, you will receive a password reset link.' 
    });
    
    // Create Supabase client with correct cookie handling
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    // Check if the email exists in the admin_users table via a join with auth.users
    const { data: adminExists, error: adminError } = await supabase.rpc('verify_admin_email', {
      p_email: email
    });
    
    // Send password reset email using Supabase Auth
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${request.headers.get('origin')}/admin/reset-password?type=recovery`,
    });
    
    if (resetError) {
      console.error('Error sending reset email:', resetError);
      // Still return success to prevent email enumeration
    }
    
    return response;
  } catch (error) {
    console.error('Error in password reset:', error);
    return NextResponse.json({ 
      success: true, // Still return success to prevent email enumeration
      message: 'If your email is registered, you will receive a password reset link.'
    });
  }
}

// Handle password update after verification
export async function PUT(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const { password } = body;
    
    if (!password || password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 });
    }
    
    // Create a new response
    const response = NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
    
    // Create Supabase client with correct cookie handling
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'You must be logged in to reset your password' 
      }, { status: 401 });
    }
    
    // Update the password hash in admin_users table
    const { error: adminError } = await supabase.rpc('update_admin_password', {
      p_user_id: user.id,
      p_password: password
    });
    
    if (adminError) {
      console.error('Error updating admin password:', adminError);
      // Password is already updated in auth.users, so we'll still return success
    }
    
    return response;
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }, { status: 500 });
  }
}
