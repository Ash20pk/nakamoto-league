'use client';

import React, { useState, useEffect } from 'react';
import { Sword, Bell, Zap, User, Menu, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';

const Navbar = () => {
  const { authState, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNotificationsClick = () => {
    router.push('/dashboard/notifications');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('user-dropdown');
      const dropdownButton = document.getElementById('dropdown-button');
      
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
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-black/80 backdrop-blur-md border-b border-red/30' 
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="absolute inset-0 bg-scan-lines opacity-10 z-0"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Sword className="w-8 h-8 text-red group-hover:text-red-light transition-colors" />
              <Zap className="w-4 h-4 text-cyan absolute -top-1 -right-1 animate-pulse" />
              <div className="absolute -inset-1 bg-red/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-sans-jp leading-none">ナカモト・リーグ</span>
              <span className="text-lg font-bold font-serif-jp text-white group-hover:text-shadow-cyan transition-all">
                NAKAMOTO LEAGUE
              </span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              href="/tournaments" 
              className={`relative px-3 py-2 text-gray-300 hover:text-white transition-colors group overflow-hidden
                ${pathname === '/tournaments' ? 'text-cyan font-medium' : ''}`}
            >
              <span className="relative z-10">Tournaments</span>
              <span className={`absolute bottom-0 left-0 w-full h-0.5 ${pathname === '/tournaments' ? 'bg-cyan' : 'bg-red'} 
                transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></span>
            </Link>
            <Link 
              href="/warriors" 
              className={`relative px-3 py-2 text-gray-300 hover:text-white transition-colors group overflow-hidden
                ${pathname === '/warriors' ? 'text-cyan font-medium' : ''}`}
            >
              <span className="relative z-10">Warriors</span>
              <span className={`absolute bottom-0 left-0 w-full h-0.5 ${pathname === '/warriors' ? 'bg-cyan' : 'bg-red'} 
                transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></span>
            </Link>
            <Link 
              href="/dojos" 
              className={`relative px-3 py-2 text-gray-300 hover:text-white transition-colors group overflow-hidden
                ${pathname === '/dojos' ? 'text-cyan font-medium' : ''}`}
            >
              <span className="relative z-10">Dojos</span>
              <span className={`absolute bottom-0 left-0 w-full h-0.5 ${pathname === '/dojos' ? 'bg-cyan' : 'bg-red'} 
                transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-gray-300 hover:text-cyan transition-colors"
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
          <div className="flex items-center gap-4">
            {authState.user ? (
              <>
                <button
                  onClick={handleNotificationsClick}
                  className="relative group p-2 hover:bg-gray-900/50 rounded transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-gray-300 group-hover:text-cyan transition-colors" />
                  <span className="absolute -top-1 -right-1 bg-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-neon-red animate-pulse">
                    3
                  </span>
                </button>

                <Link
                  href="/"
                  className="hidden md:flex items-center gap-2 neon-button-red px-4 py-2 text-white font-medium transition-all"
                >
                  <span>Create Battle</span>
                  <Sword className="w-4 h-4" />
                </Link>

                <div className="relative">
                  <button 
                    id="dropdown-button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-900/50 rounded transition-colors"
                    aria-label="User menu"
                    aria-expanded={dropdownOpen}
                    aria-controls="user-dropdown"
                  >
                    <User className="w-5 h-5 text-gray-300 hover:text-cyan transition-colors" />
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div 
                      id="user-dropdown"
                      className="absolute right-0 mt-2 w-48 py-2 bg-gray-900 rounded border border-gray-800 shadow-neon-subtle backdrop-blur-md z-50"
                    >
                      <div className="border-l-2 border-cyan/50 mx-3 px-2 py-1 text-xs text-gray-500 uppercase">
                        {authState.user.email}
                      </div>
                      <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-2"></div>
                      <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-cyan"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Settings
                      </Link>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-cyan"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-2"></div>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-red"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="neon-button-cyan px-4 py-2 text-white font-medium transition-transform hover:scale-105"
              >
                Join the League
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-gray-800/30 py-4 animate-expand-y overflow-hidden">
          <div className="container mx-auto px-4 space-y-4">
            <div className="border-l-2 border-red pl-4 space-y-4">
              <Link 
                href="/tournaments"
                className="flex items-center justify-between py-2 text-gray-300 hover:text-cyan"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>Tournaments</span>
                <Zap className="w-4 h-4 text-red" />
              </Link>
              <Link 
                href="/warriors"
                className="flex items-center justify-between py-2 text-gray-300 hover:text-cyan"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>Warriors</span>
                <Zap className="w-4 h-4 text-red" />
              </Link>
              <Link 
                href="/dojos"
                className="flex items-center justify-between py-2 text-gray-300 hover:text-cyan"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>Dojos</span>
                <Zap className="w-4 h-4 text-red" />
              </Link>
            </div>
            
            {authState.user && (
              <div className="mt-6">
                <Link 
                  href="/"
                  className="block w-full neon-button-red py-2 text-center text-white"
                  // onClick={() => setMobileMenuOpen(false)}
                >
                  Create Battle
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;