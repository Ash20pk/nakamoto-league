import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

export type TournamentStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';
export type TournamentFormat = 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS';

export interface Tournament {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  format: TournamentFormat;
  prize: {
    amount: number;
    currency: string;
    description: string;
  };
  registrationDeadline: string;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  organizer: {
    id: string;
    name: string;
    avatar: string;
  };
  banner?: string;
}

export interface TournamentFilters {
  search?: string;
  status?: TournamentStatus;
  format?: TournamentFormat;
  sortBy: 'startDate' | 'prizePool' | 'participants';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export function useTournament() {
  const supabase = createClientComponentClient<Database>();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentCount, setTournamentCount] = useState(0);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = useCallback(async (filters: TournamentFilters) => {
    try {
      setLoadingTournaments(true);
      setError(null);

      // Build the query with all necessary joins and counts in a single query
      let query = supabase
        .from('tournaments')
        .select(`
          *,
          dojos:organizer_id(*),
          participants:tournament_participants(count)
        `, { count: 'exact' });

      // Apply search filter
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      // Apply format filter
      if (filters.format) {
        query = query.eq('format', filters.format);
      }

      // Apply sorting
      if (filters.sortBy === 'startDate') {
        query = query.order('start_date', { ascending: filters.sortOrder === 'asc' });
      } else if (filters.sortBy === 'prizePool') {
        query = query.order('prize_pool->amount', { ascending: filters.sortOrder === 'asc' });
      } else if (filters.sortBy === 'participants') {
        // This is handled client-side after fetching data
      }

      // Apply pagination
      const start = (filters.page - 1) * filters.limit;
      const end = start + filters.limit - 1;
      query = query.range(start, end);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Transform to our Tournament interface
      const now = new Date();
      const transformedData: Tournament[] = data?.map(tournament => {
        const startDate = new Date(tournament.start_date);
        const endDate = new Date(tournament.end_date);
        
        let status: TournamentStatus;
        if (now < startDate) status = 'UPCOMING';
        else if (now > endDate) status = 'COMPLETED';
        else status = 'ONGOING';

        // Apply status filter client-side if needed
        if (filters.status && status !== filters.status) {
          return null; // Skip this tournament
        }

        return {
          id: tournament.id,
          title: tournament.title,
          description: tournament.description || '',
          startDate: tournament.start_date,
          endDate: tournament.end_date,
          status,
          format: tournament.format,
          prize: tournament.prize_pool,
          registrationDeadline: tournament.registration_deadline,
          maxParticipants: tournament.max_participants,
          currentParticipants: tournament.participants?.[0]?.count || 0,
          entryFee: tournament.entry_fee,
          organizer: {
            id: tournament.organizer_id,
            name: tournament.dojos?.name || 'Unknown Dojo',
            avatar: tournament.dojos?.banner_url || '/images/default-dojo.png',
          },
          banner: tournament.banner_url || '/images/default-tournament.jpg',
        };
      }).filter(Boolean) as Tournament[];

      // If sorting by participants count, do it client-side
      if (filters.sortBy === 'participants') {
        transformedData.sort((a, b) => {
          if (filters.sortOrder === 'asc') {
            return a.currentParticipants - b.currentParticipants;
          } else {
            return b.currentParticipants - a.currentParticipants;
          }
        });
      }

      setTournaments(transformedData);
      setTournamentCount(count || 0);
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      setError('Failed to fetch tournaments');
    } finally {
      setLoadingTournaments(false);
    }
  }, [supabase]);

  return {
    tournaments,
    tournamentCount,
    loadingTournaments,
    error,
    fetchTournaments
  };
}
