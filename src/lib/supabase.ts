import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a safe Supabase client that won't crash the app
let supabase: any = null;

try {
  if (supabaseUrl && supabaseAnonKey) {
    console.log('✅ Creating Supabase client');
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
    console.warn('⚠️ Supabase environment variables not found');
    // Create a mock client to prevent crashes
    supabase = {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => ({ 
          eq: () => ({ 
            single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            limit: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } })
          }),
          order: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
          limit: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } })
        }),
        insert: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
        update: () => ({ 
          eq: () => Promise.resolve({ error: { message: 'Supabase not configured' } })
        }),
        delete: () => ({ 
          eq: () => Promise.resolve({ error: { message: 'Supabase not configured' } })
        })
      }),
      rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      supabaseUrl: supabaseUrl || '',
      supabaseKey: supabaseAnonKey || ''
    };
  }
} catch (error) {
  console.error('❌ Error creating Supabase client:', error);
  // Create a minimal mock client to prevent app crashes
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Connection error' } }),
      signUp: () => Promise.resolve({ data: null, error: { message: 'Connection error' } }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({ 
        eq: () => ({ 
          single: () => Promise.resolve({ data: null, error: { message: 'Connection error' } }),
          limit: () => Promise.resolve({ data: [], error: { message: 'Connection error' } })
        }),
        order: () => Promise.resolve({ data: [], error: { message: 'Connection error' } }),
        limit: () => Promise.resolve({ data: [], error: { message: 'Connection error' } })
      }),
      insert: () => Promise.resolve({ error: { message: 'Connection error' } }),
      update: () => ({ 
        eq: () => Promise.resolve({ error: { message: 'Connection error' } })
      }),
      delete: () => ({ 
        eq: () => Promise.resolve({ error: { message: 'Connection error' } })
      })
    }),
    rpc: () => Promise.resolve({ data: null, error: { message: 'Connection error' } }),
    supabaseUrl: supabaseUrl || '',
    supabaseKey: supabaseAnonKey || ''
  };
}

export { supabase };
export default supabase;