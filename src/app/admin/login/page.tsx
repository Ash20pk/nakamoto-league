'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Key, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const { authState } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Check if already authenticated as admin
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch('/api/admin/auth');
        const data = await response.json();
        
        if (data.authenticated) {
          router.push('/admin');
        }
      } catch (err) {
        console.error('Error checking admin auth:', err);
      }
    };
    
    checkAdminAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      console.error('Admin login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen w-full flex items-center justify-center pt-16 px-4 relative overflow-hidden bg-black">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[url('/images/cyber-grid.png')] opacity-5 z-0"></div>
        <div className="absolute inset-0 bg-scan-lines opacity-10 z-0"></div>
        
        {/* Admin Login Card */}
        <div className="relative z-10 w-full max-w-md">
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-cyan font-sans-jp tracking-widest">
            ナカモト・リーグ・管理者
          </div>
          
          <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 p-8 shadow-neon-subtle">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan/50"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red/50"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red/50"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan/50"></div>
            
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-slate-800/70 border border-red-500/20">
                <Lock className="h-8 w-8 text-red-400" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center mb-2 font-serif-jp text-white text-shadow-neon">
              Admin Access
            </h2>
            
            <p className="text-center text-gray-400 text-sm mb-8">
              Enter admin credentials to access the control panel
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red/10 border border-red/30 text-red text-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-scan-lines opacity-30"></div>
                <div className="absolute top-0 left-0 w-1 h-full bg-red"></div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                  <Key className="w-4 h-4 mr-2 text-cyan" />
                  Admin Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black border border-gray-700 py-3 px-4 text-white focus:outline-none focus:border-cyan focus:shadow-neon-cyan/20 transition-colors"
                    placeholder="admin"
                    required
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-cyan/30 to-purple/30"></div>
                </div>
              </div>
              
              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                  <Key className="w-4 h-4 mr-2 text-red" />
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-gray-700 py-3 px-4 text-white focus:outline-none focus:border-red focus:shadow-neon-red/20 transition-colors"
                    placeholder="••••••••••••"
                    required
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-red/30 to-purple/30"></div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white font-medium transition-all hover:scale-[1.02] disabled:opacity-50 relative overflow-hidden group neon-button-red"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent border-white mr-2" />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Access Admin Panel
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>
            </form>
            <div className="text-center mt-4">
              <Link href="/admin/forgot-password" className="text-sm text-cyan-400 hover:text-cyan-300">
                Forgot your password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
