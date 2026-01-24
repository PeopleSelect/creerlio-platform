import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function supabaseAnonServer() {
  if (!url || !anonKey) {
    throw new Error('Supabase env missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createClient(url, anonKey, { auth: { persistSession: false } })
}

export function supabaseServiceServer() {
  if (!url || !serviceKey) {
    throw new Error('Supabase env missing: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function getUserFromBearer(token: string | null) {
  if (!token) return null
  const supabase = supabaseAnonServer()
  const { data, error } = await supabase.auth.getUser(token)
  if (error) return null
  return data.user ?? null
}





