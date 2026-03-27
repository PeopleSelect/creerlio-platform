import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// GET /api/business/pipeline
// Returns all customer connections for this business with:
// - customer profile details
// - engagement score, qr_source, relationship_status
// - opportunity count (open + total)
// - latest message
// - computed signals
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = supabaseServiceServer()

  const { data: bp } = await svc
    .from('business_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!bp) return NextResponse.json({ connections: [], metrics: null })

  // Load connections with customer profiles
  const { data: conns, error } = await svc
    .from('customer_connections')
    .select(`
      id, status, relationship_status, engagement_score, qr_source,
      last_interaction_at, created_at, updated_at,
      customer_profiles ( id, name, email, company, location, phone )
    `)
    .eq('business_id', bp.id)
    .order('engagement_score', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = conns || []

  // For each connection: opportunity counts + latest message
  const enriched = await Promise.all(rows.map(async (conn: any) => {
    const [{ count: totalOpps }, { count: openOpps }, { data: latestMsg }] = await Promise.all([
      svc.from('opportunity_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', bp.id),
      svc.from('opportunity_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', bp.id)
        .in('status', ['sent', 'viewed']),
      svc.from('customer_messages')
        .select('body, sender_type, created_at')
        .eq('connection_id', conn.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    // Derive signals
    const signals: string[] = []
    const score = conn.engagement_score || 0
    const lastActive = conn.last_interaction_at || conn.updated_at
    const daysSince  = (Date.now() - new Date(lastActive).getTime()) / 86_400_000

    if (score >= 70)              signals.push('high_intent')
    if (score >= 40 && score < 70) signals.push('engaged')
    if (conn.qr_source)           signals.push('qr_connected')
    if (daysSince <= 3)           signals.push('recently_active')
    if ((openOpps ?? 0) > 0)      signals.push('open_opportunity')
    if (conn.relationship_status === 'dormant' && daysSince <= 7) signals.push('re_engaging')

    return {
      ...conn,
      total_opportunities: totalOpps ?? 0,
      open_opportunities:  openOpps  ?? 0,
      latest_message:      latestMsg ?? null,
      signals,
    }
  }))

  // Pipeline metrics
  const metrics = {
    total:         rows.length,
    active:        rows.filter((c: any) => c.relationship_status === 'active').length,
    in_progress:   rows.filter((c: any) => c.relationship_status === 'in_progress').length,
    prospect:      rows.filter((c: any) => (c.relationship_status || 'prospect') === 'prospect').length,
    dormant:       rows.filter((c: any) => c.relationship_status === 'dormant').length,
    qr_sourced:    rows.filter((c: any) => !!c.qr_source).length,
    open_opps:     enriched.reduce((s, c) => s + (c.open_opportunities || 0), 0),
    high_intent:   enriched.filter(c => c.signals.includes('high_intent')).length,
  }

  return NextResponse.json({ connections: enriched, metrics })
}
