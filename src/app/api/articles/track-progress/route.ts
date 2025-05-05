import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  try {
    // Get user session to determine if they're authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get warrior ID
    const { data: warrior } = await supabase
      .from('warriors')
      .select('id')
      .eq('owner_id', session.user.id)
      .single();
    
    if (!warrior) {
      return NextResponse.json(
        { error: 'Warrior profile not found' },
        { status: 404 }
      );
    }
    
    // Get request body
    const { articleId, readPercentage } = await request.json();
    
    if (!articleId || typeof readPercentage !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }
    
    // Call the mark_article_read function
    const { data, error } = await supabase.rpc('mark_article_read', {
      p_article_id: articleId,
      p_warrior_id: warrior.id,
      p_read_percentage: readPercentage
    });
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error tracking article progress:', error);
    return NextResponse.json(
      { error: 'Failed to track article progress' },
      { status: 500 }
    );
  }
}
