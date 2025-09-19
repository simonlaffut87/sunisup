// Static mock client that doesn't try to connect anywhere
export const supabase = {
  from: () => ({
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null }),
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null })
      }),
      not: () => Promise.resolve({ data: [], error: null }),
      limit: () => Promise.resolve({ data: [], error: null })
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({
      eq: () => Promise.resolve({ data: null, error: null })
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
  }),
  supabaseUrl: '',
  supabaseKey: ''
};

export const isSupabaseAvailable = () => false;
export const handleSupabaseError = (error: any) => null;
export default supabase;