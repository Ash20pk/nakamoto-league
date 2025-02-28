'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { MapPin, Globe, Twitter, Github, Upload } from 'lucide-react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { dojoService } from '@/services/dojoService';

interface RegisterDojoForm {
  name: string;
  location: string;
  description: string;
  specialization: string;
  socialLinks: {
    website?: string;
    twitter?: string;
    github?: string;
  };
  tags: string[];
}

export default function RegisterDojoPage() {
  const router = useRouter();
  const { authState } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [tag, setTag] = useState('');
  
  const [formData, setFormData] = useState<RegisterDojoForm>({
    name: '',
    location: '',
    description: '',
    specialization: '',
    socialLinks: {
      website: '',
      twitter: '',
      github: '',
    },
    tags: [],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('social.')) {
      const social = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [social]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = () => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  // Check if user already has a dojo
  useEffect(() => {
    const checkExistingDojo = async () => {
      if (authState.dojo) {
        // User already has a dojo, redirect to dashboard
        router.push('/dashboard');
      }
    };

    if (!authState.loading) {
      checkExistingDojo();
    }
  }, [authState.dojo, authState.loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authState.user) return;

    try {
      setLoading(true);
      setError(null);

      // Upload banner if selected
      let bannerUrl = null;
      if (bannerFile) {
        bannerUrl = await dojoService.uploadDojoBanner(bannerFile, authState.user.id);
      }

      // Create dojo
      const dojo = await dojoService.createDojo({
        name: formData.name,
        description: formData.description,
        location: formData.location,
        specialization: formData.specialization,
        banner_url: bannerUrl || undefined,
        socialLinks: formData.socialLinks,
        tags: formData.tags
      }, authState.user.id);

      // Redirect to dojo profile
      router.push(`/dojos/${dojo.id}`);
    } catch (err) {
      console.error('Error registering dojo:', err);
      setError(err instanceof Error ? err.message : 'Failed to register dojo');
    } finally {
      setLoading(false);
    }
  };

  const specializations = [
    'Blockchain Development',
    'AI/ML Engineering',
    'Web3 Development',
    'Smart Contract Development',
    'Quantum Computing',
    'Cybersecurity',
    'Cloud Architecture',
    'DevOps Engineering',
    'Full Stack Development',
    'Mobile Development',
  ];

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text mb-8">
            Register Your Dojo
          </h1>

          {error && (
            <div className="mb-6 text-center p-4 bg-red-900/30 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="cyber-card p-6 rounded-lg space-y-6">
            {/* Banner Upload */}
            <div className="relative">
              <div
                className="h-48 rounded-lg bg-slate-800/50 border-2 border-dashed border-purple-500/20 flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={() => document.getElementById('banner-upload')?.click()}
              >
                {bannerPreview ? (
                  <Image 
                    src={bannerPreview} 
                    alt="Banner preview" 
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-slate-400">Click to upload banner image</p>
                    <p className="text-sm text-slate-500">Recommended: 1200x400px</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                id="banner-upload"
                className="hidden"
                accept="image/*"
                onChange={handleBannerChange}
              />
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Dojo Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 px-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
                  placeholder="e.g. Neo Tokyo Institute"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Location *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
                    placeholder="e.g. Tokyo, Japan"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Primary Specialization *
              </label>
              <select
                name="specialization"
                value={formData.specialization}
                onChange={handleInputChange}
                className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 px-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
                required
              >
                <option value="">Select a specialization</option>
                {specializations.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 px-4 text-slate-200 focus:outline-none focus:border-purple-500/50 h-32 resize-none"
                placeholder="Tell us about your dojo..."
                required
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="flex-1 bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 px-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
                  placeholder="Add a tag (e.g. blockchain, AI, Web3)"
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
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
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

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-300">Social Links</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="url"
                    name="social.website"
                    value={formData.socialLinks?.website}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
                    placeholder="Website URL"
                  />
                </div>

                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    name="social.twitter"
                    value={formData.socialLinks?.twitter}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
                    placeholder="Twitter handle"
                  />
                </div>

                <div className="relative md:col-span-2">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    name="social.github"
                    value={formData.socialLinks?.github}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
                    placeholder="GitHub organization"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 bg-slate-800/50 border border-purple-500/20 rounded-lg text-slate-300 hover:bg-slate-800/70 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 cyber-gradient rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Register Dojo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}