'use client';

import React, { useState, useEffect } from 'react';
import { Sword, Shield, Trophy, Zap, Users, Calendar, ArrowRight, Clock, MapPin, Eye, Check, Award } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/providers/AuthProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { usePermissions } from '@/hooks/usePermissions';

// Import the AuthState type from AuthProvider
import type { AuthState } from '@/providers/AuthProvider';

interface Tournament {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  format: string;
  entry_fee: number;
  prize_pool: {
    amount: number;
    currency: string;
  };
  banner_url: string | null;
  participant_count: number;
  max_participants: number;
}

interface Battle {
  id: string;
  status: string;
  challenger: {
    name: string;
    avatar_url: string | null;
  };
  defender: {
    name: string;
    avatar_url: string | null;
  };
  created_at: string;
  metadata: any;
}

interface Dojo {
  id: string;
  name: string;
  location: string;
  banner_url: string | null;
  member_count: number;
}

export default function Dashboard() {
  const { authState, setAuthState } = useAuth();
  const { isWarrior, isDojo, canCreateTournament, canCreateDojo, canCreateBattle, canJoinTournament, canJoinDojo, canJoinBattle } = usePermissions();
  const supabase = createClientComponentClient<Database>();
  
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [recentBattles, setRecentBattles] = useState<Battle[]>([]);
  const [popularDojos, setPopularDojos] = useState<Dojo[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeTournaments: 0,
    activeWarriors: 0,
    totalBattles: 0,
    totalDojos: 0
  });
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Calculate days between two dates
  const getDaysBetween = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getExpPercentage = (experience: number, level: number) => {
    const nextLevelExp = getNextLevelExp(level);
    return Math.min((experience / nextLevelExp) * 100, 100);
  };

  const getNextLevelExp = (level: number) => {
    return level * 100;
  };

  useEffect(() => {
    async function fetchDashboardData() {
      if (!authState.user) return;
      
      try {
        setLoading(true);
        
        // Fetch active tournaments
        const { data: tournaments, error: tournamentsError } = await supabase
          .from('tournaments')
          .select(`
            id, title, start_date, end_date, format, 
            entry_fee, prize_pool, banner_url, max_participants
          `)
          .gt('end_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(3);
          
        if (tournamentsError) throw tournamentsError;
        
        // Get participant counts for active tournaments
        const tournamentIds = tournaments?.map(t => t.id) || [];
        let participantCounts: Record<string, number> = {};
        
        if (tournamentIds.length > 0) {
          const { data: participantsData } = await supabase
            .from('tournament_participants')
            .select('tournament_id')
            .in('tournament_id', tournamentIds);
            
          // Count participants per tournament
          participantsData?.forEach(p => {
            participantCounts[p.tournament_id] = (participantCounts[p.tournament_id] || 0) + 1;
          });
        }
        
        // Add participant counts to tournaments
        const tournamentsWithCounts = tournaments?.map(t => ({
          ...t,
          participant_count: participantCounts[t.id] || 0
        })) || [];
        
        setActiveTournaments(tournamentsWithCounts);
        
        // Fetch recent battles
        let query = supabase
          .from('battles')
          .select(`
            id, status, created_at, metadata,
            challenger:warriors!challenger_id (name, avatar_url),
            defender:warriors!defender_id (name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(5);
          
        // If user has a warrior, filter to show their battles
        if (authState.warrior) {
          query = query.or(`challenger_id.eq.${authState.warrior.id},defender_id.eq.${authState.warrior.id}`);
        }
        
        const { data: battles, error: battlesError } = await query;
        if (battlesError) throw battlesError;
        
        setRecentBattles(battles || []);
        
        // Fetch popular dojos
        const { data: dojos, error: dojosError } = await supabase
          .from('dojos')
          .select(`
            id, name, location, banner_url
          `)
          .order('created_at', { ascending: false })
          .limit(4);
          
        if (dojosError) throw dojosError;
        
        // Get member counts for each dojo
        const dojoIds = dojos?.map(d => d.id) || [];
        let memberCounts: Record<string, number> = {};
        
        if (dojoIds.length > 0) {
          const { data: membersData } = await supabase
            .from('warriors')
            .select('dojo_id')
            .in('dojo_id', dojoIds);
            
          // Count members per dojo
          membersData?.forEach(m => {
            memberCounts[m.dojo_id!] = (memberCounts[m.dojo_id!] || 0) + 1;
          });
        }
        
        // Add member counts to dojos
        const dojosWithCounts = dojos?.map(d => ({
          ...d,
          member_count: memberCounts[d.id] || 0
        })) || [];
        
        setPopularDojos(dojosWithCounts);
        
        // Fetch platform stats
        const [{count: tournamentCount}, {count: warriorCount}, {count: battleCount}, {count: dojoCount}] = await Promise.all([
          supabase.from('tournaments').select('*', { count: 'exact', head: true })
            .gt('end_date', new Date().toISOString()),
          supabase.from('warriors').select('*', { count: 'exact', head: true }),
          supabase.from('battles').select('*', { count: 'exact', head: true }),
          supabase.from('dojos').select('*', { count: 'exact', head: true })
        ]);
        
        setStats({
          activeTournaments: tournamentCount || 0,
          activeWarriors: warriorCount || 0,
          totalBattles: battleCount || 0,
          totalDojos: dojoCount || 0
        });
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, [supabase, authState.user, authState.warrior]);

  const handleDailyCheckIn = async () => {
    if (!authState.warrior) return;
    
    setCheckInLoading(true);
    try {
      // Call the warrior_daily_check_in function we created in the SQL migration
      const { data, error } = await supabase
        .rpc('warrior_daily_check_in', { 
          p_warrior_id: authState.warrior.id 
        });
        
      if (error) throw error;
      
      // Refresh warrior data to get updated energy and last_check_in
      const { data: warriorData, error: warriorError } = await supabase
        .from('warriors')
        .select('*')
        .eq('id', authState.warrior.id)
        .single();
        
      if (warriorError) throw warriorError;
      
      // Update the local state with the new data
      setAuthState((prev: AuthState) => ({
        ...prev,
        warrior: {
          ...prev.warrior!,
          energy: warriorData.energy,
          last_check_in: warriorData.last_check_in
        }
      }));
    } catch (error) {
      console.error('Error checking in:', error);
    } finally {
      setCheckInLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6 mt-16">
          {/* Welcome Message */}
          <div className="p-6 bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Welcome, <span className="text-cyan">{authState.profile?.username || 'Warrior'}</span>
                </h1>
                <p className="text-gray-400">
                  {authState.warrior ? (
                    <>Your warrior <span className="text-purple">{authState.warrior.name}</span> awaits your command.</>
                  ) : (
                    <>You haven't created your warrior profile yet.</>
                  )}
                </p>
              </div>
              {!authState.warrior && (
                <Link
                  href="/dashboard/warriors/register"
                  className="mt-4 md:mt-0 neon-button-red px-4 py-2 text-white font-medium inline-flex items-center"
                >
                  Create Warrior Profile
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
          
          {/* Active Tournaments */}
          <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 overflow-hidden">
            <div className="border-b border-gray-800 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                <Trophy className="inline-block mr-2 text-yellow-500" size={20} />
                Active Tournaments
              </h2>
              <Link href="/tournaments" className="text-cyan hover:text-cyan-light text-sm transition-colors">
                View All
              </Link>
            </div>
            
            <div className="p-4">
              {activeTournaments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No active tournaments at the moment.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTournaments.map(tournament => (
                    <Link
                      key={tournament.id}
                      href={`/tournaments/${tournament.id}`}
                      className="block bg-gray-800/30 hover:bg-gray-800/50 border border-gray-800 rounded-md overflow-hidden transition-colors group"
                    >
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/4 h-32 md:h-auto relative">
                          <Image
                            src={tournament.banner_url || '/images/default-tournament.jpg'}
                            alt={tournament.title}
                            width={300}
                            height={200}
                            className="object-cover h-full w-full"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 to-gray-900/30 mix-blend-overlay"></div>
                        </div>
                        <div className="p-4 md:w-3/4 flex flex-col justify-between">
                          <div>
                            <h3 className="text-lg font-bold mb-2 text-white group-hover:text-cyan transition-colors">
                              {tournament.title}
                            </h3>
                            <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-400">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1.5 text-red" />
                                {formatDate(tournament.start_date)}
                              </div>
                              <div className="flex items-center">
                                <Trophy className="w-4 h-4 mr-1.5 text-yellow-500" />
                                {tournament.prize_pool.amount.toLocaleString()} {tournament.prize_pool.currency}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1.5 text-red" />
                                {getDaysBetween(new Date().toISOString(), tournament.end_date)} days left
                              </div>
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-1.5 text-red" />
                                {tournament.participant_count}/{tournament.max_participants} participants
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex justify-between items-center">
                            <span className="text-gray-400 text-sm">
                              {tournament.format.replace('_', ' ')}
                            </span>
                            <span className="text-sm text-cyan inline-flex items-center">
                              <span className="mr-1">Entry: {tournament.entry_fee > 0 ? `${tournament.entry_fee} credits` : 'Free'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {activeTournaments.length > 0 && (
                <div className="mt-4 text-center">
                  <Link href="/tournaments" className="inline-flex items-center text-cyan hover:text-cyan-light transition-colors text-sm">
                    View all tournaments
                    <ArrowRight className="ml-1 w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Recent Battles */}
          <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 overflow-hidden">
            <div className="border-b border-gray-800 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                <Sword className="inline-block mr-2 text-red" size={20} />
                Recent Battles
              </h2>
              {authState.warrior && (
                <Link href="/dashboard/battles" className="text-cyan hover:text-cyan-light text-sm transition-colors">
                  My Battles
                </Link>
              )}
            </div>
            
            <div className="p-4">
              {recentBattles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No recent battles to display.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBattles.map(battle => (
                    <Link
                      key={battle.id}
                      href={`/battles/${battle.id}`}
                      className="block bg-gray-800/30 hover:bg-gray-800/50 border border-gray-800 rounded-md p-4 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex items-center gap-2">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-red/30">
                              <Image 
                                src={battle.challenger.avatar_url || '/images/default-avatar.jpg'} 
                                alt={battle.challenger.name}
                                width={40}
                                height={40}
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <span className="text-white">{battle.challenger.name}</span>
                          </div>
                          
                          <span className="mx-3 text-gray-500">vs</span>
                          
                          <div className="flex items-center gap-2">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-cyan/30">
                              <Image 
                                src={battle.defender.avatar_url || '/images/default-avatar.jpg'} 
                                alt={battle.defender.name}
                                width={40}
                                height={40}
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <span className="text-white">{battle.defender.name}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium 
                            ${battle.status === 'PENDING' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' :
                              battle.status === 'IN_PROGRESS' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' :
                              battle.status === 'COMPLETED' ? 'bg-green-900/30 text-green-400 border border-green-500/30' :
                              'bg-red-900/30 text-red-400 border border-red-500/30'}`}
                          >
                            {battle.status.replace('_', ' ')}
                          </span>
                          <span className="text-gray-400 text-sm hidden md:inline">
                            {formatDate(battle.created_at)}
                          </span>
                          <Eye className="w-4 h-4 text-cyan" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {!authState.warrior ? (
                <div className="mt-6 text-center">
                  <Link href="/dashboard/warriors/register" className="neon-button-red px-4 py-2 text-white font-medium">
                    Create Your Warrior to Battle
                  </Link>
                </div>
              ) : (
                <div className="mt-6 text-center">
                  <Link href="/dashboard/battles/create" className="neon-button-red px-4 py-2 text-white font-medium">
                    Create New Battle
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Sidebar (1/3 width on large screens) */}
        <div className="space-y-6 mt-16">
          {/* Platform Stats */}
          <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <h2 className="text-lg font-bold text-white mb-4">Nakamoto League Stats</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 p-3 rounded-md">
                <h3 className="text-xs text-gray-400 mb-1">Active Tournaments</h3>
                <p className="text-2xl font-bold text-cyan">{stats.activeTournaments}</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-md">
                <h3 className="text-xs text-gray-400 mb-1">Active Warriors</h3>
                <p className="text-2xl font-bold text-red">{stats.activeWarriors}</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-md">
                <h3 className="text-xs text-gray-400 mb-1">Total Battles</h3>
                <p className="text-2xl font-bold text-purple">{stats.totalBattles}</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-md">
                <h3 className="text-xs text-gray-400 mb-1">Dojos</h3>
                <p className="text-2xl font-bold text-yellow-500">{stats.totalDojos}</p>
              </div>
            </div>
          </div>
          
          {/* Warrior Profile Card (if exists) */}
          {authState.warrior && (
            <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-purple-500/50">
                  <Image
                    src={authState.warrior.avatar_url || '/images/default-avatar.jpg'}
                    alt={authState.warrior.name}
                    width={64}
                    height={64}
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-purple-500/70 py-1 text-center text-xs text-white">
                    {authState.warrior.specialty.replace('_', ' ')}
                  </div>
                </div>
                
                <div>
                  <Link href={`/warriors/${authState.warrior.id}`} className="text-cyan hover:text-cyan-light text-sm transition-colors group" target="_blank">
                    <h3 className="text-xl font-bold text-white group-hover:text-shadow-cyan transition-all duration-300">{authState.warrior.name}</h3>
                  </Link>
                  <p className="text-gray-400 text-sm">Power Level: {authState.warrior.power_level}</p>
                  <p className="text-gray-400 text-sm">Rank: #{authState.warrior.rank}</p>
                </div>
              </div>
              
              {/* Energy Section */}
              <div className="bg-gray-800/30 rounded-lg p-3 mb-4 border border-cyan/20">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-cyan" />
                    <span className="text-white font-semibold">Energy</span>
                  </div>
                  <span className="text-cyan font-medium">
                    {authState.warrior.energy || 100}/{(authState.warrior.level || 1) * 100}
                  </span>
                </div>
                
                <div className="w-full bg-gray-800/70 rounded-full h-3 overflow-hidden mb-3">
                  <div 
                    className="bg-gradient-to-r from-cyan to-blue-400 h-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(((authState.warrior.energy || 100) / ((authState.warrior.level || 1) * 100)) * 100, 100)}%` }}
                  ></div>
                </div>
                
                <div className="text-xs text-gray-400 mb-3">
                  Energy regenerates over time and is used for battles and tournaments.
                </div>
                
                {/* Daily Check-in Button */}
                <button
                  onClick={handleDailyCheckIn}
                  disabled={checkInLoading || authState.warrior.last_check_in === new Date().toISOString().split('T')[0]}
                  className={`w-full py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                    authState.warrior.last_check_in === new Date().toISOString().split('T')[0]
                      ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan/80 to-blue-500/80 text-white hover:from-cyan hover:to-blue-400 hover:shadow-lg hover:shadow-cyan/20'
                  }`}
                >
                  {checkInLoading ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Processing...
                    </>
                  ) : authState.warrior.last_check_in === new Date().toISOString().split('T')[0] ? (
                    <>
                      <Check size={16} className="text-green-400" />
                      Already Checked In Today
                    </>
                  ) : (
                    <>
                      <Zap size={16} className="text-yellow-300" />
                      Daily Check-in (+50 Energy)
                    </>
                  )}
                </button>
              </div>
              
              {/* Experience Bar */}
              <div className="bg-gray-800/30 rounded-lg p-3 mb-4 border border-purple-500/20">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-purple-500" />
                    <span className="text-white font-semibold">Experience</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-purple-500 font-medium">Level {authState.warrior.level || 1}</span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-800/70 rounded-full h-3 overflow-hidden mb-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-300 h-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${getExpPercentage(authState.warrior.experience || 0, authState.warrior.level || 1)}%` 
                    }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">
                    {authState.warrior.experience || 0} XP
                  </span>
                  <span className="text-gray-400">
                    Next: {getNextLevelExp(authState.warrior.level || 1)} XP
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Top Dojos */}
          <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 overflow-hidden">
            <div className="border-b border-gray-800 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                <Shield className="inline-block mr-2 text-blue-500" size={20} />
                Popular Dojos
              </h2>
              <Link href="/dojos" className="text-cyan hover:text-cyan-light text-sm transition-colors">
                View All
              </Link>
            </div>
            
            <div className="p-4">
              {popularDojos.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  No dojos found.
                </div>
              ) : (
                <div className="space-y-3">
                  {popularDojos.map(dojo => (
                    <Link
                      key={dojo.id}
                      href={`/dojos/${dojo.id}`}
                      className="flex items-center p-2 hover:bg-gray-800/50 rounded-md transition-colors group"
                    >
                      <div className="relative w-12 h-12 rounded overflow-hidden mr-3 border border-blue-500/30">
                        <Image 
                          src={dojo.banner_url || '/images/default-dojo.jpg'}
                          alt={dojo.name}
                          width={48}
                          height={48}
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white group-hover:text-cyan transition-colors">
                          {dojo.name}
                        </p>
                        <div className="flex text-xs text-gray-400">
                          <span className="flex items-center mr-3">
                            <MapPin className="w-3 h-3 mr-1" />
                            {dojo.location || 'Unknown Location'}
                          </span>
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {dojo.member_count} warriors
                          </span>
                        </div>
                      </div>
                      <div className="cyber-badge-blue text-xs py-1">
                        Join
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {!authState.dojo && (
                <div className="mt-4 text-center">
                  <Link href="/dashboard/dojos/register" className="text-cyan hover:text-cyan-light text-sm transition-colors">
                    Register Your Own Dojo
                    <ArrowRight className="inline-block ml-1 w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 overflow-hidden">
            <div className="border-b border-gray-800 p-4">
              <h2 className="text-lg font-bold text-white">
                <Zap className="inline-block mr-2 text-yellow-500" size={20} />
                Quick Actions
              </h2>
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {isWarrior && (
                <>
                  {canJoinTournament && (
                    <Link href="/tournaments" className="action-card">
                      <Trophy size={24} className="text-yellow-500" />
                      <div>
                        <h3 className="text-white font-semibold">Join Tournament</h3>
                        <p className="text-gray-400 text-sm">Find and register for tournaments</p>
                      </div>
                    </Link>
                  )}
                  
                  {canJoinDojo && (
                    <Link href="/dojos" className="action-card">
                      <Shield size={24} className="text-purple-500" />
                      <div>
                        <h3 className="text-white font-semibold">Join Dojo</h3>
                        <p className="text-gray-400 text-sm">Find a dojo to train with</p>
                      </div>
                    </Link>
                  )}
                  
                  {canJoinBattle && (
                    <Link href="/battles" className="action-card">
                      <Sword size={24} className="text-red-500" />
                      <div>
                        <h3 className="text-white font-semibold">Join Battle</h3>
                        <p className="text-gray-400 text-sm">Find battles to participate in</p>
                      </div>
                    </Link>
                  )}
                </>
              )}
              
              {isDojo && (
                <>
                  {canCreateTournament && (
                    <Link href="/tournaments/create" className="action-card">
                      <Trophy size={24} className="text-yellow-500" />
                      <div>
                        <h3 className="text-white font-semibold">Create Tournament</h3>
                        <p className="text-gray-400 text-sm">Organize a new tournament</p>
                      </div>
                    </Link>
                  )}
                  
                  {canCreateBattle && (
                    <Link href="/battles/create" className="action-card">
                      <Sword size={24} className="text-red-500" />
                      <div>
                        <h3 className="text-white font-semibold">Create Battle</h3>
                        <p className="text-gray-400 text-sm">Challenge another dojo to battle</p>
                      </div>
                    </Link>
                  )}
                  
                  <Link href="/dashboard/warriors" className="action-card">
                    <Users size={24} className="text-blue-500" />
                    <div>
                      <h3 className="text-white font-semibold">Manage Warriors</h3>
                      <p className="text-gray-400 text-sm">View and manage your dojo's warriors</p>
                    </div>
                  </Link>
                </>
              )}
              
              <Link href="/profile" className="action-card">
                <Eye size={24} className="text-cyan" />
                <div>
                  <h3 className="text-white font-semibold">View Profile</h3>
                  <p className="text-gray-400 text-sm">See your public profile</p>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <h2 className="text-lg font-bold text-white mb-4">Quick Links</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <Link href="/tournaments" className="bg-gray-800/50 hover:bg-gray-800/80 p-3 rounded-lg flex flex-col items-center text-center transition-colors">
                <Trophy className="w-6 h-6 mb-2 text-yellow-500" />
                <span className="text-sm text-white">Tournaments</span>
              </Link>
              <Link href="/warriors" className="bg-gray-800/50 hover:bg-gray-800/80 p-3 rounded-lg flex flex-col items-center text-center transition-colors">
                <Sword className="w-6 h-6 mb-2 text-red" />
                <span className="text-sm text-white">Warriors</span>
              </Link>
              <Link href="/dojos" className="bg-gray-800/50 hover:bg-gray-800/80 p-3 rounded-lg flex flex-col items-center text-center transition-colors">
                <Shield className="w-6 h-6 mb-2 text-blue-500" />
                <span className="text-sm text-white">Dojos</span>
              </Link>
              <Link href="/dashboard/battles/create" className="bg-gray-800/50 hover:bg-gray-800/80 p-3 rounded-lg flex flex-col items-center text-center transition-colors">
                <Zap className="w-6 h-6 mb-2 text-purple" />
                <span className="text-sm text-white">New Battle</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {renderContent()}
      </div>
      <Footer />
    </>
  );
}