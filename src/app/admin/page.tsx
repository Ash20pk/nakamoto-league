'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Shield, Users, School, Plus, ArrowRight } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { authState } = useAuth();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<{ id: string; username: string } | null>(null);

  // Check if user is authorized to access admin panel
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch('/api/admin/auth');
        const data = await response.json();
        
        if (!data.authenticated) {
          router.push('/admin/login');
        } else {
          setAdminUser(data.admin);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error checking admin auth:', err);
        router.push('/admin/login');
      }
    };
    
    checkAdminAuth();
  }, [router]);

  // Admin logout function
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'DELETE',
      });
      router.push('/admin/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan border-t-transparent shadow-neon-cyan"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            {adminUser && (
              <p className="text-gray-400 text-sm">Logged in as: {adminUser.username}</p>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600/70 hover:bg-red-600/90 text-white rounded-lg"
          >
            Admin Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Dojo Management Card */}
          <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-all">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-full bg-purple-900/30 mr-4">
                <School className="h-6 w-6 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Dojo Management</h2>
            </div>
            <p className="text-gray-400 mb-6">Create and manage dojo accounts for the Nakamoto League.</p>
            <Link 
              href="/admin/dojos" 
              className="inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors"
            >
              Manage Dojos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          {/* User Management Card */}
          <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-all">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-full bg-cyan-900/30 mr-4">
                <Users className="h-6 w-6 text-cyan-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">User Management</h2>
            </div>
            <p className="text-gray-400 mb-6">View and manage user accounts and permissions.</p>
            <span className="inline-flex items-center text-gray-500">
              Coming Soon
            </span>
          </div>

          {/* System Settings Card */}
          <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-all">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-full bg-red-900/30 mr-4">
                <Shield className="h-6 w-6 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">System Settings</h2>
            </div>
            <p className="text-gray-400 mb-6">Configure system settings and security parameters.</p>
            <span className="inline-flex items-center text-gray-500">
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
