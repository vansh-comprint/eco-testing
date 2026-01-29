import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Regular client for normal operations (uses anon key)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// DEPRECATED: supabaseAdmin has been removed.
// All admin operations (password resets, user management) now go through the REST API backend.
// See: usersApi.resetPassword(), usersApi.create(), etc. in @/lib/api/users.ts
export const supabaseAdmin = null as any; // Stub for legacy imports - will throw on use

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any): never {
  console.error('[Supabase Error]', error);
  throw new Error(error.message || 'An unexpected error occurred');
}

// Helper to check if we're using Supabase or localStorage
export const isSupabaseEnabled = !!(supabaseUrl && supabaseAnonKey);
