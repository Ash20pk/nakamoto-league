// src/hooks/useWinRate.ts
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

export function useWinRate() {
  const supabase = createClientComponentClient<Database>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculate and update the win rate for a warrior
   * @param warriorId The ID of the warrior to update
   * @returns The updated win rate or null if there was an error
   */
  const updateWinRate = async (warriorId: string): Promise<number | null> => {
    setLoading(true);
    setError(null);
    
    try {
      // Get all battles where the warrior participated
      const { data: battles, error: battlesError } = await supabase
        .from('battles')
        .select('*')
        .or(`challenger_id.eq.${warriorId},defender_id.eq.${warriorId}`)
        .eq('status', 'COMPLETED');
      
      if (battlesError) {
        throw battlesError;
      }
      
      // Calculate win rate
      const totalBattles = battles.length;
      const wonBattles = battles.filter(battle => battle.winner_id === warriorId).length;
      
      const winRate = totalBattles > 0 
        ? (wonBattles / totalBattles) * 100 
        : 0;
      
      // Update the warrior's win rate in the database
      const { error: updateError } = await supabase
        .from('warriors')
        .update({ win_rate: winRate })
        .eq('id', warriorId);
      
      if (updateError) {
        throw updateError;
      }
      
      return winRate;
    } catch (err) {
      console.error('Error updating win rate:', err);
      setError(err instanceof Error ? err.message : 'Unknown error updating win rate');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get the current win rate for a warrior
   * @param warriorId The ID of the warrior
   * @returns The current win rate or null if there was an error
   */
  const getWinRate = async (warriorId: string): Promise<number | null> => {
    try {
      const { data, error } = await supabase
        .from('warriors')
        .select('win_rate')
        .eq('id', warriorId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data?.win_rate ?? 0;
    } catch (err) {
      console.error('Error getting win rate:', err);
      setError(err instanceof Error ? err.message : 'Unknown error getting win rate');
      return null;
    }
  };

  /**
   * Update win rates for all warriors in the database
   * @returns True if successful, false otherwise
   */
  const updateAllWinRates = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Get all warriors
      const { data: warriors, error: warriorsError } = await supabase
        .from('warriors')
        .select('id');
      
      if (warriorsError) {
        throw warriorsError;
      }
      
      // Update win rate for each warrior
      for (const warrior of warriors) {
        await updateWinRate(warrior.id);
      }
      
      return true;
    } catch (err) {
      console.error('Error updating all win rates:', err);
      setError(err instanceof Error ? err.message : 'Unknown error updating all win rates');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateWinRate,
    getWinRate,
    updateAllWinRates,
    loading,
    error
  };
}

export default useWinRate;
