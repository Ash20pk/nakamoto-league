// src/app/api/warriors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';
import type { WarriorSpecialty } from '@/lib/database.types';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    // Get search params for filtering
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search');
    const specialty = searchParams.get('specialty') as WarriorSpecialty | null;
    const sortBy = searchParams.get('sortBy') || 'rank';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Build query - avoid recursive join by being specific about fields
    let query = supabase
      .from('warriors')
      .select(`
        id, name, avatar_url, power_level, rank, specialty, dojo_id, owner_id, created_at, updated_at, metadata,
        win_rate, experience, level, energy, energy_last_updated, last_check_in,
        dojos:dojo_id (id, name)
      `, { count: 'exact' });
    
    // Apply filters
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    if (specialty) {
      query = query.eq('specialty', specialty);
    }
    
    // Apply sorting
    if (sortBy === 'rank') {
      query = query.order('rank', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'powerLevel') {
      query = query.order('power_level', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    
    // Apply pagination
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    query = query.range(start, end);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching warriors:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ warriors: data, count });
  
  } catch (err) {
    console.error('Unexpected error in warriors API:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get request body
    const body = await req.json();
    const { name, specialty, bio, socialLinks } = body;
    
    // Validate required fields
    if (!name || !specialty) {
      return NextResponse.json({ error: 'Name and specialty are required' }, { status: 400 });
    }
    
    // Check if user already has a warrior
    const { data: existingWarrior, error: existingError } = await supabase
      .from('warriors')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();
      
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    
    if (existingWarrior) {
      return NextResponse.json({ error: 'You already have a warrior' }, { status: 400 });
    }
    
    // Create new warrior
    const { data: warrior, error } = await supabase
      .from('warriors')
      .insert({
        name,
        specialty,
        owner_id: userId,
        power_level: 1000,
        rank: 0,
        win_rate: 0,
        experience: 0,
        level: 1,
        energy: 100,
        energy_last_updated: new Date().toISOString(),
        metadata: {
          bio,
          socialLinks
        }
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating warrior:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(warrior, { status: 201 });
  
  } catch (err) {
    console.error('Unexpected error in warrior creation:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}