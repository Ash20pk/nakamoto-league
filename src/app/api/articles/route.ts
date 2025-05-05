import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');
  const tag = searchParams.get('tag');
  
  try {
    // Get user session to determine if they're authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    // Get warrior ID if authenticated
    let warriorId = null;
    if (session?.user) {
      const { data: warrior } = await supabase
        .from('warriors')
        .select('id')
        .eq('owner_id', session.user.id)
        .single();
      
      if (warrior) {
        warriorId = warrior.id;
      }
    }
    
    // Call the get_articles function
    const { data, error } = await supabase.rpc('get_articles', {
      p_limit: limit,
      p_offset: offset,
      p_tag: tag,
      p_warrior_id: warriorId
    });
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}
