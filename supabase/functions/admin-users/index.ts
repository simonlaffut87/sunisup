import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
  last_login: string;
  total_consumption: number;
  total_shared_energy: number;
  savings_percentage: number;
}

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  member_type: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create regular client to verify the requesting user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if the user is an admin (you can customize this logic)
    // For now, we'll check if the user email is the admin email
    const adminEmail = 'info@sunisup.be'
    if (user.email !== adminEmail) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin privileges required.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'GET') {
      // Handle different endpoints
      const url = new URL(req.url)
      const action = url.searchParams.get('action')

      if (action === 'list-users') {
        // Fetch all users using admin client
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
        if (authError) {
          throw authError
        }

        // Fetch energy data for each user and calculate stats
        const usersWithStats = await Promise.all(authUsers.users.map(async (authUser) => {
          const { data: energyData, error: energyError } = await supabaseAdmin
            .from('energy_data')
            .select('consumption, shared_energy')
            .eq('user_id', authUser.id)

          if (energyError) {
            console.error('Error fetching energy data for user:', authUser.id, energyError)
            return null
          }

          const totalConsumption = energyData.reduce((sum, item) => sum + Number(item.consumption), 0)
          const totalSharedEnergy = energyData.reduce((sum, item) => sum + Number(item.shared_energy), 0)
          const savingsPercentage = totalConsumption > 0 ? (totalSharedEnergy / totalConsumption) * 100 : 0

          return {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || '',
            created_at: authUser.created_at,
            last_login: authUser.last_sign_in_at || '',
            total_consumption: totalConsumption,
            total_shared_energy: totalSharedEnergy,
            savings_percentage: savingsPercentage
          }
        }))

        // Filter out null values
        const validUsers = usersWithStats.filter(user => user !== null) as DatabaseUser[]

        return new Response(
          JSON.stringify({ users: validUsers }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (action === 'get-user') {
        const userId = url.searchParams.get('userId')
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Fetch specific user details
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (authError) {
          throw authError
        }

        return new Response(
          JSON.stringify({ user: authUser.user }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'POST') {
      const url = new URL(req.url)
      const action = url.searchParams.get('action')

      if (action === 'create-user') {
        const body: CreateUserRequest = await req.json()
        
        if (!body.email || !body.password || !body.name || !body.member_type) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: email, password, name, member_type' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Create the user using admin client
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
          user_metadata: {
            name: body.name,
            member_type: body.member_type
          }
        })

        if (authError) {
          return new Response(
            JSON.stringify({ error: `Failed to create user: ${authError.message}` }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        if (!authData.user) {
          return new Response(
            JSON.stringify({ error: 'No user created' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Create the user profile in the users table
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authData.user.id,
            email: body.email,
            name: body.name,
            member_type: body.member_type
          })

        if (profileError) {
          console.warn('Error creating user profile:', profileError)
          // Don't fail if profile already exists
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            user: authData.user,
            message: 'User created successfully'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in admin-users function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})