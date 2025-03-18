import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

export const createServerSupabaseClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: false
      }
    }
  );
};

export const createBrowserSupabaseClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: {
          getItem: (key) => document.cookie.split('; ').find(row => row.startsWith(`${key}=`))?.split('=')[1],
          setItem: (key, value) => document.cookie = `${key}=${value}; path=/; secure; samesite=lax`,
          removeItem: (key) => document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        }
      }
    }
  );
};