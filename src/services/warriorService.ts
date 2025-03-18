import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import type { WarriorSpecialty } from '@/lib/database.types';
import { BaseService } from './baseService';

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

export class WarriorService extends BaseService<'warriors'> {
  constructor() {
    super('warriors');
  }

  async createWarrior(data: CreateWarriorDTO, userId: string) {
    return this.create({
      ...data,
      owner_id: userId,
      power_level: 100, // Default starting level
      rank: 1000, // Default starting rank
      metadata: {
        bio: data.bio,
        socialLinks: data.socialLinks
      }
    });
  }

  async uploadWarriorAvatar(file: File, userId: string) {
    const supabase = this.getClient();
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
  }

  async getWarrior(id: string) {
    return this.getById(id, '*, profiles(*), dojos(*)');
  }

  async getWarriorByOwner(userId: string) {
    const { data, error } = await this.getClient()
      .from(this.tableName)
      .select()
      .eq('owner_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = No rows returned
    return data || null;
  }

  async updateWarrior(id: string, data: Partial<CreateWarriorDTO>, userId: string) {
    // Verify ownership
    const warrior = await this.getWarrior(id);
    if (warrior.owner_id !== userId) {
      throw new Error('Unauthorized: You can only update your own warrior');
    }

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

    return this.update(id, updateData);
  }

  async joinDojo(warriorId: string, dojoId: string, userId: string) {
    // Verify ownership
    const warrior = await this.getWarrior(warriorId);
    if (warrior.owner_id !== userId) {
      throw new Error('Unauthorized: You can only join a dojo with your own warrior');
    }

    return this.update(warriorId, { dojo_id: dojoId });
  }

  async leaveDojo(warriorId: string, userId: string) {
    // Verify ownership
    const warrior = await this.getWarrior(warriorId);
    if (warrior.owner_id !== userId) {
      throw new Error('Unauthorized: You can only leave a dojo with your own warrior');
    }

    return this.update(warriorId, { dojo_id: null });
  }
}