import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';

type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

// Simple cache implementation
class SimpleCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly DEFAULT_TTL = 60000; // 1 minute in milliseconds

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl,
    });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  invalidate(keyPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export abstract class BaseService<T extends TableName> {
  protected tableName: T;
  private static client: ReturnType<typeof createClientComponentClient<Database>> | null = null;
  protected static cache = new SimpleCache();
  
  constructor(tableName: T) {
    this.tableName = tableName;
  }

  protected getClient() {
    if (!BaseService.client) {
      BaseService.client = createClientComponentClient<Database>();
    }
    return BaseService.client;
  }

  async create(data: Omit<TableRow<T>, 'id' | 'created_at' | 'updated_at'>): Promise<TableRow<T>> {
    const { data: result, error } = await this.getClient()
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    
    // Invalidate cache for this table
    BaseService.cache.invalidate(`${this.tableName}:`);
    
    return result;
  }

  async getById(id: string, select: string = '*'): Promise<TableRow<T>> {
    const cacheKey = `${this.tableName}:id:${id}:${select}`;
    const cached = BaseService.cache.get<TableRow<T>>(cacheKey);
    
    if (cached) return cached;

    const { data, error } = await this.getClient()
      .from(this.tableName)
      .select(select)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Cache the result
    BaseService.cache.set(cacheKey, data);
    
    return data;
  }

  async getAll(select: string = '*'): Promise<TableRow<T>[]> {
    const cacheKey = `${this.tableName}:all:${select}`;
    const cached = BaseService.cache.get<TableRow<T>[]>(cacheKey);
    
    if (cached) return cached;

    const { data, error } = await this.getClient()
      .from(this.tableName)
      .select(select);

    if (error) throw error;
    
    // Cache the result
    BaseService.cache.set(cacheKey, data);
    
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
    
    // Invalidate cache for this item and table
    BaseService.cache.invalidate(`${this.tableName}:id:${id}`);
    BaseService.cache.invalidate(`${this.tableName}:all`);
    
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.getClient()
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Invalidate cache for this item and table
    BaseService.cache.invalidate(`${this.tableName}:id:${id}`);
    BaseService.cache.invalidate(`${this.tableName}:all`);
  }
}
