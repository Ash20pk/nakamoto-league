import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  try {
    // Verify the user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all dojos
    const { data: dojos, error: dojosError } = await supabase
      .from('dojos')
      .select('*, profiles(*)');
    
    if (dojosError) {
      throw dojosError;
    }
    
    // For each dojo, get the user email from auth.users
    // Since we can't use admin APIs, we'll just return the dojos with their owner_id
    return NextResponse.json({ dojos });
  } catch (error) {
    console.error('Error fetching dojos:', error);
    return NextResponse.json({ error: 'Failed to fetch dojos' }, { status: 500 });
  }
}

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
    
    // Create user with dojo account type using signUp
    // This creates the user in auth.users but doesn't immediately return the user ID
    const { data: userData, error: userError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          account_type: 'dojo'
        }
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
      return NextResponse.json({ error: profileError.message }, { status: 500 });
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
      return NextResponse.json({ error: dojoError.message }, { status: 500 });
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
