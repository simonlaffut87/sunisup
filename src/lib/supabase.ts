import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
  throw new Error('Supabase environment variables are required');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('❌ Invalid Supabase URL format:', supabaseUrl);
  throw new Error('Invalid Supabase URL format');
}

// Validate anon key format (should be a JWT)
if (!supabaseAnonKey.startsWith('eyJ')) {
  console.error('❌ Invalid Supabase anon key format');
  throw new Error('Invalid Supabase anon key format');
}

console.log('✅ Supabase environment variables validated');
console.log('🔗 Connecting to:', supabaseUrl);

// Create Supabase client
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
      }
    },
    db: {
      schema: 'public'
    }
  }
);

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test auth
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.warn('⚠️ Auth test warning:', authError.message);
    } else {
      console.log('✅ Auth service accessible');
    }

    // Test database access
    const { data, error } = await supabase
      .from('participants')
      .select('count')
      .limit(1);

    if (error) {
      if (error.code === '42501') {
        console.log('✅ Database connected (RLS policies active)');
        return true;
      } else {
        console.error('❌ Database test failed:', error);
        return false;
      }
    }

    console.log('✅ Full database access confirmed');
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
};

// Helper function to check if Supabase is available
export const isSupabaseAvailable = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Initialize connection test
testSupabaseConnection().then(connected => {
  if (connected) {
    console.log('🎉 Supabase connection established successfully');
  } else {
    console.error('❌ Supabase connection failed');
  }
});

export default supabase;