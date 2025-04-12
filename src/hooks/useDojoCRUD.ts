import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

export interface CreateDojoDTO {
  name: string;
  location: string;
  description: string;
  banner_url?: string;
  socialLinks?: {
    website?: string;
    twitter?: string;
    github?: string;
  };
  tags?: string[];
}

export function useDojoCRUD() {
  const supabase = createClientComponentClient<Database>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadDojoBanner = async (file: File, userId: string): Promise<string> => {
    try {
      setLoading(true);
      setError(null);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `dojo-banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading dojo banner:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload banner');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createDojo = async (data: CreateDojoDTO, userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Extract fields that aren't directly in the database schema
      const { socialLinks, tags, ...dojoData } = data;
      
      // Create the dojo with only the fields that exist in the database
      const { data: result, error } = await supabase
        .from('dojos')
        .insert({
          ...dojoData,
          owner_id: userId,
          metadata: {
            socialLinks,
            tags
          }
        })
        .select()
        .single();

      if (error) throw error;
      
      return result;
    } catch (err) {
      console.error('Error creating dojo:', err);
      setError(err instanceof Error ? err.message : 'Failed to create dojo');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getDojo = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('dojos')
        .select('*, profiles(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      return data;
    } catch (err) {
      console.error('Error getting dojo:', err);
      setError(err instanceof Error ? err.message : 'Failed to get dojo');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getDojosByOwner = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('dojos')
        .select('*')
        .eq('owner_id', userId);

      if (error) throw error;
      
      return data;
    } catch (err) {
      console.error('Error getting dojos by owner:', err);
      setError(err instanceof Error ? err.message : 'Failed to get dojos');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateDojo = async (id: string, data: Partial<CreateDojoDTO>, userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Verify ownership
      const { data: dojo, error: getError } = await supabase
        .from('dojos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (getError) throw getError;
      
      if (dojo.owner_id !== userId) {
        throw new Error('Unauthorized: You can only update your own dojo');
      }

      // Extract fields that aren't directly in the database schema
      const { socialLinks, tags, ...updateData } = data;
      
      // Prepare metadata update
      const metadata = {
        ...(dojo.metadata || {}),
        ...(socialLinks ? { socialLinks } : {}),
        ...(tags ? { tags } : {})
      };

      // Update the dojo
      const { data: result, error: updateError } = await supabase
        .from('dojos')
        .update({
          ...updateData,
          metadata
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      return result;
    } catch (err) {
      console.error('Error updating dojo:', err);
      setError(err instanceof Error ? err.message : 'Failed to update dojo');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    uploadDojoBanner,
    createDojo,
    getDojo,
    getDojosByOwner,
    updateDojo
  };
}
