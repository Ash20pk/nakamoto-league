'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import Navbar from '@/components/Navbar';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  
  const { signIn, authState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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
      router.push(redirectUrl);
    }
  }, [authState.user, authState.loading, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(formData.email, formData.password);
      // After successful sign-in, the useEffect above will handle redirection
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Show loading state while checking auth status
  if (authState.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan border-t-transparent shadow-neon-cyan"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen w-full flex items-center justify-center pt-16 px-4 relative overflow-hidden bg-black">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[url('/images/cyber-grid.png')] opacity-5 z-0"></div>
        <div className="absolute inset-0 bg-scan-lines opacity-10 z-0"></div>
        
        {/* Japanese Characters Column - Left Side */}
        <div className="absolute top-1/4 left-8 opacity-20 hidden lg:block">
          <div className="text-vertical-left text-3xl font-serif-jp tracking-widest text-cyan space-y-4">
            <div>アクセス</div>
            <div>認証</div>
            <div>安全</div>
          </div>
        </div>
        
        {/* Japanese Characters Column - Right Side */}
        <div className="absolute top-1/3 right-8 opacity-20 hidden lg:block">
          <div className="text-vertical-right text-3xl font-serif-jp tracking-widest text-red space-y-4">
            <div>ログイン</div>
            <div>戦士</div>
            <div>始める</div>
          </div>
        </div>
        
        {/* Login Card */}
        <div className={`relative z-10 w-full max-w-md transition-all duration-1000 transform 
          ${showForm ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-cyan font-sans-jp tracking-widest">
            ナカモト・システム・アクセス
          </div>
          
          <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 p-8 shadow-neon-subtle">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan/50"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red/50"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red/50"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan/50"></div>
            
            <h2 className="text-2xl font-bold text-center mb-2 font-serif-jp text-white text-shadow-neon">
              System Authentication
            </h2>
            
            <p className="text-center text-gray-400 text-sm mb-8">
              Enter credentials to access your battle station
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red/10 border border-red/30 text-red text-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-scan-lines opacity-30"></div>
                <div className="absolute top-0 left-0 w-1 h-full bg-red"></div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    className="w-full bg-black border border-gray-700 py-3 px-4 text-white focus:outline-none focus:border-cyan focus:shadow-input-cyan transition-colors"
                    placeholder="warrior@nakamotoleague.io"
                    required
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-cyan/30 to-purple/30"></div>
                </div>
              </div>

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
                    className="w-full bg-black border border-gray-700 py-3 px-4 text-white focus:outline-none focus:border-red focus:shadow-input-red transition-colors"
                    placeholder="••••••••••••"
                    required
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-red/30 to-purple/30"></div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full neon-button-cyan py-3 text-white font-medium transition-all hover:scale-[1.02] disabled:opacity-50 relative overflow-hidden group"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent border-white mr-2" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Authenticate
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>
            </form>

            <div className="mt-8 text-center relative">
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
              <span className="relative inline-block px-4 bg-gray-900 text-xs text-gray-500 uppercase tracking-wider">
                Not Registered
              </span>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/register"
                className="inline-flex items-center text-cyan hover:text-cyan-light text-sm transition-colors group"
              >
                Create New Warrior Profile
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}