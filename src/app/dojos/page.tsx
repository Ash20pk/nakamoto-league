'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Users, MapPin, ExternalLink, Zap, Shield, Search, Filter, ChevronDown } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import BitcoinLoader from '@/components/BitcoinLoader';
import { useDojo, type DojoFilters } from '@/hooks/useDojo';
import { usePermissions } from '@/hooks/usePermissions';

const DojosPage = () => {
  const router = useRouter();
  const { authState } = useAuth();
  const { dojos, dojoCount, loadingDojos, error, fetchDojos } = useDojo();
  const { canCreateDojo, canJoinDojo } = usePermissions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<DojoFilters>({
    sortBy: 'rank',
    sortOrder: 'desc',
    limit: 9,
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [joiningDojo, setJoiningDojo] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    fetchDojos(filters);
  }, [fetchDojos, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
  };

  const handleFilterChange = (key: keyof DojoFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleLoadMore = () => {
    setFilters(prev => ({ ...prev, page: prev.page + 1 }));
  };

  // Join dojo function
  const joinDojo = async (dojoId: string) => {
    if (!authState.warrior) {
      router.push('/dashboard/warriors/register');
      return;
    }
    
    try {
      setJoiningDojo(dojoId);
      setJoinError(null);
      
      const response = await fetch(`/api/warriors/${authState.warrior.id}/dojo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dojoId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join dojo');
      }
      
      // Update local state
      if (authState.warrior) {
        authState.warrior.dojo_id = dojoId;
      }
      
      setJoinSuccess(dojoId);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setJoinSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error joining dojo:', error);
      setJoinError(error instanceof Error ? error.message : 'Failed to join dojo');
    } finally {
      setJoiningDojo(null);
    }
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

  if (loadingDojos && dojos.length === 0) {
    return <BitcoinLoader />;
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Dojos</h1>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <form onSubmit={handleSearchSubmit} className="flex gap-4 mb-8">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search dojos..."
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
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/20 rounded-lg p-4 text-red-400 mb-6">
            {error}
          </div>
        )}

        {/* Dojos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loadingDojos && dojos.length > 0 ? (
            // Loading skeletons
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-800/50 border border-purple-500/20 rounded-lg overflow-hidden animate-pulse">
                <div className="h-48 bg-slate-700/50"></div>
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-slate-700/50 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700/50 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-700/50 rounded w-2/3"></div>
                  <div className="h-10 bg-slate-700/50 rounded"></div>
                </div>
              </div>
            ))
          ) : dojos.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p className="text-slate-400 text-lg">No dojos found matching your criteria.</p>
            </div>
          ) : (
            dojos.map(dojo => (
              <div 
                key={dojo.id}
                className="bg-slate-800/50 border border-purple-500/20 rounded-lg overflow-hidden hover:border-purple-500/40 transition-all"
              >
                <div className="relative h-48 cursor-pointer" onClick={() => router.push(`/dojos/${dojo.id}`)}>
                  <div className="w-full h-full relative">
                    <Image
                      src={dojo.banner}
                      alt={dojo.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent p-4">
                    <h3 className="text-white font-bold text-lg">{dojo.name}</h3>
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin size={14} />
                      <span className="text-sm">{dojo.location}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-purple-400" />
                      <span className="text-slate-300 text-sm">Rank #{dojo.rank}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-slate-400" />
                      <span className="text-slate-300 text-sm">{dojo.totalWarriors} warriors</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-400">Power Level</span>
                      <span className="text-sm font-semibold text-slate-300">{dojo.powerLevel}</span>
                    </div>
                    <PowerLevelBar level={dojo.powerLevel} />
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-1">
                      <Zap size={16} className="text-yellow-500" />
                      <span className="text-slate-300 text-sm">Win Rate: {dojo.winRate}%</span>
                    </div>
                    <div className="px-2 py-1 bg-slate-800/70 rounded text-xs text-slate-300 border border-purple-500/20">
                      {dojo.specialization}
                    </div>
                  </div>
                  
                  {canJoinDojo ? (
                    <>
                      {authState.warrior?.dojo_id === dojo.id ? (
                        <div className="w-full py-2 bg-green-900/30 border border-green-500/20 rounded-lg text-green-400 text-sm text-center">
                          Member of this dojo
                        </div>
                      ) : (
                        <button
                          onClick={() => joinDojo(dojo.id)}
                          disabled={joiningDojo === dojo.id}
                          className="w-full py-2 neon-button-red rounded-lg text-white"
                        >
                          {joiningDojo === dojo.id ? (
                            <span className="animate-pulse">Joining...</span>
                          ) : (
                            "Join Dojo"
                          )}
                        </button>
                      )}
                      {joinSuccess === dojo.id && (
                        <div className="mt-2 text-green-400 text-xs text-center animate-fade-in">
                          Successfully joined dojo!
                        </div>
                      )}
                      {joinError && joiningDojo === dojo.id && (
                        <div className="mt-2 text-red-400 text-xs text-center">
                          {joinError}
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => router.push(`/dojos/${dojo.id}`)}
                      className="w-full py-2 bg-slate-800/70 border border-purple-500/20 rounded-lg hover:bg-slate-800/90 text-slate-300"
                    >
                      View Dojo
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More Button */}
        {dojos.length > 0 && dojos.length < dojoCount && (
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

export default DojosPage;