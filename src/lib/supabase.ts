import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug environment variables
console.log('Environment check:', {
  url: supabaseUrl ? 'Present' : 'Missing',
  key: supabaseAnonKey ? 'Present' : 'Missing',
  actualUrl: supabaseUrl
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${error.message}`);
}

export const supabase = createClient<Database>(
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
      },
      fetch: (url, options = {}) => {
        return fetch(url, options).catch(error => {
          console.warn('Supabase fetch error:', error.message);
          throw new Error('Connection to database failed. Please check your internet connection and try again.');
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

// Enhanced connection test with better error handling
const testConnection = async () => {
  console.log('Testing Supabase connection...');
  console.log('Connecting to:', supabaseUrl);
  
  try {
    // Test with a simple query that should work even with basic permissions
    const { data, error } = await supabase
      .from('participants')
      .select('count')
      .limit(1)
      .maybeSingle();
    
    if (error && !['PGRST116', 'PGRST301'].includes(error.code)) { // Allow "no rows" and "multiple rows" errors
      throw error;
    }
    
    console.log('✅ Successfully connected to Supabase');
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
  console.warn('⚠️ Connection test failed, but application will continue:', error.message);
  console.log('💡 The app may still work if the connection issue resolves itself');
  console.log('🔧 To fix CORS issues: Add https://localhost:5173 to your Supabase project CORS settings');
  return false;
});

// Initialize connection test
connectionPromise;

export default supabase;