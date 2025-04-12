import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

export interface Dojo {
  id: string;
  name: string;
  location: string;
  rank?: number;
  powerLevel: number;
  totalWarriors: number;
  winRate: number;
  specialization: string;
  banner: string;
}

export interface DojoFilters {
  search?: string;
  sortBy: 'rank' | 'powerLevel' | 'totalWarriors' | 'winRate';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export function useDojo() {
  const supabase = createClientComponentClient<Database>();
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [dojoCount, setDojoCount] = useState(0);
  const [loadingDojos, setLoadingDojos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDojos = useCallback(async (filters: DojoFilters) => {
    try {
      setLoadingDojos(true);
      setError(null);

      // Build the query with all necessary joins and counts in a single query
      let query = supabase
        .from('dojos')
        .select(`
          *,
          warriors:warriors(count)
        `, { count: 'exact' });

      // Apply search filter
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Apply sorting based on filter
      if (filters.sortBy === 'rank') {
        // For rank, we'll use created_at as a proxy for now
        query = query.order('created_at', { ascending: filters.sortOrder === 'asc' });
      }
      // Other sorting options will be handled client-side after data retrieval

      // Apply pagination
      const start = (filters.page - 1) * filters.limit;
      const end = start + filters.limit - 1;
      query = query.range(start, end);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Transform data to match our Dojo interface
      const transformedData: Dojo[] = data?.map((dojo: any, index: number) => {
        // Calculate a deterministic power level based on dojo id
        // This ensures the same dojo always has the same power level
        const dojoIdSum = dojo.id.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
        const powerLevel = 1500 + (dojoIdSum % 1000);
        
        // Calculate a deterministic win rate based on dojo id
        const winRate = 50 + (dojoIdSum % 50);
        
        return {
          id: dojo.id,
          name: dojo.name,
          location: dojo.location || 'Unknown Location',
          rank: index + 1 + (filters.page - 1) * filters.limit, // Calculate rank based on pagination
          powerLevel,
          totalWarriors: dojo.warriors?.[0]?.count || 0,
          winRate,
          specialization: dojo.description?.split(' ')[0] || 'Mixed',
          banner: dojo.banner_url || '/images/default-dojo.jpg'
        };
      }) || [];

      // Apply client-side sorting if needed
      if (filters.sortBy === 'powerLevel') {
        transformedData.sort((a: Dojo, b: Dojo) => {
          return filters.sortOrder === 'asc' 
            ? a.powerLevel - b.powerLevel 
            : b.powerLevel - a.powerLevel;
        });
      } else if (filters.sortBy === 'totalWarriors') {
        transformedData.sort((a: Dojo, b: Dojo) => {
          return filters.sortOrder === 'asc' 
            ? a.totalWarriors - b.totalWarriors 
            : b.totalWarriors - a.totalWarriors;
        });
      } else if (filters.sortBy === 'winRate') {
        transformedData.sort((a: Dojo, b: Dojo) => {
          return filters.sortOrder === 'asc' 
            ? a.winRate - b.winRate 
            : b.winRate - a.winRate;
        });
      }

      setDojos(transformedData);
      setDojoCount(count || 0);
    } catch (err) {
      console.error('Error fetching dojos:', err);
      setError('Failed to fetch dojos');
    } finally {
      setLoadingDojos(false);
    }
  }, [supabase]);

  return {
    dojos,
    dojoCount,
    loadingDojos,
    error,
    fetchDojos
  };
}
