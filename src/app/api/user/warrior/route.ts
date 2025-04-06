// src/app/api/user/warrior/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get user's warrior
    const { data: warrior, error: warriorError } = await supabase
      .from('warriors')
      .select(`
        *,
        dojos (id, name, location, banner_url)
      `)
      .eq('owner_id', userId)
      .maybeSingle();
      
    if (warriorError) {
      return NextResponse.json({ error: warriorError.message }, { status: 500 });
    }
    
    if (!warrior) {
      return NextResponse.json({ error: 'Warrior not found' }, { status: 404 });
    }
    
    return NextResponse.json(warrior);
  
  } catch (err) {
    console.error('Unexpected error fetching user warrior:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}