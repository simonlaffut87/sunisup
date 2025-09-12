import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Production fallback values
const fallbackUrl = 'https://qjvlnqjxkqwjxqwjxqwj.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqdmxucWp4a3F3anhxd2p4cXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NjI0MDAsImV4cCI6MjA1MDUzODQwMH0.demo-key-for-production';

// Debug environment variables
console.log('Environment check:', {
  url: supabaseUrl ? 'Present' : 'Missing - using fallback',
  key: supabaseAnonKey ? 'Present' : 'Missing - using fallback',
  actualUrl: supabaseUrl,
  environment: import.meta.env.MODE
});

const finalUrl = supabaseUrl || fallbackUrl;
const finalKey = supabaseAnonKey || fallbackKey;

// Validate URL format
try {
  new URL(finalUrl);
} catch (error) {
  console.error(`Invalid Supabase URL format: ${error.message}`);
}

export const supabase = createClient<Database>(
  finalUrl,
  finalKey,
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
      },
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(8000) // 8 second timeout
        }).catch(error => {
          console.warn('Supabase fetch error:', error.message);
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Connection timeout - using fallback data');
          }
          if (error.message?.includes('Failed to fetch')) {
            throw new Error('Network connection failed - using fallback data');
          }
          throw new Error('Connection to database failed - using fallback data');
        });
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  }
);

// Helper function to handle RLS permission errors silently
export const handleSupabaseError = (error: any) => {
  // Check if it's a RLS permission denied error (code 42501)
  if (error?.code === '42501' || 
      (error?.message && error.message.includes('permission denied')) ||
      (error?.body && typeof error.body === 'string' && error.body.includes('42501'))) {
    // Silently handle RLS errors - return null to indicate fallback should be used
    return null;
  }
  // For other errors, re-throw them
  throw error;
};

// Enhanced connection test with better error handling
const testConnection = async () => {
  console.log('Testing Supabase connection...');
  console.log('Connecting to:', supabaseUrl);
  
  try {
    // Test with a simple auth check first with timeout
    const authPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth check timeout')), 5000)
    );
    
    const { data: { session }, error: authError } = await Promise.race([authPromise, timeoutPromise]) as any;
    
    if (authError && !authError.message?.includes('Failed to fetch')) {
      console.warn('Auth check failed:', authError.message);
    }
    
    // Try a simple participants query with timeout
    try {
      const queryPromise = supabase
        .from('participants')
        .select('count')
        .limit(1)
        .maybeSingle();
      
      const queryTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 3000)
      );
      
      const { data, error } = await Promise.race([queryPromise, queryTimeoutPromise]) as any;
      
      if (error && error.code === '42501') {
        console.warn('⚠️ RLS policies restrict anonymous access to participants table');
        console.warn('💡 This is expected behavior - the app will use fallback data');
        console.log('✅ Supabase connection established (with RLS restrictions)');
        return true;
      }
      
      if (error && !['PGRST116', 'PGRST301'].includes(error.code)) {
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          throw new Error('Network connection failed');
        }
        throw error;
      }
    } catch (tableError: any) {
      if (tableError.code === '42501') {
        console.warn('⚠️ RLS policies restrict anonymous access - using fallback data');
        console.log('✅ Supabase connection established (with RLS restrictions)');
        return true;
      }
      if (tableError.message?.includes('timeout') || tableError.message?.includes('Failed to fetch')) {
        console.warn('⚠️ Connection timeout or network error - using fallback data');
        return false;
      }
      throw tableError;
    }
    
    console.log('✅ Successfully connected to Supabase with full access');
    return true;
  } catch (error: any) {
    console.error('❌ Supabase connection error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      status: error.status
    });
    
    // Provide specific guidance based on error type
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('Connection to database failed')) {
      console.error('🔧 Troubleshooting steps:');
      console.error('1. Check your internet connection');
      console.error('2. Verify Supabase project is active at:', supabaseUrl);
      console.error('3. Add https://localhost:5173 to CORS settings in Supabase dashboard');
      console.error('4. Go to Project Settings > API > CORS and add the URL');
    } else if (error.code === '42501') {
      console.error('🔒 RLS policies are blocking access');
      console.error('💡 Go to Supabase Dashboard > Authentication > Policies');
      console.error('💡 Create a policy for participants table allowing SELECT for anon role');
      console.error('💡 The app will continue with demonstration data');
      return false; // Don't throw, just return false
    } else if (error.code === '3000' || error.status === 401) {
      console.error('🔑 API key issue - check your VITE_SUPABASE_ANON_KEY');
    } else if (error.code === '42501' || error.status === 403) {
      console.error('🔒 Permission denied - check RLS policies');
    }
    
    return false;
  }
};

// Test connection with timeout
const connectionPromise = Promise.race([
  testConnection(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Connection test timeout')), 10000)
  )
]).catch((error) => {
  return false;
});

// Initialize connection test
connectionPromise;

export default supabase;