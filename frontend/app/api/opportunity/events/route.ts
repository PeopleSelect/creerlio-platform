export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'
import type { OpportunityEvent } from '../../../../../modules/opportunity-intelligence/shared/types'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') || null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const event: OpportunityEvent = await req.json()
    if (!event.user_id || !event.event_type || !event.entity_type) {
      return NextResponse.json({ error: 'user_id, event_type, entity_type required' }, { status: 400 })
    }

    const svc = supabaseServiceServer()
    const { error } = await svc.from('user_opportunity_events').insert({
      user_id:     event.user_id,
      event_type:  event.event_type,
      entity_type: event.entity_type,
      entity_id:   event.entity_id ?? null,
      metadata:    event.metadata ?? {},
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
