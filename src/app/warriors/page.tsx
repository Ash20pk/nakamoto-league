'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Search, Filter, ChevronDown, Sword, Trophy, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import type { Database } from '@/lib/database.types';

interface Warrior {
  id: string;
  name: string;
  avatar: string;
  rank: number;
  powerLevel: number;
  specialties: string[];
  dojoId?: string;
  dojoName?: string;
  winRate: number;
}

interface WarriorFilters {
  search?: string;
  specialty?: string;
  sortBy: 'rank' | 'powerLevel' | 'winRate';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

const WarriorsPage = () => {
  const router = useRouter();
  const { authState } = useAuth();
  const supabase = createClientComponentClient<Database>();
  
  const [warriors, setWarriors] = useState<Warrior[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<WarriorFilters>({
    sortBy: 'rank',
    sortOrder: 'desc',
    limit: 12,
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [totalWarriors, setTotalWarriors] = useState(0);

  const specialtyOptions = [
    'STRIKER',
    'GRAPPLER',
    'WEAPONS_MASTER',
    'MIXED',
  ];

  useEffect(() => {
    const fetchWarriors = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('warriors')
          .select('*, dojos(name)', { count: 'exact' });

        // Apply search filter
        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }

        // Apply specialty filter
        if (filters.specialty) {
          query = query.eq('specialty', filters.specialty);
        }

        // Apply sorting
        if (filters.sortBy === 'rank') {
          query = query.order('rank', { ascending: filters.sortOrder === 'asc' });
        } else if (filters.sortBy === 'powerLevel') {
          query = query.order('power_level', { ascending: filters.sortOrder === 'asc' });
        }
        // Note: winRate might need to be calculated from a join or other methods

        // Apply pagination
        const start = (filters.page - 1) * filters.limit;
        const end = start + filters.limit - 1;
        query = query.range(start, end);

        const { data, error: fetchError, count } = await query;

        if (fetchError) throw fetchError;

        // Transform data to match our Warrior interface
        const transformedData: Warrior[] = data?.map(warrior => ({
          id: warrior.id,
          name: warrior.name,
          avatar: warrior.avatar_url || `/images/default-avatar.jpg`,
          rank: warrior.rank,
          powerLevel: warrior.power_level,
          specialties: [warrior.specialty], // Convert specialty to array
          dojoId: warrior.dojo_id || undefined,
          dojoName: warrior.dojos?.name || 'Independent',
          winRate: Math.floor(Math.random() * 100), // Placeholder for win rate
        })) || [];

        setWarriors(transformedData);
        setTotalWarriors(count || 0);
      } catch (err) {
        console.error('Error fetching warriors:', err);
        setError('Failed to fetch warriors');
      } finally {
        setLoading(false);
      }
    };

    fetchWarriors();
  }, [supabase, searchTerm, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
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

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mt-8 mb-8">
        </div>

        <div className="mb-8">
          <div className="flex gap-4 mb-4">
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
          {warriors.map(warrior => (
            <div
              key={warrior.id}
              onClick={() => handleWarriorClick(warrior.id)}
              className="bg-slate-800/50 border border-purple-500/20 rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform hover:border-purple-500/40"
            >
              <div className="relative h-48">
                <div className="w-full h-full relative">
                  <Image
                    src={warrior.avatar}
                    alt={warrior.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent p-4">
                  <h3 className="text-white font-bold text-lg">{warrior.name}</h3>
                  <p className="text-gray-200 text-sm">{warrior.dojoName || 'Independent'}</p>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Trophy size={16} className="text-yellow-500" />
                    <span className="text-sm text-slate-300">Rank #{warrior.rank}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sword size={16} className="text-blue-500" />
                    <span className="text-sm text-slate-300">Power {warrior.powerLevel}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-4">
                  <Star size={16} className="text-purple-500" />
                  <span className="text-sm text-slate-300">{warrior.winRate}% Win Rate</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {warrior.specialties.map(specialty => (
                    <span
                      key={specialty}
                      className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded-full border border-purple-500/20 text-xs"
                    >
                      {specialty.replace('_', ' ')}
                    </span>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (authState.warrior) {
                      router.push(`/dashboard/battles/create?opponent=${warrior.id}`);
                    } else {
                      router.push('/auth/login?redirect=/dashboard/warriors/register');
                    }
                  }}
                  className="w-full cyber-gradient py-2 rounded pixel-corners text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Challenge
                </button>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : warriors.length < totalWarriors ? (
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