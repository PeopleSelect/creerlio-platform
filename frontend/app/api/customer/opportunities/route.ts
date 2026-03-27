import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// GET /api/customer/opportunities — list opportunities sent by this user
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = supabaseServiceServer()

  const { data, error } = await svc
    .from('opportunities')
    .select(`
      id, type, title, description, budget, deadline, status, created_at,
      opportunity_recipients (
        id, business_id, status, response_message, created_at,
        business_profiles ( id, name, business_name, industry, city )
      )
    `)
    .eq('sender_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ opportunities: data || [] })
}

// POST /api/customer/opportunities — create a new opportunity
// Body: { type, title, description?, budget?, deadline?, business_ids: string[] }
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { type, title, description, product_name, budget, deadline, business_ids } = body

  if (!type || !title?.trim() || !Array.isArray(business_ids) || business_ids.length === 0) {
    return NextResponse.json({ error: 'type, title, and at least one business_id are required' }, { status: 400 })
  }

  const svc = supabaseServiceServer()

  const { data: opp, error: oppErr } = await svc
    .from('opportunities')
    .insert({
      sender_id:   user.id,
      type,
      title:        title.trim(),
      description:  description?.trim()  || null,
      product_name: product_name?.trim() || null,
      budget:       budget?.trim()       || null,
      deadline:     deadline             || null,
      status:      'sent',
    })
    .select()
    .single()

  if (oppErr) return NextResponse.json({ error: oppErr.message }, { status: 500 })

  const recipients = (business_ids as string[]).map(bid => ({
    opportunity_id: opp.id,
    business_id:    bid,
    status:         'sent',
  }))

  const { error: recErr } = await svc.from('opportunity_recipients').insert(recipients)
  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 })

  // Log activity event
  await svc.from('activity_events').insert({
    user_id:  user.id,
    type:     'opportunity_sent',
    metadata: { opportunity_id: opp.id, opportunity_type: type, recipient_count: business_ids.length },
  }).catch(() => {})

  return NextResponse.json({ opportunity: opp }, { status: 201 })
}
