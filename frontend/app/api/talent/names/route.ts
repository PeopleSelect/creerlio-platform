export const dynamic = 'force-dynamic'

/**
 * POST /api/talent/names
 * Batch-fetch talent names for a list of talent_profile IDs.
 * Uses service role to bypass RLS — caller must be authenticated.
 * Body: { talent_ids: string[] }
 * Returns: { names: Record<string, string> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromBearer, supabaseServiceServer } from '@/lib/supabaseServer'

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
