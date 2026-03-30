import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'outgoing'       // outgoing = my connections, incoming = connections to my business
    const type = searchParams.get('type') || null             // filter by relationship_type
    const status = searchParams.get('status') || 'active'
    const business_id = searchParams.get('business_id') || null  // for incoming view

    if (view === 'outgoing') {
      // Connections I initiated (for customer/talent dashboard)
      let q = supabase
        .from('ros_connections')
        .select(`
          id, relationship_type, entry_source, status,
          connected_at, last_interaction_at, disconnected_at,
          business_profiles!business_id (
            id, business_name, name, industry, city, state,
            logo_url
          )
        `)
        .eq('initiator_id', user.id)
        .eq('status', status)
        .order('connected_at', { ascending: false })

      if (type) q = q.eq('relationship_type', type)

      const { data, error } = await q
      if (error) {
        console.error('[ROS connections outgoing]', error)
        return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 })
      }

      return NextResponse.json({ connections: data || [] })

    } else {
      // Connections to my business (for business CRM tab)
      if (!business_id) return NextResponse.json({ error: 'business_id required for incoming view' }, { status: 400 })

      // Verify ownership
      const { data: owned } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('id', business_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      let q = supabase
        .from('ros_connections')
        .select(`
          id, relationship_type, entry_source, status,
          connected_at, last_interaction_at, disconnected_at,
          campaign,
          users!initiator_id (
            id, email
          )
        `)
        .eq('business_id', business_id)
        .eq('status', status)
        .order('connected_at', { ascending: false })

      if (type) q = q.eq('relationship_type', type)

      const { data, error } = await q
      if (error) {
        console.error('[ROS connections incoming]', error)
        return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 })
      }

      // Enrich with profile names from talent_profiles / customer data
      const initiatorIds = (data || []).map((c: any) => c.initiator_id).filter(Boolean)
      let profileMap: Record<string, { name: string; title?: string }> = {}

      if (initiatorIds.length > 0) {
        const { data: tps } = await supabase
          .from('talent_profiles')
          .select('user_id, name, title')
          .in('user_id', initiatorIds)
        if (tps) tps.forEach((tp: any) => { profileMap[tp.user_id] = { name: tp.name, title: tp.title } })
      }

      const enriched = (data || []).map((c: any) => ({
        ...c,
        profile: profileMap[c.initiator_id] || null,
      }))

      return NextResponse.json({ connections: enriched })
    }
  } catch (err) {
    console.error('[ROS connections]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
