'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Calendar, 
  Clock, 
  Users, 
  Trophy, 
  Coins, 
  Info, 
  FileText, 
  Award, 
  ArrowLeft, 
  Share2, 
  BookOpen, 
  MapPin,
  User,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BitcoinLoader from '@/components/BitcoinLoader';
import { useAuth } from '@/providers/AuthProvider';
import { usePermissions } from '@/hooks/usePermissions';
import type { Database } from '@/lib/database.types';
import type { Tournament as BaseTournament } from '@/hooks/useTournament';

// Extended Tournament interface with additional properties needed for the detail page
interface Tournament extends BaseTournament {
  rules?: string[];
  requirements?: string[];
  tracks?: Array<{
    id?: string;
    name: string;
    description?: string;
    tags?: string[];
  }>;
  resources?: Array<{
    name: string;
    url: string;
    description?: string;
  }>;
  location?: string;
}

const TournamentPage = () => {
  const params = useParams();
  const router = useRouter();
  const { authState } = useAuth();
  const { canJoinTournament } = usePermissions();
  const supabase = createClientComponentClient<Database>();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    const fetchTournamentDetails = async () => {
      if (!params.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch tournament details
        const { data: tournamentData, error: tournamentError } = await supabase
          .from('tournaments')
          .select(`
            *,
            dojos:organizer_id(id, name, banner_url, location),
            tournament_participants(count)
          `)
          .eq('id', params.id)
          .single();
        
        if (tournamentError) throw tournamentError;
        
        if (!tournamentData) {
          setError('Tournament not found');
          setLoading(false);
          return;
        }
        
        // Fetch tracks separately
        const { data: tracksData } = await supabase
          .from('tournament_tracks')
          .select('*')
          .eq('tournament_id', params.id);
        
        // Check if user is registered for this tournament
        let isUserRegistered = false;
        if (authState?.user?.id) {
          const { data: participantData } = await supabase
            .from('tournament_participants')
            .select('*')
            .eq('tournament_id', params.id)
            .eq('user_id', authState.user.id)
            .maybeSingle();
          
          isUserRegistered = !!participantData;
        }
        
        // Transform to our Tournament interface
        const now = new Date();
        const startDate = new Date(tournamentData.start_date);
        const endDate = new Date(tournamentData.end_date);
        
        let status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
        if (now < startDate) status = 'UPCOMING';
        else if (now > endDate) status = 'COMPLETED';
        else status = 'ONGOING';
        
        const transformedData: Tournament = {
          id: tournamentData.id,
          title: tournamentData.title,
          description: tournamentData.description || '',
          startDate: tournamentData.start_date,
          endDate: tournamentData.end_date,
          status,
          format: tournamentData.format,
          prize: tournamentData.prize_pool || { amount: 0, currency: 'USD', description: 'No prize information available' },
          registrationDeadline: tournamentData.registration_deadline,
          maxParticipants: tournamentData.max_participants,
          currentParticipants: tournamentData.tournament_participants?.[0]?.count || 0,
          entryFee: tournamentData.entry_fee || 0,
          organizer: {
            id: tournamentData.organizer_id,
            name: tournamentData.dojos?.name || 'Unknown',
            avatar: tournamentData.dojos?.banner_url || '/images/default-avatar.jpg',
          },
          banner: tournamentData.banner_url || '/images/default-tournament.jpg',
          rules: tournamentData.rules || [],
          requirements: tournamentData.requirements || [],
          tracks: tracksData || [],
          resources: tournamentData.resources || [],
          location: tournamentData.location || 'Online',
        };
        
        setTournament(transformedData);
        setIsRegistered(isUserRegistered);
      } catch (err) {
        console.error('Error fetching tournament details:', err);
        setError('Failed to fetch tournament details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTournamentDetails();
  }, [params.id, supabase, authState?.user?.id]);

  const handleRegister = async () => {
    if (!tournament || !authState?.user?.id) return;
    
    try {
      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournament.id,
          user_id: authState.user.id,
          registration_date: new Date().toISOString(),
          status: 'REGISTERED'
        });
      
      if (error) throw error;
      
      setIsRegistered(true);
    } catch (err) {
      console.error('Error registering for tournament:', err);
      // Handle error (show toast, etc.)
    }
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

  const renderTabs = () => {
    return (
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overview'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'rules'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Rules & Requirements
        </button>
        <button
          onClick={() => setActiveTab('tracks')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'tracks'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Tracks & Resources
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'participants'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Participants
        </button>
      </div>
    );
  };

  const renderOverviewTab = () => {
    if (!tournament) return null;
    
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Info className="text-cyan-400" size={20} />
            About This Tournament
          </h3>
          <p className="text-gray-300 whitespace-pre-line">{tournament.description}</p>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Trophy className="text-cyan-400" size={20} />
            Prizes
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0 w-16 h-16 bg-cyan-900/30 rounded-full flex items-center justify-center">
              <Coins className="text-cyan-400" size={32} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {tournament.prize.amount} {tournament.prize.currency}
              </p>
              <p className="text-gray-400">Total Prize Pool</p>
            </div>
          </div>
          <p className="text-gray-300">{tournament.prize.description}</p>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Calendar className="text-cyan-400" size={20} />
            Schedule
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center">
                <Calendar className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-gray-400">Start Date</p>
                <p className="text-white font-medium">
                  {format(new Date(tournament.startDate), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-900/30 rounded-full flex items-center justify-center">
                <Calendar className="text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-gray-400">End Date</p>
                <p className="text-white font-medium">
                  {format(new Date(tournament.endDate), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-900/30 rounded-full flex items-center justify-center">
                <Clock className="text-red-400" size={20} />
              </div>
              <div>
                <p className="text-gray-400">Registration Deadline</p>
                <p className="text-white font-medium">
                  {format(new Date(tournament.registrationDeadline), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <MapPin className="text-cyan-400" size={20} />
            Location
          </h3>
          <p className="text-gray-300">{tournament.location}</p>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <User className="text-cyan-400" size={20} />
            Organizer
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 relative rounded-full overflow-hidden">
              <Image
                src={tournament.organizer.avatar}
                alt={tournament.organizer.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <p className="text-white font-medium">{tournament.organizer.name}</p>
              <Link href={`/dojos/${tournament.organizer.id}`} className="text-cyan-400 text-sm hover:underline">
                View Dojo
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRulesTab = () => {
    if (!tournament) return null;
    
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <FileText className="text-cyan-400" size={20} />
            Tournament Rules
          </h3>
          {tournament.rules && tournament.rules.length > 0 ? (
            <ul className="space-y-2 list-disc list-inside text-gray-300">
              {tournament.rules.map((rule: string, index: number) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No specific rules have been set for this tournament.</p>
          )}
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Info className="text-cyan-400" size={20} />
            Participation Requirements
          </h3>
          {tournament.requirements && tournament.requirements.length > 0 ? (
            <ul className="space-y-2 list-disc list-inside text-gray-300">
              {tournament.requirements.map((requirement: string, index: number) => (
                <li key={index}>{requirement}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No specific requirements have been set for this tournament.</p>
          )}
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Award className="text-cyan-400" size={20} />
            Format
          </h3>
          <p className="text-gray-300">
            This tournament follows a <span className="text-white font-medium">{tournament.format.replace('_', ' ')}</span> format.
          </p>
        </div>
      </div>
    );
  };

  const renderTracksTab = () => {
    if (!tournament) return null;
    
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <BookOpen className="text-cyan-400" size={20} />
            Tournament Tracks
          </h3>
          {tournament.tracks && tournament.tracks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tournament.tracks.map((track: { name: string; description?: string; tags?: string[] }, index: number) => (
                <div key={index} className="bg-black/30 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-lg font-medium text-white mb-2">{track.name}</h4>
                  <p className="text-gray-300 text-sm mb-3">{track.description}</p>
                  {track.tags && track.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {track.tags.map((tag: string, tagIndex: number) => (
                        <span 
                          key={tagIndex} 
                          className="text-xs font-semibold px-2 py-1 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-500/50"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No tracks have been defined for this tournament.</p>
          )}
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <FileText className="text-cyan-400" size={20} />
            Resources
          </h3>
          {tournament.resources && tournament.resources.length > 0 ? (
            <div className="space-y-3">
              {tournament.resources.map((resource: { name: string; url: string; description?: string }, index: number) => (
                <a 
                  key={index} 
                  href={resource.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-900/30 flex items-center justify-center">
                      <FileText className="text-cyan-400" size={18} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{resource.name}</p>
                      <p className="text-gray-400 text-sm">{resource.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-gray-400" size={20} />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No resources have been provided for this tournament.</p>
          )}
        </div>
      </div>
    );
  };

  const renderParticipantsTab = () => {
    if (!tournament) return null;
    
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
          <Users className="text-cyan-400" size={20} />
          Participants
        </h3>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-cyan-500 h-2.5 rounded-full" 
              style={{ width: `${(tournament.currentParticipants / tournament.maxParticipants) * 100}%` }}
            ></div>
          </div>
          <span className="text-gray-300 text-sm whitespace-nowrap">
            {tournament.currentParticipants} / {tournament.maxParticipants}
          </span>
        </div>
        
        {/* Placeholder for participants list - would need to fetch actual participants */}
        <p className="text-gray-400">
          {tournament.currentParticipants === 0 
            ? 'No participants have registered yet.' 
            : 'Participants list is being loaded...'}
        </p>
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'rules':
        return renderRulesTab();
      case 'tracks':
        return renderTracksTab();
      case 'participants':
        return renderParticipantsTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    return <BitcoinLoader />;
  }

  if (error || !tournament) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8 mt-16">
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">
              {error || 'Tournament not found'}
            </h2>
            <p className="text-gray-300 mb-4">
              We couldn't find the tournament you're looking for.
            </p>
            <button
              onClick={() => router.push('/tournaments')}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white hover:bg-slate-800/70 transition-colors"
            >
              Back to Tournaments
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-gray-400">
          <Link href="/tournaments" className="hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft size={16} />
            <span>All Tournaments</span>
          </Link>
        </div>
        
        {/* Tournament Banner */}
        <div className="relative h-64 md:h-80 rounded-lg overflow-hidden mb-6">
          <Image
            src={tournament.banner || '/images/default-tournament.jpg'}
            alt={tournament.title}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(tournament.status)}`}>
                {tournament.status}
              </span>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-white">
                {tournament.format.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{tournament.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-300 text-sm">
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>{format(new Date(tournament.startDate), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={16} />
                <span>{tournament.currentParticipants}/{tournament.maxParticipants}</span>
              </div>
              <div className="flex items-center gap-1">
                <Coins size={16} />
                <span>{tournament.prize.amount} {tournament.prize.currency}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          {tournament.status === 'UPCOMING' && canJoinTournament && !isRegistered && (
            <button
              onClick={() => router.push(`/tournaments/register/${tournament.id}`)}
              className="px-6 py-3 neon-button-cyan rounded-lg text-white font-medium"
              disabled={new Date() > new Date(tournament.registrationDeadline)}
            >
              Register for Tournament
            </button>
          )}
          
          {isRegistered && (
            <div className="px-6 py-3 bg-green-900/30 border border-green-500/50 rounded-lg text-green-400 font-medium">
              You are registered for this tournament
            </div>
          )}
          
          <button className="px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white hover:bg-slate-800/70 transition-colors flex items-center gap-2">
            <Share2 size={18} />
            Share
          </button>
        </div>
        
        {/* Tournament Info Tabs */}
        {renderTabs()}
        
        {/* Active Tab Content */}
        <div className="mt-6">
          {renderActiveTab()}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default TournamentPage;
