'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, ChevronDown, Trophy, Users, Calendar, Coins } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/providers/AuthProvider';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import BitcoinLoader from '@/components/BitcoinLoader';
import { useTournament, type TournamentFilters } from '@/hooks/useTournament';
import { usePermissions } from '@/hooks/usePermissions';

const TournamentsPage = () => {
  const router = useRouter();
  const { authState } = useAuth();
  const { tournaments, tournamentCount, loadingTournaments, error, fetchTournaments } = useTournament();
  const { canCreateTournament, canJoinTournament } = usePermissions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<TournamentFilters>({
    sortBy: 'startDate',
    sortOrder: 'desc',
    limit: 9,
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTournaments(filters);
  }, [fetchTournaments, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
  };

  const handleFilterChange = (key: keyof TournamentFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleLoadMore = () => {
    setFilters(prev => ({ ...prev, page: prev.page + 1 }));
  };

  const getStatusColor = (status: 'UPCOMING' | 'ONGOING' | 'COMPLETED') => {
    switch (status) {
      case 'UPCOMING':
        return 'text-blue-400 bg-blue-900/30 border-blue-500/50';
      case 'ONGOING':
        return 'text-green-400 bg-green-900/30 border-green-500/50';
      case 'COMPLETED':
        return 'text-purple-400 bg-purple-900/30 border-purple-500/50';
    }
  };

  if (loadingTournaments && tournaments.length === 0) {
    return <BitcoinLoader />;
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Tournaments</h1>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <form onSubmit={handleSearchSubmit} className="flex gap-4 mb-4">
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
              type="submit"
              className="px-4 py-2 neon-button-red rounded-lg text-white"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-slate-800/50 border border-purple-500/20 rounded-lg flex items-center gap-2 hover:bg-slate-800/70 text-slate-300"
            >
              <Filter size={20} />
              Filters
              <ChevronDown size={16} className={showFilters ? 'rotate-180' : ''} />
            </button>
          </form>

          {showFilters && (
            <div className="mb-6 p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-300">Status</label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                    className="w-full p-2 bg-slate-800/50 border border-purple-500/20 rounded-lg text-slate-200"
                  >
                    <option value="">All Statuses</option>
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
                    <option value="">All Formats</option>
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
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-300">Sort Order</label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                    className="w-full p-2 bg-slate-800/50 border border-purple-500/20 rounded-lg text-slate-200"
                  >
                    <option value="desc">Highest First</option>
                    <option value="asc">Lowest First</option>
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

        {/* Tournament Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loadingTournaments && tournaments.length === 0 ? (
            <BitcoinLoader />
          ) : tournaments.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p className="text-slate-400 text-lg">No tournaments found matching your criteria.</p>
            </div>
          ) : (
            tournaments.map(tournament => (
              <div 
                key={tournament.id}
                className="bg-slate-800/50 border border-purple-500/20 rounded-lg overflow-hidden hover:border-purple-500/40 transition-all"
              >
                <div className="relative h-48 cursor-pointer" onClick={() => router.push(`/tournaments/${tournament.id}`)}>
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
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(tournament.status)}`}>
                      {tournament.status}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent p-4">
                    <h3 className="text-white font-bold text-lg">{tournament.title}</h3>
                    <p className="text-gray-300 text-sm">
                      {tournament.format.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="text-slate-300 text-sm">
                      {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={16} className="text-slate-400" />
                    <span className="text-slate-300 text-sm">
                      {tournament.currentParticipants} / {tournament.maxParticipants} participants
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Coins size={16} className="text-slate-400" />
                    <span className="text-slate-300 text-sm">
                      {tournament.prize.amount} {tournament.prize.currency} prize pool
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 relative rounded-full overflow-hidden">
                      <Image
                        src={tournament.organizer.avatar}
                        alt={tournament.organizer.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <span className="text-slate-300 text-sm">
                      Organized by {tournament.organizer.name}
                    </span>
                  </div>
                  
                  {tournament.status === 'UPCOMING' && canJoinTournament && (
                    <button
                      onClick={() => router.push(`/tournaments/${tournament.id}/register`)}
                      className="w-full py-2 neon-button-red rounded-lg text-white"
                    >
                      Join Tournament
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More Button */}
        {tournaments.length > 0 && tournaments.length < tournamentCount && (
          <div className="text-center mt-8">
            <button
              onClick={handleLoadMore}
              className="px-6 py-2 bg-slate-800/50 border border-purple-500/20 rounded-lg hover:bg-slate-800/70 text-slate-300"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default TournamentsPage;