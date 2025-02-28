import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import type { BattleStatus } from '@/lib/database.types';

export interface CreateBattleDTO {
  title?: string;
  description?: string;
  challengerId: string;
  defenderId: string;
  tournamentId?: string;
  scheduledFor?: string;
  battleData?: any;
}

export interface BattleSubmissionDTO {
  solutionUrl: string;
  notes?: string;
}

export interface BattleFilters {
  status?: BattleStatus;
  warriorId?: string;
  tournamentId?: string;
  page?: number;
  limit?: number;
}

export const battleService = {
  async createBattle(data: CreateBattleDTO, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Verify challenger is owned by the current user
      const { data: warrior, error: warriorError } = await supabase
        .from('warriors')
        .select('owner_id')
        .eq('id', data.challengerId)
        .single();

      if (warriorError) throw warriorError;
      
      if (warrior.owner_id !== userId) {
        throw new Error('Unauthorized: You can only create battles with your own warrior');
      }
      
      // Create the battle
      const { data: battle, error } = await supabase
        .from('battles')
        .insert({
          challenger_id: data.challengerId,
          defender_id: data.defenderId,
          tournament_id: data.tournamentId || null,
          status: 'PENDING',
          battle_data: data.battleData || {},
          scheduled_for: data.scheduledFor || null,
          metadata: {
            title: data.title,
            description: data.description
          }
        })
        .select()
        .single();

      if (error) throw error;
      
      // Create notification for defender
      await this.createBattleNotification(
        battle.id,
        battle.defender_id,
        'BATTLE_INVITATION',
        'You have been challenged to a battle!',
        `${data.title || 'A warrior'} has challenged you to a battle.`
      );
      
      return battle;
    } catch (error) {
      console.error('Error creating battle:', error);
      throw error;
    }
  },

  async getBattle(id: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      const { data: battle, error } = await supabase
        .from('battles')
        .select(`
          *,
          challenger:warriors!challenger_id (*),
          defender:warriors!defender_id (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Get submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from('battle_submissions')
        .select('*')
        .eq('battle_id', id);
        
      if (submissionsError) throw submissionsError;
      
      return {
        ...battle,
        submissions: submissions || []
      };
    } catch (error) {
      console.error('Error fetching battle:', error);
      throw error;
    }
  },

  async getBattles(filters: BattleFilters = {}) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      let query = supabase
        .from('battles')
        .select(`
          *,
          challenger:warriors!challenger_id (id, name, avatar_url),
          defender:warriors!defender_id (id, name, avatar_url)
        `, { count: 'exact' });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.tournamentId) {
        query = query.eq('tournament_id', filters.tournamentId);
      }
      
      if (filters.warriorId) {
        query = query.or(`challenger_id.eq.${filters.warriorId},defender_id.eq.${filters.warriorId}`);
      }

      // Apply pagination
      if (filters.page !== undefined && filters.limit) {
        const start = (filters.page - 1) * filters.limit;
        const end = start + filters.limit - 1;
        query = query.range(start, end);
      }

      // Default sorting
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;
      
      return {
        battles: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching battles:', error);
      throw error;
    }
  },

  async acceptBattle(battleId: string, warriorId: string, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Verify defender ownership
      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .select('defender_id, status, challenger_id')
        .eq('id', battleId)
        .single();

      if (battleError) throw battleError;
      
      if (battle.defender_id !== warriorId) {
        throw new Error('Unauthorized: Only the defender can accept this battle');
      }
      
      if (battle.status !== 'PENDING') {
        throw new Error('This battle cannot be accepted in its current state');
      }
      
      // Verify warrior ownership
      const { data: warrior, error: warriorError } = await supabase
        .from('warriors')
        .select('owner_id')
        .eq('id', warriorId)
        .single();

      if (warriorError) throw warriorError;
      
      if (warrior.owner_id !== userId) {
        throw new Error('Unauthorized: You can only accept battles with your own warrior');
      }
      
      // Update battle status
      const { data: updatedBattle, error } = await supabase
        .from('battles')
        .update({
          status: 'IN_PROGRESS',
          metadata: {
            ...battle.metadata,
            accepted_at: new Date().toISOString()
          }
        })
        .eq('id', battleId)
        .select()
        .single();

      if (error) throw error;
      
      // Create notification for challenger
      await this.createBattleNotification(
        battleId,
        battle.challenger_id,
        'BATTLE_ACCEPTED',
        'Your battle challenge was accepted!',
        'Your opponent has accepted your battle challenge.'
      );
      
      return updatedBattle;
    } catch (error) {
      console.error('Error accepting battle:', error);
      throw error;
    }
  },

  async declineBattle(battleId: string, warriorId: string, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Verify defender ownership
      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .select('defender_id, status, challenger_id')
        .eq('id', battleId)
        .single();

      if (battleError) throw battleError;
      
      if (battle.defender_id !== warriorId) {
        throw new Error('Unauthorized: Only the defender can decline this battle');
      }
      
      if (battle.status !== 'PENDING') {
        throw new Error('This battle cannot be declined in its current state');
      }
      
      // Verify warrior ownership
      const { data: warrior, error: warriorError } = await supabase
        .from('warriors')
        .select('owner_id')
        .eq('id', warriorId)
        .single();

      if (warriorError) throw warriorError;
      
      if (warrior.owner_id !== userId) {
        throw new Error('Unauthorized: You can only decline battles with your own warrior');
      }
      
      // Update battle status
      const { data: updatedBattle, error } = await supabase
        .from('battles')
        .update({
          status: 'CANCELLED',
          metadata: {
            ...battle.metadata,
            declined_at: new Date().toISOString()
          }
        })
        .eq('id', battleId)
        .select()
        .single();

      if (error) throw error;
      
      // Create notification for challenger
      await this.createBattleNotification(
        battleId,
        battle.challenger_id,
        'BATTLE_DECLINED',
        'Your battle challenge was declined',
        'Your opponent has declined your battle challenge.'
      );
      
      return updatedBattle;
    } catch (error) {
      console.error('Error declining battle:', error);
      throw error;
    }
  },

  async submitSolution(battleId: string, warriorId: string, submission: BattleSubmissionDTO, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Verify battle exists and is in progress
      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .select('challenger_id, defender_id, status')
        .eq('id', battleId)
        .single();

      if (battleError) throw battleError;
      
      if (battle.status !== 'IN_PROGRESS') {
        throw new Error('Cannot submit solution: battle is not in progress');
      }
      
      // Verify warrior is part of the battle
      if (battle.challenger_id !== warriorId && battle.defender_id !== warriorId) {
        throw new Error('Unauthorized: This warrior is not part of this battle');
      }
      
      // Verify warrior ownership
      const { data: warrior, error: warriorError } = await supabase
        .from('warriors')
        .select('owner_id')
        .eq('id', warriorId)
        .single();

      if (warriorError) throw warriorError;
      
      if (warrior.owner_id !== userId) {
        throw new Error('Unauthorized: You can only submit solutions with your own warrior');
      }
      
      // Check for existing submission
      const { data: existingSubmission, error: existingError } = await supabase
        .from('battle_submissions')
        .select('id')
        .eq('battle_id', battleId)
        .eq('warrior_id', warriorId)
        .maybeSingle();
        
      if (existingError) throw existingError;
      
      if (existingSubmission) {
        throw new Error('You have already submitted a solution for this battle');
      }
      
      // Create submission
      const { data: battleSubmission, error } = await supabase
        .from('battle_submissions')
        .insert({
          battle_id: battleId,
          warrior_id: warriorId,
          solution_url: submission.solutionUrl,
          notes: submission.notes || null,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      // Check if both warriors have submitted
      const { data: submissions, error: submissionsError } = await supabase
        .from('battle_submissions')
        .select('warrior_id')
        .eq('battle_id', battleId);
        
      if (submissionsError) throw submissionsError;
      
      // If both warriors have submitted, mark the battle as completed
      if (submissions?.length === 2) {
        const { error: updateError } = await supabase
          .from('battles')
          .update({
            status: 'COMPLETED',
            metadata: {
              ...battle.metadata,
              completed_at: new Date().toISOString()
            }
          })
          .eq('id', battleId);
          
        if (updateError) throw updateError;
        
        // Notify both warriors
        const otherWarriorId = warriorId === battle.challenger_id ? battle.defender_id : battle.challenger_id;
        
        await this.createBattleNotification(
          battleId,
          otherWarriorId,
          'BATTLE_COMPLETED',
          'Battle completed',
          'Both warriors have submitted their solutions. The battle is now completed.'
        );
        
        await this.createBattleNotification(
          battleId,
          warriorId,
          'BATTLE_COMPLETED',
          'Battle completed',
          'Both warriors have submitted their solutions. The battle is now completed.'
        );
      } else {
        // Notify the other warrior
        const otherWarriorId = warriorId === battle.challenger_id ? battle.defender_id : battle.challenger_id;
        
        await this.createBattleNotification(
          battleId,
          otherWarriorId,
          'BATTLE_SUBMISSION',
          'Opponent submitted a solution',
          'Your opponent has submitted their solution. It\'s your turn to submit!'
        );
      }
      
      return battleSubmission;
    } catch (error) {
      console.error('Error submitting solution:', error);
      throw error;
    }
  },

  async rateBattle(battleId: string, winnerId: string, userId: string, notes?: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Verify battle exists and is completed
      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .select('challenger_id, defender_id, status, tournament_id')
        .eq('id', battleId)
        .single();

      if (battleError) throw battleError;
      
      if (battle.status !== 'COMPLETED') {
        throw new Error('Cannot rate battle: battle is not completed');
      }
      
      // Verify the winner is part of the battle
      if (battle.challenger_id !== winnerId && battle.defender_id !== winnerId) {
        throw new Error('Invalid winner: This warrior is not part of this battle');
      }
      
      // Check if it's a tournament battle, in which case only the organizer can rate
      if (battle.tournament_id) {
        const { data: tournament, error: tournamentError } = await supabase
          .from('tournaments')
          .select('organizer_id')
          .eq('id', battle.tournament_id)
          .single();
          
        if (tournamentError) throw tournamentError;
        
        if (tournament.organizer_id !== userId) {
          throw new Error('Unauthorized: Only the tournament organizer can rate this battle');
        }
      } else {
        // For non-tournament battles, either participant can rate
        const { data: warrior, error: warriorError } = await supabase
          .from('warriors')
          .select('owner_id')
          .in('id', [battle.challenger_id, battle.defender_id])
          .eq('owner_id', userId);
          
        if (warriorError) throw warriorError;
        
        if (!warrior || warrior.length === 0) {
          throw new Error('Unauthorized: Only battle participants can rate this battle');
        }
      }
      
      // Update battle with the winner
      const { data: updatedBattle, error } = await supabase
        .from('battles')
        .update({
          winner_id: winnerId,
          metadata: {
            ...battle.metadata,
            rated_at: new Date().toISOString(),
            rated_by: userId,
            notes: notes || null
          }
        })
        .eq('id', battleId)
        .select()
        .single();

      if (error) throw error;
      
      // Update warrior stats (power level, etc.)
      await this.updateWarriorStats(winnerId, true);
      const loserId = winnerId === battle.challenger_id ? battle.defender_id : battle.challenger_id;
      await this.updateWarriorStats(loserId, false);
      
      // Create notifications
      await this.createBattleNotification(
        battleId,
        battle.challenger_id,
        'BATTLE_RATED',
        'Battle results are in',
        `The winner has been declared: ${winnerId === battle.challenger_id ? 'You won!' : 'Your opponent won.'}`
      );
      
      await this.createBattleNotification(
        battleId,
        battle.defender_id,
        'BATTLE_RATED',
        'Battle results are in',
        `The winner has been declared: ${winnerId === battle.defender_id ? 'You won!' : 'Your opponent won.'}`
      );
      
      return updatedBattle;
    } catch (error) {
      console.error('Error rating battle:', error);
      throw error;
    }
  },

  async updateWarriorStats(warriorId: string, isWinner: boolean) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Get warrior's current stats
      const { data: warrior, error: warriorError } = await supabase
        .from('warriors')
        .select('power_level, rank')
        .eq('id', warriorId)
        .single();
        
      if (warriorError) throw warriorError;
      
      // Calculate new power level and rank
      const powerIncrease = isWinner ? 20 : 5;
      const rankChange = isWinner ? -10 : 5; // Negative means better rank (1 is top)
      
      const newPowerLevel = warrior.power_level + powerIncrease;
      const newRank = Math.max(1, warrior.rank + rankChange); // Rank can't go below 1
      
      // Update warrior
      const { error } = await supabase
        .from('warriors')
        .update({
          power_level: newPowerLevel,
          rank: newRank
        })
        .eq('id', warriorId);
        
      if (error) throw error;
      
    } catch (error) {
      console.error('Error updating warrior stats:', error);
      throw error;
    }
  },

  async createBattleNotification(
    battleId: string,
    warriorId: string,
    type: string,
    title: string,
    message: string
  ) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Get warrior's owner
      const { data: warrior, error: warriorError } = await supabase
        .from('warriors')
        .select('owner_id')
        .eq('id', warriorId)
        .single();
        
      if (warriorError) throw warriorError;
      
      // Create notification
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: warrior.owner_id,
          title,
          message,
          type,
          read: false,
          metadata: {
            battle_id: battleId,
            warrior_id: warriorId
          }
        });
        
      if (error) throw error;
      
    } catch (error) {
      console.error('Error creating notification:', error);
      // Don't throw here, as this is a secondary operation
    }
  }
}