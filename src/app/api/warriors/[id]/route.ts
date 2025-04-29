// src/app/api/warriors/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export async function GET(
  req: NextRequest,
  // @ts-ignore - Next.js App Router type issue
  { params }: any
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get warrior by ID
    const { data: warrior, error } = await supabase
      .from('warriors')
      .select(`
        *,
        dojos (id, name, location, banner_url),
        owner:profiles (username, avatar_url)
      `)
      .eq('id', params.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Warrior not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Get additional stats like battles won, battles participated, etc.
    const { data: battlesWon, error: battlesWonError } = await supabase
      .from('battles')
      .select('id', { count: 'exact' })
      .eq('winner_id', params.id);
      
    // Get battles participated
    const { data: battlesParticipated, error: battlesParticipatedError } = await supabase
      .from('battles')
      .select('id', { count: 'exact' })
      .or(`challenger_id.eq.${params.id},defender_id.eq.${params.id}`);
    
    // Get tournament participation
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournament_participants')
      .select(`
        tournament:tournaments (
          id, 
          title, 
          start_date, 
          end_date
        )
      `)
      .eq('warrior_id', params.id);
    
    // Combine the results
    const result = {
      ...warrior,
      stats: {
        battlesWon: battlesWon?.length || 0,
        battlesParticipated: battlesParticipated?.length || 0,
        tournaments: tournaments?.map(t => t.tournament) || []
      }
    };
    
    return NextResponse.json(result);
  
  } catch (err) {
    console.error('Unexpected error fetching warrior:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  // @ts-ignore - Next.js App Router type issue
  { params }: any
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Check if user owns the warrior
    const { data: warrior, error: warriorError } = await supabase
      .from('warriors')
      .select('owner_id')
      .eq('id', params.id)
      .single();
      
    if (warriorError) {
      if (warriorError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Warrior not found' }, { status: 404 });
      }
      return NextResponse.json({ error: warriorError.message }, { status: 500 });
    }
    
    if (warrior.owner_id !== userId) {
      return NextResponse.json({ error: 'You can only update your own warrior' }, { status: 403 });
    }
    
    // Get request body
    const body = await req.json();
    const { name, bio, socialLinks } = body;
    
    // Create update object
    const updates: any = {};
    if (name) updates.name = name;
    
    // Update metadata fields if provided
    if (bio !== undefined || socialLinks !== undefined) {
      // Get current metadata
      const { data: currentWarrior } = await supabase
        .from('warriors')
        .select('metadata')
        .eq('id', params.id)
        .single();
      
      const currentMetadata = currentWarrior?.metadata || {};
      
      updates.metadata = {
        ...currentMetadata,
        ...(bio !== undefined && { bio }),
        ...(socialLinks !== undefined && { socialLinks })
      };
    }
    
    // Update the warrior
    const { data: updatedWarrior, error } = await supabase
      .from('warriors')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating warrior:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(updatedWarrior);
  
  } catch (err) {
    console.error('Unexpected error updating warrior:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  // @ts-ignore - Next.js App Router type issue
  { params }: any
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Check if user owns the warrior
    const { data: warrior, error: warriorError } = await supabase
      .from('warriors')
      .select('owner_id')
      .eq('id', params.id)
      .single();
      
    if (warriorError) {
      if (warriorError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Warrior not found' }, { status: 404 });
      }
      return NextResponse.json({ error: warriorError.message }, { status: 500 });
    }
    
    if (warrior.owner_id !== userId) {
      return NextResponse.json({ error: 'You can only delete your own warrior' }, { status: 403 });
    }
    
    // Delete the warrior
    const { error } = await supabase
      .from('warriors')
      .delete()
      .eq('id', params.id);
    
    if (error) {
      console.error('Error deleting warrior:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  
  } catch (err) {
    console.error('Unexpected error deleting warrior:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}