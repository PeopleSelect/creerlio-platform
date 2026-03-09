import { NextRequest, NextResponse } from 'next/server'
import { supabaseAnonServer } from '@/lib/supabaseServer'

export async function GET(_req: NextRequest, ctx: { params: { username: string } }) {
  const { username } = ctx.params
  const u = String(username || '').trim().toLowerCase()
  if (!u) return NextResponse.json({ error: 'username is required' }, { status: 400 })

  const supabase = supabaseAnonServer()
  const { data, error } = await supabase
    .from('public_talent_profiles')
    .select('*')
    .eq('username', u)
    .eq('is_public', true)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ profile: data })
}

