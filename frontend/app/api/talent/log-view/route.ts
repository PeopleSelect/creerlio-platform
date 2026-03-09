import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const username = String(body?.username || '').trim().toLowerCase()
    const view_type = String(body?.view_type || 'public').trim() || 'public'
    if (!username) return NextResponse.json({ error: 'username is required' }, { status: 400 })

    const supabase = supabaseServiceServer()
    const { data: pub, error: pubErr } = await supabase
      .from('public_talent_profiles')
      .select('talent_profile_id')
      .eq('username', username)
      .maybeSingle()

    if (pubErr) return NextResponse.json({ error: pubErr.message }, { status: 500 })
    if (!pub?.talent_profile_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const viewer_email = body?.viewer_email ? String(body.viewer_email).trim().toLowerCase() : null
    const company = body?.company ? String(body.company).trim() : null

    // Viewer id best-effort
    let viewer_id: string | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const bearer = authHeader.substring(7)
      const { data } = await supabase.auth.getUser(bearer)
      viewer_id = data?.user?.id || null
    }

    await supabase.from('profile_views_log').insert({
      talent_profile_id: pub.talent_profile_id,
      viewer_id,
      viewer_email,
      company,
      view_type,
      page_path: `/${username}`,
      referrer: req.headers.get('referer') || null,
      user_agent: req.headers.get('user-agent') || null,
      session_id: req.headers.get('x-creerlio-session-id') || null,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

