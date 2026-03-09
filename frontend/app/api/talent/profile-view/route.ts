import { NextRequest, NextResponse } from 'next/server'
import { getUserFromBearer, supabaseServiceServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    const user = await getUserFromBearer(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const name = String(body?.name || '').trim()
    const visible_sections_json = typeof body?.visible_sections_json === 'object' && body.visible_sections_json
      ? body.visible_sections_json
      : null

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!visible_sections_json) return NextResponse.json({ error: 'visible_sections_json is required' }, { status: 400 })

    const supabase = supabaseServiceServer()

    const { data: tp, error: tpErr } = await supabase
      .from('talent_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (tpErr) return NextResponse.json({ error: tpErr.message }, { status: 500 })
    const talent_profile_id = tp?.id || user.id

    const { data, error } = await supabase
      .from('profile_views')
      .insert({ talent_profile_id, name, visible_sections_json })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, view: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

