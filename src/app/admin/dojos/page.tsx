'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { ArrowLeft, Mail, Lock, School, Plus, Check, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';

interface DojoFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  location: string;
  description: string;
}

export default function AdminDojosPage() {
  const router = useRouter();
  const { authState } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creatingDojo, setCreatingDojo] = useState(false);
  const [dojos, setDojos] = useState<any[]>([]);
  const [loadingDojos, setLoadingDojos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [formData, setFormData] = useState<DojoFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    description: ''
  });

  // Check if user is authorized to access admin panel
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch('/api/admin/auth');
        const data = await response.json();
        
        if (!data.authenticated) {
          router.push('/admin/login');
        } else {
          setLoading(false);
          fetchDojos();
        }
      } catch (err) {
        console.error('Error checking admin auth:', err);
        router.push('/admin/login');
      }
    };
    
    checkAdminAuth();
  }, [router]);

  const fetchDojos = async () => {
    setLoadingDojos(true);
    try {
      // Use our API endpoint instead of direct admin API access
      const response = await fetch('/api/admin/dojos');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dojos');
      }
      
      const data = await response.json();
      setDojos(data.dojos.map((dojo: any) => ({
        id: dojo.owner_id,
        email: dojo.profiles?.username || 'Unknown', // Using username as fallback since we can't access emails directly
        created_at: dojo.created_at,
        dojo: dojo
      })));
    } catch (err) {
      console.error('Error fetching dojos:', err);
      setError('Failed to fetch dojos');
    } finally {
      setLoadingDojos(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCreatingDojo(true);
    
    try {
      // Validate form data
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords don't match");
      }
      
      if (formData.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      
      // Use our new API endpoint for creating dojos
      const response = await fetch('/api/admin/create-dojo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          location: formData.location,
          description: formData.description
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create dojo account');
      }
      
      const data = await response.json();
      setSuccess(data.message || 'Dojo account created successfully');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        location: '',
        description: ''
      });
      
      // Refresh dojos list
      fetchDojos();
      
      // Hide form after success
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating dojo:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setCreatingDojo(false);
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
    <div className="min-h-screen bg-gray-900 text-white">
      
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="flex items-center mb-8">
          <Link href="/admin" className="text-gray-400 hover:text-white mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Dojo Management</h1>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg text-green-400 flex items-center">
            <Check className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}
        
        <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <School className="h-5 w-5 mr-2 text-purple-400" />
              Dojos
            </h2>
            
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center transition-colors"
            >
              {showCreateForm ? (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Dojo Account
                </>
              )}
            </button>
          </div>
          
          {showCreateForm ? (
            <div className="bg-slate-900/50 border border-purple-500/20 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Create New Dojo Account</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dojo Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">
                      Dojo Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <School className="h-5 w-5 text-gray-500" />
                      </div>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 pl-10 pr-4 py-2 w-full rounded-lg focus:ring-purple-500 focus:border-purple-500 focus:outline-none"
                        placeholder="Dojo Name"
                      />
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-500" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 pl-10 pr-4 py-2 w-full rounded-lg focus:ring-purple-500 focus:border-purple-500 focus:outline-none"
                        placeholder="dojo@example.com"
                      />
                    </div>
                  </div>
                  
                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-500" />
                      </div>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        minLength={6}
                        className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 pl-10 pr-4 py-2 w-full rounded-lg focus:ring-purple-500 focus:border-purple-500 focus:outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  
                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-500" />
                      </div>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        minLength={6}
                        className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 pl-10 pr-4 py-2 w-full rounded-lg focus:ring-purple-500 focus:border-purple-500 focus:outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Location */}
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-400 mb-2">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-purple-500 focus:border-purple-500 focus:outline-none"
                    placeholder="e.g., Tokyo, Japan"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-400 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="bg-black/30 border border-gray-700 text-white placeholder-gray-500 px-4 py-2 w-full rounded-lg focus:ring-purple-500 focus:border-purple-500 focus:outline-none"
                    placeholder="Describe the dojo..."
                  ></textarea>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingDojo}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center transition-colors disabled:opacity-50"
                  >
                    {creatingDojo ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Dojo Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {loadingDojos ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
                </div>
              ) : dojos.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No dojo accounts found. Create your first dojo account.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-700">
                        <th className="px-4 py-3">Dojo Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dojos.map((dojo) => (
                        <tr key={dojo.id} className="border-b border-gray-800 hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-white">{dojo.dojo?.name || 'Not Set Up'}</td>
                          <td className="px-4 py-3 text-gray-300">{dojo.email}</td>
                          <td className="px-4 py-3 text-gray-300">{dojo.dojo?.location || '-'}</td>
                          <td className="px-4 py-3 text-gray-400">
                            {new Date(dojo.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${dojo.dojo ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                              {dojo.dojo ? 'Active' : 'Pending Setup'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={fetchDojos}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center transition-colors"
                  disabled={loadingDojos}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingDojos ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                
                <div className="text-sm text-gray-400">
                  {dojos.length} dojo{dojos.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
