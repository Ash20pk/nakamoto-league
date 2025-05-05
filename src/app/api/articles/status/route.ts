import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  try {
    // Check if articles table exists and has data
    const { data: articlesCount, error: countError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      return NextResponse.json({
        status: 'error',
        message: 'Failed to check articles table',
        error: countError.message,
        details: countError
      }, { status: 500 });
    }
    
    // Check if get_articles function exists
    const { data: functions, error: functionsError } = await supabase
      .rpc('get_articles', {
        p_limit: 1,
        p_offset: 0
      });
      
    // Return status information
    return NextResponse.json({
      status: 'ok',
      articlesTableExists: true,
      articlesCount: articlesCount,
      getFunctionWorks: !functionsError,
      functionsError: functionsError ? functionsError.message : null,
      message: 'Articles system status'
    });
  } catch (error) {
    console.error('Error checking articles system status:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check articles system status',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
