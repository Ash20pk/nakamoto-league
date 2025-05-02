'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Navbar from '@/components/Navbar';
import BitcoinLoader from '@/components/BitcoinLoader';
import type { Database } from '@/lib/database.types';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  const { signUp, authState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: 'warrior' // Default to warrior
  });
  
  // Animation state
  const [showForm, setShowForm] = useState(false);

  // Trigger animation after initial render
  useEffect(() => {
    setTimeout(() => {
      setShowForm(true);
    }, 100);
  }, []);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (authState.user && !authState.loading) {
      router.push('/dashboard');
    }
  }, [authState.user, authState.loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    // Validate form data
    if (formData.password !== formData.confirmPassword) {
      setError("Access codes don't match");
      setLoading(false);
      return;
    }

    try {
      // Sign up with Supabase using the proper account type
      const accountType = formData.accountType as 'warrior' | 'dojo';
      await signUp(formData.email, formData.password, accountType);

      // Create profile
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: userData.user.id,
              username: formData.username,
              full_name: null,
              avatar_url: null
            }
          ]);

        if (profileError) throw profileError;

        // Show success message
        setSuccess(true);
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Show loading state while checking auth status
  if (authState.loading) {
    return <BitcoinLoader />;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen w-full flex items-center justify-center pt-16 px-4 relative overflow-hidden bg-black">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[url('/images/cyber-grid.png')] opacity-5 z-0"></div>
        <div className="absolute inset-0 bg-scan-lines opacity-10 z-0"></div>
        
        {/* Animated scanline effect */}
        <div className="scanline"></div>
        
        {/* Japanese Characters Column - Left Side */}
        <div className="absolute top-1/4 left-8 opacity-20 hidden lg:block">
          <div className="text-vertical-left text-3xl font-serif-jp tracking-widest text-cyan space-y-4">
            <div>新規登録</div>
            <div>戦士</div>
            <div>道場</div>
          </div>
        </div>
        
        {/* Japanese Characters Column - Right Side */}
        <div className="absolute top-1/3 right-8 opacity-20 hidden lg:block">
          <div className="text-vertical-right text-3xl font-serif-jp tracking-widest text-red space-y-4">
            <div>参加する</div>
            <div>プロフィール</div>
            <div>登録</div>
          </div>
        </div>
        
        {/* Register Card */}
        <div className={`relative z-10 w-full max-w-lg transition-all duration-1000 transform 
          ${showForm ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-cyan font-sans-jp tracking-widest">
            ナカモト・リーグ・新規登録
          </div>
          
          <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 p-8 shadow-neon-subtle">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan/50"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red/50"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red/50"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan/50"></div>
            
            <h2 className="text-2xl font-bold text-center mb-2 font-serif-jp text-white text-shadow-neon">
              Enter The League
            </h2>
            
            <p className="text-center text-gray-400 text-sm mb-8">
              Register your profile to join the Nakamoto blockchain battles
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red/10 border border-red/30 text-red text-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-scan-lines opacity-30"></div>
                <div className="absolute top-0 left-0 w-1 h-full bg-red"></div>
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-cyan/10 border border-cyan/30 text-cyan text-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-scan-lines opacity-30"></div>
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan"></div>
                <p>Registration successful! Please check your email to verify your account.</p>
                <p className="mt-2">Redirecting to login...</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  name="username"
                  id="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 pl-10 pr-4 py-2 w-full focus:ring-cyan focus:border-cyan focus:outline-none"
                  placeholder="Username"
                />
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-cyan" />
                  Email ID
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-black border border-gray-700 py-3 px-4 text-white focus:outline-none focus:border-cyan focus:shadow-neon-cyan/20 transition-colors"
                    placeholder="warrior@nakamotoleague.io"
                    required
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-cyan/30 to-purple/30"></div>
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                    <Lock className="w-4 h-4 mr-2 text-red" />
                    Access Code
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full bg-black border border-gray-700 py-3 px-4 text-white focus:outline-none focus:border-red focus:shadow-neon-red/20 transition-colors"
                      placeholder="••••••••••••"
                      required
                      minLength={6}
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-red/30 to-purple/30"></div>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                    <Lock className="w-4 h-4 mr-2 text-red" />
                    Confirm Code
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full bg-black border border-gray-700 py-3 px-4 text-white focus:outline-none focus:border-red focus:shadow-neon-red/20 transition-colors"
                      placeholder="••••••••••••"
                      required
                      minLength={6}
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-red/30 to-purple/30"></div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-2"></div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || success}
                className={`w-full py-3 text-white font-medium transition-all hover:scale-[1.02] disabled:opacity-50 relative overflow-hidden group neon-button-red`}
              >
                {loading ? (
                  <BitcoinLoader />
                ) : (
                  <span className="flex items-center justify-center">
                    Register as Warrior
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>
            </form>

            <div className="mt-8 text-center relative">
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
              <span className="relative inline-block px-4 bg-gray-900 text-xs text-gray-500 uppercase tracking-wider">
                Already Registered
              </span>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-cyan hover:text-cyan-light text-sm transition-colors group"
              >
                Login to Your Battle Station
                <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
          
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-purple/50 to-transparent"></div>
        </div>
      </div>
    </>
  );
}