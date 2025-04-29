// src/app/api/warriors/[id]/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export async function POST(
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
    
    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }
    
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${params.id}-${Date.now()}.${fileExt}`;
    const filePath = `warrior-avatars/${fileName}`;
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });
    
    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    // Update warrior with new avatar URL
    const { data: updatedWarrior, error: updateError } = await supabase
      .from('warriors')
      .update({ avatar_url: publicUrl })
      .eq('id', params.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating warrior with avatar URL:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      avatar_url: publicUrl,
      warrior: updatedWarrior
    });
  
  } catch (err) {
    console.error('Unexpected error in avatar upload:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}