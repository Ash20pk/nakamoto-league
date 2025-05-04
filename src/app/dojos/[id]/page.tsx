'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Shield, 
  Trophy, 
  Users, 
  MapPin, 
  Sword, 
  Star, 
  Globe, 
  Github, 
  Twitter,
  ArrowLeft,
  Zap,
  Edit,
  Upload,
  X,
  Check,
  Building,
  Calendar
} from 'lucide-react';
import BitcoinLoader from '@/components/BitcoinLoader';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/providers/AuthProvider';

interface DojoData {
  id: string;
  name: string;
  description: string;
  location: string;
  banner_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    specialization?: string;
    socialLinks?: {
      github?: string;
      twitter?: string;
      website?: string;
    };
    tags?: string[];
  };
  owner: {
    username: string;
    avatar_url: string | null;
  };
  stats: {
    totalWarriors: number;
    activeTournaments: number;
    victories: number;
    powerLevel: number;
    winRate: number;
  };
}

interface Warrior {
  id: string;
  name: string;
  rank: number;
  power_level: number;
  avatar_url: string | null;
  win_rate: number;
  level?: number;
}

interface Tournament {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  format: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  banner_url: string | null;
}

const DojoPage = () => {
  const params = useParams();
  const router = useRouter();
  const { authState } = useAuth();
  const supabase = createClientComponentClient<Database>();
  
  const [dojo, setDojo] = useState<DojoData | null>(null);
  const [warriors, setWarriors] = useState<Warrior[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'warriors' | 'tournaments' | 'overview'>('overview');
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSocials, setEditSocials] = useState<{github?: string, twitter?: string, website?: string}>({});
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editSpecialization, setEditSpecialization] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [joiningDojo, setJoiningDojo] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  // Check if current user is the owner of this dojo
  const isOwner = authState.user?.id === dojo?.owner_id;

  useEffect(() => {
    async function fetchDojoData() {
      try {
        setLoading(true);
        
        // Get dojo ID from params
        const dojoId = params.id as string;
        
        // Fetch dojo data
        const { data: dojoData, error: dojoError } = await supabase
          .from('dojos')
          .select(`
            *,
            owner:profiles (username, avatar_url)
          `)
          .eq('id', dojoId)
          .single();
        
        if (dojoError) throw dojoError;
        
        // Calculate dojo stats
        // Fetch warriors in this dojo
        const { data: dojoWarriors, error: warriorsError } = await supabase
          .from('warriors')
          .select(`
            id, name, rank, power_level, avatar_url, win_rate, level
          `)
          .eq('dojo_id', dojoId)
          .order('rank', { ascending: true });
          
        if (warriorsError) throw warriorsError;
        
        // Set warriors state
        setWarriors(dojoWarriors || []);
        
        // Calculate total power level and win rate
        let totalPowerLevel = 0;
        let totalWinRate = 0;
        
        dojoWarriors?.forEach(warrior => {
          totalPowerLevel += warrior.power_level || 0;
          totalWinRate += warrior.win_rate || 0;
        });
        
        const avgWinRate = dojoWarriors && dojoWarriors.length > 0 
          ? Math.round(totalWinRate / dojoWarriors.length) 
          : 0;
        
        // Get tournaments organized by this dojo
        const { data: dojoTournaments, error: tournamentsError } = await supabase
          .from('tournaments')
          .select(`
            id, title, start_date, end_date, format, banner_url
          `)
          .eq('organizer_id', dojoData.id)
          .order('start_date', { ascending: false });
          
        if (tournamentsError) throw tournamentsError;
        
        // Format tournaments and add status
        const now = new Date();
        const formattedTournaments = dojoTournaments?.map(tournament => {
          const startDate = new Date(tournament.start_date);
          const endDate = new Date(tournament.end_date);
          
          let status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
          if (now < startDate) status = 'UPCOMING';
          else if (now > endDate) status = 'COMPLETED';
          else status = 'ONGOING';
          
          return {
            ...tournament,
            status
          };
        }) || [];
        
        setTournaments(formattedTournaments);
        
        // Get victory count
        // For simplicity, we'll count battles won by any warrior in this dojo
        const { data: victoriesData, error: victoriesError } = await supabase
          .from('battles')
          .select('id')
          .in('winner_id', dojoWarriors?.map(w => w.id) || []);
          
        const victoriesCount = victoriesData?.length || 0;
        
        // Count active tournaments
        const activeTournaments = formattedTournaments.filter(
          t => t.status === 'ONGOING' || t.status === 'UPCOMING'
        ).length;
        
        // Combine all the data
        const processedDojo: DojoData = {
          ...dojoData,
          stats: {
            totalWarriors: dojoWarriors?.length || 0,
            activeTournaments,
            victories: victoriesCount,
            powerLevel: totalPowerLevel,
            winRate: avgWinRate
          }
        };
        
        // Set the dojo data
        setDojo(processedDojo);
        
        // Initialize edit form with current values
        if (processedDojo) {
          setEditName(processedDojo.name);
          setEditDescription(processedDojo.description || '');
          setEditLocation(processedDojo.location || '');
          setEditSocials(processedDojo.metadata?.socialLinks || {});
          setEditTags(processedDojo.metadata?.tags || []);
          setEditSpecialization(processedDojo.metadata?.specialization || '');
        }
      } catch (err) {
        console.error('Error fetching dojo data:', err);
        setError('Failed to load dojo profile');
      } finally {
        setLoading(false);
      }
    }
    
    fetchDojoData();
  }, [params.id, supabase]);

  // Handle banner file selection
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setBannerPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle adding a new tag
  const handleAddTag = () => {
    if (newTag && !editTags.includes(newTag)) {
      setEditTags([...editTags, newTag]);
      setNewTag('');
    }
  };

  // Handle removing a tag
  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag));
  };
  
  // Upload banner to storage
  const uploadBanner = async (file: File, dojoId: string): Promise<string | null> => {
    try {
      if (!isOwner || !authState.user) {
        console.error('Unauthorized: Only the owner can upload a banner');
        throw new Error('Unauthorized: Only the owner can upload a banner');
      }

      // Use the exact bucket name you created in Supabase
      const bucketName = 'dojo-profile';  // This should match exactly what you created
      
      console.log(`Using bucket '${bucketName}'`);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${dojoId}-${Date.now()}.${fileExt}`;
      
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
      
      // Set the banner preview to the new URL
      setBannerPreview(publicUrl);
      
      console.log('File uploaded successfully, public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading banner:');
      
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
      
      return null;
    }
  };
  
  // Save profile changes
  const saveProfileChanges = async () => {
    if (!dojo || !isOwner) return;
    
    setUpdateLoading(true);
    try {
      // Upload banner if changed
      let bannerUrl = dojo.banner_url;
      if (bannerFile) {
        const uploadedUrl = await uploadBanner(bannerFile, dojo.id);
        if (uploadedUrl) {
          bannerUrl = uploadedUrl;
        }
      }
      
      // Create metadata object
      const metadata = {
        specialization: editSpecialization,
        socialLinks: editSocials,
        tags: editTags
      };
      
      // Update dojo with all fields
      const { error: updateError, data: updateData } = await supabase
        .from('dojos')
        .update({ 
          name: editName,
          description: editDescription,
          location: editLocation,
          banner_url: bannerUrl,
          metadata: metadata 
        })
        .eq('id', dojo.id)
        .select();
        
      if (updateError) throw updateError;
      
      // Update local state with the updated data
      if (updateData && updateData.length > 0) {
        setDojo({
          ...dojo,
          ...updateData[0],
          banner_url: bannerUrl,
          metadata: metadata
        });
      }
      
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setUpdateLoading(false);
    }
  };
  
  // Enter edit mode
  const enterEditMode = () => {
    if (dojo) {
      setEditName(dojo.name);
      setEditDescription(dojo.description || '');
      setEditLocation(dojo.location || '');
      setEditSocials(dojo.metadata?.socialLinks || {});
      setEditTags(dojo.metadata?.tags || []);
      setEditSpecialization(dojo.metadata?.specialization || '');
      setIsEditMode(true);
    }
  };
  
  // Cancel edit mode
  const cancelEditMode = () => {
    setIsEditMode(false);
    setBannerPreview(null);
    setBannerFile(null);
  };

  // Join dojo function
  const joinDojo = async () => {
    if (!authState.warrior || !dojo) return;
    
    try {
      setJoiningDojo(true);
      
      const response = await fetch(`/api/warriors/${authState.warrior.id}/dojo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dojoId: dojo.id }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join dojo');
      }
      
      // Update local state
      if (authState.warrior) {
        authState.warrior.dojo_id = dojo.id;
      }
      
      // Fetch updated warriors list
      const { data: updatedWarriors, error: warriorsError } = await supabase
        .from('warriors')
        .select(`
          id, name, rank, power_level, avatar_url, win_rate, level
        `)
        .eq('dojo_id', dojo.id)
        .order('rank', { ascending: true });
        
      if (warriorsError) {
        console.error('Error fetching updated warriors:', warriorsError);
      } else {
        // Update warriors state with the new list
        setWarriors(updatedWarriors || []);
        
        // Update dojo stats
        if (dojo) {
          setDojo({
            ...dojo,
            stats: {
              ...dojo.stats,
              totalWarriors: (updatedWarriors?.length || 0)
            }
          });
        }
      }
      
      setJoinSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setJoinSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error joining dojo:', error);
      setError(error instanceof Error ? error.message : 'Failed to join dojo');
    } finally {
      setJoiningDojo(false);
    }
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <BitcoinLoader />;
  }

  if (error || !dojo) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="bg-red-900/30 border border-red-500/20 rounded-lg p-4 text-red-400 mb-6">
            {error || 'Dojo not found'}
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

  console.log(dojo);

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

        {/* Hero Banner Section */}
        <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden mb-6">
          {isEditMode ? (
            <div className="absolute inset-0 bg-slate-800/90 flex items-center justify-center">
              {bannerPreview ? (
                <Image
                  src={bannerPreview}
                  alt="Banner preview"
                  fill
                  className="object-cover opacity-70"
                  priority
                />
              ) : dojo.banner_url ? (
                <Image
                  src={dojo.banner_url}
                  alt={dojo.name}
                  fill
                  className="object-cover opacity-70"
                  priority
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-slate-800"></div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <label 
                  htmlFor="banner-upload"
                  className="bg-slate-800/80 border border-purple-500/30 rounded-lg p-4 flex flex-col items-center cursor-pointer hover:bg-slate-800/50 transition-colors"
                >
                  <Upload className="w-8 h-8 text-cyan mb-2" />
                  <span className="text-white font-medium">Upload Dojo Banner</span>
                  <span className="text-gray-400 text-sm">Recommended: 1200x400px</span>
                  <input 
                    id="banner-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleBannerChange}
                  />
                </label>
              </div>
            </div>
          ) : (
            <>
              {dojo.banner_url ? (
                <Image
                  src={dojo.banner_url}
                  alt={dojo.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-slate-800"></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70"></div>
            </>
          )}
          
          {/* Dojo Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between">
              <div>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-slate-800/80 border border-purple-500/30 rounded px-2 py-1 text-white text-2xl md:text-3xl font-bold mb-2 focus:outline-none focus:border-purple-500"
                    placeholder="Dojo Name"
                  />
                ) : (
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg">
                    {dojo.name}
                  </h1>
                )}
                
                <div className="flex items-center mb-2">
                  {isEditMode ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-cyan" />
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="bg-slate-800/80 border border-purple-500/30 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-purple-500"
                        placeholder="Location"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-300 text-sm">
                      <MapPin className="w-4 h-4 mr-1 text-cyan" />
                      {dojo.location || 'Unknown Location'}
                    </div>
                  )}
                </div>
                
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editSpecialization}
                      onChange={(e) => setEditSpecialization(e.target.value)}
                      className="bg-slate-800/80 border border-purple-500/30 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Select Specialization</option>
                      <option value="Blockchain Development">Blockchain Development</option>
                      <option value="Smart Contracts">Smart Contracts</option>
                      <option value="Web3">Web3</option>
                      <option value="DeFi">DeFi</option>
                      <option value="NFT">NFT</option>
                      <option value="AI/ML">AI/ML</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="Full Stack">Full Stack</option>
                    </select>
                  </div>
                ) : dojo.metadata?.specialization ? (
                  <div className="bg-purple-900/30 text-purple-400 border border-purple-500/20 rounded-lg px-3 py-1 text-xs inline-flex">
                    {dojo.metadata.specialization}
                  </div>
                ) : null}
              </div>
              
              <div className="mt-4 md:mt-0">
                {isOwner && !isEditMode && (
                  <button 
                    onClick={enterEditMode}
                    className="bg-purple-900/30 text-purple-400 border border-purple-500/30 rounded-lg px-4 py-2 hover:bg-purple-900/50 transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Dojo
                  </button>
                )}
                
                {isOwner && isEditMode && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={saveProfileChanges}
                      disabled={updateLoading}
                      className="bg-green-900/30 text-green-400 border border-green-500/30 rounded-lg px-4 py-2 hover:bg-green-900/50 transition-colors flex items-center gap-2"
                    >
                      {updateLoading ? (
                        <span className="animate-pulse">Saving...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button 
                      onClick={cancelEditMode}
                      className="bg-red-900/30 text-red-400 border border-red-500/30 rounded-lg px-4 py-2 hover:bg-red-900/50 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
                
                {updateSuccess && (
                  <div className="mt-2 text-green-400 text-xs animate-fade-out">
                    Dojo updated successfully!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Info & Stats */}
          <div className="space-y-6">
            {/* Dojo Stats Card */}
            <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Dojo Stats</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-5 h-5 text-cyan" />
                    <span className="text-gray-400 text-sm">Warriors</span>
                  </div>
                  <p className="text-2xl font-bold text-cyan">{dojo.stats.totalWarriors}</p>
                </div>
                
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-gray-400 text-sm">Victories</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-500">{dojo.stats.victories}</p>
                </div>
                
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Sword className="w-5 h-5 text-red" />
                    <span className="text-gray-400 text-sm">Power Level</span>
                  </div>
                  <p className="text-2xl font-bold text-red">{dojo.stats.powerLevel}</p>
                </div>
                
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-5 h-5 text-purple" />
                    <span className="text-gray-400 text-sm">Win Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-purple">{dojo.stats.winRate}%</p>
                </div>
              </div>
              
              <div className="mt-4 bg-slate-900/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-400 text-sm">Active Tournaments</span>
                </div>
                <p className="text-2xl font-bold text-blue-400">{dojo.stats.activeTournaments}</p>
              </div>
            </div>
        
            
            {/* Social Links & Tags */}
            <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Information</h2>
              
              {isEditMode ? (
                <div className="space-y-4 mb-6">
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
              ) : (
                <>
                  {(dojo.metadata?.socialLinks?.github || dojo.metadata?.socialLinks?.twitter || dojo.metadata?.socialLinks?.website) && (
                    <div className="mb-6">
                      <h3 className="text-white font-medium text-sm mb-2">Social Links</h3>
                      <div className="flex flex-wrap gap-3">
                        {dojo.metadata?.socialLinks?.github && (
                          <a 
                            href={dojo.metadata.socialLinks.github}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-slate-900/50 hover:bg-slate-900/80 transition-colors p-2 rounded"
                          >
                            <Github className="w-4 h-4 text-purple-400" />
                            <span className="text-gray-300 text-sm">GitHub</span>
                          </a>
                        )}
                        
                        {dojo.metadata?.socialLinks?.twitter && (
                          <a 
                            href={dojo.metadata.socialLinks.twitter}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-slate-900/50 hover:bg-slate-900/80 transition-colors p-2 rounded"
                          >
                            <Twitter className="w-4 h-4 text-cyan" />
                            <span className="text-gray-300 text-sm">Twitter</span>
                          </a>
                        )}
                        
                        {dojo.metadata?.socialLinks?.website && (
                          <a 
                            href={dojo.metadata.socialLinks.website}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-slate-900/50 hover:bg-slate-900/80 transition-colors p-2 rounded"
                          >
                            <Globe className="w-4 h-4 text-blue-400" />
                            <span className="text-gray-300 text-sm">Website</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Tags Section */}
              {isEditMode ? (
                <div className="space-y-4">
                  <h3 className="text-white font-medium text-sm mb-2">Tags</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag..."
                      className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded p-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-purple-400 hover:bg-purple-900/50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-purple-900/30 text-purple-400 rounded-lg border border-purple-500/20 text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {dojo.metadata?.tags && dojo.metadata.tags.length > 0 && (
                    <div>
                      <h3 className="text-white font-medium text-sm mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {dojo.metadata.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-purple-900/30 text-purple-400 rounded-lg border border-purple-500/20 text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Actions Card */}
            {authState.user && !isOwner && (
              <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
                
                {authState.warrior ? (
                  <div className="space-y-3">
                    {authState.warrior.dojo_id !== dojo.id ? (
                      <>
                        <button
                          onClick={joinDojo}
                          disabled={joiningDojo}
                          className="w-full neon-button-red py-2 text-white font-medium flex items-center justify-center"
                        >
                          {joiningDojo ? (
                            <span className="animate-pulse">Joining...</span>
                          ) : (
                            <>
                              <Shield className="w-4 h-4 mr-2" />
                              Join This Dojo
                            </>
                          )}
                        </button>
                        {joinSuccess && (
                          <div className="bg-green-900/30 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2 animate-fade-in">
                            <Check className="w-4 h-4" />
                            Successfully joined dojo!
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="bg-green-900/30 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        You are a member of this dojo
                      </div>
                    )}
                    
                    <button
                      onClick={() => router.push(`/dashboard/battles/create?dojo=${dojo.id}`)}
                      className="w-full bg-slate-900/50 border border-cyan/20 hover:border-cyan/40 py-2 text-cyan font-medium transition-colors rounded-lg flex items-center justify-center mt-2"
                    >
                      <Sword className="w-4 h-4 mr-2" />
                      Challenge to Battle
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-slate-900/50 border border-purple-500/20 rounded-lg">
                    <p className="text-gray-400 mb-3">Create a warrior to join this dojo</p>
                    <Link href="/dashboard/warriors/register" className="neon-button-cyan px-4 py-2 text-white font-medium">
                      Create Warrior
                    </Link>
                  </div>
                )}
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
                    activeTab === 'warriors' 
                      ? 'border-cyan text-cyan' 
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setActiveTab('warriors')}
                >
                  Warriors
                </button>
                <button 
                  className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'tournaments' 
                      ? 'border-red text-red' 
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
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-white mb-4">About</h2>
                  
                  {isEditMode ? (
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full h-32 bg-slate-900/50 border border-slate-700/50 rounded p-3 text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                      placeholder="Describe your dojo..."
                    />
                  ) : (
                    <p className="text-gray-300">
                      {dojo.description || `${dojo.name} is a prestigious dojo in the Nakamoto League, focusing on blockchain technology and web3 development. Join us to participate in hackathons and improve your skills.`}
                    </p>
                  )}
                </div>
                
                {/* Top Warriors Preview */}
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Top Warriors</h2>
                    <button 
                      onClick={() => setActiveTab('warriors')}
                      className="text-cyan hover:text-cyan-light text-sm transition-colors"
                    >
                      View All
                    </button>
                  </div>
                  
                  {warriors.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-400 mb-4">No warriors have joined this dojo yet.</p>
                      {authState.warrior && authState.warrior.dojo_id !== dojo.id && (
                        <button
                          onClick={joinDojo}
                          disabled={joiningDojo}
                          className="mt-3 neon-button-cyan px-4 py-2 text-white font-medium"
                        >
                          {joiningDojo ? (
                            <span className="animate-pulse">Joining...</span>
                          ) : (
                            <>
                              <Shield className="w-4 h-4 mr-2" />
                              Join This Dojo
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {warriors.slice(0, 4).map((warrior) => (
                        <Link
                          key={warrior.id}
                          href={`/warriors/${warrior.id}`}
                          className="flex items-center p-3 bg-slate-900/50 hover:bg-slate-900/80 transition-colors border border-slate-700/50 rounded-lg"
                        >
                          <div className="relative w-12 h-12 rounded-full overflow-hidden mr-3 border border-cyan/30">
                            <Image 
                              src={warrior.avatar_url || '/images/default-avatar.png'}
                              alt={warrior.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-white">{warrior.name}</h3>
                              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                                Lvl {warrior.level || 1}
                              </span>
                            </div>
                            <div className="flex items-center text-gray-400 text-xs mt-1">
                              <Zap className="w-4 h-4 mr-1 text-cyan" />
                              <span>Level {warrior.level || 1}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Recent Tournaments Preview */}
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Recent Tournaments</h2>
                    <button 
                      onClick={() => setActiveTab('tournaments')}
                      className="text-cyan hover:text-cyan-light text-sm transition-colors"
                    >
                      View All
                    </button>
                  </div>
                  
                  {tournaments.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-400">This dojo hasn't organized any tournaments yet.</p>
                      {isOwner && (
                        <Link
                          href="/tournaments/create"
                          className="mt-3 neon-button-red px-4 py-2 text-white font-medium inline-block"
                        >
                          Create Tournament
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tournaments.slice(0, 3).map((tournament) => (
                        <Link
                          key={tournament.id}
                          href={`/tournaments/${tournament.id}`}
                          className="block bg-slate-900/50 hover:bg-slate-900/80 transition-colors border border-slate-700/50 rounded-lg overflow-hidden"
                        >
                          <div className="flex flex-col md:flex-row">
                            <div className="md:w-1/3 h-32 md:h-auto relative">
                              <Image 
                                src={tournament.banner_url || '/images/default-tournament.jpg'}
                                alt={tournament.title}
                                width={300}
                                height={200}
                                className="object-cover h-full w-full"
                                unoptimized
                              />
                              <div className="absolute top-2 right-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  tournament.status === 'UPCOMING' 
                                    ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' 
                                    : tournament.status === 'ONGOING'
                                    ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                                    : 'bg-purple-900/30 text-purple-400 border border-purple-500/30'
                                }`}>
                                  {tournament.status}
                                </span>
                              </div>
                            </div>
                            <div className="p-4 md:w-2/3">
                              <h3 className="font-medium text-white text-lg mb-2">{tournament.title}</h3>
                              <div className="flex flex-wrap items-center text-gray-400 text-sm gap-y-1">
                                <div className="flex items-center mr-4">
                                  <Calendar className="w-4 h-4 mr-1.5 text-red" />
                                  Start: {formatDate(tournament.start_date)}
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1.5 text-red" />
                                  End: {formatDate(tournament.end_date)}
                                </div>
                                <div className="flex items-center col-span-2">
                                  <Trophy className="w-4 h-4 mr-1.5 text-yellow-500" />
                                  Format: {tournament.format.replace('_', ' ')}
                                </div>
                              </div>
                              
                              <div className="mt-3 flex justify-between items-center">
                                <div className="flex items-center">
                                  <Shield className="w-4 h-4 mr-1.5 text-cyan" />
                                  <span className="text-cyan">Organized by this dojo</span>
                                </div>
                                
                                {tournament.status === 'UPCOMING' && (
                                  <button className="bg-red-900/30 text-red-400 border border-red-500/20 px-3 py-1 rounded-lg text-sm hover:bg-red-900/50 transition-colors">
                                    Register
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'warriors' && (
              <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Dojo Warriors</h2>
                
                {warriors.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-400 mb-4">No warriors have joined this dojo yet.</p>
                    {authState.warrior && authState.warrior.dojo_id !== dojo.id && (
                      <button
                        onClick={joinDojo}
                        disabled={joiningDojo}
                        className="neon-button-cyan px-4 py-2 text-white font-medium"
                      >
                        {joiningDojo ? (
                          <span className="animate-pulse">Joining...</span>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Join This Dojo
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {warriors.map((warrior) => (
                      <Link
                        key={warrior.id}
                        href={`/warriors/${warrior.id}`}
                        className="flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-900/80 transition-colors border border-slate-700/50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <div className="relative w-14 h-14 rounded-full overflow-hidden mr-4 border border-cyan/30">
                            <Image 
                              src={warrior.avatar_url || '/images/default-avatar.png'}
                              alt={warrior.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-white">{warrior.name}</h3>
                              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                                Lvl {warrior.level || 1}
                              </span>
                            </div>
                            <div className="flex items-center text-gray-400 text-xs mt-1">
                              <Zap className="w-4 h-4 mr-1 text-cyan" />
                              <span>Level {warrior.level || 1}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-400">Power:</span>
                              <span className="text-red font-medium">{warrior.power_level}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-400">Rank:</span>
                              <span className="text-yellow-500 font-medium">#{warrior.rank || '—'}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded">
                            <Star className="w-4 h-4 text-purple" />
                            <span className="text-purple font-medium">{warrior.win_rate}%</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                
                {/* Pagination would go here if needed */}
              </div>
            )}
            
            {activeTab === 'tournaments' && (
              <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Tournaments</h2>
                  {isOwner && (
                    <Link
                      href="/tournaments/create"
                      className="neon-button-red px-4 py-2 text-white font-medium"
                    >
                      Create Tournament
                    </Link>
                  )}
                </div>
                
                {tournaments.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-400">This dojo hasn't organized any tournaments yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tournaments.map((tournament) => (
                      <Link
                        key={tournament.id}
                        href={`/tournaments/${tournament.id}`}
                        className="block bg-slate-900/50 hover:bg-slate-900/80 transition-colors border border-slate-700/50 rounded-lg overflow-hidden"
                      >
                        <div className="flex flex-col md:flex-row">
                          <div className="md:w-1/3 h-40 md:h-auto relative">
                            <Image 
                              src={tournament.banner_url || '/images/default-tournament.jpg'}
                              alt={tournament.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/10 to-slate-900/60"></div>
                            <div className="absolute top-3 right-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                tournament.status === 'UPCOMING' 
                                  ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' 
                                  : tournament.status === 'ONGOING'
                                  ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                                  : 'bg-purple-900/30 text-purple-400 border border-purple-500/30'
                              }`}>
                                {tournament.status}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 md:w-2/3">
                            <h3 className="font-medium text-white text-lg mb-2">{tournament.title}</h3>
                            <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-400">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1.5 text-red" />
                                Start: {formatDate(tournament.start_date)}
                              </div>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1.5 text-red" />
                                End: {formatDate(tournament.end_date)}
                              </div>
                              <div className="flex items-center col-span-2">
                                <Trophy className="w-4 h-4 mr-1.5 text-yellow-500" />
                                Format: {tournament.format.replace('_', ' ')}
                              </div>
                            </div>
                            
                            <div className="mt-3 flex justify-between items-center">
                              <div className="flex items-center">
                                <Shield className="w-4 h-4 mr-1.5 text-cyan" />
                                <span className="text-cyan">Organized by this dojo</span>
                              </div>
                              
                              {tournament.status === 'UPCOMING' && (
                                <button className="bg-red-900/30 text-red-400 border border-red-500/20 px-3 py-1 rounded-lg text-sm hover:bg-red-900/50 transition-colors">
                                  Register
                                </button>
                              )}
                            </div>
                          </div>
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

export default DojoPage;