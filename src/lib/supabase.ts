import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Supabase Environment Check:');
console.log('URL present:', !!supabaseUrl);
console.log('Key present:', !!supabaseAnonKey);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabase: any;

if (isSupabaseConfigured) {
  console.log('✅ Creating Supabase client with provided credentials');
  supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-application-name': 'sun-is-up'
        }
      }
    }
  );
} else {
  console.warn('⚠️ Supabase not configured - environment variables missing');
  console.log('Please click "Connect to Supabase" button to set up your database connection');
  
  // Create a mock client that shows helpful error messages
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ 
        data: { session: null }, 
        error: { message: 'Please connect to Supabase first' } 
      }),
      getUser: () => Promise.resolve({ 
        data: { user: null }, 
        error: { message: 'Please connect to Supabase first' } 
      }),
      signInWithPassword: () => Promise.resolve({ 
        data: null, 
        error: { message: 'Please connect to Supabase to enable authentication' } 
      }),
      signUp: () => Promise.resolve({ 
        data: null, 
        error: { message: 'Please connect to Supabase to enable user registration' } 
      }),
      signOut: () => Promise.resolve({ error: null }),
      resetPasswordForEmail: () => Promise.resolve({ 
        error: { message: 'Please connect to Supabase to enable password reset' } 
      }),
      onAuthStateChange: () => ({ 
        data: { 
          subscription: { unsubscribe: () => {} } 
        } 
      })
    },
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: () => ({ 
          single: () => Promise.resolve({ 
            data: null, 
            error: { message: 'Please connect to Supabase to access database' } 
          }),
          limit: () => Promise.resolve({ 
            data: [], 
            error: { message: 'Please connect to Supabase to access database' } 
          })
        }),
        not: () => ({
          eq: () => Promise.resolve({ 
            data: [], 
            error: { message: 'Please connect to Supabase to access database' } 
          })
        }),
        order: () => Promise.resolve({ 
          data: [], 
          error: { message: 'Please connect to Supabase to access database' } 
        }),
        limit: () => Promise.resolve({ 
          data: [], 
          error: { message: 'Please connect to Supabase to access database' } 
        })
      }),
      insert: () => Promise.resolve({ 
        error: { message: 'Please connect to Supabase to save data' } 
      }),
      update: () => ({ 
        eq: () => Promise.resolve({ 
          error: { message: 'Please connect to Supabase to update data' } 
        })
      }),
      delete: () => ({ 
        eq: () => Promise.resolve({ 
          error: { message: 'Please connect to Supabase to delete data' } 
        })
      })
    }),
    rpc: () => Promise.resolve({ 
      data: null, 
      error: { message: 'Please connect to Supabase to use database functions' } 
    }),
    supabaseUrl: supabaseUrl || '',
    supabaseKey: supabaseAnonKey || ''
  };
}

export { supabase };
export const isSupabaseAvailable = () => isSupabaseConfigured;
export default supabase;