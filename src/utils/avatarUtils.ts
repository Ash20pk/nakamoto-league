/**
 * Utility functions for avatar generation and handling
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * Avatar styles available from DiceBear
 */
export type AvatarStyle = 
  | 'adventurer' 
  | 'avataaars' 
  | 'bottts' 
  | 'initials' 
  | 'micah' 
  | 'miniavs' 
  | 'open-peeps' 
  | 'pixel-art' 
  | 'personas';

/**
 * Generates a random avatar URL using DiceBear API
 * @param seed Optional seed for consistent avatar generation. If not provided, a random one will be used.
 * @param style Avatar style to use
 * @returns URL to the generated avatar
 */
export function getRandomAvatarUrl(seed?: string, style: AvatarStyle = 'pixel-art'): string {
  // Generate a random seed if none provided
  const avatarSeed = seed || Math.random().toString(36).substring(2, 10);
  
  // Return URL for the avatar
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${avatarSeed}`;
}

/**
 * Gets a random avatar URL for a specific entity type
 * @param type The type of entity (warrior, dojo, etc.)
 * @param id Optional ID to use as seed
 * @returns URL to the generated avatar
 */
export function getEntityAvatar(type: 'warrior' | 'dojo' | 'tournament', id?: string): string {
  // Different entity types can use different avatar styles
  const styleMap: Record<string, AvatarStyle> = {
    warrior: 'avataaars',
    dojo: 'bottts',
    tournament: 'pixel-art'
  };
  
  return getRandomAvatarUrl(id, styleMap[type]);
}

/**
 * Fetches a random avatar from DiceBear and stores it in Supabase storage
 * @param supabase Supabase client
 * @param userId User ID for storage path
 * @param type Entity type (warrior, dojo, tournament)
 * @param entityId Entity ID for seed and filename
 * @returns URL to the stored avatar in Supabase storage
 */
export async function fetchAndStoreRandomAvatar(
  supabase: SupabaseClient<Database>,
  userId: string,
  type: 'warrior' | 'dojo' | 'tournament',
  entityId: string
): Promise<string | null> {
  try {
    // Generate a random avatar URL
    const randomAvatarUrl = getEntityAvatar(type, entityId + Date.now());
    
    // Fetch the avatar image
    const response = await fetch(randomAvatarUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch avatar: ${response.status} ${response.statusText}`);
    }
    
    // Get the image data as blob
    const imageBlob = await response.blob();
    
    // Convert blob to buffer for Supabase storage
    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a unique filename
    const fileName = `${type}-${entityId}-${Date.now()}.svg`;
    const filePath = `${userId}/${fileName}`;
    
    // Use the correct bucket name that exists in Supabase
    const bucketName = 'warrior-profile';
    
    console.log(`Uploading random avatar to ${bucketName}/${filePath}`);
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: 'image/svg+xml',
        upsert: true,
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('Error uploading random avatar:', uploadError);
      return null;
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('Failed to get public URL');
      return null;
    }
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in fetchAndStoreRandomAvatar:', error);
    return null;
  }
}
