'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Search, Filter, ChevronDown, Sword, Trophy, Star, Zap } from 'lucide-react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { useWarrior } from '@/hooks/useWarrior';
import BitcoinLoader from '@/components/BitcoinLoader';

interface WarriorFilters {
  search?: string;
  sortBy: 'rank' | 'powerLevel' | 'winRate';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

interface WarriorMetadata {
  bio?: string;
  socialLinks?: {
    github?: string;
    twitter?: string;
    website?: string;
  };
  avatarBase64?: string;
}

declare module '@/hooks/useWarrior' {
  interface Warrior {
    metadata?: WarriorMetadata;
  }
}

const WarriorsPage = () => {
  const router = useRouter();
  const { authState } = useAuth();
  const { 
    warriors, 
    warriorCount, 
    loadingWarriors, 
    error, 
    fetchWarriors 
  } = useWarrior();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<WarriorFilters>({
    sortBy: 'rank',
    sortOrder: 'desc',
    limit: 12,
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchWarriors(filters);
  }, [fetchWarriors, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
  };

  const handleFilterChange = (key: keyof WarriorFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleLoadMore = () => {
    setFilters(prev => ({ ...prev, page: prev.page + 1 }));
  };

  const handleWarriorClick = (warriorId: string) => {
    router.push(`/warriors/${warriorId}`);
  };

  if (loadingWarriors && warriors.length === 0) {
    return <BitcoinLoader />;
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mt-16 mb-8">
          <h1 className="text-2xl font-bold text-white">Warriors</h1>
        </div>

        <div className="mb-8">
          <form onSubmit={handleSearchSubmit} className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search warriors..."
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
            <div className="p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-300">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value as any)}
                    className="w-full p-2 bg-slate-800/50 border border-purple-500/20 rounded-lg text-slate-200"
                  >
                    <option value="rank">Rank</option>
                    <option value="powerLevel">Power Level</option>
                    <option value="winRate">Win Rate</option>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loadingWarriors && warriors.length > 0 ? (
            <div className="flex justify-center items-center mt-8">
              <BitcoinLoader />
            </div>
          ) : warriors.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p className="text-slate-400 text-lg">No warriors found matching your criteria.</p>
            </div>
          ) : (
            warriors.map(warrior => (
              <div
                key={warrior.id}
                onClick={() => handleWarriorClick(warrior.id)}
                className="bg-slate-800/50 border border-purple-500/20 rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform hover:border-purple-500/40"
              >
                <div className="relative h-48">
                  <div className="w-full h-full relative">
                    <Image
                      src={warrior.avatar_url || '/images/default-avatar.png'}
                      alt={warrior.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent p-4">
                    <h3 className="text-white font-bold text-lg">{warrior.name}</h3>
                    <p className="text-gray-200 text-sm">{warrior.dojos?.name || 'Independent'}</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <Trophy size={16} className="text-yellow-500" />
                      <span className="text-sm text-slate-300">
                        {warrior.rank === 0 ? 'Unranked' : `Rank #${warrior.rank}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Sword size={16} className="text-blue-500" />
                      <span className="text-sm text-slate-300">Level {warrior.level || 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={16} className="text-purple-500" />
                      <span className="text-sm text-slate-300">
                        {warrior.win_rate ? warrior.win_rate.toFixed(1) : '0'}% Win Rate
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap size={16} className="text-cyan" />
                      <span className="text-sm text-slate-300">
                        {warrior.energy || 100} Energy
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {loadingWarriors && warriors.length > 0 ? (
          <div className="flex justify-center items-center mt-8">
            <BitcoinLoader />
          </div>
        ) : warriors.length > 0 && warriors.length < warriorCount ? (
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

export default WarriorsPage;