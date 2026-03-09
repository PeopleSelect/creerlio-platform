import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = String(body?.username || '').trim().toLowerCase()
    const requester_name = String(body?.name || '').trim()
    const requester_company = String(body?.company || '').trim() || null
    const requester_email = String(body?.email || '').trim().toLowerCase()
    const reason = String(body?.reason || '').trim() || null

    if (!username) return NextResponse.json({ error: 'username is required' }, { status: 400 })
    if (!requester_name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!requester_email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

    const supabase = supabaseServiceServer()

    const { data: pub, error: pubErr } = await supabase
      .from('public_talent_profiles')
      .select('talent_profile_id')
      .ilike('username', username)
      .maybeSingle()

    if (pubErr) return NextResponse.json({ error: pubErr.message }, { status: 500 })
    if (!pub?.talent_profile_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const viewer_session_id = req.headers.get('x-creerlio-session-id') || null
    const viewer_user_agent = req.headers.get('user-agent') || null

    const { error: insErr } = await supabase.from('profile_access_requests').insert({
      talent_profile_id: pub.talent_profile_id,
      requester_name,
      requester_company,
      requester_email,
      reason,
      viewer_session_id,
      viewer_user_agent,
    })

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

