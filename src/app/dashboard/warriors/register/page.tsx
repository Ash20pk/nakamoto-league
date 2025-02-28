'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Upload } from 'lucide-react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { warriorService } from '@/services/warriorService';
import type { WarriorSpecialty } from '@/lib/database.types';

interface RegisterWarriorForm {
  name: string;
  specialty: WarriorSpecialty;
  bio?: string;
  socialLinks: {
    github?: string;
    twitter?: string;
    website?: string;
  };
}

export default function RegisterWarriorPage() {
  const router = useRouter();
  const { authState } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [formData, setFormData] = useState<RegisterWarriorForm>({
    name: '',
    specialty: 'MIXED',
    socialLinks: {
      github: '',
      twitter: '',
      website: '',
    }
  });

  useEffect(() => {
    if (authState.warrior) {
      router.push('/dashboard');
    }
  }, [authState.warrior, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name.startsWith('social.')) {
      const social = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [social]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authState.user) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Upload avatar if provided
      let avatarUrl = null;
      if (avatarFile) {
        avatarUrl = await warriorService.uploadWarriorAvatar(avatarFile, authState.user.id);
      }

      // Create warrior
      await warriorService.createWarrior({
        name: formData.name,
        specialty: formData.specialty,
        avatar_url: avatarUrl,
        bio: formData.bio,
        socialLinks: formData.socialLinks
      }, authState.user.id);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Error registering warrior:', err);
      setError(err instanceof Error ? err.message : 'Failed to register warrior');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authState.loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text mb-8">
          Register as Warrior
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="cyber-card p-6 rounded-lg space-y-6">
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-32 h-32 rounded-full border-2 border-dashed border-purple-500/30 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-purple-500/60 transition-colors"
              onClick={() => document.getElementById('avatar')?.click()}
            >
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto text-slate-400" />
                  <span className="text-sm text-slate-400">Upload Avatar</span>
                </div>
              )}
            </div>
            <input
              type="file"
              id="avatar"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Warrior Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 px-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
              placeholder="Enter your warrior name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Specialty *
            </label>
            <select
              name="specialty"
              value={formData.specialty}
              onChange={handleInputChange}
              required
              className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 px-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
            >
              <option value="STRIKER">Striker</option>
              <option value="GRAPPLER">Grappler</option>
              <option value="WEAPONS_MASTER">Weapons Master</option>
              <option value="MIXED">Mixed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 px-4 text-slate-200 focus:outline-none focus:border-purple-500/50 resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-slate-300">Social Links</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                GitHub
              </label>
              <input
                type="url"
                name="social.github"
                value={formData.socialLinks.github}
                onChange={handleInputChange}
                className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 px-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
                placeholder="https://github.com/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Twitter
              </label>
              <input
                type="url"
                name="social.twitter"
                value={formData.socialLinks.twitter}
                onChange={handleInputChange}
                className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 px-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
                placeholder="https://twitter.com/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Personal Website
              </label>
              <input
                type="url"
                name="social.website"
                value={formData.socialLinks.website}
                onChange={handleInputChange}
                className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg py-2 px-4 text-slate-200 focus:outline-none focus:border-purple-500/50"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

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
              disabled={isSubmitting}
              className="px-6 py-2 cyber-gradient rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}