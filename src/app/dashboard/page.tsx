'use client';

import React, { useState, useEffect } from 'react';
import { Sword, Shield, Trophy, Zap, Users, Calendar, ArrowRight, Clock, MapPin, Eye, Check, Award, UserCircle, Camera, Building, Star, ChevronRight, Search, Flame, Shuffle, Book } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/providers/AuthProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BitcoinLoader from '@/components/BitcoinLoader';
import { usePermissions } from '@/hooks/usePermissions';
import { getEntityAvatar, fetchAndStoreRandomAvatar } from '@/utils/avatarUtils';
import { useArticles } from '@/hooks/useArticles';

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
  const { dailyStats, fetchDailyStats } = useArticles();
  
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [popularDojos, setPopularDojos] = useState<Dojo[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeTournaments: 0,
    activeWarriors: 0,
    totalDojos: 0
  });
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [warriorName, setWarriorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  
  // Game progression state
  const [userLevel, setUserLevel] = useState(7);
  const [userXP, setUserXP] = useState(375);
  const [maxDailyXP, setMaxDailyXP] = useState(500);
  const [userStreak, setUserStreak] = useState(authState.warrior?.streak || 0);
  const [dailyQuests, setDailyQuests] = useState([
    { id: 1, name: 'Read Articles', description: 'Read 4 blockchain articles today', completed: 0, total: 4, xp: 50, icon: 'search', color: 'cyan' },
    { id: 2, name: 'Join Tournament', description: 'Join 1 tournament this month', completed: 1, total: 1, xp: 100, icon: 'trophy', color: 'purple' },
    { id: 3, name: 'Daily Login', description: 'Login daily for rewards', completed: 5, total: 7, xp: 25, icon: 'award', color: 'yellow' },
    { id: 4, name: 'Visit Dojo', description: 'Visit your dojo page', completed: 0, total: 1, xp: 30, icon: 'clock', color: 'red' },
  ]);
  
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

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle random avatar generation
  const handleGenerateRandomAvatar = async () => {
    if (!authState.user) return;
    
    try {
      setIsSubmitting(true);
      
      // Generate a random avatar and store it in Supabase
      const storedAvatarUrl = await fetchAndStoreRandomAvatar(
        supabase,
        authState.user.id,
        'warrior',
        authState.user.id
      );
      
      if (storedAvatarUrl) {
        // Set the preview to the stored avatar URL
        setAvatarPreview(storedAvatarUrl);
        // We'll set avatarFile to null since we're using a URL directly
        setAvatarFile(null);
      } else {
        // Fallback to direct API URL if storage fails
        const fallbackUrl = getEntityAvatar('warrior', authState.user.id + Date.now());
        setAvatarPreview(fallbackUrl);
        setAvatarFile(null);
      }
    } catch (error) {
      console.error('Error generating random avatar:', error);
      // Fallback to direct API URL
      const fallbackUrl = getEntityAvatar('warrior', authState.user.id + Date.now());
      setAvatarPreview(fallbackUrl);
      setAvatarFile(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle profile submission
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authState.user) {
      setOnboardingError('User not authenticated. Please log in again.');
      return;
    }
    
    // Validate warrior name if creating a new warrior
    if (!authState.warrior && !warriorName.trim()) {
      setOnboardingError('Please enter a name for your warrior.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setOnboardingError('');
      
      // Upload avatar if selected
      let avatarUrl = authState.profile?.avatar_url || null;
      
      if (avatarFile) {
        try {
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${authState.user.id}-${Date.now()}.${fileExt}`;
          const filePath = `${authState.user.id}/${fileName}`;
          
          // Use the correct bucket name that exists in Supabase
          const bucketName = 'warrior-profile';
          
          console.log(`Attempting to upload avatar to ${bucketName}/${filePath}`);
          
          // Upload the file
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from(bucketName)
            .upload(filePath, avatarFile, {
              upsert: true,
              cacheControl: '3600'
            });
            
          if (uploadError) {
            console.error('Avatar upload error details:', JSON.stringify(uploadError, null, 2));
            throw uploadError;
          }
          
          console.log('Avatar upload successful, data:', uploadData);
          
          // Get public URL instead of signed URL
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);
            
          if (!publicUrlData || !publicUrlData.publicUrl) {
            console.error('Failed to get public URL');
            throw new Error('Failed to get public URL');
          }
          
          avatarUrl = publicUrlData.publicUrl;
          console.log('Avatar public URL:', avatarUrl);
        } catch (uploadError) {
          console.error('Error uploading avatar:');
          if (uploadError instanceof Error) {
            console.error('Error name:', uploadError.name);
            console.error('Error message:', uploadError.message);
            console.error('Error stack:', uploadError.stack);
          } else {
            console.error('Unknown error type:', typeof uploadError);
            console.error('Error value:', uploadError);
          }
          console.log('Avatar upload failed, will proceed with profile update only');
          // Continue with existing avatar
        }
      } else if (avatarPreview && avatarPreview !== authState.profile?.avatar_url) {
        // If we have a preview but no file, it means we're using a generated avatar
        avatarUrl = avatarPreview;
      }
      
      // Prepare profile update data
      const profileUpdateData: {
        full_name: string;
        updated_at: string;
        avatar_url?: string | null;
      } = {
        full_name: bio, // Store bio in the full_name field since there's no dedicated bio field
        updated_at: new Date().toISOString()
      };
      
      // Only include avatar_url if we have one
      if (avatarUrl !== null) {
        profileUpdateData.avatar_url = avatarUrl;
      }
      
      console.log('Updating profile with:', profileUpdateData);
      
      // Update profile
      const { error: updateError, data: profileData } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', authState.user.id)
        .select();
        
      if (updateError) {
        console.error('Profile update error details:', JSON.stringify(updateError, null, 2));
        throw updateError;
      }
      
      console.log('Profile update successful:', profileData);
      
      // Check if the user already has a warrior
      if (!authState.warrior) {
        console.log('No warrior found, creating one...');
        
        // Create a new warrior for the user
        const { data: warrior, error: warriorError } = await supabase
          .from('warriors')
          .insert({
            name: warriorName,
            owner_id: authState.user.id,
            power_level: 100,
            rank: 0,
            win_rate: 0,
            experience: 0,
            level: 1,
            energy: 100,
            energy_last_updated: new Date().toISOString(),
            avatar_url: avatarUrl,
            metadata: {
              bio: bio,
              socialLinks: {
                github: '',
                twitter: '',
                website: ''
              }
            }
          })
          .select()
          .single();
        
        if (warriorError) {
          console.error('Error creating warrior:', warriorError);
          throw warriorError;
        }
        
        console.log('Warrior created successfully:', warrior);
        
        // Update auth state with the new warrior
        setAuthState({
          ...authState,
          warrior: warrior,
          profile: profileData[0] || authState.profile,
          onboardingStep: 'complete'
        });
      } else {
        // Update local state
        if (authState.profile) {
          const updatedProfile = {
            ...authState.profile,
            full_name: bio,
            updated_at: new Date().toISOString()
          };
          
          // Only update avatar_url if we have a new one
          if (avatarUrl !== null) {
            updatedProfile.avatar_url = avatarUrl;
          }
          
          setAuthState({
            ...authState,
            profile: updatedProfile,
            onboardingStep: 'complete'
          });
        }
      }
      
      // Mark onboarding as complete
      setOnboardingComplete(true);
      setTimeout(() => {
        setShowOnboarding(false);
      }, 1500); // Show completion animation for 1.5 seconds
      
    } catch (error) {
      console.error('Error updating profile:');
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else if (error && typeof error === 'object') {
        try {
          console.error('Error object:', JSON.stringify(error, null, 2));
        } catch (jsonError) {
          console.error('Error object (not JSON serializable):', error);
          console.error('Error object properties:', Object.keys(error as object));
        }
      } else {
        console.error('Unknown error type:', typeof error);
        console.error('Error value:', error);
      }
      setOnboardingError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skip onboarding for now
  const skipOnboarding = () => {
    setShowOnboarding(false);
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
        const [{count: tournamentCount}, {count: warriorCount}, {count: dojoCount}] = await Promise.all([
          supabase.from('tournaments').select('*', { count: 'exact', head: true })
            .gt('end_date', new Date().toISOString()),
          supabase.from('warriors').select('*', { count: 'exact', head: true }),
          supabase.from('dojos').select('*', { count: 'exact', head: true })
        ]);
        
        setStats({
          activeTournaments: tournamentCount || 0,
          activeWarriors: warriorCount || 0,
          totalDojos: dojoCount || 0
        });
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, [supabase, authState.user]);

  useEffect(() => {
    async function updateDailyQuests() {
      if (dailyStats && authState.isAuthenticated) {
        // Update the Read Articles quest with actual data
        setDailyQuests(prevQuests => 
          prevQuests.map(quest => 
            quest.id === 1 
              ? { 
                  ...quest, 
                  completed: Math.min(dailyStats.articles_completed, quest.total)
                } 
              : quest
          )
        );
        
        // Update user XP based on articles read
        setUserXP(prevXP => {
          // Calculate new XP from articles and other sources
          const articlesXP = dailyStats.total_xp_earned || 0;
          const otherXP = prevXP - (dailyQuests.find(q => q.id === 1)?.completed || 0) * (dailyQuests.find(q => q.id === 1)?.xp || 0);
          return Math.min(otherXP + articlesXP, maxDailyXP);
        });
      }
    }
    
    updateDailyQuests();
  }, [dailyStats, authState.isAuthenticated]);

  useEffect(() => {
    console.log('Dojo:', );
  }, []);

  useEffect(() => {
    // Initialize profile data when auth state changes
    if (authState.profile) {
      setBio(authState.profile.full_name || '');
      if (authState.profile.avatar_url) {
        setAvatarPreview(authState.profile.avatar_url);
      }
    }
    
    // Show onboarding if user is authenticated but hasn't completed onboarding
    if (authState.isAuthenticated && !authState.loading && authState.onboardingStep !== 'complete') {
      setShowOnboarding(true);
    }
  }, [authState]);

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
      setUserStreak(warriorData.streak);
    } catch (error) {
      console.error('Error checking in:', error);
    } finally {
      setCheckInLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <BitcoinLoader />;
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
                  Welcome, <span className="text-cyan">{authState.warrior?.name || 'Warrior'} 👋</span>
                </h1>
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
          {/* Daily Quests Section */}
          <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center">
                <Flame className="mr-2 text-orange-500" size={20} />
                Daily Quests
              </h2>
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-800/50 rounded-full border border-gray-700">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-orange-400">{authState.warrior?.streak || 0} Day Streak</span>
              </div>
            </div>
            
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Daily Progress</span>
              <span className="text-cyan-400">{userXP}/{maxDailyXP} XP</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 mb-3">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-purple-500 h-3 rounded-full" 
                style={{ width: `${(userXP/maxDailyXP) * 100}%` }}
              ></div>
            </div>
            
            <div className="space-y-3 mb-4">
              {dailyQuests.slice(0, 2).map((quest) => {
                const iconMap: Record<string, any> = {
                  search: Search,
                  trophy: Trophy,
                  award: Award,
                  clock: Clock
                };
                const Icon = iconMap[quest.icon];
                const progress = (quest.completed / quest.total) * 100;
                
                return (
                  <div key={quest.id} className="bg-gray-800/40 border border-gray-800 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full bg-${quest.color}-500/20 flex items-center justify-center mr-2`}>
                          <Icon className={`w-4 h-4 text-${quest.color}-400`} />
                        </div>
                        <div>
                          <h5 className="font-bold text-white group-hover:text-cyan transition-colors">
                            {quest.name}
                          </h5>
                          <p className="text-xs text-gray-400">{quest.description}</p>
                        </div>
                      </div>
                      <div className="text-yellow-400 font-bold text-sm">+{quest.xp} XP</div>
                    </div>
                    
                    <div className="w-full bg-gray-900 rounded-full h-2 mb-1">
                      <div 
                        className={`bg-${quest.color}-500 h-2 rounded-full`} 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">{quest.completed}/{quest.total} completed</span>
                      <span className={`text-${quest.color}-400`}>
                        {progress === 100 ? 'Complete!' : `${progress}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={() => document.getElementById('daily-activity-modal')?.classList.remove('hidden')}
                className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-md transition-colors flex items-center text-sm"
              >
                View All Quests
                <ArrowRight className="w-3 h-3 ml-1" />
              </button>
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
                            <h3 className="text-lg font-bold text-white group-hover:text-cyan transition-colors">
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
        </div>
        
        {/* Sidebar (1/3 width on large screens) */}
        <div className="space-y-6 mt-16">
          
          {/* Warrior Profile Card (if exists) */}
          {authState.warrior && (
            <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-purple-500/50">
                  <Image
                    src={authState.warrior.avatar_url || getEntityAvatar('warrior', authState.warrior.id)}
                    alt={authState.warrior.name}
                    width={64}
                    height={64}
                    className="object-cover"
                    unoptimized
                  />
                </div>
                
                <div>
                  <Link href={`/warriors/${authState.warrior.id}`} className="text-cyan hover:text-cyan-light text-sm transition-colors group" target="_blank">
                    <h3 className="text-xl font-bold text-white group-hover:text-cyan transition-all duration-300">{authState.warrior.name}</h3>
                  </Link>
                  <p className="text-gray-400 text-sm">Power Level: {authState.warrior.power_level}</p>
                  <p className="text-gray-400 text-sm">Rank: #{authState.warrior.rank}</p>
                </div>
              </div>
              
              {/* Energy Section */}
              <div className="bg-gray-800/30 rounded-lg p-3 mb-4 border border-cyan/20">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="text-cyan" size={18} />
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
                    <span className="flex items-center">
                      <div className="animate-spin w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full mr-2"></div>
                      <span className="text-xs">Loading...</span>
                    </span>
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
          {!authState.warrior?.dojo_id && (
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
                            src={dojo.banner_url || '/images/default-dojo.png'}
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
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Onboarding Overlay */}
        {showOnboarding && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-scan-lines opacity-20"></div>
            
            {/* Japanese characters floating in background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="text-vertical-left text-3xl font-serif-jp tracking-widest text-cyan/10 absolute top-1/4 left-8">
                <div>戦士</div>
                <div>初期化</div>
                <div>プロフィール</div>
              </div>
              <div className="text-vertical-right text-3xl font-serif-jp tracking-widest text-red/10 absolute top-1/3 right-8">
                <div>ナカモト</div>
                <div>リーグ</div>
                <div>登録</div>
              </div>
            </div>
            
            {/* Glowing border effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full border-2 border-cyan/30 animate-pulse-slow"></div>
            </div>
            
            <div className="relative max-w-md w-full mx-4 overflow-hidden">
              {/* Cyberpunk styled card */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-neon-cyan overflow-hidden">
                {/* Glitch effect header */}
                <div className="relative bg-gradient-to-r from-cyan/20 to-red/20 p-4 border-b border-gray-800">
                  <div className="absolute top-0 left-0 w-full h-full bg-glitch opacity-10"></div>
                  <h2 className="text-2xl font-bold text-cyan glitch-text flex items-center gap-2">
                    <span className="relative z-10">戦士初期化</span>
                    <span className="text-sm text-gray-400">WARRIOR SETUP</span>
                  </h2>
                  <p className="text-gray-400 mt-1 font-mono text-sm flex items-center gap-2">
                    <span className="text-xs font-serif-jp text-red">ナカモト・リーグ</span>
                    <span>SYS://PROFILE_CONFIG</span>
                  </p>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  {onboardingError && (
                    <div className="bg-red-900/50 border border-red-700 text-red-100 p-3 rounded-md mb-4 flex items-start">
                      <div className="text-red-400 mr-2 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-sm font-mono">{onboardingError}</div>
                    </div>
                  )}
                  
                  {onboardingComplete ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="inline-block p-3 rounded-full bg-cyan/20 mb-2">
                        <Check className="w-8 h-8 text-cyan animate-pulse" />
                      </div>
                      <h3 className="text-xl font-bold text-cyan flex justify-center items-center gap-2">
                        <span className="font-serif-jp">完了</span>
                        <span>Profile Initialized</span>
                      </h3>
                      <p className="text-gray-400">Your warrior profile has been successfully configured.</p>
                      <div className="h-2 bg-gray-800 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan to-red w-full animate-progress"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Warrior name input - positioned first */}
                      <div className="mb-4">
                        <label className="block mb-1 flex items-center gap-2">
                          <span className="text-cyan text-sm font-serif-jp">戦士名</span>
                          <span className="text-gray-400 text-xs font-mono">WARRIOR NAME</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={warriorName}
                            onChange={(e) => setWarriorName(e.target.value)}
                            className="w-full bg-gray-800/80 border border-gray-700 rounded p-2 text-white focus:border-cyan focus:outline-none focus:shadow-neon-cyan-sm pl-3 font-mono"
                            placeholder="Enter your warrior's name"
                            required
                          />
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan"></div>
                        </div>
                      </div>
                      
                      {/* Bio input */}
                      <div className="mb-4">
                        <label className="block mb-1 flex items-center gap-2">
                          <span className="text-cyan text-sm font-serif-jp">バイオ</span>
                          <span className="text-gray-400 text-xs font-mono">BIO</span>
                        </label>
                        <div className="relative">
                          <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full h-24 bg-gray-800/80 border border-gray-700 rounded p-2 text-white focus:border-cyan focus:outline-none focus:shadow-neon-cyan-sm pl-3 font-mono"
                            placeholder="Tell us about yourself..."
                          ></textarea>
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan"></div>
                        </div>
                      </div>
                      
                      {/* Avatar upload with cyberpunk styling */}
                      <div className="flex flex-col items-center mb-6">
                        <div className="relative">
                          <div className="w-32 h-32 rounded-full bg-gray-800 border-2 border-cyan overflow-hidden flex items-center justify-center shadow-neon-cyan">
                            {avatarPreview ? (
                              <img 
                                src={avatarPreview} 
                                alt="Avatar preview" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserCircle className="w-20 h-20 text-gray-600" />
                            )}
                            <div className="absolute inset-0 bg-scan-lines opacity-20"></div>
                          </div>
                        </div>
                        
                        {/* Avatar controls below the preview */}
                        <div className="mt-4 flex justify-center space-x-4">
                          {/* Upload button */}
                          <label className="bg-gray-800 text-white px-3 py-2 rounded-md cursor-pointer hover:bg-gray-700 transition-colors border border-red/30 flex items-center">
                            <Camera className="w-4 h-4 mr-2 text-red" />
                            <span className="text-xs">Upload</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleAvatarChange}
                            />
                          </label>
                          
                          {/* Random avatar button */}
                          <button 
                            onClick={handleGenerateRandomAvatar}
                            className="bg-gray-800 text-white px-3 py-2 rounded-md cursor-pointer hover:bg-gray-700 transition-colors border border-purple-500/30 flex items-center"
                            title="Generate random avatar"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <span className="flex items-center">
                                <div className="animate-spin w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full mr-2"></div>
                                <span className="text-xs">Loading...</span>
                              </span>
                            ) : (
                              <>
                                <Shuffle className="w-4 h-4 mr-2 text-purple-500" />
                                <span className="text-xs">Random</span>
                              </>
                            )}
                          </button>
                        </div>
                        
                        {/* Label with Japanese styling */}
                        <div className="mt-4 flex flex-col items-center">
                          <span className="text-cyan text-sm font-serif-jp">アバター</span>
                          <span className="text-gray-400 text-xs font-mono">AVATAR</span>
                        </div>
                      </div>
                      
                      {/* Gamified progress indicator */}
                      <div className="h-1 bg-gray-800 rounded-full mt-4">
                        <div className="h-full bg-gradient-to-r from-cyan to-red" style={{ width: avatarFile || avatarPreview ? '100%' : '50%' }}></div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Footer with cyberpunk styling */}
                <div className="border-t border-gray-800 p-4 flex justify-between items-center bg-gray-900/80">
                  <button
                    onClick={skipOnboarding}
                    className="text-gray-400 hover:text-white transition-colors font-mono text-sm flex items-center gap-1"
                  >
                    <span className="text-xs font-serif-jp text-red">スキップ</span>
                    <span>SKIP</span>
                  </button>
                  
                  {!onboardingComplete && (
                    <button
                      onClick={handleProfileSubmit}
                      disabled={isSubmitting}
                      className={`bg-gradient-to-r from-cyan to-cyan-dark text-white px-4 py-2 rounded flex items-center gap-2 transition-all hover:shadow-neon-cyan-sm ${
                        isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                      }`}
                    >
                      <span className="text-xs font-serif-jp">確認</span>
                      <span className="font-mono">{isSubmitting ? 'PROCESSING...' : 'CONFIRM'}</span>
                      {!isSubmitting && <Zap className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Dashboard content */}
        {renderContent()}
      </main>
      
      <Footer />
      
      {/* Daily Activity Modal */}
      <div id="daily-activity-modal" className="fixed inset-0 z-50 flex items-center justify-center hidden">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => document.getElementById('daily-activity-modal')?.classList.add('hidden')}></div>
        <div className="relative bg-gray-900 border border-gray-800 rounded-lg shadow-neon-subtle w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Daily Activity Tracker</h2>
            <button 
              onClick={() => document.getElementById('daily-activity-modal')?.classList.add('hidden')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6">
            {/* User Level and XP Progress */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 bg-gray-800/30 p-4 rounded-lg border border-gray-800">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="relative mr-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center">
                      <div className="text-2xl font-bold text-yellow-400">Lv.{userLevel}</div>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-gray-900 rounded-full px-2 py-0.5 text-xs font-bold">
                    +{userXP} XP
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-serif-jp">Game Progress</h3>
                  <div className="flex items-center mt-1">
                    <Flame className="w-4 h-4 text-orange-500 mr-1" />
                    <span className="text-sm text-orange-400 font-medium">{authState.warrior?.streak || 0} Day Streak</span>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Daily Progress</span>
                  <span className="text-cyan-400">{userXP}/{maxDailyXP} XP</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3 mb-1">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-3 rounded-full" 
                    style={{ width: `${(userXP/maxDailyXP) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Level {userLevel}</span>
                  <span>Level {userLevel + 1}</span>
                </div>
              </div>
            </div>
            
            {/* Daily Quests */}
            <div className="mb-8">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                <Award className="mr-2 text-yellow-500" size={18} />
                Daily Quests
                <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                  {dailyQuests.filter(q => (q.completed / q.total) * 100 === 100).length}/{dailyQuests.length} Completed
                </span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dailyQuests.map((quest) => {
                  const iconMap: Record<string, any> = {
                    search: Search,
                    trophy: Trophy,
                    award: Award,
                    clock: Clock
                  };
                  const Icon = iconMap[quest.icon];
                  const progress = (quest.completed / quest.total) * 100;
                  
                  return (
                    <div key={quest.id} className="p-4 bg-gray-800/40 border border-gray-800 rounded-lg h-full">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full bg-${quest.color}-500/20 flex items-center justify-center mr-3 flex-shrink-0`}>
                            <Icon className={`w-5 h-5 text-${quest.color}-400`} />
                          </div>
                          <div>
                            <h5 className="font-bold text-white">{quest.name}</h5>
                            <p className="text-xs text-gray-400">{quest.description}</p>
                          </div>
                        </div>
                        <div className="text-yellow-400 font-bold">+{quest.xp} XP</div>
                      </div>
                      
                      <div className="w-full bg-gray-900 rounded-full h-2.5 mb-1">
                        <div 
                          className={`bg-${quest.color}-500 h-2.5 rounded-full`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">{quest.completed}/{quest.total} completed</span>
                        <span className={`text-${quest.color}-400`}>
                          {progress === 100 ? 'Complete!' : `${progress}%`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Weekly Challenges */}
            <div className="mb-8">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                <Shield className="mr-2 text-blue-500" size={18} />
                Weekly Challenges
                <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  1/2 Completed
                </span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800/40 border border-gray-800 rounded-lg h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 flex-shrink-0">
                        <Trophy className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white">Tournament Participant</h5>
                        <p className="text-xs text-gray-400">Join 3 tournaments this week</p>
                      </div>
                    </div>
                    <div className="text-yellow-400 font-bold">+150 XP</div>
                  </div>
                  
                  <div className="w-full bg-gray-900 rounded-full h-2.5 mb-1">
                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '33%' }}></div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">1/3 completed</span>
                    <span className="text-blue-400">33%</span>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-800/40 border border-gray-800 rounded-lg h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mr-3 flex-shrink-0">
                        <Users className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white">Social Butterfly</h5>
                        <p className="text-xs text-gray-400">Interact with 5 warriors</p>
                      </div>
                    </div>
                    <div className="text-yellow-400 font-bold">+200 XP</div>
                  </div>
                  
                  <div className="w-full bg-gray-900 rounded-full h-2.5 mb-1">
                    <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">5/5 completed</span>
                    <span className="text-orange-400">Complete!</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Monthly Achievements */}
            <div>
              <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                <Star className="mr-2 text-purple-500" size={18} />
                Monthly Achievements
                <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                  1/3 Completed
                </span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-800/40 border border-gray-800 rounded-lg text-center h-full">
                  <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                    <Trophy className="w-8 h-8 text-purple-400" />
                  </div>
                  <h5 className="font-bold text-white mb-1">Tournament Master</h5>
                  <p className="text-xs text-gray-400 mb-2">Win 3 tournaments this month</p>
                  <div className="text-yellow-400 font-bold mb-1">+500 XP</div>
                  <div className="text-xs text-purple-400">1/3</div>
                </div>
                
                <div className="p-4 bg-gray-800/40 border border-gray-800 rounded-lg text-center h-full">
                  <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 flex items-center justify-center mb-2">
                    <Search className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h5 className="font-bold text-white mb-1">Knowledge Seeker</h5>
                  <p className="text-xs text-gray-400 mb-2">Read 20 blockchain articles</p>
                  <div className="text-yellow-400 font-bold mb-1">+300 XP</div>
                  <div className="text-xs text-cyan-400">9/20</div>
                </div>
                
                <div className="p-4 bg-gray-800/40 border border-gray-800 rounded-lg text-center h-full">
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-2">
                    <Shield className="w-8 h-8 text-red-400" />
                  </div>
                  <h5 className="font-bold text-white mb-1">Dojo Defender</h5>
                  <p className="text-xs text-gray-400 mb-2">Represent your dojo in 5 battles</p>
                  <div className="text-yellow-400 font-bold mb-1">+400 XP</div>
                  <div className="text-xs text-red-400">0/5</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 p-4 flex justify-between items-center bg-gray-900/80">
            <div className="text-sm text-gray-400">
              Complete daily quests to earn XP and increase your streak!
            </div>
            <button 
              onClick={() => document.getElementById('daily-activity-modal')?.classList.add('hidden')}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      
      {/* Onboarding Modal */}
    </div>
  );
}