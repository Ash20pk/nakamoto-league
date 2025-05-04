'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Warrior = Database['public']['Tables']['warriors']['Row'];
type Dojo = Database['public']['Tables']['dojos']['Row'];

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  warrior: Warrior | null;
  dojo: Dojo | null;
  accountType: 'warrior' | 'dojo' | null;
  loading: boolean;
  isAuthenticated: boolean;
  onboardingStep: 'profile' | 'entity' | 'complete' | null;
}

interface AuthContextType {
  authState: AuthState;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null; } | void>;
  signUp: (email: string, password: string, accountType: 'warrior' | 'dojo') => Promise<{ user: User | null; session: Session | null; } | void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  
  const initialState: AuthState = {
    user: null,
    profile: null,
    warrior: null,
    dojo: null,
    accountType: null,
    loading: true,
    isAuthenticated: false,
    onboardingStep: null,
  };

  const [authState, setAuthState] = useState<AuthState>(initialState);

  // Fetch user data from Supabase
  const fetchUserData = async (user: User | null) => {
    if (!user) {
      setAuthState({
        user: null,
        profile: null,
        warrior: null,
        dojo: null,
        accountType: null,
        loading: false,
        isAuthenticated: false,
        onboardingStep: null,
      });
      return;
    }

    try {
      // Extract account type from user metadata
      const accountType = user.user_metadata?.account_type as 'warrior' | 'dojo' | null;
      
      // Initialize variables
      let profile = null;
      let warrior = null;
      let dojo = null;

      // Fetch profile
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') { // No profile found
            // Create a new profile
            try {
              // Generate a default username from email
              const emailUsername = user.email?.split('@')[0] || 'user';
              const timestamp = Date.now().toString().slice(-4);
              const defaultUsername = `${emailUsername}${timestamp}`;
              
              const { data: newProfile, error: createProfileError } = await supabase
                .from('profiles')
                .insert([{ 
                  id: user.id, 
                  username: defaultUsername, // Required field
                  full_name: null,
                  avatar_url: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }])
                .select()
                .single();
                
              if (createProfileError) {
                console.error('Error creating profile:', createProfileError);
              } else {
                profile = newProfile;
              }
            } catch (err) {
              console.error('Exception creating profile:', err);
            }
          } else {
            console.error('Error fetching profile:', profileError);
          }
        } else {
          profile = profileData;
        }
      } catch (err) {
        console.error('Exception in profile operations:', err);
      }

      // Fetch warrior if account type is warrior
      if (accountType === 'warrior') {
        try {
          const { data: warriorData, error: warriorError } = await supabase
            .from('warriors')
            .select('*')
            .eq('owner_id', user.id)
            .maybeSingle();

          if (warriorError) {
            console.error('Error checking warrior:', warriorError);
          } else if (warriorData) {
            warrior = warriorData;
          }
        } catch (err) {
          console.error('Exception checking warrior:', err);
        }
      }

      // Fetch dojo if account type is dojo
      if (accountType === 'dojo') {
        try {
          const { data: dojoData, error: dojoError } = await supabase
            .from('dojos')
            .select('*')
            .eq('owner_id', user.id)
            .maybeSingle();

          if (dojoError) {
            console.error('Error checking dojo:', dojoError);
          } else if (dojoData) {
            dojo = dojoData;
          }
        } catch (err) {
          console.error('Exception checking dojo:', err);
        }
      }

      // Determine onboarding step
      let onboardingStep: 'profile' | 'entity' | 'complete' | null = null;
      
      if (!profile || !profile.username || !profile.avatar_url) {
        // If profile is missing or incomplete, first step is to complete profile
        onboardingStep = 'profile';
      } else if ((accountType === 'warrior' && !warrior) || (accountType === 'dojo' && !dojo)) {
        // If profile is complete but entity (warrior/dojo) is missing, next step is to create entity
        onboardingStep = 'entity';
      } else {
        // If both profile and entity are complete, onboarding is done
        onboardingStep = 'complete';
      }

      // If a warrior is trying to access a dojo page, or vice versa, they should be considered onboarded
      // This allows warriors to view dojo pages without going through dojo onboarding
      if ((accountType === 'warrior' && warrior) || (accountType === 'dojo' && dojo)) {
        onboardingStep = 'complete';
      }

      setAuthState({
        user,
        profile,
        warrior,
        dojo,
        accountType,
        loading: false,
        isAuthenticated: true,
        onboardingStep,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      setAuthState({
        user,
        profile: null,
        warrior: null,
        dojo: null,
        accountType: null,
        loading: false,
        isAuthenticated: true, // Still authenticated even if we couldn't fetch all data
        onboardingStep: 'profile', // Default to profile step if there's an error
      });
    }
  };

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await fetchUserData(session?.user || null);
  
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          await fetchUserData(session?.user || null);
          router.refresh();
        }
      );
  
      return () => {
        subscription.unsubscribe();
      };
    };
  
    initializeAuth();
  }, [supabase, router]);

  // After auth state changes, check if we need to redirect for onboarding
  useEffect(() => {
    // Only proceed if auth state has loaded and we have a user
    if (!authState.loading && authState.user) {
      const { accountType, warrior, dojo, onboardingStep } = authState;
      
      // If user is on a login/register page, redirect them to appropriate onboarding step
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/login') || currentPath.startsWith('/register') || currentPath === '/') {
        // First, redirect to dashboard which will handle onboarding
        router.push('/dashboard');
      } else if (currentPath.startsWith('/dashboard')) {
        // If user is already on dashboard, no need to redirect
        // The dashboard will handle showing the appropriate onboarding UI based on onboardingStep
      }
    }
  }, [authState, router]);

  const signIn = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      await fetchUserData(data.user);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, accountType: 'warrior' | 'dojo') => {
    setAuthState((prev) => ({ ...prev, loading: true }));
    try {
      // Validate inputs before attempting signup
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      if (!['warrior', 'dojo'].includes(accountType)) {
        throw new Error('Invalid account type');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            account_type: accountType
          }
        }
      });

      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }
      
      if (!data.user) {
        throw new Error('Account creation failed. No user returned from authentication service.');
      }
      
      // Wait a moment for the auth to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now fetch user data
      if (data.user) {
        await fetchUserData(data.user);
      }
      
      setAuthState((prev) => ({ ...prev, loading: false }));
      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      setAuthState((prev) => ({ ...prev, loading: false }));
      
      // Make sure we're returning a proper error object
      if (error instanceof Error) {
        throw error;
      } else if (typeof error === 'object' && error !== null) {
        // Try to create a more informative error
        const errorObj = error as any;
        if (errorObj.message) {
          throw new Error(errorObj.message);
        } else if (errorObj.error_description) {
          throw new Error(errorObj.error_description);
        } else if (errorObj.error) {
          throw new Error(errorObj.error);
        } else {
          throw new Error(`Registration failed: ${JSON.stringify(error)}`);
        }
      } else {
        throw new Error('An unexpected error occurred during registration');
      }
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setAuthState({
        user: null,
        profile: null,
        warrior: null,
        dojo: null,
        accountType: null,
        loading: false,
        isAuthenticated: false,
        onboardingStep: null,
      });
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ authState, setAuthState, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}