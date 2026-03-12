export const dynamic = 'force-dynamic'

/**
 * POST /api/talent/attachments
 * Batch-fetch talent bank attachment items by ID, using service role to bypass RLS.
 * Caller must be authenticated. Intended for business users viewing connected talent portfolios.
 * Body: { talent_id: string, item_ids: number[] }
 * Returns: { items: TalentBankItem[] }
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
    const talentId = String(body?.talent_id || '').trim()
    const itemIds: number[] = (body?.item_ids || []).map(Number).filter((n: number) => Number.isFinite(n) && n > 0)

    if (!talentId) {
      return NextResponse.json({ error: 'talent_id is required' }, { status: 400 })
    }
    if (itemIds.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const supabase = supabaseServiceServer()

    // Get the talent's user_id so we can scope the query correctly
    const { data: profile } = await supabase
      .from('talent_profiles')
      .select('user_id')
      .eq('id', talentId)
      .maybeSingle()

    const targetUserId = profile?.user_id || talentId

    const { data: items, error } = await supabase
      .from('talent_bank_items')
      .select('id,item_type,title,metadata,file_path,file_type,file_url')
      .eq('user_id', targetUserId)
      .in('id', itemIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: items || [] })
  } catch (error: any) {
    console.error('[Talent Attachments API] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
