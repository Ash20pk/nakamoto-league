// src/hooks/useWarriorStats.ts
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

export function useWarriorStats() {
  const supabase = createClientComponentClient<Database>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update a warrior's power level and rank
   * @param warriorId The ID of the warrior to update
   * @returns The updated power level or null if there was an error
   */
  const updatePowerAndRank = async (warriorId: string): Promise<number | null> => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the database function to update power level and rank
      const { data, error: fnError } = await supabase
        .rpc('update_warrior_power_level', { warrior_id: warriorId });
      
      if (fnError) {
        throw fnError;
      }
      
      return data;
    } catch (err) {
      console.error('Error updating warrior stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error updating warrior stats');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get the current power level and rank for a warrior
   * @param warriorId The ID of the warrior
   * @returns The warrior's stats or null if there was an error
   */
  const getWarriorStats = async (warriorId: string): Promise<{ 
    power_level: number; 
    rank: number; 
    win_rate: number;
    experience?: number;
    level?: number;
    energy?: number;
    energy_last_updated?: string;
    last_check_in?: string;
  } | null> => {
    try {
      const { data, error } = await supabase
        .from('warriors')
        .select('power_level, rank, win_rate, experience, level, energy, energy_last_updated, last_check_in')
        .eq('id', warriorId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (err) {
      console.error('Error getting warrior stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error getting warrior stats');
      return null;
    }
  };

  /**
   * Update stats for all warriors in the database
   * @returns True if successful, false otherwise
   */
  const updateAllWarriorStats = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the database function to recalculate all ranks
      const { error: fnError } = await supabase
        .rpc('calculate_warrior_rank');
      
      if (fnError) {
        throw fnError;
      }
      
      return true;
    } catch (err) {
      console.error('Error updating all warrior stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error updating all warrior stats');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get the top ranked warriors
   * @param limit Number of warriors to return
   * @returns Array of top warriors or empty array if there was an error
   */
  const getTopWarriors = async (limit: number = 10): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from('warriors')
        .select('id, name, avatar_url, power_level, rank, win_rate')
        .order('rank', { ascending: true })
        .limit(limit);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (err) {
      console.error('Error getting top warriors:', err);
      setError(err instanceof Error ? err.message : 'Unknown error getting top warriors');
      return [];
    }
  };

  /**
   * Regenerate a warrior's energy
   * @param warriorId The ID of the warrior
   * @returns The updated energy value or null if there was an error
   */
  const regenerateEnergy = async (warriorId: string): Promise<number | null> => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the database function to regenerate energy
      const { data, error: fnError } = await supabase
        .rpc('regenerate_warrior_energy', { p_warrior_id: warriorId });
      
      if (fnError) {
        throw fnError;
      }
      
      return data;
    } catch (err) {
      console.error('Error regenerating warrior energy:', err);
      setError(err instanceof Error ? err.message : 'Unknown error regenerating warrior energy');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Perform daily check-in to receive energy bonus
   * @param warriorId The ID of the warrior
   * @returns True if check-in was successful, false otherwise
   */
  const dailyCheckIn = async (warriorId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the database function for daily check-in
      const { data, error: fnError } = await supabase
        .rpc('warrior_daily_check_in', { p_warrior_id: warriorId });
      
      if (fnError) {
        throw fnError;
      }
      
      return data;
    } catch (err) {
      console.error('Error performing daily check-in:', err);
      setError(err instanceof Error ? err.message : 'Unknown error performing daily check-in');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Spend warrior energy on an activity
   * @param warriorId The ID of the warrior
   * @param amount The amount of energy to spend
   * @returns True if energy was spent successfully, false if not enough energy
   */
  const spendEnergy = async (warriorId: string, amount: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the database function to spend energy
      const { data, error: fnError } = await supabase
        .rpc('spend_warrior_energy', { 
          p_warrior_id: warriorId,
          p_amount: amount
        });
      
      if (fnError) {
        throw fnError;
      }
      
      return data;
    } catch (err) {
      console.error('Error spending warrior energy:', err);
      setError(err instanceof Error ? err.message : 'Unknown error spending warrior energy');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    updatePowerAndRank,
    getWarriorStats,
    updateAllWarriorStats,
    getTopWarriors,
    regenerateEnergy,
    dailyCheckIn,
    spendEnergy,
    loading,
    error
  };
}

export default useWarriorStats;
