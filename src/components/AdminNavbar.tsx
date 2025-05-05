'use client';

import React, { useState, useEffect } from 'react';
import { Sword, User, LogOut, Menu, X, ChevronDown, Shield, Trophy, Users, Book } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

const AdminNavbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const supabase = createClientComponentClient<Database>();

  // Check admin session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/admin/login');
        return;
      }
      
      // Get admin user info
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('username')
        .eq('user_id', session.user.id)
        .single();
        
      if (adminUser) {
        setAdminName(adminUser.username);
      }
    };
    
    checkSession();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/admin/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('admin-dropdown');
      const dropdownButton = document.getElementById('admin-dropdown-button');
      
      if (
        dropdown && 
        dropdownButton && 
        !dropdown.contains(event.target as Node) && 
        !dropdownButton.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="relative">
                <Shield className="w-8 h-8 text-cyan" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 leading-none">Admin Panel</span>
                <span className="text-lg font-bold text-white">
                  NAKAMOTO LEAGUE
                </span>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center ml-10 space-x-4">
              <Link 
                href="/admin" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/admin' 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/admin/tournaments" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname?.startsWith('/admin/tournaments') 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Trophy className="inline-block w-4 h-4 mr-1" />
                Tournaments
              </Link>
              <Link 
                href="/admin/dojos" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname?.startsWith('/admin/dojos') 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Users className="inline-block w-4 h-4 mr-1" />
                Dojos
              </Link>
              <Link 
                href="/admin/articles" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname?.startsWith('/admin/articles') 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Book className="inline-block w-4 h-4 mr-1" />
                Articles
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-gray-300 hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <button
                id="admin-dropdown-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center text-gray-300 hover:text-white focus:outline-none"
              >
                <User className="w-5 h-5 mr-2" />
                <span>{adminName}</span>
                <ChevronDown className={`ml-1 w-4 h-4 transform transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {dropdownOpen && (
                <div
                  id="admin-dropdown"
                  className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-10"
                >
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <LogOut className="inline-block w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-800 px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link 
            href="/admin" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === '/admin' 
                ? 'bg-gray-700 text-white' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link 
            href="/admin/tournaments" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname?.startsWith('/admin/tournaments') 
                ? 'bg-gray-700 text-white' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Trophy className="inline-block w-4 h-4 mr-1" />
            Tournaments
          </Link>
          <Link 
            href="/admin/dojos" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname?.startsWith('/admin/dojos') 
                ? 'bg-gray-700 text-white' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Users className="inline-block w-4 h-4 mr-1" />
            Dojos
          </Link>
          <Link 
            href="/admin/articles" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname?.startsWith('/admin/articles') 
                ? 'bg-gray-700 text-white' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Book className="inline-block w-4 h-4 mr-1" />
            Articles
          </Link>
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <LogOut className="inline-block w-4 h-4 mr-1" />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
};

export default AdminNavbar;
