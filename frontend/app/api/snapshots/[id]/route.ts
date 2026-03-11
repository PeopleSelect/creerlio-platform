import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

function anonId(uuid: string) {
  return 'CAN-' + uuid.replace(/-/g, '').slice(0, 5).toUpperCase()
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { id } = ctx.params
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const user = await getUserFromBearer(token)

    const supabase = supabaseServiceServer()

    const { data: snapshot, error } = await supabase
      .from('talent_snapshots')
      .select('id, talent_id, snapshot_title, headline, experience_years, location, skills_json, industry_tags, summary, is_active, view_count, search_appearance_count, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!snapshot) return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })

    // Check ownership
    const isOwner = user
      ? await (async () => {
          const { data: tp } = await supabase
            .from('talent_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()
          return tp?.id === snapshot.talent_id
        })()
      : false

    // Non-owners can only see active snapshots, and never see talent_id / snapshot_title
    if (!isOwner && !snapshot.is_active) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    // Log view (fire-and-forget)
    supabase.from('snapshot_views_log').insert({
      snapshot_id: id,
      viewer_user_id: user?.id || null,
      view_type: 'direct',
      session_id: req.headers.get('x-creerlio-session-id') || null,
    }).then(() => {})

    // Increment view_count (fire-and-forget)
    supabase
      .from('talent_snapshots')
      .update({ view_count: (snapshot.view_count || 0) + 1 })
      .eq('id', id)
      .then(() => {})

    if (isOwner) {
      // Owner gets full data including internal title
      return NextResponse.json({ snapshot, is_owner: true })
    }

    // Recruiter / public gets only anonymous-safe fields
    return NextResponse.json({
      snapshot: {
        id: snapshot.id,
        anon_id: anonId(snapshot.id),
        headline: snapshot.headline,
        experience_years: snapshot.experience_years,
        location: snapshot.location,
        skills: Array.isArray(snapshot.skills_json) ? snapshot.skills_json : [],
        industry_tags: snapshot.industry_tags || [],
        summary: snapshot.summary,
        view_count: snapshot.view_count,
        created_at: snapshot.created_at,
      },
      is_owner: false,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

// PATCH — toggle is_active (owner only)
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { id } = ctx.params
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const user = await getUserFromBearer(token)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await req.json()
    const supabase = supabaseServiceServer()

    const { data: tp } = await supabase
      .from('talent_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!tp) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Only allow toggling is_active via PATCH (full edit goes through POST /create)
    const updates: Record<string, unknown> = {}
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active

    const { data, error } = await supabase
      .from('talent_snapshots')
      .update(updates)
      .eq('id', id)
      .eq('talent_id', tp.id)
      .select('id, is_active')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, snapshot: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
