// src/app/api/warriors/[id]/dojo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

// Join a dojo
export async function POST(
  req: NextRequest,
  // @ts-ignore - Next.js App Router type issue
  { params }: any
) {
  try {
    const warriorId = params.id;
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
      .eq('id', warriorId)
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
    const { dojoId } = body;
    
    if (!dojoId) {
      return NextResponse.json({ error: 'Dojo ID is required' }, { status: 400 });
    }
    
    // Check if the dojo exists
    const { data: dojo, error: dojoError } = await supabase
      .from('dojos')
      .select('id')
      .eq('id', dojoId)
      .single();
      
    if (dojoError) {
      if (dojoError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Dojo not found' }, { status: 404 });
      }
      return NextResponse.json({ error: dojoError.message }, { status: 500 });
    }
    
    // Update the warrior's dojo
    const { data: updatedWarrior, error: updateError } = await supabase
      .from('warriors')
      .update({ dojo_id: dojoId })
      .eq('id', warriorId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating warrior:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json(updatedWarrior);
  
  } catch (err) {
    console.error('Unexpected error joining dojo:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Leave a dojo
export async function DELETE(
  req: NextRequest,
  // @ts-ignore - Next.js App Router type issue
  { params }: any
) {
  try {
    const warriorId = params.id;
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
      .select('owner_id, dojo_id')
      .eq('id', warriorId)
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
    
    if (!warrior.dojo_id) {
      return NextResponse.json({ error: 'Warrior is not in a dojo' }, { status: 400 });
    }
    
    // Update the warrior's dojo to null
    const { data: updatedWarrior, error: updateError } = await supabase
      .from('warriors')
      .update({ dojo_id: null })
      .eq('id', warriorId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating warrior:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json(updatedWarrior);
  
  } catch (err) {
    console.error('Unexpected error leaving dojo:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}