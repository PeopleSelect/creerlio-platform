import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isBusinessOwner(userId: string, businessId: string): Promise<boolean> {
  // Check direct ownership on business_profiles
  const { data: direct } = await supabase
    .from('business_profiles')
    .select('id')
    .eq('id', businessId)
    .eq('user_id', userId)
    .maybeSingle()
  if (direct) return true

  // Check via user_business_roles (used by multi-user businesses)
  const { data: role } = await supabase
    .from('user_business_roles')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .maybeSingle()
  if (role) return true

  // Check via businesses table (legacy)
  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!biz
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const view       = searchParams.get('view')        || 'outgoing'
    const type       = searchParams.get('type')        || null
    const status     = searchParams.get('status')      || 'active'
    const businessId = searchParams.get('business_id') || null

    if (view === 'outgoing') {
      // Connections I initiated — customer/talent dashboard
      let q = supabase
        .from('ros_connections')
        .select('id, relationship_type, entry_source, status, connected_at, last_interaction_at, disconnected_at, business_id')
        .eq('initiator_id', user.id)
        .eq('status', status)
        .order('connected_at', { ascending: false })

      if (type) q = q.eq('relationship_type', type)

      const { data: rows, error } = await q
      if (error) {
        console.error('[ROS outgoing]', error)
        return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 })
      }

      // Enrich with business profiles separately (avoids FK alias issues)
      const bizIds = [...new Set((rows || []).map((r: any) => r.business_id).filter(Boolean))]
      let bizMap: Record<string, any> = {}
      if (bizIds.length) {
        const { data: bps } = await supabase
          .from('business_profiles')
          .select('id, business_name, name, industry, city, state, logo_url')
          .in('id', bizIds)
        if (bps) bps.forEach((b: any) => { bizMap[b.id] = b })
      }

      const enriched = (rows || []).map((r: any) => ({
        ...r,
        business_profiles: bizMap[r.business_id] || null,
      }))

      return NextResponse.json({ connections: enriched })

    } else {
      // Incoming connections to my business — business CRM Network tab
      if (!businessId) {
        return NextResponse.json({ error: 'business_id required for incoming view' }, { status: 400 })
      }

      const owned = await isBusinessOwner(user.id, businessId)
      if (!owned) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      let q = supabase
        .from('ros_connections')
        .select('id, initiator_id, relationship_type, entry_source, status, connected_at, last_interaction_at, disconnected_at, campaign')
        .eq('business_id', businessId)
        .eq('status', status)
        .order('connected_at', { ascending: false })

      if (type) q = q.eq('relationship_type', type)

      const { data: rows, error } = await q
      if (error) {
        console.error('[ROS incoming]', error)
        return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 })
      }

      // Enrich with talent profiles
      const initiatorIds = [...new Set((rows || []).map((r: any) => r.initiator_id).filter(Boolean))]
      let profileMap: Record<string, { name: string; title?: string }> = {}

      if (initiatorIds.length > 0) {
        const { data: tps } = await supabase
          .from('talent_profiles')
          .select('user_id, name, title')
          .in('user_id', initiatorIds)
        if (tps) tps.forEach((tp: any) => { profileMap[tp.user_id] = { name: tp.name, title: tp.title } })
      }

      const enriched = (rows || []).map((r: any) => ({
        ...r,
        profile: profileMap[r.initiator_id] || null,
      }))

      return NextResponse.json({ connections: enriched })
    }
  } catch (err) {
    console.error('[ROS connections]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
