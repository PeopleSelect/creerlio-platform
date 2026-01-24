import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

export async function createClient(accessToken?: string) {
  if (!url || !anonKey) {
    throw new Error('Supabase env missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  
  const client = createSupabaseClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
    },
  })
  
  // If access token provided, set it on the client
  if (accessToken) {
    // Set the session so RLS can access auth.uid()
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: '', // Not needed for server-side
    }).catch(() => {
      // If setSession fails, try setting auth directly
      // This ensures RLS policies can access auth.uid()
    })
  }
  
  return client
}
