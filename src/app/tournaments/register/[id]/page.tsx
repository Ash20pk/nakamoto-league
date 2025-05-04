'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  ChevronRight, 
  Calendar, 
  Trophy, 
  Users, 
  Coins,
  Github,
  Twitter,
  Globe,
  Wallet,
  User,
  Mail,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BitcoinLoader from '@/components/BitcoinLoader';
import { useAuth } from '@/providers/AuthProvider';
import type { Database } from '@/lib/database.types';
import type { Tournament } from '@/hooks/useTournament';

interface RegistrationData {
  fullName: string;
  email: string;
  walletAddress: string;
  githubUrl: string;
  twitterUrl: string;
  websiteUrl: string;
  experience: string;
  teamName: string;
  lookingForTeam: boolean;
  selectedTrack: string;
  projectIdea: string;
  agreeToTerms: boolean;
}

const TournamentRegistrationPage = () => {
  const params = useParams();
  const router = useRouter();
  const { authState } = useAuth();
  const supabase = createClientComponentClient<Database>();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [tracks, setTracks] = useState<Array<{id: string; name: string; description?: string}>>([]);
  
  const [formData, setFormData] = useState<RegistrationData>({
    fullName: '',
    email: '',
    walletAddress: '',
    githubUrl: '',
    twitterUrl: '',
    websiteUrl: '',
    experience: 'beginner',
    teamName: '',
    lookingForTeam: false,
    selectedTrack: '',
    projectIdea: '',
    agreeToTerms: false
  });

  useEffect(() => {
    // Redirect if not logged in
    if (!authState.loading && !authState.user) {
      router.push(`/auth/login?redirect=/tournaments/register/${params.id}`);
      return;
    }

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
            profiles:organizer_id(id, username, avatar_url),
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
        
        // Fetch tracks
        const { data: tracksData } = await supabase
          .from('tournament_tracks')
          .select('*')
          .eq('tournament_id', params.id);
        
        if (tracksData && tracksData.length > 0) {
          setTracks(tracksData);
          setFormData(prev => ({...prev, selectedTrack: tracksData[0].id}));
        }
        
        // Check if already registered
        if (authState?.user?.id) {
          const { data: participantData } = await supabase
            .from('tournament_participants')
            .select('*')
            .eq('tournament_id', params.id)
            .eq('user_id', authState.user.id)
            .maybeSingle();
          
          if (participantData) {
            // Already registered, redirect to tournament page
            router.push(`/tournaments/${params.id}?registered=true`);
            return;
          }
        }
        
        // Transform to our Tournament interface
        const now = new Date();
        const startDate = new Date(tournamentData.start_date);
        const endDate = new Date(tournamentData.end_date);
        
        let status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
        if (now < startDate) status = 'UPCOMING';
        else if (now > endDate) status = 'COMPLETED';
        else status = 'ONGOING';
        
        // Only allow registration for upcoming tournaments
        if (status !== 'UPCOMING') {
          router.push(`/tournaments/${params.id}?error=registration_closed`);
          return;
        }
        
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
            name: tournamentData.profiles?.username || 'Unknown',
            avatar: tournamentData.profiles?.avatar_url || '/images/default-avatar.png',
          },
          banner: tournamentData.banner_url || '/images/default-tournament.jpg',
        };
        
        setTournament(transformedData);
        
        // Pre-fill form with user data if available
        if (authState?.user) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authState.user.id)
            .single();
          
          if (userData) {
            setFormData(prev => ({
              ...prev,
              fullName: userData.full_name || '',
              email: authState.user?.email || '',
              githubUrl: userData.github_url || '',
              twitterUrl: userData.twitter_url || '',
              websiteUrl: userData.website_url || '',
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching tournament details:', err);
        setError('Failed to fetch tournament details');
      } finally {
        setLoading(false);
      }
    };
    
    if (!authState.loading) {
      fetchTournamentDetails();
    }
  }, [params.id, supabase, authState, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
    window.scrollTo(0, 0);
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: // Basic Info
        if (!formData.fullName || !formData.email) {
          setError('Please fill in all required fields');
          return false;
        }
        return true;
      case 2: // Team Info
        return true; // No required fields
      case 3: // Project Info
        if (!formData.selectedTrack) {
          setError('Please select a track');
          return false;
        }
        return true;
      case 4: // Review
        if (!formData.agreeToTerms) {
          setError('You must agree to the terms and conditions');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep() || !tournament || !authState?.user?.id) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Save registration data
      const { error: registrationError } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournament.id,
          user_id: authState.user.id,
          registration_date: new Date().toISOString(),
          status: 'REGISTERED',
          track_id: formData.selectedTrack || null,
          team_name: formData.teamName || null,
          looking_for_team: formData.lookingForTeam,
          project_idea: formData.projectIdea || null,
          registration_data: {
            wallet_address: formData.walletAddress,
            github_url: formData.githubUrl,
            twitter_url: formData.twitterUrl,
            website_url: formData.websiteUrl,
            experience_level: formData.experience
          }
        });
      
      if (registrationError) throw registrationError;
      
      // Update user profile with the provided information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          github_url: formData.githubUrl,
          twitter_url: formData.twitterUrl,
          website_url: formData.websiteUrl
        })
        .eq('id', authState.user.id);
      
      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Continue anyway as the registration was successful
      }
      
      // Redirect to success page
      router.push(`/tournaments/${tournament.id}?registered=success`);
    } catch (err) {
      console.error('Error registering for tournament:', err);
      setError('Failed to register for tournament');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map((step) => (
          <React.Fragment key={step}>
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step < currentStep 
                  ? 'bg-green-500 text-white' 
                  : step === currentStep 
                    ? 'bg-cyan-500 text-white' 
                    : 'bg-gray-700 text-gray-400'
              }`}
            >
              {step < currentStep ? <Check size={18} /> : step}
            </div>
            {step < 4 && (
              <div 
                className={`h-1 w-16 ${
                  step < currentStep ? 'bg-green-500' : 'bg-gray-700'
                }`}
              ></div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderBasicInfoStep = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Full Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="Your full name"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="your.email@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Wallet Address</label>
            <input
              type="text"
              name="walletAddress"
              value={formData.walletAddress}
              onChange={handleInputChange}
              className="w-full p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="0x..."
            />
            <p className="text-gray-500 text-sm mt-1">Your Ethereum wallet address for potential rewards</p>
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">GitHub URL</label>
            <div className="relative">
              <Github className="absolute left-3 top-3 text-gray-500" size={20} />
              <input
                type="url"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={handleInputChange}
                className="w-full p-3 pl-10 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="https://github.com/yourusername"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Twitter URL</label>
            <div className="relative">
              <Twitter className="absolute left-3 top-3 text-gray-500" size={20} />
              <input
                type="url"
                name="twitterUrl"
                value={formData.twitterUrl}
                onChange={handleInputChange}
                className="w-full p-3 pl-10 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="https://twitter.com/yourusername"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Website URL</label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 text-gray-500" size={20} />
              <input
                type="url"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleInputChange}
                className="w-full p-3 pl-10 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Experience Level</label>
            <select
              name="experience"
              value={formData.experience}
              onChange={handleInputChange}
              className="w-full p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="beginner">Beginner (0-1 years)</option>
              <option value="intermediate">Intermediate (1-3 years)</option>
              <option value="advanced">Advanced (3-5 years)</option>
              <option value="expert">Expert (5+ years)</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderTeamInfoStep = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-6">Team Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Team Name</label>
            <input
              type="text"
              name="teamName"
              value={formData.teamName}
              onChange={handleInputChange}
              className="w-full p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="Your team name (if you have one)"
            />
            <p className="text-gray-500 text-sm mt-1">Leave blank if you're participating solo</p>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="lookingForTeam"
              name="lookingForTeam"
              checked={formData.lookingForTeam}
              onChange={handleInputChange}
              className="w-5 h-5 bg-slate-800 border border-slate-700 rounded"
            />
            <label htmlFor="lookingForTeam" className="text-gray-300">
              I'm looking for team members
            </label>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectInfoStep = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-6">Project Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Select Track <span className="text-red-500">*</span></label>
            <select
              name="selectedTrack"
              value={formData.selectedTrack}
              onChange={handleInputChange}
              className="w-full p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              required
            >
              {tracks.length > 0 ? (
                tracks.map(track => (
                  <option key={track.id} value={track.id}>
                    {track.name}
                  </option>
                ))
              ) : (
                <option value="">General</option>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Project Idea</label>
            <textarea
              name="projectIdea"
              value={formData.projectIdea}
              onChange={handleInputChange}
              className="w-full p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500 min-h-[150px]"
              placeholder="Describe your project idea (optional)"
            ></textarea>
            <p className="text-gray-500 text-sm mt-1">It's okay if you don't have a specific idea yet</p>
          </div>
        </div>
      </div>
    );
  };

  const renderReviewStep = () => {
    if (!tournament) return null;
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-6">Review & Submit</h2>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6 mb-6">
          <h3 className="text-xl font-semibold text-white mb-4">Tournament Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Tournament</p>
              <p className="text-white font-medium">{tournament.title}</p>
            </div>
            <div>
              <p className="text-gray-400">Start Date</p>
              <p className="text-white font-medium">{format(new Date(tournament.startDate), 'MMMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-gray-400">End Date</p>
              <p className="text-white font-medium">{format(new Date(tournament.endDate), 'MMMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-gray-400">Prize Pool</p>
              <p className="text-white font-medium">{tournament.prize.amount} {tournament.prize.currency}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6 mb-6">
          <h3 className="text-xl font-semibold text-white mb-4">Your Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Full Name</p>
              <p className="text-white font-medium">{formData.fullName}</p>
            </div>
            <div>
              <p className="text-gray-400">Email</p>
              <p className="text-white font-medium">{formData.email}</p>
            </div>
            <div>
              <p className="text-gray-400">Wallet Address</p>
              <p className="text-white font-medium">{formData.walletAddress || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-gray-400">Experience Level</p>
              <p className="text-white font-medium">{formData.experience}</p>
            </div>
            <div>
              <p className="text-gray-400">Team Name</p>
              <p className="text-white font-medium">{formData.teamName || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-gray-400">Looking for Team</p>
              <p className="text-white font-medium">{formData.lookingForTeam ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-gray-400">Selected Track</p>
              <p className="text-white font-medium">
                {tracks.find(t => t.id === formData.selectedTrack)?.name || 'General'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6 mb-6">
          <h3 className="text-xl font-semibold text-white mb-4">Project Idea</h3>
          <p className="text-white whitespace-pre-line">{formData.projectIdea || 'Not provided'}</p>
        </div>
        
        <div className="flex items-center gap-3 mb-6">
          <input
            type="checkbox"
            id="agreeToTerms"
            name="agreeToTerms"
            checked={formData.agreeToTerms}
            onChange={handleInputChange}
            className="w-5 h-5 bg-slate-800 border border-slate-700 rounded"
          />
          <label htmlFor="agreeToTerms" className="text-gray-300">
            I agree to the tournament rules and code of conduct <span className="text-red-500">*</span>
          </label>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfoStep();
      case 2:
        return renderTeamInfoStep();
      case 3:
        return renderProjectInfoStep();
      case 4:
        return renderReviewStep();
      default:
        return renderBasicInfoStep();
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
          <Link href="/tournaments" className="hover:text-white transition-colors">
            Tournaments
          </Link>
          <ChevronRight size={16} />
          <Link href={`/tournaments/${tournament.id}`} className="hover:text-white transition-colors">
            {tournament.title}
          </Link>
          <ChevronRight size={16} />
          <span className="text-cyan-400">Registration</span>
        </div>
        
        {/* Tournament Banner */}
        <div className="relative h-48 rounded-lg overflow-hidden mb-6">
          <Image
            src={tournament.banner || '/images/default-tournament.jpg'}
            alt={tournament.title}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="text-2xl font-bold text-white mb-2">Register for {tournament.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-300 text-sm">
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>{format(new Date(tournament.startDate), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy size={16} />
                <span>{tournament.prize.amount} {tournament.prize.currency}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Registration Form */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-800/50 p-6 mb-8">
          {renderStepIndicator()}
          
          {error && (
            <div className="bg-red-900/30 border border-red-500/20 rounded-lg p-4 text-red-400 mb-6">
              {error}
            </div>
          )}
          
          {renderCurrentStep()}
          
          <div className="flex justify-between mt-8">
            {currentStep > 1 ? (
              <button
                onClick={prevStep}
                className="px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white hover:bg-slate-800/70 transition-colors flex items-center gap-2"
                disabled={submitting}
              >
                <ArrowLeft size={18} />
                Back
              </button>
            ) : (
              <Link
                href={`/tournaments/${tournament.id}`}
                className="px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white hover:bg-slate-800/70 transition-colors flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                Cancel
              </Link>
            )}
            
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="px-6 py-3 neon-button-cyan rounded-lg text-white font-medium flex items-center gap-2"
              >
                Next
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-3 neon-button-cyan rounded-lg text-white font-medium flex items-center gap-2"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Complete Registration'}
                {!submitting && <Check size={18} />}
              </button>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default TournamentRegistrationPage;
