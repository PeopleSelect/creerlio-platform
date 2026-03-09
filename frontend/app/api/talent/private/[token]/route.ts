import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

function isExternalUrl(url?: string | null) {
  return !!url && /^https?:\/\//i.test(url)
}

function encodeStoragePath(p: string) {
  return p.split('/').map(encodeURIComponent).join('/')
}

async function toSignedOrPublicUrl(supabase: ReturnType<typeof supabaseServiceServer>, bucket: string, path: string, seconds = 60 * 30) {
  if (!path) return null
  if (isExternalUrl(path)) return path

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds)
    if (!error && data?.signedUrl) return data.signedUrl
  } catch {}

  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeStoragePath(path)}`
  }
  return null
}

export async function GET(req: NextRequest, ctx: { params: { token: string } }) {
  try {
    const { token } = ctx.params
    const t = String(token || '').trim()
    if (!t) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    const supabase = supabaseServiceServer()

    const { data: link, error: linkErr } = await supabase
      .from('profile_share_links')
      .select('*')
      .eq('token', t)
      .maybeSingle()

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })
    if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (link.expiry_date && new Date(link.expiry_date).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 })
    }
    if (typeof link.max_views === 'number' && typeof link.view_count === 'number' && link.view_count >= link.max_views) {
      return NextResponse.json({ error: 'Link view limit reached' }, { status: 410 })
    }

    // Optional restrictions (best-effort)
    const viewer_email = (req.nextUrl.searchParams.get('email') || '').trim().toLowerCase() || null
    const viewer_company = (req.nextUrl.searchParams.get('company') || '').trim() || null
    if (link.restricted_email && viewer_email && link.restricted_email.toLowerCase() !== viewer_email) {
      return NextResponse.json({ error: 'Not allowed for this email' }, { status: 403 })
    }
    if (link.restricted_email && !viewer_email) {
      return NextResponse.json({ error: 'Email required for this link' }, { status: 403 })
    }
    if (link.restricted_company && viewer_company && link.restricted_company !== viewer_company) {
      return NextResponse.json({ error: 'Not allowed for this company' }, { status: 403 })
    }

    // Fetch snapshot payload (deterministic)
    let snapshotPayload: any = null
    if (link.snapshot_id) {
      const { data: snap, error: snapErr } = await supabase
        .from('talent_portfolio_snapshots')
        .select('id, template_id, shared_payload, talent_profile_id')
        .eq('id', link.snapshot_id)
        .maybeSingle()
      if (snapErr) return NextResponse.json({ error: snapErr.message }, { status: 500 })
      snapshotPayload = snap
    }

    if (!snapshotPayload?.shared_payload) {
      return NextResponse.json({ error: 'Share payload missing' }, { status: 500 })
    }

    // Resolve media URLs
    const payload = snapshotPayload.shared_payload
    const avatarUrl = payload?.media?.avatar_path ? await toSignedOrPublicUrl(supabase, 'talent-bank', String(payload.media.avatar_path)) : null

    let introVideoUrl: string | null = null
    if (payload?.media?.intro_video_id) {
      const { data: videoItem } = await supabase
        .from('talent_bank_items')
        .select('file_path, file_url')
        .eq('id', payload.media.intro_video_id)
        .maybeSingle()
      if (videoItem?.file_url && isExternalUrl(videoItem.file_url)) {
        introVideoUrl = videoItem.file_url
      } else if (videoItem?.file_path) {
        introVideoUrl = await toSignedOrPublicUrl(supabase, 'talent-bank', String(videoItem.file_path))
      }
    }

    // Increment view count (best-effort)
    await supabase
      .from('profile_share_links')
      .update({ view_count: (link.view_count || 0) + 1 })
      .eq('id', link.id)

    // Viewer id best-effort
    let viewer_id: string | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const bearer = authHeader.substring(7)
      const { data } = await supabase.auth.getUser(bearer)
      viewer_id = data?.user?.id || null
    }

    // Log view
    await supabase.from('profile_views_log').insert({
      talent_profile_id: snapshotPayload.talent_profile_id || link.talent_profile_id,
      viewer_id,
      viewer_email,
      company: viewer_company,
      view_type: 'private_link',
      page_path: `/share/${t}`,
      referrer: req.headers.get('referer') || null,
      user_agent: req.headers.get('user-agent') || null,
      session_id: req.headers.get('x-creerlio-session-id') || null,
    })

    return NextResponse.json({
      success: true,
      permissions: link.permissions_json,
      snapshot: payload,
      media_urls: {
        avatar_url: avatarUrl,
        intro_video_url: introVideoUrl,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

