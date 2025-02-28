'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Warrior = Database['public']['Tables']['warriors']['Row'];
type Dojo = Database['public']['Tables']['dojos']['Row'];

interface AuthState {
  user: User | null;
  profile: Profile | null;
  warrior: Warrior | null;
  dojo: Dojo | null;
  loading: boolean;
}

interface AuthContextType {
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    warrior: null,
    dojo: null,
    loading: true,
  });

  // Fetch user data from Supabase
  const fetchUserData = async (user: User | null) => {
    if (!user) {
      setAuthState({
        user: null,
        profile: null,
        warrior: null,
        dojo: null,
        loading: false,
      });
      return;
    }

    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Fetch warrior if profile exists
      let warrior = null;
      if (profile) {
        const { data: warriorData, error: warriorError } = await supabase
          .from('warriors')
          .select('*')
          .eq('owner_id', user.id)
          .single();

        if (!warriorError) {
          warrior = warriorData;
        }
      }

      // Fetch dojo if profile exists
      let dojo = null;
      if (profile) {
        const { data: dojoData, error: dojoError } = await supabase
          .from('dojos')
          .select('*')
          .eq('owner_id', user.id)
          .single();

        if (!dojoError) {
          dojo = dojoData;
        }
      }

      setAuthState({
        user,
        profile,
        warrior,
        dojo,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      setAuthState({
        user,
        profile: null,
        warrior: null,
        dojo: null,
        loading: false,
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

  const signIn = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      await fetchUserData(data.user);
      router.push('/');
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      // Don't fetchUserData here as we need to wait for email verification
      setAuthState((prev) => ({ ...prev, loading: false }));
      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      setAuthState((prev) => ({ ...prev, loading: false }));
      throw error;
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
        loading: false,
      });
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ authState, signIn, signUp, signOut }}>
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