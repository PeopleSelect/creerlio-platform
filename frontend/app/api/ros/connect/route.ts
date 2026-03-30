import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { business_id, relationship_type = 'customer', entry_source = 'qr', campaign } = body

    if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400 })
    if (!['customer', 'talent', 'business'].includes(relationship_type)) {
      return NextResponse.json({ error: 'Invalid relationship_type' }, { status: 400 })
    }

    // Verify business exists
    const { data: biz, error: bizErr } = await supabase
      .from('business_profiles')
      .select('id, business_name, name, industry, city')
      .eq('id', business_id)
      .maybeSingle()

    if (bizErr || !biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    // Upsert connection — if previously disconnected, re-activate
    const { data: conn, error: connErr } = await supabase
      .from('ros_connections')
      .upsert(
        {
          initiator_id: user.id,
          business_id,
          relationship_type,
          entry_source,
          campaign,
          status: 'active',
          disconnected_at: null,
          disconnected_by: null,
          disconnected_reason: null,
          last_interaction_at: new Date().toISOString(),
        },
        { onConflict: 'initiator_id,business_id,relationship_type' }
      )
      .select()
      .single()

    if (connErr) {
      console.error('[ROS connect]', connErr)
      return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 })
    }

    // Write audit event
    await supabase.from('ros_connection_events').insert({
      connection_id: conn.id,
      event_type: 'connected',
      actor_id: user.id,
      metadata: { entry_source, campaign, relationship_type },
    })

    return NextResponse.json({
      success: true,
      connection: conn,
      business: {
        id: biz.id,
        name: biz.business_name || biz.name,
        industry: biz.industry,
        city: biz.city,
      },
    })
  } catch (err) {
    console.error('[ROS connect]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
