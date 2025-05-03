'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Trophy, 
  Shield, 
  Sword, 
  Zap, 
  Star, 
  Calendar, 
  Link as LinkIcon, 
  Github, 
  Twitter, 
  Globe,
  ArrowLeft,
  Users,
  Edit,
  Upload,
  X,
  Check,
  Award
} from 'lucide-react';
import BitcoinLoader from '@/components/BitcoinLoader';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/providers/AuthProvider';
import { formatDistanceToNow } from 'date-fns';

// Helper functions for experience and level calculations
const getNextLevelExp = (currentLevel: number): number => {
  switch (currentLevel) {
    case 1: return 100;
    case 2: return 300;
    case 3: return 600;
    case 4: return 1000;
    case 5: return 1500;
    case 6: return 2100;
    case 7: return 2800;
    case 8: return 3600;
    case 9: return 4500;
    default: return (currentLevel - 10) * 1000 + 4500;
  }
};

const getPrevLevelExp = (currentLevel: number): number => {
  if (currentLevel <= 1) return 0;
  return getNextLevelExp(currentLevel - 1);
};

const getExpPercentage = (experience: number, currentLevel: number): number => {
  const prevLevelExp = getPrevLevelExp(currentLevel);
  const nextLevelExp = getNextLevelExp(currentLevel);
  const levelExpRange = nextLevelExp - prevLevelExp;
  const currentLevelProgress = experience - prevLevelExp;
  
  return Math.min(Math.floor((currentLevelProgress / levelExpRange) * 100), 100);
};

interface Warrior {
  id: string;
  name: string;
  power_level: number;  // Competitive rating (like chess ELO) - used for ranking
  rank: number;         // Position in the global leaderboard based on power_level
  avatar_url: string | null;
  win_rate: number;     // Percentage of battles won (now deprecated, but kept for compatibility)
  experience?: number;  // Gamification XP earned from all platform activities
  level?: number;       // Progression tier based on experience points
  energy?: number;      // Spendable resource that regenerates over time
  energy_last_updated?: string;
  last_check_in?: string;
  created_at: string;
  owner: {
    username: string;
    avatar_url: string | null;
  };
  dojo: {
    id: string;
    name: string;
    banner_url: string | null;
  };
}

interface Tournament {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
}

