'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, ChevronDown, Trophy, Users, Calendar, Coins } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/providers/AuthProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import type { Database } from '@/lib/database.types';

interface Tournament {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS';
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

interface TournamentFilters {
  search?: string;
  status?: Tournament['status'];
  format?: Tournament['format'];
  sortBy: 'startDate' | 'prizePool' | 'participants';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

const TournamentsPage = () => {
  const router = useRouter();
  const { authState } = useAuth();
  const supabase = createClientComponentClient<Database>();
  
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<TournamentFilters>({
    sortBy: 'startDate',
    sortOrder: 'desc',
    limit: 9,
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [totalTournaments, setTotalTournaments] = useState(0);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('tournaments')
          .select('*, profiles(*)', { count: 'exact' });

        // Apply search filter
        if (searchTerm) {
          query = query.ilike('title', `%${searchTerm}%`);
        }

        // Apply status filter
        if (filters.status) {
          // Need to calculate status based on dates
          // This would ideally be done with database functions
          // For now, we'll fetch all and filter client-side
        }

        // Apply format filter
        if (filters.format) {
          query = query.eq('format', filters.format);
        }

        // Apply sorting
        if (filters.sortBy === 'startDate') {
          query = query.order('start_date', { ascending: filters.sortOrder === 'asc' });
        } else if (filters.sortBy === 'prizePool') {
          // Using JSONB path operator for sorting by prize amount
          query = query.order('prize_pool->amount', { ascending: filters.sortOrder === 'asc' });
        }
        // participants count sorting would need to be done client-side or with joins

        // Apply pagination
        const start = (filters.page - 1) * filters.limit;
        const end = start + filters.limit - 1;
        query = query.range(start, end);

        const { data, error: fetchError, count } = await query;

        if (fetchError) throw fetchError;

        // Get participant counts
        const tournamentIds = data?.map(t => t.id) || [];
        const { data: participantCounts, error: countError } = await supabase
          .from('tournament_participants')
          .select(`
            tournament_id,
            count:count(*)
          `)
          .in('tournament_id', tournamentIds)
          .group('tournament_id');

        if (countError) throw countError;

        // Map participant counts
        const countMap = new Map();
        participantCounts?.forEach(item => {
          countMap.set(item.tournament_id, parseInt(item.count));
        });

        // Transform to our Tournament interface
        const now = new Date();
        const transformedData: Tournament[] = data?.map(tournament => {
          const startDate = new Date(tournament.start_date);
          const endDate = new Date(tournament.end_date);
          
          let status: Tournament['status'];
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
            prize: tournament.prize_pool as Tournament['prize'],
            registrationDeadline: tournament.registration_deadline,
            maxParticipants: tournament.max_participants,
            currentParticipants: countMap.get(tournament.id) || 0,
            entryFee: tournament.entry_fee,
            organizer: {
              id: tournament.organizer_id,
              name: tournament.profiles?.username || 'Unknown',
              avatar: tournament.profiles?.avatar_url || '/images/default-avatar.jpg',
            },
            banner: tournament.banner_url || '/images/default-tournament.jpg',
          };
        }).filter(Boolean) as Tournament[];

        setTournaments(transformedData);
        setTotalTournaments(count || 0);
      } catch (err) {
        console.error('Error fetching tournaments:', err);
        setError('Failed to fetch tournaments');
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [supabase, searchTerm, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (key: keyof TournamentFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleLoadMore = () => {
    setFilters(prev => ({ ...prev, page: prev.page + 1 }));
  };

  const getStatusColor = (status: Tournament['status']) => {
    switch (status) {
      case 'UPCOMING':
        return 'text-blue-400 bg-blue-900/30 border-blue-500/50';
      case 'ONGOING':
        return 'text-green-400 bg-green-900/30 border-green-500/50';
      case 'COMPLETED':
        return 'text-purple-400 bg-purple-900/30 border-purple-500/50';
    }
  };

  const registerForTournament = async (tournamentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!authState.warrior) {
      router.push('/auth/login?redirect=/dashboard/warriors/register');
      return;
    }

    try {
      setError(null);
      
      const { error: registrationError } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          warrior_id: authState.warrior.id,
          registration_date: new Date().toISOString(),
          status: 'REGISTERED'
        });

      if (registrationError) throw registrationError;

      router.push(`/tournaments/${tournamentId}`);
    } catch (err) {
      console.error('Error registering for tournament:', err);
      setError(err instanceof Error ? err.message : 'Failed to register for tournament');
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mt-8 mb-8">
          {authState.user && authState.warrior && (
            <Link
              href="/dashboard/tournaments/create"
              className="px-4 py-2 cyber-gradient rounded-lg text-white hover:opacity-90 transition-opacity"
            >
              Create Tournament
            </Link>
          )}
        </div>

        <div className="mb-8">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search tournaments..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-purple-500/20 text-slate-200 focus:outline-none focus:border-purple-500/50"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-slate-800/50 border border-purple-500/20 rounded-lg flex items-center gap-2 hover:bg-slate-800/70 text-slate-300"
            >
              <Filter size={20} />
              Filters
              <ChevronDown size={16} className={showFilters ? 'rotate-180' : ''} />
            </button>
          </div>

          {showFilters && (
            <div className="p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-300">Status</label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                    className="w-full p-2 bg-slate-800/50 border border-purple-500/20 rounded-lg text-slate-200"
                  >
                    <option value="">All</option>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-300">Format</label>
                  <select
                    value={filters.format || ''}
                    onChange={(e) => handleFilterChange('format', e.target.value || undefined)}
                    className="w-full p-2 bg-slate-800/50 border border-purple-500/20 rounded-lg text-slate-200"
                  >
                    <option value="">All</option>
                    <option value="SINGLE_ELIMINATION">Single Elimination</option>
                    <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                    <option value="ROUND_ROBIN">Round Robin</option>
                    <option value="SWISS">Swiss</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-300">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value as any)}
                    className="w-full p-2 bg-slate-800/50 border border-purple-500/20 rounded-lg text-slate-200"
                  >
                    <option value="startDate">Start Date</option>
                    <option value="prizePool">Prize Pool</option>
                    <option value="participants">Participants</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/20 rounded-lg p-4 text-red-400 mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map(tournament => (
            <div
              key={tournament.id}
              className="bg-slate-800/50 rounded-lg shadow-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform border border-purple-500/20 hover:border-purple-500/40"
              onClick={() => router.push(`/tournaments/${tournament.id}`)}
            >
              <div className="relative h-48">
                <div className="w-full h-full relative">
                  <Image
                    src={tournament.banner || '/images/default-tournament.jpg'}
                    alt={tournament.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tournament.status)}`}>
                    {tournament.status}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent p-4">
                  <h3 className="text-white font-bold text-lg">{tournament.title}</h3>
                  <p className="text-gray-200 text-sm">
                    {tournament.format.replace('_', ' ')}
                  </p>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-300">
                      {format(new Date(tournament.startDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-300">
                      {tournament.currentParticipants}/{tournament.maxParticipants}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={20} className="text-yellow-500" />
                  <div>
                    <p className="font-bold text-lg text-slate-200">
                      {tournament.prize.amount.toLocaleString()} {tournament.prize.currency}
                    </p>
                    <p className="text-sm text-slate-400">{tournament.prize.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Coins size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-300">
                    Entry Fee: {tournament.entryFee > 0 ? `${tournament.entryFee} credits` : 'Free'}
                  </span>
                </div>

                {tournament.status === 'UPCOMING' && (
                  <button
                    onClick={(e) => registerForTournament(tournament.id, e)}
                    className="w-full cyber-gradient py-2 rounded pixel-corners text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    Register Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : tournaments.length < totalTournaments ? (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleLoadMore}
              className="px-6 py-2 bg-slate-800/50 border border-purple-500/20 rounded-lg text-purple-400 hover:bg-slate-800/70 transition-colors"
            >
              Load More
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default TournamentsPage;