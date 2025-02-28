'use client';

import React, { useEffect, useState } from 'react';
import { Sword, Users, Trophy, Scroll, Building2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import Navbar from '@/components/Navbar';

interface Warrior {
  id: string;
  name: string;
  power_level: number;
  rank: number;
  avatar_url: string | null;
  dojo: {
    name: string;
  } | null;
}

interface Dojo {
  id: string;
  name: string;
  location: string;
  warrior_count: number;
  banner_url: string | null;
}

interface Tournament {
  id: string;
  title: string;
  start_date: string;
  prize_pool: any;
  max_participants: number;
  participant_count: number;
}

export default function Dashboard() {
  const { authState } = useAuth();
  const supabase = createClientComponentClient<Database>();
  
  const [warriors, setWarriors] = useState<Warrior[]>([]);
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch top warriors
        const { data: warriorsData, error: warriorsError } = await supabase
          .from('warriors')
          .select(`
            id,
            name,
            power_level,
            rank,
            avatar_url,
            dojo:dojos(name)
          `)
          .order('rank', { ascending: false })
          .limit(5);

        if (warriorsError) throw warriorsError;

        // Fetch top dojos
        const { data: dojosData, error: dojosError } = await supabase
          .from('dojos')
          .select(`
            id,
            name,
            location,
            banner_url,
            warrior_count:warriors(count)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (dojosError) throw dojosError;

        // Fetch upcoming tournaments
        const { data: tournamentsData, error: tournamentsError } = await supabase
          .from('tournaments')
          .select(`
            id,
            title,
            start_date,
            prize_pool,
            max_participants,
            participant_count:tournament_participants(count)
          `)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(3);

        if (tournamentsError) throw tournamentsError;

        setWarriors(warriorsData || []);
        setDojos(dojosData || []);
        setTournaments(tournamentsData || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-pulse text-2xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-[url('/images/japanese-pattern.png')] bg-repeat">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/90 to-gray-900/50"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            ナカモト リーグ
          </h1>
          <p className="mt-4 text-xl text-gray-300">
            Welcome to the Nakamoto League - Where Digital Warriors Forge Their Legacy
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Tournaments Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Active Tournaments
            </h2>
            <a href="/tournaments" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              View All →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-indigo-500 transition-colors"
              >
                <h3 className="text-xl font-semibold mb-2">{tournament.title}</h3>
                <div className="space-y-2 text-gray-400">
                  <p>Starts: {new Date(tournament.start_date).toLocaleDateString()}</p>
                  <p>Prize Pool: {tournament.prize_pool.total} ETH</p>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Participants</span>
                      <span>{tournament.participant_count}/{tournament.max_participants}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-indigo-500 rounded-full h-2"
                        style={{
                          width: `${(tournament.participant_count / tournament.max_participants) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Warriors Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sword className="h-6 w-6 text-red-500" />
              Top Warriors
            </h2>
            <a href="/warriors" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              View All →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="pb-3 px-6">Rank</th>
                  <th className="pb-3 px-6">Warrior</th>
                  <th className="pb-3 px-6">Dojo</th>
                  <th className="pb-3 px-6">Power Level</th>
                </tr>
              </thead>
              <tbody>
                {warriors.map((warrior, index) => (
                  <tr
                    key={warrior.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-4 px-6">#{index + 1}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {warrior.avatar_url ? (
                          <img
                            src={warrior.avatar_url}
                            alt={warrior.name}
                            className="w-10 h-10 rounded-full bg-gray-700"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                            <Sword className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        {warrior.name}
                      </div>
                    </td>
                    <td className="py-4 px-6">{warrior.dojo?.name || 'Independent'}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-500">{warrior.power_level}</span>
                        <Scroll className="w-4 h-4 text-yellow-500" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Dojos Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-500" />
              Top Dojos
            </h2>
            <a href="/dojos" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              View All →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dojos.map((dojo) => (
              <div
                key={dojo.id}
                className="group relative overflow-hidden rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500 transition-colors"
              >
                <div className="h-32 overflow-hidden">
                  {dojo.banner_url ? (
                    <img
                      src={dojo.banner_url}
                      alt={dojo.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-gray-700 to-gray-600 flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{dojo.name}</h3>
                  <div className="text-gray-400">
                    <p className="mb-2">{dojo.location}</p>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{dojo.warrior_count} Warriors</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}