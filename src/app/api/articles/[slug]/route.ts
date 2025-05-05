import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

export async function GET(
  request: NextRequest,
  // @ts-ignore - Next.js App Router type issue
  { params }: any
) {
  const { slug } = params;
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
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
    
    // Call the get_article_by_slug function
    const { data, error } = await supabase.rpc('get_article_by_slug', {
      p_slug: slug,
      p_warrior_id: warriorId
    });
    
    if (error) throw error;
    
    if (data.error) {
      return NextResponse.json(
        { error: data.error },
        { status: 404 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}
