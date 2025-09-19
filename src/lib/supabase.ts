// Mock Supabase client for static site
const createMockClient = () => ({
  from: () => ({
    select: () => ({
      order: () => ({
        abortSignal: () => Promise.resolve({ data: [], error: null })
      }),
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null })
      }),
      not: () => ({
        eq: () => Promise.resolve({ data: [], error: null })
      }),
      limit: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error: null })
      })
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({
      eq: () => ({
        select: () => Promise.resolve({ data: null, error: null })
      })
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null })
    })
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ 
      data: null, 
      error: { message: 'Mode statique - connexion désactivée' } 
    }),
    signUp: () => Promise.resolve({ 
      data: null, 
      error: { message: 'Mode statique - inscription désactivée' } 
    }),
    signOut: () => Promise.resolve({ error: null }),
    resetPasswordForEmail: () => Promise.resolve({ 
      error: { message: 'Mode statique - réinitialisation désactivée' } 
    }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } }
    })
  },
  rpc: () => Promise.resolve({ 
    data: null, 
    error: { message: 'Mode statique - RPC désactivé' } 
  })
});

// Export the mock client
export const supabase = createMockClient();

// Helper function to check if Supabase is available (always false for static site)
export const isSupabaseAvailable = () => false;

// Helper function to handle errors (always return null for static site)
export const handleSupabaseError = (error: any) => null;

export default supabase;