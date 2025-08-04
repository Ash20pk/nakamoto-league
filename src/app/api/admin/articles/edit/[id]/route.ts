import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookiesInstance = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookiesInstance });
    
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
    
    const { id: articleId } = await params;
    
    if (!articleId) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }
    
    // Fetch the article by ID
    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();
    
    if (error) {
      console.error('Error fetching article for edit:', error);
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    
    return NextResponse.json(article);
  } catch (error) {
    console.error('Error in admin article edit API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookiesInstance = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookiesInstance });
    
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
    
    const { id: articleId } = await params;
    
    if (!articleId) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
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
    
    // Update article record
    const { data, error } = await supabase
      .from('articles')
      .update({
        title: articleData.title,
        slug: articleData.slug,
        content: articleData.content,
        summary: articleData.summary || null,
        author: articleData.author,
        reading_time_minutes: articleData.reading_time_minutes || 5,
        banner_url: bannerUrl,
        tags: articleData.tags || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating article:', error);
      return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, article: data });
  } catch (error) {
    console.error('Error in admin article update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
