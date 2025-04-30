import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  try {
    // Verify the user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { name, email, password, location, description } = body;
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Use admin.createUser instead of signUp to avoid auto-login
    // This creates a user without logging in as that user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        account_type: 'dojo'
      }
    });
    
    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }
    
    if (!userData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
    
    // Get the user ID from the response
    const userId = userData.user.id;
    
    // Create profile for the user
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          username: name,
          full_name: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    
    if (profileError) {
      return NextResponse.json({ error: `Profile error: ${profileError.message}` }, { status: 500 });
    }
    
    // Create dojo entry
    const { error: dojoError } = await supabase
      .from('dojos')
      .insert([
        {
          name,
          owner_id: userId,
          location: location || null,
          description: description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    
    if (dojoError) {
      return NextResponse.json({ error: `Dojo error: ${dojoError.message}` }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Dojo account created successfully for ${email}` 
    });
  } catch (error) {
    console.error('Error creating dojo:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }, { status: 500 });
  }
}
