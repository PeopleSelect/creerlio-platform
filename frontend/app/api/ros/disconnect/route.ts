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
    const { connection_id, reason } = body

    if (!connection_id) return NextResponse.json({ error: 'connection_id required' }, { status: 400 })

    // Verify the caller owns this connection (either as initiator or business owner)
    const { data: conn } = await supabase
      .from('ros_connections')
      .select('id, initiator_id, business_id, status')
      .eq('id', connection_id)
      .maybeSingle()

    if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })

    const isInitiator = conn.initiator_id === user.id

    // Check if user is the business owner (direct, via roles, or legacy)
    let isBusinessOwner = false
    if (!isInitiator) {
      const { data: direct } = await supabase
        .from('business_profiles').select('id')
        .eq('id', conn.business_id).eq('user_id', user.id).maybeSingle()
      if (direct) {
        isBusinessOwner = true
      } else {
        const { data: role } = await supabase
          .from('user_business_roles').select('id')
          .eq('business_id', conn.business_id).eq('user_id', user.id).maybeSingle()
        isBusinessOwner = !!role
      }
    }

    if (!isInitiator && !isBusinessOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (conn.status === 'disconnected') {
      return NextResponse.json({ error: 'Already disconnected' }, { status: 409 })
    }

    // Soft-delete — preserve audit trail
    const { error: updateErr } = await supabase
      .from('ros_connections')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        disconnected_by: user.id,
        disconnected_reason: reason || null,
      })
      .eq('id', connection_id)

    if (updateErr) {
      console.error('[ROS disconnect]', updateErr)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    // Write audit event
    await supabase.from('ros_connection_events').insert({
      connection_id,
      event_type: 'disconnected',
      actor_id: user.id,
      metadata: { reason, disconnected_by_role: isInitiator ? 'initiator' : 'business' },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ROS disconnect]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
