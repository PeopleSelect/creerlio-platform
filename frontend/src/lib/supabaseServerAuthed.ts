import 'server-only'

import { createClient } from '@supabase/supabase-js'

export function supabaseServerAuthed(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL')
  if (!anon) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createClient(url, anon, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}


