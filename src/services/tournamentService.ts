import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import type { TournamentFormat } from '@/lib/database.types';

export interface CreateTournamentDTO {
  title: string;
  description?: string;
  format: TournamentFormat;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxParticipants: number;
  entryFee?: number;
  prizePool: {
    amount: number;
    currency: string;
    description: string;
  };
  rules: string[];
  requirements?: {
    minRank?: number;
    minPowerLevel?: number;
    allowedSpecialties?: string[];
  };
  bannerUrl?: string;
}

export interface TournamentFilters {
  search?: string;
  status?: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  format?: TournamentFormat;
  organizerId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const tournamentService = {
  async createTournament(data: CreateTournamentDTO, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Create the tournament record
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .insert({
          title: data.title,
          description: data.description || null,
          organizer_id: userId,
          format: data.format,
          start_date: data.startDate,
          end_date: data.endDate,
          registration_deadline: data.registrationDeadline,
          max_participants: data.maxParticipants,
          entry_fee: data.entryFee || 0,
          prize_pool: data.prizePool,
          rules: data.rules,
          requirements: data.requirements || {},
          banner_url: data.bannerUrl || null
        })
        .select()
        .single();

      if (error) throw error;
      return tournament;
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  },

  async uploadTournamentBanner(file: File, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `tournament-banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading banner:', error);
      throw error;
    }
  },

  async getTournament(id: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*, profiles(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Get participants count
      const { count, error: countError } = await supabase
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', id);
        
      if (countError) throw countError;
      
      return {
        ...tournament,
        currentParticipants: count || 0
      };
    } catch (error) {
      console.error('Error fetching tournament:', error);
      throw error;
    }
  },

  async getTournaments(filters: TournamentFilters = {}) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      let query = supabase
        .from('tournaments')
        .select('*, profiles(*)', { count: 'exact' });

      // Apply search filter
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      // Apply format filter
      if (filters.format) {
        query = query.eq('format', filters.format);
      }

      // Apply organizer filter
      if (filters.organizerId) {
        query = query.eq('organizer_id', filters.organizerId);
      }

      // Apply sorting
      if (filters.sortBy) {
        const order = { ascending: filters.sortOrder === 'asc' };
        
        if (filters.sortBy === 'startDate') {
          query = query.order('start_date', order);
        } else if (filters.sortBy === 'prizePool') {
          // Using JSONB path operator
          query = query.order('prize_pool->amount', order);
        } else {
          query = query.order('created_at', { ascending: false });
        }
      } else {
        // Default sorting
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (filters.page && filters.limit) {
        const start = (filters.page - 1) * filters.limit;
        const end = start + filters.limit - 1;
        query = query.range(start, end);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Get participant counts for each tournament
      const tournamentIds = data?.map(t => t.id) || [];
      let participantCounts = new Map();
      
      if (tournamentIds.length > 0) {
        const { data: participants, error: countError } = await supabase
          .from('tournament_participants')
          .select('tournament_id')
          .in('tournament_id', tournamentIds);
          
        if (countError) throw countError;
        
        // Count participants per tournament
        participants?.forEach(p => {
          const count = participantCounts.get(p.tournament_id) || 0;
          participantCounts.set(p.tournament_id, count + 1);
        });
      }
      
      // Process and filter by status if needed
      const now = new Date();
      const processedData = data?.map(tournament => {
        const startDate = new Date(tournament.start_date);
        const endDate = new Date(tournament.end_date);
        
        let status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
        if (now < startDate) status = 'UPCOMING';
        else if (now > endDate) status = 'COMPLETED';
        else status = 'ONGOING';
        
        // Filter by status if specified
        if (filters.status && status !== filters.status) {
          return null;
        }
        
        return {
          ...tournament,
          status,
          currentParticipants: participantCounts.get(tournament.id) || 0
        };
      }).filter(Boolean);
      
      return {
        tournaments: processedData || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      throw error;
    }
  },

  async updateTournament(id: string, data: Partial<CreateTournamentDTO>, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // First verify ownership
      const { data: existingTournament, error: fetchError } = await supabase
        .from('tournaments')
        .select('organizer_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      if (existingTournament.organizer_id !== userId) {
        throw new Error('Unauthorized: You can only update your own tournaments');
      }

      // Build the update object
      const updateData: any = {};
      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.format) updateData.format = data.format;
      if (data.startDate) updateData.start_date = data.startDate;
      if (data.endDate) updateData.end_date = data.endDate;
      if (data.registrationDeadline) updateData.registration_deadline = data.registrationDeadline;
      if (data.maxParticipants) updateData.max_participants = data.maxParticipants;
      if (data.entryFee !== undefined) updateData.entry_fee = data.entryFee;
      if (data.prizePool) updateData.prize_pool = data.prizePool;
      if (data.rules) updateData.rules = data.rules;
      if (data.requirements) updateData.requirements = data.requirements;
      if (data.bannerUrl) updateData.banner_url = data.bannerUrl;

      // Update the tournament
      const { data: updatedTournament, error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedTournament;
    } catch (error) {
      console.error('Error updating tournament:', error);
      throw error;
    }
  },

  async registerForTournament(tournamentId: string, warriorId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Check if registration is still open
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('registration_deadline, max_participants')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      
      const now = new Date();
      const deadline = new Date(tournament.registration_deadline);
      
      if (now > deadline) {
        throw new Error('Registration deadline has passed');
      }
      
      // Check if tournament is full
      const { count, error: countError } = await supabase
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);
        
      if (countError) throw countError;
      
      if (count && count >= tournament.max_participants) {
        throw new Error('Tournament is full');
      }
      
      // Check if warrior is already registered
      const { data: existingReg, error: regCheckError } = await supabase
        .from('tournament_participants')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('warrior_id', warriorId)
        .maybeSingle();
        
      if (regCheckError) throw regCheckError;
      
      if (existingReg) {
        throw new Error('Already registered for this tournament');
      }
      
      // Register for tournament
      const { data: registration, error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          warrior_id: warriorId,
          registration_date: new Date().toISOString(),
          status: 'REGISTERED'
        })
        .select()
        .single();

      if (error) throw error;
      return registration;
    } catch (error) {
      console.error('Error registering for tournament:', error);
      throw error;
    }
  },

  async withdrawFromTournament(tournamentId: string, warriorId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Check if tournament has started
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('start_date')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      
      const now = new Date();
      const startDate = new Date(tournament.start_date);
      
      if (now > startDate) {
        throw new Error('Cannot withdraw after tournament has started');
      }
      
      // Withdraw registration
      const { error } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('warrior_id', warriorId);

      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error withdrawing from tournament:', error);
      throw error;
    }
  },

  async getTournamentParticipants(tournamentId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select(`
          id, 
          registration_date, 
          status,
          warriors (
            id, 
            name, 
            avatar_url, 
            power_level, 
            rank,
            specialty,
            dojos (
              id,
              name
            )
          )
        `)
        .eq('tournament_id', tournamentId)
        .order('registration_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tournament participants:', error);
      throw error;
    }
  },

  async startTournament(tournamentId: string, userId: string) {
    const supabase = createClientComponentClient<Database>();
    
    try {
      // Verify ownership
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('organizer_id')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      
      if (tournament.organizer_id !== userId) {
        throw new Error('Unauthorized: Only the organizer can start the tournament');
      }
      
      // Get participants
      const { data: participants, error: participantError } = await supabase
        .from('tournament_participants')
        .select('warrior_id')
        .eq('tournament_id', tournamentId);
        
      if (participantError) throw participantError;
      
      if (!participants || participants.length < 2) {
        throw new Error('Tournament needs at least 2 participants to start');
      }
      
      // TODO: Create initial matches based on tournament format
      
      // Update tournament status (using a custom field or metadata)
      const { error } = await supabase
        .from('tournaments')
        .update({
          metadata: {
            status: 'ONGOING',
            started_at: new Date().toISOString()
          }
        })
        .eq('id', tournamentId);

      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error starting tournament:', error);
      throw error;
    }
  }
};