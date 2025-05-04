'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { usePermissions } from '@/hooks/usePermissions';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Calendar,
  CalendarDays,
  ChevronRight,
  Clock,
  Coins,
  DollarSign,
  FileText,
  Flag,
  Globe,
  Grid,
  HelpCircle,
  Info,
  Trophy,
  Upload,
  Users,
  X,
  Plus,
  Check,
  Hash,
  Award,
  Swords,
  Sparkles,
  Rocket,
  Gauge,
  ListChecks,
  BookOpen,
  Zap,
  UserPlus,
  Github,
  Video,
  AlertCircle
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import Link from 'next/link';

interface FormData {
  // Basic Information
  title: string;
  description: string;
  format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS';
  
  // Dates
  registrationStart: string;
  registrationDeadline: string;
  startDate: string;
  endDate: string;
  
  // Prizes
  entryFee: number;
  prizePool: {
    amount: number;
    currency: string;
    distribution: {
      [key: string]: number;
    };
  };
  
  // Requirements
  requirements: {
    minRank: number;
    minPowerLevel: number;
    eligibility: {
      isOpen: boolean;
      requirementText: string;
    };
  };
  
  // Participants
  maxParticipants: number;
  minParticipants: number;
  
  // Rules
  rules: string[];
  
  // Resources
  resources: {
    title: string;
    url: string;
    type: 'DOCUMENTATION' | 'GITHUB' | 'VIDEO' | 'WEBSITE';
  }[];
  
  // Tracks & Categories
  tracks: {
    name: string;
    description: string;
    prize: number;
  }[];
  
  // Judges
  judges: {
    name: string;
    profileUrl: string;
    bio: string;
  }[];
  
  // Sponsors
  sponsors: {
    name: string;
    logo: string;
    url: string;
    tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
  }[];
  
  // Metadata
  tags: string[];
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  website: string;
  bannerImageFile: File | null;
  bannerImagePreview: string;
}

