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

export const dojoService = {
  async createDojo(data: CreateDojoDTO, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Create the dojo record
      const { data: dojo, error } = await supabase
        .from('dojos')
        .insert({
          name: data.name,
          description: data.description,
          owner_id: userId,
          location: data.location,
          banner_url: data.banner_url,
          metadata: {
            socialLinks: data.socialLinks,
            tags: data.tags
          }
        })
        .select()
        .single();

      if (error) throw error;
      return dojo;
    } catch (error) {
      console.error('Error creating dojo:', error);
      throw error;
    }
  },

  async uploadDojoBanner(file: File, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `dojo-banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading banner:', error);
      throw error;
    }
  },

  async getDojo(id: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      const { data: dojo, error } = await supabase
        .from('dojos')
        .select('*, profiles(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return dojo;
    } catch (error) {
      console.error('Error fetching dojo:', error);
      throw error;
    }
  },

  async getDojosByOwner(userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      const { data: dojos, error } = await supabase
        .from('dojos')
        .select('*')
        .eq('owner_id', userId);

      if (error) throw error;
      return dojos;
    } catch (error) {
      console.error('Error fetching owner dojos:', error);
      throw error;
    }
  },

  async updateDojo(id: string, data: Partial<CreateDojoDTO>, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // First verify ownership
      const { data: existingDojo, error: fetchError } = await supabase
        .from('dojos')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      if (existingDojo.owner_id !== userId) {
        throw new Error('Unauthorized: You can only update your own dojos');
      }

      // Update the dojo
      const { data: updatedDojo, error } = await supabase
        .from('dojos')
        .update({
          name: data.name,
          description: data.description,
          location: data.location,
          banner_url: data.banner_url,
          metadata: {
            socialLinks: data.socialLinks,
            tags: data.tags
          }
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedDojo;
    } catch (error) {
      console.error('Error updating dojo:', error);
      throw error;
    }
  }
};