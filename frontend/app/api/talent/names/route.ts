export const dynamic = 'force-dynamic'

/**
 * GET /api/talent/names?talent_id=<id>
 * Fetch a single talent profile (user_id + portfolio) using service role.
 * Uses service role to bypass RLS — caller must be authenticated.
 * Returns: { id, user_id, portfolio: { metadata } | null }
 *
 * POST /api/talent/names
 * Batch-fetch talent names for a list of talent_profile IDs.
 * Uses service role to bypass RLS — caller must be authenticated.
 * Body: { talent_ids: string[] }
 * Returns: { names: Record<string, string> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromBearer, supabaseServiceServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || null
    const user = await getUserFromBearer(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const talentId = request.nextUrl.searchParams.get('talent_id')?.trim()
    if (!talentId) {
      return NextResponse.json({ error: 'talent_id is required' }, { status: 400 })
    }

    const supabase = supabaseServiceServer()

    // 1. Try talent_profiles by profile id
    let { data: profile, error: profileErr } = await supabase
      .from('talent_profiles')
      .select('id, user_id, name, title, location')
      .eq('id', talentId)
      .maybeSingle()

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    // 2. Try talent_profiles by user_id (when caller passed auth UUID instead of profile id)
    if (!profile) {
      const byUid = await supabase
        .from('talent_profiles')
        .select('id, user_id, name, title, location')
        .eq('user_id', talentId)
        .maybeSingle()
      if (!byUid.error && byUid.data) {
        profile = byUid.data
      }
    }

    // 3. Try customer_profiles by user_id (QR-connected customer with no talent profile)
    if (!profile) {
      const custRes = await supabase
        .from('customer_profiles')
        .select('user_id, name')
        .eq('user_id', talentId)
        .maybeSingle()
      if (!custRes.error && custRes.data) {
        const cp = custRes.data as any
        return NextResponse.json({
          profile: { id: talentId, user_id: talentId, name: cp.name || 'Customer', title: null, location: null },
          portfolio: null,
        })
      }

      // 4. Last resort: auth admin metadata
      const { data: authUser } = await supabase.auth.admin.getUserById(talentId)
      if (authUser?.user) {
        const meta = authUser.user.user_metadata || {}
        const name = meta.full_name || meta.name || authUser.user.email?.split('@')[0] || 'User'
        return NextResponse.json({
          profile: { id: talentId, user_id: talentId, name, title: null, location: null },
          portfolio: null,
        })
      }

      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const targetUserId = profile.user_id || talentId

    const { data: bankItem } = await supabase
      .from('talent_bank_items')
      .select('id, metadata, created_at')
      .eq('user_id', targetUserId)
      .eq('item_type', 'portfolio')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ profile, portfolio: bankItem || null })
  } catch (error: any) {
    console.error('[Talent Names GET] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || null
    const user = await getUserFromBearer(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const talentIds: string[] = (body?.talent_ids || []).map(String).filter(Boolean)

    if (talentIds.length === 0) {
      return NextResponse.json({ names: {} })
    }

    const supabase = supabaseServiceServer()
    const nameMap: Record<string, string> = {}

    // Batch 1: talent_profiles
    const { data: profiles } = await supabase
      .from('talent_profiles')
      .select('id, name, title, user_id')
      .in('id', talentIds)

    const userIdByTalentId: Record<string, string> = {}
    const stillMissing: string[] = []

    for (const tp of profiles || []) {
      const key = String(tp.id)
      if (tp.user_id) userIdByTalentId[key] = String(tp.user_id)
      const name = tp.name?.trim() || tp.title?.trim() || ''
      if (name) {
        nameMap[key] = name
      } else {
        stillMissing.push(key)
      }
    }

    // Any IDs that weren't in profiles at all
    for (const id of talentIds) {
      if (!nameMap[id] && !stillMissing.includes(id)) stillMissing.push(id)
    }

    // Batch 2: portfolio metadata fallback for still-missing names
    if (stillMissing.length > 0) {
      const uids = stillMissing.map((id) => userIdByTalentId[id] || id)
      const { data: bankItems } = await supabase
        .from('talent_bank_items')
        .select('user_id, metadata')
        .in('user_id', uids)
        .eq('item_type', 'portfolio')

      const talentByUid: Record<string, string> = {}
      for (const tid of stillMissing) {
        const uid = userIdByTalentId[tid] || tid
        talentByUid[uid] = tid
      }

      for (const item of bankItems || []) {
        const talentId = talentByUid[String(item.user_id)]
        if (talentId && !nameMap[talentId] && item.metadata?.name?.trim()) {
          nameMap[talentId] = String(item.metadata.name).trim()
        }
      }
    }

    return NextResponse.json({ names: nameMap })
  } catch (error: any) {
    console.error('[Talent Names API] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
