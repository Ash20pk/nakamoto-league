import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Database } from '@/lib/database.types';

type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

export abstract class BaseService<T extends TableName> {
  protected tableName: T;
  
  constructor(tableName: T) {
    this.tableName = tableName;
  }

  protected getClient() {
    return createBrowserSupabaseClient<Database>();
  }

  async create(data: Omit<TableRow<T>, 'id' | 'created_at' | 'updated_at'>): Promise<TableRow<T>> {
    const { data: result, error } = await this.getClient()
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async getById(id: string): Promise<TableRow<T>> {
    const { data, error } = await this.getClient()
      .from(this.tableName)
      .select()
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getAll(): Promise<TableRow<T>[]> {
    const { data, error } = await this.getClient()
      .from(this.tableName)
      .select();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: Partial<TableRow<T>>): Promise<TableRow<T>> {
    const { data, error } = await this.getClient()
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.getClient()
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
