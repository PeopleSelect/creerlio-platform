import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

function makeToken() {
  // URL-safe token: base64url without padding
  return randomBytes(12).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function asBool(v: any, fallback = false) {
  return typeof v === 'boolean' ? v : fallback
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    const user = await getUserFromBearer(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const mode = String(body?.mode || 'full').trim() || 'full' // full | public | custom
    const expiry_date = body?.expiry_date ? new Date(String(body.expiry_date)).toISOString() : null
    const max_views = body?.max_views != null && String(body.max_views).trim() !== '' ? Number(body.max_views) : null
    const restricted_email = body?.restricted_email ? String(body.restricted_email).trim().toLowerCase() : null
    const restricted_company = body?.restricted_company ? String(body.restricted_company).trim() : null

    const permissions_json =
      typeof body?.permissions_json === 'object' && body.permissions_json
        ? body.permissions_json
        : mode === 'public'
          ? {
              sections: { intro: true, skills: true, projects: true, social: true },
              media: { avatar: true, intro_video: false, banner: false },
              contact: { phone: false, email: false },
            }
          : {
              sections: {
                intro: true,
                skills: true,
                experience: true,
                education: true,
                projects: true,
                social: true,
                referees: true,
                attachments: true,
              },
              media: { avatar: true, intro_video: true, banner: false },
              contact: { phone: true, email: true },
            }

    const supabase = supabaseServiceServer()

    // Resolve talent_profile_id for this user
    const { data: tp, error: tpErr } = await supabase
      .from('talent_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (tpErr) return NextResponse.json({ error: tpErr.message }, { status: 500 })
    const talent_profile_id = tp?.id || user.id

    // Load latest portfolio meta (source of truth for experience/projects/etc)
    const { data: portfolioItem, error: portErr } = await supabase
      .from('talent_bank_items')
      .select('id, metadata')
      .eq('user_id', user.id)
      .eq('item_type', 'portfolio')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (portErr) return NextResponse.json({ error: portErr.message }, { status: 500 })
    const meta = (portfolioItem?.metadata || {}) as any

    const template_id = typeof meta?.selected_template_id === 'string' ? meta.selected_template_id : 'fullstack-developer'

    // Build shared payload (deterministic, minimal schema aligned with existing snapshot renderer)
    const sec = permissions_json?.sections || {}
    const med = permissions_json?.media || {}

    const shared_payload = {
      template_id,
      sections: {
        ...(asBool(sec.intro, true)
          ? {
              intro: {
                name: meta?.name || null,
                title: meta?.title || null,
                bio: meta?.bio || null,
              },
            }
          : {}),
        ...(asBool(sec.social, false) ? { social: Array.isArray(meta?.socialLinks) ? meta.socialLinks : [] } : {}),
        ...(asBool(sec.skills, false) ? { skills: Array.isArray(meta?.skills) ? meta.skills : [] } : {}),
        ...(asBool(sec.experience, false) ? { experience: Array.isArray(meta?.experience) ? meta.experience : [] } : {}),
        ...(asBool(sec.education, false) ? { education: Array.isArray(meta?.education) ? meta.education : [] } : {}),
        ...(asBool(sec.referees, false) ? { referees: Array.isArray(meta?.referees) ? meta.referees : [] } : {}),
        ...(asBool(sec.projects, false) ? { projects: Array.isArray(meta?.projects) ? meta.projects : [] } : {}),
        ...(asBool(sec.attachments, false) ? { attachments: Array.isArray(meta?.attachments) ? meta.attachments : [] } : {}),
      },
      media: {
        ...(asBool(med.avatar, false) && meta?.avatar_path ? { avatar_path: meta.avatar_path } : {}),
        ...(asBool(med.banner, false) && meta?.banner_path ? { banner_path: meta.banner_path } : {}),
        ...(asBool(med.intro_video, false) && typeof meta?.introVideoId === 'number'
          ? { intro_video_id: meta.introVideoId }
          : {}),
      },
      snapshot_timestamp: new Date().toISOString(),
      version: 1,
    }

    // Insert snapshot (service role bypasses RLS)
    const { data: snapshot, error: snapErr } = await supabase
      .from('talent_portfolio_snapshots')
      .insert({
        talent_profile_id,
        user_id: user.id,
        template_id,
        shared_payload,
        business_id: null,
      })
      .select('id')
      .single()

    if (snapErr) return NextResponse.json({ error: snapErr.message }, { status: 500 })

    const shareToken = makeToken()

    const { error: linkErr } = await supabase.from('profile_share_links').insert({
      talent_profile_id,
      token: shareToken,
      permissions_json,
      expiry_date,
      max_views,
      restricted_email,
      restricted_company,
      snapshot_id: snapshot?.id || null,
    })

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })

    const origin = req.nextUrl.origin
    return NextResponse.json({
      success: true,
      token: shareToken,
      share_url: `${origin}/share/${shareToken}`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

