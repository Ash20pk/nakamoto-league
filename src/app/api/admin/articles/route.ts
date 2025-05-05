import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check if admin token cookie exists
    const adminToken = request.cookies.get('admin_token')?.value;
    const adminUsername = request.cookies.get('admin_username')?.value;
    
    if (!adminToken || !adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin exists and is active
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, username')
      .eq('username', adminUsername)
      .eq('is_active', true)
      .single();
    
    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search') || '';
    const tag = url.searchParams.get('tag') || '';
    
    // Use the dedicated admin function to get articles
    const { data, error } = await supabase.rpc('get_admin_articles', {
      p_limit: limit,
      p_offset: offset,
      p_search: search,
      p_tag: tag === '' ? null : tag
    });
    
    if (error) {
      console.error('Error fetching admin articles:', error);
      return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in admin articles API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check if admin token cookie exists
    const adminToken = request.cookies.get('admin_token')?.value;
    const adminUsername = request.cookies.get('admin_username')?.value;
    
    if (!adminToken || !adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin exists and is active
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, username')
      .eq('username', adminUsername)
      .eq('is_active', true)
      .single();
    
    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get article data from request body
    const articleData = await request.json();
    
    // Validate required fields
    if (!articleData.title || !articleData.slug || !articleData.content || !articleData.author) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Upload banner image if provided as base64
    let bannerUrl = articleData.banner_url;
    if (articleData.banner_image_base64) {
      try {
        // Extract file data and type from base64 string
        const matches = articleData.banner_image_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
          throw new Error('Invalid image data');
        }
        
        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const fileExt = type.split('/')[1];
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `articles/${fileName}`;
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('public')
          .upload(filePath, buffer, {
            contentType: type,
            cacheControl: '3600'
          });
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('public')
          .getPublicUrl(filePath);
          
        bannerUrl = publicUrlData.publicUrl;
      } catch (error) {
        console.error('Error uploading banner image:', error);
        // Continue without banner if upload fails
      }
    }
    
    // Create article record
    const { data, error } = await supabase
      .from('articles')
      .insert({
        title: articleData.title,
        slug: articleData.slug,
        content: articleData.content,
        summary: articleData.summary || null,
        author: articleData.author,
        reading_time_minutes: articleData.reading_time_minutes || 5,
        banner_url: bannerUrl,
        tags: articleData.tags || [],
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating article:', error);
      return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, article: data });
  } catch (error) {
    console.error('Error in admin articles POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check if admin token cookie exists
    const adminToken = request.cookies.get('admin_token')?.value;
    const adminUsername = request.cookies.get('admin_username')?.value;
    
    if (!adminToken || !adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin exists and is active
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, username')
      .eq('username', adminUsername)
      .eq('is_active', true)
      .single();
    
    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get article ID from request body
    const { articleId } = await request.json();
    if (!articleId) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }
    
    // Delete the article
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId);
      
    if (error) {
      console.error('Error deleting article:', error);
      return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in admin articles DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
