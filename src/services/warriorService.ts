import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import type { WarriorSpecialty } from '@/lib/database.types';

export interface CreateWarriorDTO {
  name: string;
  specialty: WarriorSpecialty;
  avatar_url?: string;
  bio?: string;
  socialLinks?: {
    github?: string;
    twitter?: string;
    website?: string;
  };
}

export const warriorService = {
  async createWarrior(data: CreateWarriorDTO, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Create the warrior record
      const { data: warrior, error } = await supabase
        .from('warriors')
        .insert({
          name: data.name,
          owner_id: userId,
          specialty: data.specialty,
          avatar_url: data.avatar_url,
          power_level: 100, // Default starting level
          rank: 1000, // Default starting rank
          metadata: {
            bio: data.bio,
            socialLinks: data.socialLinks
          }
        })
        .select()
        .single();

      if (error) throw error;
      return warrior;
    } catch (error) {
      console.error('Error creating warrior:', error);
      throw error;
    }
  },

  async uploadWarriorAvatar(file: File, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `warrior-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  },

  async getWarrior(id: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      const { data: warrior, error } = await supabase
        .from('warriors')
        .select('*, profiles(*), dojos(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return warrior;
    } catch (error) {
      console.error('Error fetching warrior:', error);
      throw error;
    }
  },

  async getWarriorByOwner(userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      const { data: warrior, error } = await supabase
        .from('warriors')
        .select('*')
        .eq('owner_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = No rows returned
      return warrior || null;
    } catch (error) {
      console.error('Error fetching owner warrior:', error);
      throw error;
    }
  },

  async updateWarrior(id: string, data: Partial<CreateWarriorDTO>, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // First verify ownership
      const { data: existingWarrior, error: fetchError } = await supabase
        .from('warriors')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      if (existingWarrior.owner_id !== userId) {
        throw new Error('Unauthorized: You can only update your own warrior');
      }

      // Update the warrior
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.specialty) updateData.specialty = data.specialty;
      if (data.avatar_url) updateData.avatar_url = data.avatar_url;
      if (data.bio || data.socialLinks) {
        updateData.metadata = {
          bio: data.bio,
          socialLinks: data.socialLinks
        };
      }

      const { data: updatedWarrior, error } = await supabase
        .from('warriors')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedWarrior;
    } catch (error) {
      console.error('Error updating warrior:', error);
      throw error;
    }
  },

  async joinDojo(warriorId: string, dojoId: string, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Verify warrior ownership
      const { data: warrior, error: warriorError } = await supabase
        .from('warriors')
        .select('owner_id')
        .eq('id', warriorId)
        .single();

      if (warriorError) throw warriorError;
      
      if (warrior.owner_id !== userId) {
        throw new Error('Unauthorized: You can only join a dojo with your own warrior');
      }

      // Update warrior with new dojo
      const { data: updatedWarrior, error } = await supabase
        .from('warriors')
        .update({
          dojo_id: dojoId
        })
        .eq('id', warriorId)
        .select()
        .single();

      if (error) throw error;
      return updatedWarrior;
    } catch (error) {
      console.error('Error joining dojo:', error);
      throw error;
    }
  },

  async leaveDojo(warriorId: string, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Verify warrior ownership
      const { data: warrior, error: warriorError } = await supabase
        .from('warriors')
        .select('owner_id')
        .eq('id', warriorId)
        .single();

      if (warriorError) throw warriorError;
      
      if (warrior.owner_id !== userId) {
        throw new Error('Unauthorized: You can only leave a dojo with your own warrior');
      }

      // Set dojo_id to null
      const { data: updatedWarrior, error } = await supabase
        .from('warriors')
        .update({
          dojo_id: null
        })
        .eq('id', warriorId)
        .select()
        .single();

      if (error) throw error;
      return updatedWarrior;
    } catch (error) {
      console.error('Error leaving dojo:', error);
      throw error;
    }
  }
};