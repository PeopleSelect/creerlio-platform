import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const visitor_session_id = String(body?.visitor_session_id || '').trim()
    if (!visitor_session_id) return NextResponse.json({ error: 'visitor_session_id is required' }, { status: 400 })

    const supabase = supabaseServiceServer()

    // Resolve user from bearer
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const bearer = authHeader.substring(7)
    const { data, error: userErr } = await supabase.auth.getUser(bearer)
    if (userErr || !data?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const signup_user_id = data.user.id

    const { error } = await supabase
      .from('referrals')
      .update({ signup_user_id })
      .eq('visitor_session_id', visitor_session_id)
      .is('signup_user_id', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

