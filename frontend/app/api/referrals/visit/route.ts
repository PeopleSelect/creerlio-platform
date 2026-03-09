import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const username = String(body?.username || '').trim().toLowerCase()
    if (!username) return NextResponse.json({ error: 'username is required' }, { status: 400 })

    const session_id = String(body?.visitor_session_id || req.headers.get('x-creerlio-session-id') || '').trim()
    if (!session_id) return NextResponse.json({ error: 'visitor_session_id is required' }, { status: 400 })

    const supabase = supabaseServiceServer()
    const { data: pub, error: pubErr } = await supabase
      .from('public_talent_profiles')
      .select('talent_profile_id')
      .eq('username', username)
      .maybeSingle()

    if (pubErr) return NextResponse.json({ error: pubErr.message }, { status: 500 })
    if (!pub?.talent_profile_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await supabase.from('referrals').insert({
      referrer_talent_id: pub.talent_profile_id,
      visitor_session_id: session_id,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