const WarriorProfile = () => {
  const params = useParams();
  const router = useRouter();
  const { authState } = useAuth();
  const supabase = createClientComponentClient<Database>();
  
  const [warrior, setWarrior] = useState<Warrior | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tournaments'>('overview');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editSocials, setEditSocials] = useState<{github?: string, twitter?: string, website?: string}>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  useEffect(() => {
    async function fetchWarriorData() {
      try {
        setLoading(true);
        
        // Get warrior ID from params
        const warriorId = params.id as string;
        
        // Fetch warrior data
        const { data: warriorData, error: warriorError } = await supabase
          .from('warriors')
          .select(`
            *,
            owner:profiles (username, avatar_url),
            dojo:dojos (id, name, banner_url)
          `)
          .eq('id', warriorId)
          .single();
        
        if (warriorError) throw warriorError;
        
        // Fetch tournaments
        const { data: tournamentsData, error: tournamentsError } = await supabase
          .from('tournament_participants')
          .select(`
            tournament:tournaments (
              id, 
              title, 
              start_date, 
              end_date
            )
          `)
          .eq('warrior_id', warriorId);
        
        if (tournamentsError) throw tournamentsError;
        
        // Process and set the warrior data
        if (warriorData) {
          setWarrior(warriorData);
          setTournaments(tournamentsData.map(t => t.tournament));
        }
      } catch (err) {
        console.error('Error fetching warrior data:', err);
        setError('Failed to load warrior profile');
      } finally {
        setLoading(false);
      }
    }
    
    fetchWarriorData();
  }, [params.id, supabase]);

  // Function to handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setAvatarPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Function to upload avatar to storage
  const uploadAvatar = async (file: File, warriorId: string): Promise<string | null> => {
    try {
      // Make sure we're only allowing the owner to upload
      if (!authState.warrior?.id || authState.warrior.id !== warrior.id) {
        console.error('Unauthorized: Only the owner can upload an avatar');
        throw new Error('Unauthorized: Only the owner can upload an avatar');
      }

      // Use the exact bucket name you created in Supabase
      const bucketName = 'warrior-profile';  // This should match exactly what you created
      
      console.log(`Using bucket '${bucketName}'`);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${warriorId}-${Date.now()}.${fileExt}`;
      
      // IMPORTANT: The path must match your RLS policy
      // Your policy requires the first folder to be the user's ID:
      // (storage.foldername(name))[1] = auth.uid()::text
      const filePath = `${authState.user?.id}/${fileName}`;
      
      console.log(`User ID for RLS policy: ${authState.user?.id}`);
      console.log(`Attempting to upload file to ${bucketName}/${filePath}`);
      
      // Upload the file
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        });
        
      if (uploadError) {
        console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
        throw uploadError;
      }
      
      console.log('Upload successful, data:', uploadData);
      
      // Get public URL instead of signed URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      if (!publicUrlData || !publicUrlData.publicUrl) {
        console.error('Failed to get public URL');
        throw new Error('Failed to get public URL');
      }
      
      console.log('Public URL data:', publicUrlData);
      
      const publicUrl = publicUrlData.publicUrl;
      
      // Set the avatar preview to the new URL
      setAvatarPreview(publicUrl);
      
      console.log('File uploaded successfully, public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:');
      
      // More detailed error logging
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
        // Log the actual error value for debugging
        console.error('Error value:', error);
      }
      
      // Try a simpler approach - just update the metadata without the avatar
      console.log('Avatar upload failed, will proceed with metadata update only');
      return null;
    }
  };
  
  // Function to save profile changes
  const saveProfileChanges = async () => {
    if (!warrior || !authState.warrior?.id || authState.warrior.id !== warrior.id) return;
    
    setUpdateLoading(true);
    try {
      // Upload avatar if changed
      let avatarUrl = warrior.avatar_url;
      if (avatarFile) {
        console.log('Uploading new avatar file...');
        const uploadedUrl = await uploadAvatar(avatarFile, warrior.id);
        console.log('Upload result:', uploadedUrl);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        } else {
          console.log('Avatar upload failed, keeping existing avatar');
        }
      }
      
      // Create metadata object
      const metadata = {
        bio: editBio,
        socialLinks: editSocials
      };
      
      console.log('Updating warrior profile with:', { avatarUrl, metadata });
      
      // Update warrior with avatar and metadata
      const { error: updateError, data: updateData } = await supabase
        .from('warriors')
        .update({ 
          avatar_url: avatarUrl,
          metadata: metadata 
        })
        .eq('id', warrior.id)
        .select();
        
      if (updateError) {
        console.error('Update error details:', updateError);
        throw updateError;
      }
      
      console.log('Update successful:', updateData);
      
      // Update local state with the updated data
      if (updateData && updateData.length > 0) {
        const updatedWarrior = updateData[0];
        setWarrior({
          ...warrior,
          ...updatedWarrior,
          avatar_url: avatarUrl,
          metadata: {
            bio: editBio,
            socialLinks: editSocials
          }
        });
      } else {
        // Fallback if no data returned
        setWarrior({
          ...warrior,
          avatar_url: avatarUrl,
          metadata: {
            bio: editBio,
            socialLinks: editSocials
          }
        });
      }
      
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        console.error('Unknown error type:', typeof error);
      }
    } finally {
      setUpdateLoading(false);
    }
  };
  
  // Enter edit mode
  const enterEditMode = () => {
    if (warrior) {
      setEditBio(warrior.metadata?.bio || '');
      setEditSocials(warrior.metadata?.socialLinks || {});
      setIsEditMode(true);
    }
  };
  
  // Cancel edit mode
  const cancelEditMode = () => {
    setIsEditMode(false);
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  if (loading) {
    return <BitcoinLoader />;
  }

  if (error || !warrior) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="bg-red-900/30 border border-red-500/20 rounded-lg p-4 text-red-400 mb-6">
            {error || 'Warrior not found'}
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center text-cyan hover:text-cyan-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-cyan hover:text-cyan-light transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        {/* Hero Section */}
        <div className="relative w-full h-48 md:h-64 rounded-lg bg-slate-800/50 border border-purple-500/20 mb-6 overflow-hidden">
          {/* Background with glitch effect */}
          <div className="absolute inset-0 bg-[url('/images/cyber-grid.png')] opacity-10 bg-cover"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/50 to-blue-900/50"></div>
          <div className="absolute inset-0 bg-slate-900/80"></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-center h-full p-4">
            <div className="relative mb-4 md:mb-0 md:mr-8">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-purple-500 relative">
                {isEditMode ? (
                  <>
                    <Image
                      src={avatarPreview || warrior.avatar_url || '/images/default-avatar.jpg'}
                      alt={warrior.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <label 
                      htmlFor="avatar-upload"
                      className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-white" />
                      <input 
                        id="avatar-upload" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </>
                ) : (
                  <Image
                    src={warrior.avatar_url || '/images/default-avatar.jpg'}
                    alt={warrior.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-red p-1.5 rounded-full">
                <Sword className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                {warrior.name}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mb-2">
                {warrior.dojo && (
                  <Link 
                    href={`/dojos/${warrior.dojo.id}`}
                    className="bg-blue-900/30 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5 text-xs flex items-center"
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {warrior.dojo.name}
                  </Link>
                )}
                
                {/* Social Links */}
                {warrior.metadata?.socialLinks?.github && (
                  <a 
                    href={warrior.metadata.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-900/30 text-gray-300 hover:text-purple border border-gray-500/20 rounded-full px-2 py-0.5 text-xs flex items-center transition-colors"
                  >
                    <Github className="w-3 h-3 mr-1" />
                    GitHub
                  </a>
                )}
                
                {warrior.metadata?.socialLinks?.twitter && (
                  <a 
                    href={warrior.metadata.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-900/30 text-gray-300 hover:text-cyan border border-gray-500/20 rounded-full px-2 py-0.5 text-xs flex items-center transition-colors"
                  >
                    <Twitter className="w-3 h-3 mr-1" />
                    Twitter
                  </a>
                )}
                
                {warrior.metadata?.socialLinks?.website && (
                  <a 
                    href={warrior.metadata.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-900/30 text-gray-300 hover:text-red border border-gray-500/20 rounded-full px-2 py-0.5 text-xs flex items-center transition-colors"
                  >
                    <Globe className="w-3 h-3 mr-1" />
                    Website
                  </a>
                )}
              </div>
              <p className="text-gray-400 text-sm">
                Warrior since {new Date(warrior.created_at).toLocaleDateString()}
              </p>
              
              {/* Edit Profile Button (only shown to owner) */}
              {authState.warrior?.id === warrior.id && !isEditMode && (
                <button 
                  onClick={enterEditMode}
                  className="mt-2 flex items-center justify-center mx-auto md:mx-0 bg-purple-900/30 text-purple-400 border border-purple-500/20 rounded-full px-3 py-1 text-xs hover:bg-purple-900/50 transition-colors"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit Profile
                </button>
              )}
              
              {/* Edit Mode Controls */}
              {authState.warrior?.id === warrior.id && isEditMode && (
                <div className="flex items-center justify-center md:justify-start space-x-2 mt-2">
                  <button 
                    onClick={saveProfileChanges}
                    disabled={updateLoading}
                    className="flex items-center justify-center bg-green-900/30 text-green-400 border border-green-500/20 rounded-full px-3 py-1 text-xs hover:bg-green-900/50 transition-colors"
                  >
                    {updateLoading ? (
                      <BitcoinLoader />
                    ) : (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Save
                      </>
                    )}
                  </button>
                  <button 
                    onClick={cancelEditMode}
                    className="flex items-center justify-center bg-red-900/30 text-red-400 border border-red-500/20 rounded-full px-3 py-1 text-xs hover:bg-red-900/50 transition-colors"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </button>
                </div>
              )}
              
              {/* Success message */}
              {updateSuccess && (
                <div className="mt-2 text-green-400 text-xs animate-fade-out">
                  Profile updated successfully!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Warrior Stats</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-5 h-5 text-cyan" />
                    <span className="text-gray-400 text-sm">Energy</span>
                  </div>
                  <p className="text-2xl font-bold text-cyan">{warrior.energy || 100}</p>
                </div>
                
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-400 text-sm">Level</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">{warrior.level || 1}</p>
                </div>
                
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-gray-400 text-sm">Rank</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {warrior.rank === 0 ? 'Unranked' : `#${warrior.rank}`}
                  </p>
                </div>
                
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Sword className="w-5 h-5 text-red" />
                    <span className="text-gray-400 text-sm">Power Rating</span>
                  </div>
                  <p className="text-2xl font-bold text-red">{warrior.power_level}</p>
                </div>
                
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-5 h-5 text-purple" />
                    <span className="text-gray-400 text-sm">Win Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-purple">{warrior.win_rate}%</p>
                </div>
              </div>
              
              {/* Experience Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Experience</span>
                  <span className="text-purple">
                    {warrior.experience || 0} / 
                    {getNextLevelExp(warrior.level || 1)} XP
                  </span>
                </div>
                <div className="w-full bg-slate-900/70 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-cyan h-full"
                    style={{ 
                      width: `${getExpPercentage(warrior.experience || 0, warrior.level || 1)}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              {/* Energy Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Energy</span>
                  <span className="text-cyan">
                    {warrior.energy || 100} / {(warrior.level || 1) * 100}
                  </span>
                </div>
                <div className="w-full bg-slate-900/70 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-cyan to-blue-400 h-full"
                    style={{ 
                      width: `${Math.min(((warrior.energy || 100) / ((warrior.level || 1) * 100)) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Dojo Info */}
            {warrior.dojo && (
              <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Dojo</h2>
                <Link 
                  href={`/dojos/${warrior.dojo.id}`}
                  className="block group"
                >
                  <div className="flex items-center mb-3">
                    <div className="relative w-12 h-12 rounded overflow-hidden border border-blue-500/30 mr-3">
                      <Image 
                        src={warrior.dojo.banner_url || '/images/default-dojo.png'}
                        alt={warrior.dojo.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <h3 className="text-white font-medium group-hover:text-cyan transition-colors">
                        {warrior.dojo.name}
                      </h3>
                      <p className="text-gray-400 text-sm">{warrior.dojo.location}</p>
                    </div>
                  </div>
                </Link>
                <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-3"></div>
                <Link 
                  href={`/dojos/${warrior.dojo.id}`}
                  className="text-cyan hover:text-cyan-light text-sm flex items-center"
                >
                  <Users className="w-4 h-4 mr-1" />
                  View All Dojo Warriors
                </Link>
              </div>
            )}
          </div>
          
          {/* Right Column - Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-800">
              <div className="flex space-x-6">
                <button 
                  className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'overview' 
                      ? 'border-purple text-purple' 
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button 
                  className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'tournaments' 
                      ? 'border-cyan text-cyan' 
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setActiveTab('tournaments')}
                >
                  Tournaments
                </button>
              </div>
            </div>
            
            {/* Tab Content */}
            {activeTab === 'overview' && (
              <>
                {/* Bio */}
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-white mb-4">About</h2>
                  
                  {isEditMode ? (
                    <div className="mb-4">
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        className="w-full bg-slate-900/50 border border-purple-500/20 rounded-lg p-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        rows={4}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-300 mb-4">
                      {warrior.metadata?.bio || `${warrior.name} is a skilled warrior. With a power level of ${warrior.power_level} ${warrior.rank === 0 ? 'and currently Unranked' : `and a rank of #${warrior.rank}`}, they are a formidable opponent in the Nakamoto League.`}
                    </p>
                  )}
                  
                  {/* Social Links Edit Form */}
                  {isEditMode && (
                    <div className="mt-4 space-y-3">
                      <h3 className="text-white font-medium text-sm mb-2">Social Links</h3>
                      
                      <div className="flex items-center space-x-3">
                        <Github className="w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={editSocials.github || ''}
                          onChange={(e) => setEditSocials({...editSocials, github: e.target.value})}
                          placeholder="GitHub URL"
                          className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded p-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Twitter className="w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={editSocials.twitter || ''}
                          onChange={(e) => setEditSocials({...editSocials, twitter: e.target.value})}
                          placeholder="Twitter URL"
                          className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded p-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Globe className="w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={editSocials.website || ''}
                          onChange={(e) => setEditSocials({...editSocials, website: e.target.value})}
                          placeholder="Website URL"
                          className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded p-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Tournaments Preview */}
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Tournament History</h2>
                    <button 
                      onClick={() => setActiveTab('tournaments')}
                      className="text-cyan hover:text-cyan-light text-sm transition-colors"
                    >
                      View All
                    </button>
                  </div>
                  
                  {tournaments.length === 0 ? (
                    <p className="text-gray-400">No tournament participation yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {tournaments.slice(0, 3).map(tournament => (
                        <Link
                          key={tournament.id}
                          href={`/tournaments/${tournament.id}`}
                          className="block bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800/70 transition-colors"
                        >
                          <h3 className="text-white font-medium mb-1">{tournament.title}</h3>
                          <div className="flex items-center text-gray-400 text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>
                              {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            
            {activeTab === 'tournaments' && (
              <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Tournament History</h2>
                
                {tournaments.length === 0 ? (
                  <p className="text-gray-400">No tournament participation yet.</p>
                ) : (
                  <div className="space-y-4">
                    {tournaments.map(tournament => (
                      <Link
                        key={tournament.id}
                        href={`/tournaments/${tournament.id}`}
                        className="block bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800/70 transition-colors"
                      >
                        <h3 className="text-white font-medium mb-2">{tournament.title}</h3>
                        <div className="flex items-center text-gray-400 text-sm mb-2">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>
                            {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-2">
                          {new Date() < new Date(tournament.end_date) ? (
                            <span className="bg-green-900/30 text-green-400 border border-green-500/30 px-2 py-1 rounded-full text-xs">
                              Active
                            </span>
                          ) : (
                            <span className="bg-purple-900/30 text-purple-400 border border-purple-500/30 px-2 py-1 rounded-full text-xs">
                              Completed
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default WarriorProfile;