export default function CreateTournamentPage() {
  const router = useRouter();
  const { authState } = useAuth();
  const { canCreateTournament } = usePermissions();
  const supabase = createClientComponentClient<Database>();

  // Define our form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    format: 'SINGLE_ELIMINATION',
    registrationStart: '',
    registrationDeadline: '',
    startDate: '',
    endDate: '',
    entryFee: 0,
    prizePool: {
      amount: 1000,
      currency: 'USD',
      distribution: {
        '1st': 60,
        '2nd': 30,
        '3rd': 10
      }
    },
    requirements: {
      minRank: 0,
      minPowerLevel: 0,
      eligibility: {
        isOpen: true,
        requirementText: ''
      }
    },
    maxParticipants: 128,
    minParticipants: 8,
    rules: ['All submissions must be original work', 'Teams must not exceed 4 members', 'Code must be open source'],
    resources: [],
    tracks: [],
    judges: [],
    sponsors: [],
    tags: [],
    visibility: 'PUBLIC',
    website: '',
    bannerImageFile: null,
    bannerImagePreview: ''
  });

  // Handle multi-step form navigation
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Handle adding new rule
  const [newRule, setNewRule] = useState('');
  
  // Handle adding new tag
  const [newTag, setNewTag] = useState('');
  
  // Handle new track
  const [newTrack, setNewTrack] = useState({
    name: '',
    description: '',
    prize: 0
  });
  
  // Handle new resource
  const [newResource, setNewResource] = useState({
    title: '',
    url: '',
    type: 'DOCUMENTATION' as const
  });
  
  // Check if the user has permission to create tournaments
  useEffect(() => {
    if (!authState.loading && !canCreateTournament) {
      router.push('/tournaments');
    }
  }, [authState.loading, canCreateTournament, router]);

  // Initialize today's date and future dates for the form
  useEffect(() => {
    const today = new Date();
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);
    
    const threeWeeksFromNow = new Date(today);
    threeWeeksFromNow.setDate(today.getDate() + 21);
    
    const fourWeeksFromNow = new Date(today);
    fourWeeksFromNow.setDate(today.getDate() + 28);
    
    setFormData(prev => ({
      ...prev,
      registrationStart: today.toISOString().split('T')[0],
      registrationDeadline: twoWeeksFromNow.toISOString().split('T')[0],
      startDate: threeWeeksFromNow.toISOString().split('T')[0],
      endDate: fourWeeksFromNow.toISOString().split('T')[0]
    }));
  }, []);
  
  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      const parentKey = parent as keyof typeof formData;
      const parentValue = formData[parentKey];
      
      // Check if the parent value is an object before spreading
      if (parentValue && typeof parentValue === 'object' && !Array.isArray(parentValue)) {
        setFormData({
          ...formData,
          [parent]: {
            ...parentValue,
            [child]: value
          }
        });
      } else {
        // Handle the case where parent doesn't exist or isn't an object
        setFormData({
          ...formData,
          [parent]: { [child]: value }
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Handle numeric input changes
  const handleNumericInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let numericValue: number;
    
    try {
      numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        numericValue = 0;
      }
    } catch (error) {
      numericValue = 0;
    }
    
    // Handle nested properties
    if (name.includes('.')) {
      const parts = name.split('.');
      
      if (parts.length === 2) {
        const [parent, child] = parts;
        const parentKey = parent as keyof typeof formData;
        const parentValue = formData[parentKey];
        
        // Check if the parent value is an object before spreading
        if (parentValue && typeof parentValue === 'object' && !Array.isArray(parentValue)) {
          setFormData({
            ...formData,
            [parent]: {
              ...parentValue,
              [child]: numericValue
            }
          });
        } else {
          // Handle the case where parent doesn't exist or isn't an object
          setFormData({
            ...formData,
            [parent]: { [child]: numericValue }
          });
        }
      } else if (parts.length === 3) {
        const [parent, child, grandchild] = parts;
        const parentKey = parent as keyof typeof formData;
        const parentValue = formData[parentKey];
        
        // Check if the parent value is an object before spreading
        if (parentValue && typeof parentValue === 'object' && !Array.isArray(parentValue)) {
          const childValue = (parentValue as any)[child];
          
          // Check if the child value is an object before spreading
          if (childValue && typeof childValue === 'object' && !Array.isArray(childValue)) {
            setFormData({
              ...formData,
              [parent]: {
                ...parentValue,
                [child]: {
                  ...childValue,
                  [grandchild]: numericValue
                }
              }
            });
          } else {
            // Handle the case where child doesn't exist or isn't an object
            setFormData({
              ...formData,
              [parent]: {
                ...parentValue,
                [child]: { [grandchild]: numericValue }
              }
            });
          }
        } else {
          // Handle the case where parent doesn't exist or isn't an object
          setFormData({
            ...formData,
            [parent]: { [child]: { [grandchild]: numericValue } }
          });
        }
      }
    } else {
      setFormData({
        ...formData,
        [name]: numericValue
      });
    }
  };
  
  // Handle prize distribution change
  const handleDistributionChange = (place: string, value: string) => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;
    
    setFormData({
      ...formData,
      prizePool: {
        ...formData.prizePool,
        distribution: {
          ...formData.prizePool.distribution,
          [place]: numericValue
        }
      }
    });
  };
  
  // Add a new rule
  const handleAddRule = () => {
    if (newRule.trim() !== '') {
      setFormData({
        ...formData,
        rules: [...formData.rules, newRule]
      });
      setNewRule('');
    }
  };
  
  // Remove a rule
  const handleRemoveRule = (index: number) => {
    const updatedRules = formData.rules.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      rules: updatedRules
    });
  };
  
  // Add a new tag
  const handleAddTag = () => {
    if (newTag.trim() !== '' && !formData.tags.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag]
      });
      setNewTag('');
    }
  };
  
  // Remove a tag
  const handleRemoveTag = (tag: string) => {
    const updatedTags = formData.tags.filter(t => t !== tag);
    setFormData({
      ...formData,
      tags: updatedTags
    });
  };
  
  // Add a new track
  const handleAddTrack = () => {
    if (newTrack.name.trim() !== '') {
      setFormData({
        ...formData,
        tracks: [...formData.tracks, newTrack]
      });
      setNewTrack({
        name: '',
        description: '',
        prize: 0
      });
    }
  };
  
  // Remove a track
  const handleRemoveTrack = (index: number) => {
    const updatedTracks = formData.tracks.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      tracks: updatedTracks
    });
  };
  
  // Update track field
  const handleTrackChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTrack({
      ...newTrack,
      [name]: name === 'prize' ? Number(value) : value
    });
  };
  
  // Add a new resource
  const handleAddResource = () => {
    if (newResource.title.trim() !== '' && newResource.url.trim() !== '') {
      setFormData({
        ...formData,
        resources: [...formData.resources, newResource]
      });
      setNewResource({
        title: '',
        url: '',
        type: 'DOCUMENTATION'
      });
    }
  };
  
  // Remove a resource
  const handleRemoveResource = (index: number) => {
    const updatedResources = formData.resources.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      resources: updatedResources
    });
  };
  
  // Update resource field
  const handleResourceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewResource({
      ...newResource,
      [name]: value
    });
  };
  
  // Handle banner image upload
  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        bannerImageFile: file
      });
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          bannerImagePreview: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Upload banner image to Supabase storage
  const uploadBannerImage = async (): Promise<string | null> => {
    if (!formData.bannerImageFile || !authState.user) return null;
    
    try {
      const fileExt = formData.bannerImageFile.name.split('.').pop();
      const fileName = `tournament-banner-${Date.now()}.${fileExt}`;
      const filePath = `${authState.user.id}/${fileName}`;
      
      // Upload to tournament-banners bucket
      const { error: uploadError } = await supabase.storage
        .from('tournament-banners')
        .upload(filePath, formData.bannerImageFile, {
          upsert: true,
          cacheControl: '3600'
        });
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('tournament-banners')
        .getPublicUrl(filePath);
        
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading banner image:', error);
      return null;
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authState.user) {
      setError('You must be logged in to create a tournament');
      return;
    }
    
    if (!authState.dojo) {
      setError('You must have a registered dojo to create a tournament');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate dates
      const regStart = new Date(formData.registrationStart);
      const regDeadline = new Date(formData.registrationDeadline);
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (regDeadline <= regStart) {
        throw new Error('Registration deadline must be after registration start');
      }
      
      if (startDate <= regDeadline) {
        throw new Error('Tournament start date must be after registration deadline');
      }
      
      if (endDate <= startDate) {
        throw new Error('Tournament end date must be after start date');
      }
      
      // Upload banner image if provided
      let bannerUrl: string | null = null;
      if (formData.bannerImageFile) {
        bannerUrl = await uploadBannerImage();
      }
      
      // Format prize pool distribution array into the expected JSON structure
      const prizePoolWithDistribution = {
        amount: formData.prizePool.amount,
        currency: formData.prizePool.currency,
        distribution: formData.prizePool.distribution
      };
      
      // Prepare tournament data
      const tournamentData = {
        title: formData.title,
        description: formData.description,
        format: formData.format,
        organizer_id: authState.dojo?.id,
        start_date: formData.startDate,
        end_date: formData.endDate,
        registration_deadline: formData.registrationDeadline,
        max_participants: formData.maxParticipants,
        entry_fee: formData.entryFee,
        prize_pool: prizePoolWithDistribution,
        rules: formData.rules,
        requirements: {
          minRank: formData.requirements.minRank,
          minPowerLevel: formData.requirements.minPowerLevel,
          eligibility: formData.requirements.eligibility
        },
        banner_url: bannerUrl,
        metadata: {
          tracks: formData.tracks,
          resources: formData.resources,
          judges: formData.judges,
          sponsors: formData.sponsors,
          tags: formData.tags,
          visibility: formData.visibility,
          website: formData.website,
          registrationStart: formData.registrationStart,
          minParticipants: formData.minParticipants
        }
      };
      
      // Create tournament in database
      const { data: tournament, error: createError } = await supabase
        .from('tournaments')
        .insert(tournamentData)
        .select()
        .single();
        
      if (createError) throw createError;
      
      // Set success state
      setSuccess(true);
      
      // Redirect to tournament page after a short delay
      setTimeout(() => {
        router.push(`/tournaments/${tournament.id}`);
      }, 2000);
      
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };
  
  // Navigate to next step
  const nextStep = () => {
    setCurrentStep(Math.min(currentStep + 1, 5));
  };
  
  // Navigate to previous step
  const prevStep = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };
  
  // Render progress tracker
  const renderStepIndicator = () => {
    return (
      <div className="mb-8 bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between select-none">
          <div 
            className={`step-item flex flex-col items-center cursor-pointer ${currentStep >= 1 ? 'text-cyan-400' : 'text-gray-500'}`}
            onClick={() => setCurrentStep(1)}
          >
            <div className={`step-number flex items-center justify-center w-8 h-8 rounded-full border ${currentStep >= 1 ? 'border-cyan-500 bg-cyan-900/30' : 'border-gray-700 bg-gray-900/50'} mb-1`}>
              {currentStep > 1 ? <Check className="w-4 h-4" /> : 1}
            </div>
            <div className="step-label text-xs">Basic Info</div>
          </div>
          
          <div className="h-0.5 flex-1 mx-2 bg-gray-800"></div>
          
          <div 
            className={`step-item flex flex-col items-center cursor-pointer ${currentStep >= 2 ? 'text-cyan-400' : 'text-gray-500'}`}
            onClick={() => currentStep > 1 ? setCurrentStep(2) : null}
          >
            <div className={`step-number flex items-center justify-center w-8 h-8 rounded-full border ${currentStep >= 2 ? 'border-cyan-500 bg-cyan-900/30' : 'border-gray-700 bg-gray-900/50'} mb-1`}>
              {currentStep > 2 ? <Check className="w-4 h-4" /> : 2}
            </div>
            <div className="step-label text-xs">Schedule & Prizes</div>
          </div>
          
          <div className="h-0.5 flex-1 mx-2 bg-gray-800"></div>
          
          <div 
            className={`step-item flex flex-col items-center cursor-pointer ${currentStep >= 3 ? 'text-cyan-400' : 'text-gray-500'}`}
            onClick={() => currentStep > 2 ? setCurrentStep(3) : null}
          >
            <div className={`step-number flex items-center justify-center w-8 h-8 rounded-full border ${currentStep >= 3 ? 'border-cyan-500 bg-cyan-900/30' : 'border-gray-700 bg-gray-900/50'} mb-1`}>
              {currentStep > 3 ? <Check className="w-4 h-4" /> : 3}
            </div>
            <div className="step-label text-xs">Rules & Requirements</div>
          </div>
          
          <div className="h-0.5 flex-1 mx-2 bg-gray-800"></div>
          
          <div 
            className={`step-item flex flex-col items-center cursor-pointer ${currentStep >= 4 ? 'text-cyan-400' : 'text-gray-500'}`}
            onClick={() => currentStep > 3 ? setCurrentStep(4) : null}
          >
            <div className={`step-number flex items-center justify-center w-8 h-8 rounded-full border ${currentStep >= 4 ? 'border-cyan-500 bg-cyan-900/30' : 'border-gray-700 bg-gray-900/50'} mb-1`}>
              {currentStep > 4 ? <Check className="w-4 h-4" /> : 4}
            </div>
            <div className="step-label text-xs">Tracks & Resources</div>
          </div>
          
          <div className="h-0.5 flex-1 mx-2 bg-gray-800"></div>
          
          <div 
            className={`step-item flex flex-col items-center cursor-pointer ${currentStep >= 5 ? 'text-cyan-400' : 'text-gray-500'}`}
            onClick={() => currentStep > 4 ? setCurrentStep(5) : null}
          >
            <div className={`step-number flex items-center justify-center w-8 h-8 rounded-full border ${currentStep >= 5 ? 'border-cyan-500 bg-cyan-900/30' : 'border-gray-700 bg-gray-900/50'} mb-1`}>
              5
            </div>
            <div className="step-label text-xs">Review & Publish</div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render the current form step
  const renderFormStep = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfoStep();
      case 2:
        return renderScheduleAndPrizesStep();
      case 3:
        return renderRulesAndRequirementsStep();
      case 4:
        return renderTracksAndResourcesStep();
      case 5:
        return renderReviewStep();
      default:
        return renderBasicInfoStep();
    }
  };
  
  // Step 1: Basic Information
  const renderBasicInfoStep = () => {
    return (
      <div className="space-y-6">
        <div className="form-section">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-cyan-400" />
            Tournament Details
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-2">
                Tournament Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                placeholder="e.g. Blockchain Battle Royale 2025"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-400 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                placeholder="Describe your tournament in detail..."
                rows={5}
                required
              />
            </div>
            
            <div>
              <label htmlFor="format" className="block text-sm font-medium text-gray-400 mb-2">
                Tournament Format <span className="text-red-500">*</span>
              </label>
              <select
                id="format"
                name="format"
                value={formData.format}
                onChange={handleInputChange}
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                required
              >
                <option value="SINGLE_ELIMINATION">Single Elimination</option>
                <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                <option value="ROUND_ROBIN">Round Robin</option>
                <option value="SWISS">Swiss System</option>
              </select>
              <p className="text-gray-400 text-xs mt-1">
                <Info className="w-3 h-3 inline mr-1" />
                Select the tournament structure that best fits your competition.
              </p>
            </div>
          </div>
        </div>
        
        <div className="form-section pt-4 border-t border-gray-800">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-cyan-400" />
            Visibility & Tags
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="visibility" className="block text-sm font-medium text-gray-400 mb-2">
                Tournament Visibility
              </label>
              <select
                id="visibility"
                name="visibility"
                value={formData.visibility}
                onChange={handleInputChange}
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
              >
                <option value="PUBLIC">Public - Visible to everyone</option>
                <option value="UNLISTED">Unlisted - Accessible via link only</option>
                <option value="PRIVATE">Private - Invite only</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-400 mb-2">
                Tournament Website (Optional)
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                placeholder="https://yourtournament.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <div key={tag} className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded-md border border-purple-500/20 text-sm flex items-center">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-gray-400 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 flex-1 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                  placeholder="Add a tag (e.g. Blockchain, AI, Web3)"
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
                  className="px-4 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-purple-400 hover:bg-purple-900/50 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="form-section pt-4 border-t border-gray-800">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-cyan-400" />
            Tournament Banner
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Banner Image (Recommended: 1200×400px)
            </label>
            <div 
              className="border-2 border-dashed border-cyan-500/30 rounded-lg p-8 text-center cursor-pointer hover:border-cyan-500/60 transition-colors"
              onClick={() => document.getElementById('bannerImage')?.click()}
            >
              {formData.bannerImagePreview ? (
                <div className="relative w-full h-48">
                  <Image
                    src={formData.bannerImagePreview}
                    alt="Banner preview"
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">Click to upload tournament banner</p>
                </div>
              )}
              <input
                type="file"
                id="bannerImage"
                accept="image/*"
                className="hidden"
                onChange={handleBannerImageChange}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={nextStep}
            className="neon-button-cyan px-6 py-2 rounded-lg text-white flex items-center"
          >
            Next: Schedule & Prizes
            <ChevronRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };
  
  // Step 2: Schedule & Prizes
  const renderScheduleAndPrizesStep = () => {
    return (
      <div className="space-y-6">
        <div className="form-section">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-cyan-400" />
            Schedule
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="registrationStart" className="block text-sm font-medium text-gray-400 mb-2">
                Registration Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="registrationStart"
                name="registrationStart"
                value={formData.registrationStart}
                onChange={handleInputChange}
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label htmlFor="registrationDeadline" className="block text-sm font-medium text-gray-400 mb-2">
                Registration Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="registrationDeadline"
                name="registrationDeadline"
                value={formData.registrationDeadline}
                onChange={handleInputChange}
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-400 mb-2">
                Tournament Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-400 mb-2">
                Tournament End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
          </div>
          
          <p className="text-gray-400 text-xs mt-2">
            <Info className="w-3 h-3 inline mr-1" />
            Registration must close before the tournament starts, and the end date must be after the start date.
          </p>
        </div>
        
        <div className="form-section pt-4 border-t border-gray-800">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-cyan-400" />
            Participants
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-400 mb-2">
                Maximum Participants <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="maxParticipants"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleNumericInputChange}
                min="2"
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label htmlFor="minParticipants" className="block text-sm font-medium text-gray-400 mb-2">
                Minimum Participants
              </label>
              <input
                type="number"
                id="minParticipants"
                name="minParticipants"
                value={formData.minParticipants}
                onChange={handleNumericInputChange}
                min="2"
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label htmlFor="entryFee" className="block text-sm font-medium text-gray-400 mb-2">
              Entry Fee (0 for free entry)
            </label>
            <div className="relative">
              <input
                type="number"
                id="entryFee"
                name="entryFee"
                value={formData.entryFee}
                onChange={handleNumericInputChange}
                min="0"
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 pl-8 pr-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
              />
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>
        </div>
        
        <div className="form-section pt-4 border-t border-gray-800">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-yellow-500" />
            Prize Pool
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="prizePool.amount" className="block text-sm font-medium text-gray-400 mb-2">
                Total Prize Pool <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="prizePool.amount"
                  name="prizePool.amount"
                  value={formData.prizePool.amount}
                  onChange={handleNumericInputChange}
                  min="0"
                  className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 pl-8 pr-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                  required
                />
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>
            
            <div>
              <label htmlFor="prizePool.currency" className="block text-sm font-medium text-gray-400 mb-2">
                Currency
              </label>
              <select
                id="prizePool.currency"
                name="prizePool.currency"
                value={formData.prizePool.currency}
                onChange={handleInputChange}
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="ETH">ETH</option>
                <option value="BTC">BTC</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Prize Distribution
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(formData.prizePool.distribution).map(([place, percentage]) => (
                <div key={place} className="relative">
                  <input
                    type="number"
                    value={percentage}
                    onChange={(e) => handleDistributionChange(place, e.target.value)}
                    min="0"
                    max="100"
                    className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 pl-16 pr-8 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                  />
                  <div className="absolute left-0 top-0 bottom-0 w-14 bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-medium rounded-l-md border-r border-slate-700">
                    {place}
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    %
                  </div>
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-xs mt-2">
              <Info className="w-3 h-3 inline mr-1" />
              Percentages should add up to 100%. The actual prize amounts will be calculated based on the total prize pool.
            </p>
          </div>
        </div>
        
        <div className="flex justify-between pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={prevStep}
            className="px-6 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800/50 transition-colors"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="neon-button-cyan px-6 py-2 rounded-lg text-white flex items-center"
          >
            Next: Rules & Requirements
            <ChevronRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };
  
  // Step 3: Rules & Requirements
  const renderRulesAndRequirementsStep = () => {
    return (
      <div className="space-y-6">
        <div className="form-section">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Flag className="w-5 h-5 text-cyan-400" />
            Eligibility Requirements
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="requirements.minRank" className="block text-sm font-medium text-gray-400 mb-2">
                Minimum Warrior Rank (0 for no minimum)
              </label>
              <input
                type="number"
                id="requirements.minRank"
                name="requirements.minRank"
                value={formData.requirements.minRank}
                onChange={handleNumericInputChange}
                min="0"
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label htmlFor="requirements.minPowerLevel" className="block text-sm font-medium text-gray-400 mb-2">
                Minimum Power Level (0 for no minimum)
              </label>
              <input
                type="number"
                id="requirements.minPowerLevel"
                name="requirements.minPowerLevel"
                value={formData.requirements.minPowerLevel}
                onChange={handleNumericInputChange}
                min="0"
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="requirements.eligibility.isOpen"
                checked={formData.requirements.eligibility.isOpen}
                onChange={(e) => setFormData({
                  ...formData,
                  requirements: {
                    ...formData.requirements,
                    eligibility: {
                      ...formData.requirements.eligibility,
                      isOpen: e.target.checked
                    }
                  }
                })}
                className="w-4 h-4 bg-black/30 border border-gray-700 rounded focus:ring-cyan-500 focus:border-cyan-500"
              />
              <label htmlFor="requirements.eligibility.isOpen" className="ml-2 text-gray-300">
                Open to all warriors (no restrictions)
              </label>
            </div>
            
            {!formData.requirements.eligibility.isOpen && (
              <div>
                <label htmlFor="requirements.eligibility.requirementText" className="block text-sm font-medium text-gray-400 mb-2">
                  Additional Requirements
                </label>
                <textarea
                  id="requirements.eligibility.requirementText"
                  name="requirements.eligibility.requirementText"
                  value={formData.requirements.eligibility.requirementText}
                  onChange={(e) => setFormData({
                    ...formData,
                    requirements: {
                      ...formData.requirements,
                      eligibility: {
                        ...formData.requirements.eligibility,
                        requirementText: e.target.value
                      }
                    }
                  })}
                  className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                  placeholder="Describe any additional requirements or restrictions for participating in this tournament..."
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="form-section pt-4 border-t border-gray-800">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-cyan-400" />
            Tournament Rules
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Rules & Guidelines <span className="text-red-500">*</span>
            </label>
            <div className="mb-4 space-y-2">
              {formData.rules.map((rule, index) => (
                <div key={index} className="flex items-start group">
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex-1 group-hover:border-cyan-500/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2">
                        <span className="text-cyan-400 font-medium">{index + 1}.</span>
                        <span className="text-gray-300">{rule}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(index)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 flex-1 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                placeholder="Add a rule or guideline..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRule();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddRule}
                className="px-4 py-2 bg-cyan-900/30 border border-cyan-500/20 rounded-lg text-cyan-400 hover:bg-cyan-900/50 transition-colors"
              >
                Add Rule
              </button>
            </div>
            
            <p className="text-gray-400 text-xs mt-2">
              <Info className="w-3 h-3 inline mr-1" />
              Clearly define the rules of your tournament to ensure fair competition.
            </p>
          </div>
        </div>
        
        <div className="flex justify-between pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={prevStep}
            className="px-6 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800/50 transition-colors"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="neon-button-cyan px-6 py-2 rounded-lg text-white flex items-center"
          >
            Next: Tracks & Resources
            <ChevronRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };
  
  // Step 4: Tracks & Resources
  const renderTracksAndResourcesStep = () => {
    return (
      <div className="space-y-6">
        <div className="form-section">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Grid className="w-5 h-5 text-cyan-400" />
            Tournament Tracks
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Competition Tracks (Optional)
            </label>
            <p className="text-gray-400 text-sm mb-4">
              Create different tracks or categories for your tournament to allow participants to focus on specific areas.
            </p>
            
            <div className="mb-6 space-y-4">
              {formData.tracks.map((track, index) => (
                <div key={index} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 group hover:border-cyan-500/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-semibold text-cyan-400">{track.name}</h4>
                    <button
                      type="button"
                      onClick={() => handleRemoveTrack(index)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-gray-300 mb-2">{track.description}</p>
                  <div className="flex items-center text-sm text-gray-400">
                    <Coins className="w-4 h-4 mr-1 text-yellow-500" />
                    Prize: {formData.prizePool.currency} {track.prize}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-black/30 p-4 rounded-lg border border-gray-800">
              <h4 className="text-lg font-semibold text-white mb-4">Add New Track</h4>
              <div className="space-y-4">
                <div>
                  <label htmlFor="trackName" className="block text-sm font-medium text-gray-400 mb-2">
                    Track Name
                  </label>
                  <input
                    type="text"
                    id="trackName"
                    name="name"
                    value={newTrack.name}
                    onChange={handleTrackChange}
                    className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. DeFi Innovation"
                  />
                </div>
                
                <div>
                  <label htmlFor="trackDescription" className="block text-sm font-medium text-gray-400 mb-2">
                    Description
                  </label>
                  <textarea
                    id="trackDescription"
                    name="description"
                    value={newTrack.description}
                    onChange={handleTrackChange}
                    className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                    placeholder="Describe this track's focus and goals..."
                    rows={2}
                  />
                </div>
                
                <div>
                  <label htmlFor="trackPrize" className="block text-sm font-medium text-gray-400 mb-2">
                    Track Prize
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="trackPrize"
                      name="prize"
                      value={newTrack.prize}
                      onChange={handleTrackChange}
                      min="0"
                      className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 pl-8 pr-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                    />
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleAddTrack}
                  className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-500/20 rounded-lg text-cyan-400 hover:bg-cyan-900/50 transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Track
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="form-section pt-4 border-t border-gray-800">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            Resources & Documentation
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Helpful Resources (Optional)
            </label>
            <p className="text-gray-400 text-sm mb-4">
              Provide resources to help participants succeed in your tournament.
            </p>
            
            <div className="mb-6 space-y-3">
              {formData.resources.map((resource, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 group hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {resource.type === 'DOCUMENTATION' && <FileText className="w-5 h-5 text-blue-400" />}
                    {resource.type === 'GITHUB' && <Github className="w-5 h-5 text-white" />}
                    {resource.type === 'VIDEO' && <Video className="w-5 h-5 text-red-400" />}
                    {resource.type === 'WEBSITE' && <Globe className="w-5 h-5 text-green-400" />}
                    <div>
                      <h5 className="font-medium text-white">{resource.title}</h5>
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline">
                        {resource.url}
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveResource(index)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="bg-black/30 p-4 rounded-lg border border-gray-800">
              <h4 className="text-lg font-semibold text-white mb-4">Add New Resource</h4>
              <div className="space-y-4">
                <div>
                  <label htmlFor="resourceTitle" className="block text-sm font-medium text-gray-400 mb-2">
                    Resource Title
                  </label>
                  <input
                    type="text"
                    id="resourceTitle"
                    name="title"
                    value={newResource.title}
                    onChange={handleResourceChange}
                    className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. Getting Started Guide"
                  />
                </div>
                
                <div>
                  <label htmlFor="resourceUrl" className="block text-sm font-medium text-gray-400 mb-2">
                    URL
                  </label>
                  <input
                    type="url"
                    id="resourceUrl"
                    name="url"
                    value={newResource.url}
                    onChange={handleResourceChange}
                    className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
                
                <div>
                  <label htmlFor="resourceType" className="block text-sm font-medium text-gray-400 mb-2">
                    Resource Type
                  </label>
                  <select
                    id="resourceType"
                    name="type"
                    value={newResource.type}
                    onChange={handleResourceChange}
                    className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="DOCUMENTATION">Documentation</option>
                    <option value="GITHUB">GitHub Repository</option>
                    <option value="VIDEO">Video Tutorial</option>
                    <option value="WEBSITE">Website</option>
                  </select>
                </div>
                
                <button
                  type="button"
                  onClick={handleAddResource}
                  className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-500/20 rounded-lg text-cyan-400 hover:bg-cyan-900/50 transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Resource
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={prevStep}
            className="px-6 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800/50 transition-colors"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="neon-button-cyan px-6 py-2 rounded-lg text-white flex items-center"
          >
            Next: Review & Publish
            <ChevronRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };
  
  // Step 5: Review & Publish
  const renderReviewStep = () => {
    return (
      <div className="space-y-6">
        <div className="form-section">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Check className="w-5 h-5 text-cyan-400" />
            Review Tournament Details
          </h3>
          
          {/* Banner Preview */}
          {formData.bannerImagePreview && (
            <div className="mb-6">
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                <Image
                  src={formData.bannerImagePreview}
                  alt="Tournament banner"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}
          
          <div className="bg-black/30 p-4 rounded-lg border border-slate-700/50 mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{formData.title || 'Untitled Tournament'}</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map(tag => (
                <span key={tag} className="bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded-md text-xs border border-cyan-500/20">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-gray-300 mb-4">{formData.description || 'No description provided.'}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Registration: {new Date(formData.registrationStart).toLocaleDateString()} - {new Date(formData.registrationDeadline).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Tournament: {new Date(formData.startDate).toLocaleDateString()} - {new Date(formData.endDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Participants: {formData.maxParticipants} max</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>Format: {formData.format.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span>Prize Pool: {formData.prizePool.amount} {formData.prizePool.currency}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span>Entry Fee: {formData.entryFee > 0 ? `${formData.entryFee} credits` : 'Free'}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rules Summary */}
            <div className="bg-black/30 p-4 rounded-lg border border-slate-700/50">
              <h4 className="font-semibold text-white flex items-center gap-2 mb-3">
                <Flag className="w-4 h-4 text-red-400" />
                Tournament Rules
              </h4>
              {formData.rules.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {formData.rules.map((rule, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-cyan-400 font-medium">{index + 1}.</span>
                      <span className="text-gray-300">{rule}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm">No rules defined.</p>
              )}
            </div>
            
            {/* Requirements Summary */}
            <div className="bg-black/30 p-4 rounded-lg border border-slate-700/50">
              <h4 className="font-semibold text-white flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-purple-400" />
                Eligibility Requirements
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  <span>Minimum Power Level: {formData.requirements.minPowerLevel > 0 ? formData.requirements.minPowerLevel : 'None'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span>Minimum Rank: {formData.requirements.minRank > 0 ? `#${formData.requirements.minRank}` : 'None'}</span>
                </div>
                <div className="flex items-start gap-2 text-gray-300">
                  <UserPlus className="w-4 h-4 text-green-500 mt-1" />
                  <div>
                    <span>{formData.requirements.eligibility.isOpen ? 'Open to all warriors' : 'Restricted entry'}</span>
                    {!formData.requirements.eligibility.isOpen && formData.requirements.eligibility.requirementText && (
                      <p className="text-gray-400 mt-1">{formData.requirements.eligibility.requirementText}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tracks Summary */}
          {formData.tracks.length > 0 && (
            <div className="bg-black/30 p-4 rounded-lg border border-slate-700/50 mt-6">
              <h4 className="font-semibold text-white flex items-center gap-2 mb-3">
                <Grid className="w-4 h-4 text-blue-400" />
                Competition Tracks
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.tracks.map((track, index) => (
                  <div key={index} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <h5 className="font-medium text-cyan-400 mb-1">{track.name}</h5>
                    <p className="text-gray-300 text-sm mb-2">{track.description}</p>
                    <div className="flex items-center text-xs text-gray-400">
                      <Trophy className="w-3 h-3 mr-1 text-yellow-500" />
                      Prize: {formData.prizePool.currency} {track.prize}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Resources Summary */}
          {formData.resources.length > 0 && (
            <div className="bg-black/30 p-4 rounded-lg border border-slate-700/50 mt-6">
              <h4 className="font-semibold text-white flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-green-400" />
                Resources
              </h4>
              <div className="space-y-2">
                {formData.resources.map((resource, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    {resource.type === 'DOCUMENTATION' && <FileText className="w-4 h-4 text-blue-400" />}
                    {resource.type === 'GITHUB' && <Github className="w-4 h-4 text-white" />}
                    {resource.type === 'VIDEO' && <Video className="w-4 h-4 text-red-400" />}
                    {resource.type === 'WEBSITE' && <Globe className="w-4 h-4 text-green-400" />}
                    <div>
                      <span className="text-white">{resource.title}</span>
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-cyan-400 hover:underline">
                        {resource.url}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Warning message about commitment */}
          <div className="bg-red-900/30 p-4 border border-red-500/20 rounded-lg mt-6">
            <h4 className="font-semibold text-white flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-red-400" />
              Important Notice
            </h4>
            <p className="text-gray-300 text-sm">
              By publishing this tournament, you are committing to hosting and managing it according to the schedule and rules you have defined. This will be visible to all Nakamoto League users who meet the eligibility requirements.
            </p>
          </div>
        </div>
        
        <div className="flex justify-between pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={prevStep}
            className="px-6 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800/50 transition-colors"
          >
            Previous
          </button>
          
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-6 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800/50 transition-colors"
            >
              Edit Details
            </button>
            
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="neon-button-red px-6 py-2 rounded-lg text-white flex items-center"
            >
              {loading ? (
                <>
                  <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                  Publishing...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 w-4 h-4" />
                  Publish Tournament
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (authState.loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </>
    );
  }

  if (!canCreateTournament) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8 mt-16">
          <div className="max-w-3xl mx-auto bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 p-8">
            <h1 className="text-2xl font-bold text-white mb-4">Permission Required</h1>
            <p className="text-gray-300 mb-6">
              You need to be a dojo owner to create tournaments. Please register a dojo or contact an administrator for assistance.
            </p>
            <div className="flex gap-4">
              <Link href="/dashboard/dojos/register" className="neon-button-cyan px-6 py-2 rounded-lg text-white">
                Register a Dojo
              </Link>
              <Link href="/tournaments" className="px-6 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800/50">
                View Tournaments
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-12 mt-16">
          <div className="max-w-3xl mx-auto bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 p-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-900/50 flex items-center justify-center border border-green-500/30">
                <Check className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Tournament Published Successfully!</h1>
            <p className="text-gray-300 mb-6">
              Your tournament has been created and is now visible to potential participants.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/tournaments" className="px-6 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800/50">
                View All Tournaments
              </Link>
              <Link href="/dashboard" className="neon-button-cyan px-6 py-2 rounded-lg text-white">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16 mb-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gradient-cyan-blue">Create Tournament</h1>
            <Link href="/tournaments" className="text-gray-400 hover:text-white transition-colors">
              Cancel
            </Link>
          </div>
          
          {error && (
            <div className="bg-red-900/30 border border-red-500/20 p-4 rounded-lg text-red-400 mb-6 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
          
          {/* Multi-step form navigation */}
          {renderStepIndicator()}
          
          {/* Form container */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6 animate-form-appear">
            {renderFormStep()}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}