import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { BaseService } from './baseService';
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

export class DojoService extends BaseService<'dojos'> {
  constructor() {
    super('dojos');
  }

  async createDojo(data: CreateDojoDTO, userId: string) {
    return this.create({
      ...data,
      owner_id: userId,
      metadata: {
        socialLinks: data.socialLinks,
        tags: data.tags
      }
    });
  }

  async uploadDojoBanner(file: File, userId: string) {
    const supabase = this.getClient();
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
  }

  async getDojo(id: string) {
    return this.getById(id, '*, profiles(*)');
  }

  async getDojosByOwner(userId: string) {
    const { data, error } = await this.getClient()
      .from(this.tableName)
      .select()
      .eq('owner_id', userId);

    if (error) throw error;
    return data;
  }

  async updateDojo(id: string, data: Partial<CreateDojoDTO>, userId: string) {
    // Verify ownership
    const dojo = await this.getDojo(id);
    if (dojo.owner_id !== userId) {
      throw new Error('Unauthorized: You can only update your own dojo');
    }

    return this.update(id, {
      ...data,
      metadata: {
        socialLinks: data.socialLinks,
        tags: data.tags
      }
    });
  }
}