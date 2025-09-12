import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Diagnostic complet des variables d'environnement
console.log('🔍 DIAGNOSTIC SUPABASE COMPLET:');
console.log('📋 Toutes les variables d\'environnement:', import.meta.env);
console.log('🔑 VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('🔑 VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('🌍 MODE:', import.meta.env.MODE);
console.log('🌍 DEV:', import.meta.env.DEV);
console.log('🌍 PROD:', import.meta.env.PROD);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ VARIABLES SUPABASE MANQUANTES:');
  console.error('URL présente:', !!supabaseUrl);
  console.error('Key présente:', !!supabaseAnonKey);
  console.error('URL value:', supabaseUrl);
  console.error('Key value:', supabaseAnonKey ? 'Present but hidden' : 'Missing');
  throw new Error('Variables d\'environnement Supabase manquantes. Vérifiez votre fichier .env');
}

console.log('✅ Variables Supabase trouvées');
console.log('🔗 URL:', supabaseUrl);
console.log('🔑 Key:', supabaseAnonKey ? 'Present' : 'Missing');

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      debug: true
    },
    global: {
      headers: {
        'x-application-name': 'sun-is-up',
        'x-client-info': 'supabase-js-web'
      },
      fetch: (url, options = {}) => {
        console.log('🌐 Supabase request:', url);
        console.log('📋 Options:', options);
        
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(15000) // 15 second timeout
        }).then(response => {
          console.log('📡 Response status:', response.status);
          console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
          
          if (!response.ok) {
            console.error('❌ Response not OK:', {
              status: response.status,
              statusText: response.statusText,
            }
            )
          }
        }
        )
      }
      fetch: (url, options = {}) => {
        console.log('🌐 Supabase request:', url);
        console.log('🔧 Options:', options);
        
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000)
        }).then(response => {
          console.log('📡 Response status:', response.status);
          console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
          
          if (!response.ok) {
            console.error('❌ Response not OK:', {
              status: response.status,
              statusText: response.statusText,
              url: response.url
            });
          }
          
          return response;
        }).catch(error => {
          console.error('❌ Fetch error détaillé:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            url: url
          });
          throw error;
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

// Test de connexion avec diagnostic complet
const testSupabaseConnection = async () => {
  console.log('🔍 TEST DE CONNEXION SUPABASE COMPLET');
  console.log('🔗 URL:', supabaseUrl);
  console.log('🔑 Key présente:', !!supabaseAnonKey);
  
  try {
    // Test 1: Vérifier la session auth
    console.log('🔐 Test 1: Vérification session auth...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erreur session:', sessionError);
    } else {
      console.log('✅ Session OK:', {
        hasSession: !!sessionData.session,
        userEmail: sessionData.session?.user?.email
      });
    }
    
  }
}
// Test de connexion simple
console.log('🔍 Test de connexion Supabase...');
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.warn('⚠️ Erreur session:', error.message);
  } else {
    console.log('✅ Session Supabase OK:', !!data.session);
    if (data.session) {
      console.log('👤 Utilisateur connecté:', data.session.user.email);
    }
  }
}).catch(err => {
  console.warn('⚠️ Erreur test session:', err);
});

export default supabase;