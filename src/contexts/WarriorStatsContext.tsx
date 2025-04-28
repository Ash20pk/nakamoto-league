'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import { useAuth } from '@/providers/AuthProvider';
import type { WarriorSpecialty } from '@/lib/database.types';

// Define the warrior stats interface
export interface WarriorStats {
  id: string;
  name: string;
  avatar_url: string | null;
  power_level: number;
  rank: number;
  win_rate: number;
  experience?: number;
  level?: number;
  energy?: number;
  energy_last_updated?: string;
  last_check_in?: string;
  specialty: WarriorSpecialty;
  dojo_id: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    bio?: string;
    socialLinks?: {
      github?: string;
      twitter?: string;
      website?: string;
    }
  };
}

// Define the context value interface
interface WarriorStatsContextValue {
  warriorStats: WarriorStats | null;
  topWarriors: WarriorStats[];
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
  updateStats: (warriorId: string) => Promise<void>;
  regenerateEnergy: (warriorId: string) => Promise<number | null>;
  dailyCheckIn: (warriorId: string) => Promise<boolean>;
  spendEnergy: (warriorId: string, amount: number) => Promise<boolean>;
}

// Create the context
const WarriorStatsContext = createContext<WarriorStatsContextValue | undefined>(undefined);

// Provider props
interface WarriorStatsProviderProps {
  children: ReactNode;
  initialWarriorId?: string;
}

// Provider component
export function WarriorStatsProvider({ children, initialWarriorId }: WarriorStatsProviderProps) {
  const supabase = createClientComponentClient<Database>();
  const { authState } = useAuth();
  
  const [warriorStats, setWarriorStats] = useState<WarriorStats | null>(null);
  const [topWarriors, setTopWarriors] = useState<WarriorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch a warrior's stats
  const fetchWarriorStats = async (warriorId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('warriors')
        .select('*, dojos(id, name)')
        .eq('id', warriorId)
        .single();
      
      if (fetchError) throw fetchError;
      
      setWarriorStats(data as unknown as WarriorStats);
    } catch (err) {
      console.error('Error fetching warrior stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error fetching warrior stats');
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch top warriors
  const fetchTopWarriors = async (limit: number = 10) => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('warriors')
        .select('id, name, avatar_url, power_level, rank, win_rate, specialty')
        .order('rank', { ascending: true })
        .limit(limit);
      
      if (fetchError) throw fetchError;
      
      setTopWarriors(data as WarriorStats[]);
    } catch (err) {
      console.error('Error fetching top warriors:', err);
      // Don't set error state here to avoid disrupting the UI if only this part fails
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh stats
  const refreshStats = async () => {
    if (warriorStats?.id) {
      await fetchWarriorStats(warriorStats.id);
    } else if (authState.warrior?.id) {
      await fetchWarriorStats(authState.warrior.id);
    } else if (initialWarriorId) {
      await fetchWarriorStats(initialWarriorId);
    }
    
    await fetchTopWarriors();
  };

  // Function to update a warrior's stats
  const updateStats = async (warriorId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call RPC function to update power and rank
      const { error: rpcError } = await supabase
        .rpc('update_warrior_power_level', { warrior_id: warriorId });
      
      if (rpcError) throw rpcError;
      
      // Refresh the stats
      await refreshStats();
    } catch (err) {
      console.error('Error updating warrior stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error updating warrior stats');
    } finally {
      setLoading(false);
    }
  };

  // Function to regenerate energy
  const regenerateEnergy = async (warriorId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call RPC function to regenerate energy
      const { data, error: rpcError } = await supabase
        .rpc('regenerate_warrior_energy', { p_warrior_id: warriorId });
      
      if (rpcError) throw rpcError;
      
      return data as number | null;
    } catch (err) {
      console.error('Error regenerating warrior energy:', err);
      setError(err instanceof Error ? err.message : 'Unknown error regenerating warrior energy');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Function to perform daily check-in
  const dailyCheckIn = async (warriorId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call RPC function to perform daily check-in
      const { data, error: rpcError } = await supabase
        .rpc('warrior_daily_check_in', { p_warrior_id: warriorId });
      
      if (rpcError) throw rpcError;
      
      return data as boolean;
    } catch (err) {
      console.error('Error performing daily check-in:', err);
      setError(err instanceof Error ? err.message : 'Unknown error performing daily check-in');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Function to spend energy
  const spendEnergy = async (warriorId: string, amount: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call RPC function to spend energy
      const { data, error: rpcError } = await supabase
        .rpc('spend_warrior_energy', { 
          p_warrior_id: warriorId, 
          p_amount: amount 
        });
      
      if (rpcError) throw rpcError;
      
      return data as boolean;
    } catch (err) {
      console.error('Error spending warrior energy:', err);
      setError(err instanceof Error ? err.message : 'Unknown error spending warrior energy');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      // Determine which warrior to fetch
      let warriorIdToFetch = initialWarriorId;
      
      if (!warriorIdToFetch && authState.warrior?.id) {
        warriorIdToFetch = authState.warrior.id;
      }
      
      if (warriorIdToFetch) {
        await fetchWarriorStats(warriorIdToFetch);
      }
      
      await fetchTopWarriors();
    };
    
    fetchInitialData();
  }, [initialWarriorId, authState.warrior?.id]);

  // Context value
  const value: WarriorStatsContextValue = {
    warriorStats,
    topWarriors,
    loading,
    error,
    refreshStats,
    updateStats,
    regenerateEnergy,
    dailyCheckIn,
    spendEnergy
  };

  return (
    <WarriorStatsContext.Provider value={value}>
      {children}
    </WarriorStatsContext.Provider>
  );
}

// Custom hook to use the context
export function useWarriorStats() {
  const context = useContext(WarriorStatsContext);
  
  if (context === undefined) {
    throw new Error('useWarriorStats must be used within a WarriorStatsProvider');
  }
  
  return context;
}
