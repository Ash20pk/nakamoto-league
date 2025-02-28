'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Users, MapPin, ExternalLink, Zap, Shield, Search, Filter } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import type { Database } from '@/lib/database.types';

interface Dojo {
  id: string;
  name: string;
  location: string;
  rank?: number;
  powerLevel: number;
  totalWarriors: number;
  winRate: number;
  specialization: string;
  banner: string;
}

interface DojoFilters {
  search?: string;
  sortBy: 'rank' | 'powerLevel' | 'totalWarriors' | 'winRate';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

const DojosPage = () => {
  const router = useRouter();
  const { authState } = useAuth();
  const supabase = createClientComponentClient<Database>();
  
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<DojoFilters>({
    sortBy: 'rank',
    sortOrder: 'desc',
    limit: 9,
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [totalDojos, setTotalDojos] = useState(0);

  useEffect(() => {
    const fetchDojos = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('dojos')
          .select('*', { count: 'exact' });

        // Apply search filter
        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }

        // Apply sorting
        query = query.order('created_at', { ascending: false });

        // Apply pagination
        const start = (filters.page - 1) * filters.limit;
        const end = start + filters.limit - 1;
        query = query.range(start, end);

        const { data, error: fetchError, count } = await query;

        if (fetchError) throw fetchError;

        // Get warrior counts for each dojo
        const dojoIds = data?.map(dojo => dojo.id) || [];
        const { data: warriorCounts, error: countError } = await supabase
          .from('warriors')
          .select(`
            dojo_id,
            count:count(*)
          `)
          .in('dojo_id', dojoIds)
          .group('dojo_id');

        if (countError) throw countError;

        // Map warrior counts to dojos
        const countMap = new Map();
        warriorCounts?.forEach(item => {
          countMap.set(item.dojo_id, parseInt(item.count));
        });

        // Transform data to match our Dojo interface
        const transformedData: Dojo[] = data?.map((dojo, index) => ({
          id: dojo.id,
          name: dojo.name,
          location: dojo.location || 'Unknown Location',
          rank: index + 1,
          powerLevel: Math.floor(Math.random() * 1000) + 1500, // Placeholder
          totalWarriors: countMap.get(dojo.id) || 0,
          winRate: Math.floor(Math.random() * 50) + 50, // Placeholder
          specialization: dojo.description?.split(' ')[0] || 'Mixed',
          banner: dojo.banner_url || '/images/default-dojo.jpg'
        })) || [];

        setDojos(transformedData);
        setTotalDojos(count || 0);
      } catch (err) {
        console.error('Error fetching dojos:', err);
        setError('Failed to fetch dojos');
      } finally {
        setLoading(false);
      }
    };

    fetchDojos();
  }, [supabase, searchTerm, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (key: keyof DojoFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleLoadMore = () => {
    setFilters(prev => ({ ...prev, page: prev.page + 1 }));
  };

  const PowerLevelBar: React.FC<{ level: number }> = ({ level }) => {
    const percentage = (level / 3000) * 100;
    return (
      <div className="relative w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="absolute h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-8 py-8">
        <div className="flex flex-col md:flex-row justify-end items-center mb-8 mt-12 gap-4">

          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
                placeholder="Search dojos..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>

            <button 
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-5 h-5 text-slate-400" />
            </button>

            {authState.user && (
              <Link
                href="/dashboard/dojos/register"
                className="px-6 py-2 cyber-badge-purple rounded-lg text-white hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Register Dojo
              </Link>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="mb-6 p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg">
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
                  <option value="totalWarriors">Total Warriors</option>
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

        {error && (
          <div className="bg-red-900/30 border border-red-500/20 rounded-lg p-4 text-red-400 mb-6">
            {error}
          </div>
        )}

        {loading && dojos.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-800/50 rounded-lg overflow-hidden border border-purple-500/20 animate-pulse">
                <div className="h-48 bg-slate-700/50" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-slate-700/50 rounded w-3/4" />
                  <div className="h-4 bg-slate-700/50 rounded w-1/2" />
                  <div className="h-4 bg-slate-700/50 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dojos.map((dojo) => (
                <Link
                  key={dojo.id}
                  href={`/dojos/${dojo.id}`}
                  className="bg-slate-800/50 rounded-lg overflow-hidden hover:bg-slate-700/50 transition-all duration-300 border border-purple-500/20 hover:border-purple-500/40 group"
                >
                  <div className="relative h-48">
                    <div className="w-full h-full relative">
                      <Image
                        src={dojo.banner}
                        alt={dojo.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent" />
                    
                    {dojo.rank && (
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 backdrop-blur-sm">
                        #{dojo.rank}
                      </div>
                    )}
                    
                    <div className="absolute bottom-4 left-4 right-4">
                      <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                        {dojo.name}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-slate-300">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-blue-400" />
                          <span>{dojo.totalWarriors.toLocaleString()} Warriors</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="w-4 h-4 text-yellow-400" />
                          <span>{dojo.winRate}% Win Rate</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>{dojo.location}</span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-slate-400">Specialization: {dojo.specialization}</span>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-purple-400" />
                          <span className="text-sm text-slate-400">Power Level</span>
                        </div>
                        <PowerLevelBar level={dojo.powerLevel} />
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-2xl font-bold text-purple-400">
                            {dojo.powerLevel.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1 text-purple-400 group-hover:translate-x-1 transition-transform">
                            <span className="text-sm font-medium">View Details</span>
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {dojos.length < totalDojos && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-slate-800/50 border border-purple-500/20 rounded-lg text-purple-400 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default DojosPage;