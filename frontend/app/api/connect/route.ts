import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// ── Helpers ───────────────────────────────────────────────────────────────

function buildActions(
  offerings: any[],
  connId: string,
  slug: string | null,
  bizName: string,
): object[] {
  const actions: object[] = []

  if (offerings.length > 0) {
    const top = offerings[0]
    actions.push({
      type:        'enquiry',
      label:       `Enquire about ${top.name}`,
      description: top.description || `Ask ${bizName} about ${top.name}`,
      href:        `/dashboard/customer/messages?connection_id=${connId}`,
    })
    actions.push({
      type:        'quote',
      label:       'Request a Quote',
      description: `Get pricing from ${bizName} for any service or product`,
      href:        `/dashboard/customer?open_opportunity=1&biz=${connId}`,
    })
  } else {
    actions.push({
      type:        'message',
      label:       'Send a Message',
      description: `Start a conversation with ${bizName}`,
      href:        `/dashboard/customer/messages?connection_id=${connId}`,
    })
    actions.push({
      type:        'quote',
      label:       'Request a Quote',
      description: `Get pricing or information from ${bizName}`,
      href:        `/dashboard/customer?open_opportunity=1`,
    })
  }

  if (slug) {
    actions.push({
      type:        'browse',
      label:       offerings.length > 0 ? `Browse ${offerings.length} offering${offerings.length !== 1 ? 's' : ''}` : 'View Profile',
      description: `See everything ${bizName} has to offer`,
      href:        `/businesses/${slug}`,
    })
  }

  actions.push({
    type:        'network',
    label:       'Your Network',
    description: 'View all your business connections',
    href:        '/dashboard/customer',
  })

  return actions
}

// ── GET /api/connect?b=<business_id> ─────────────────────────────────────
// Public preview — returns business + top products before the user connects.
// Optimised: two parallel queries.
export async function GET(req: NextRequest) {
  const bizId = new URL(req.url).searchParams.get('b')
  if (!bizId) return NextResponse.json({ error: 'Missing business id' }, { status: 400 })

  const svc = supabaseServiceServer()

  // Parallel: business profile + page + products + connection count
  const [bizRes, pageRes, productsRes, countRes] = await Promise.all([
    svc.from('business_profiles')
      .select('id, name, business_name, industry, city, state, country, description')
      .eq('id', bizId).eq('is_active', true).maybeSingle(),
    svc.from('business_profile_pages')
      .select('slug, logo_url, tagline').eq('business_id', bizId).maybeSingle(),
    svc.from('business_products')
      .select('id, name, description, category, price_from, price_to, price_unit, is_service')
      .eq('business_id', bizId).eq('is_active', true)
      .order('is_service', { ascending: true }).limit(4),
    svc.from('customer_connections')
      .select('id', { count: 'exact', head: true }).eq('business_id', bizId),
  ])

  if (!bizRes.data) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const biz      = bizRes.data
  const page     = pageRes.data ?? null
  const products = productsRes.data ?? []

  return NextResponse.json({
    business: {
      id:               biz.id,
      name:             biz.name || biz.business_name,
      industry:         biz.industry,
      city:             biz.city,
      state:            biz.state,
      description:      biz.description,
      logo_url:         page?.logo_url ?? null,
      tagline:          page?.tagline  ?? null,
      slug:             page?.slug     ?? null,
      connection_count: countRes.count ?? 0,
    },
    offerings: products,
  })
}

// ── POST /api/connect ─────────────────────────────────────────────────────
// Authenticated. Creates or updates the relationship.
// Returns a complete experience payload — frontend needs zero transformation.
// Body: { business_id, qr_source? }
export async function POST(req: NextRequest) {
  const t0 = Date.now()

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, qr_source } = await req.json().catch(() => ({}))
  if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400 })

  const svc = supabaseServiceServer()

  // ── Batch 1: all reads that don't depend on customer_id ──────────────────
  const [bizRes, pageRes, productsRes, cpRes, connCountRes] = await Promise.all([
    svc.from('business_profiles')
      .select('id, name, business_name, industry, city, state, description')
      .eq('id', business_id).eq('is_active', true).maybeSingle(),
    svc.from('business_profile_pages')
      .select('slug, logo_url, tagline').eq('business_id', business_id).maybeSingle(),
    svc.from('business_products')
      .select('id, name, description, category, price_from, price_to, price_unit, is_service')
      .eq('business_id', business_id).eq('is_active', true)
      .order('is_service', { ascending: true }).limit(4),
    svc.from('customer_profiles')
      .select('id, name').eq('user_id', user.id).maybeSingle(),
    svc.from('customer_connections')
      .select('id', { count: 'exact', head: true }).eq('business_id', business_id),
  ])

  if (!bizRes.data) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const biz      = bizRes.data
  const page     = pageRes.data  ?? null
  const products = productsRes.data ?? []
  const bizName  = biz.name || biz.business_name || 'this business'

  // ── Resolve customer profile ──────────────────────────────────────────────
  let cp = cpRes.data
  if (!cp) {
    const meta = user.user_metadata || {}
    const { data: newCp } = await svc.from('customer_profiles').insert({
      user_id: user.id,
      name:    meta.full_name || meta.name || user.email?.split('@')[0] || 'Customer',
      email:   user.email,
    }).select('id, name').single()
    cp = newCp
  }
  if (!cp) return NextResponse.json({ error: 'Could not resolve customer profile' }, { status: 500 })

  // ── Batch 2: existing connection (needs cp.id) ────────────────────────────
  const { data: existing } = await svc
    .from('customer_connections')
    .select('id, status, relationship_status, engagement_score, scan_count, intent_score')
    .eq('customer_id', cp.id)
    .eq('business_id', business_id)
    .maybeSingle()

  // ── Write: upsert connection ──────────────────────────────────────────────
  let conn: any
  let isNew: boolean

  if (existing) {
    // Returning scan — increment intelligence signals
    const newScanCount  = (existing.scan_count  || 0) + 1
    const newEngagement = (existing.engagement_score || 0) + 5
    const newIntent     = (existing.intent_score || 0) + 8

    const { data: updated } = await svc
      .from('customer_connections')
      .update({
        scan_count:          newScanCount,
        engagement_score:    newEngagement,
        intent_score:        newIntent,
        last_interaction_at: new Date().toISOString(),
        relationship_status: existing.relationship_status === 'dormant' ? 'prospect' : existing.relationship_status,
      })
      .eq('id', existing.id)
      .select()
      .single()

    conn  = updated ?? existing
    isNew = false
  } else {
    // First-time connection
    const { data: created, error } = await svc
      .from('customer_connections')
      .insert({
        customer_id:         cp.id,
        business_id,
        status:              'open',
        relationship_status: 'prospect',
        qr_source:           qr_source || 'qr',
        scan_count:          1,
        engagement_score:    10,
        intent_score:        15,
        last_interaction_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    conn  = created
    isNew = true
  }

  // ── Fire events: non-blocking ─────────────────────────────────────────────
  // Do NOT await — these run after response is returned
  const events = [
    { user_id: user.id, type: 'qr_scan',
      metadata: { business_id, business_name: bizName, qr_source: qr_source || 'qr', connection_id: conn.id } },
    { user_id: user.id, type: isNew ? 'connection_created' : 'connection_returned',
      metadata: { business_id, connection_id: conn.id, scan_count: conn.scan_count } },
  ]
  if (isNew) {
    events.push({ user_id: user.id, type: 'new_customer_acquired',
      metadata: { business_id, business_name: bizName } })
  }
  svc.from('activity_events').insert(events).then(() => {}).catch(() => {})

  // ── Build experience payload ──────────────────────────────────────────────
  const slug    = page?.slug ?? null
  const actions = buildActions(products, conn.id, slug, bizName)

  const status   = isNew ? 'new_connection' : 'returning'
  const headline = isNew
    ? `You're now connected with ${bizName}`
    : `Welcome back to ${bizName}`
  const subline  = isNew
    ? 'Your relationship is live — ready to enquire, quote, or transact.'
    : `Scan ${conn.scan_count} · You've been here before. Pick up where you left off.`

  const experience = {
    status,
    is_new:   isNew,
    headline,
    subline,
    business: {
      id:               biz.id,
      name:             bizName,
      industry:         biz.industry,
      city:             biz.city,
      description:      biz.description,
      logo_url:         page?.logo_url ?? null,
      tagline:          page?.tagline  ?? null,
      slug,
      connection_count: (connCountRes.count ?? 0),
    },
    intelligence: {
      connection_id:       conn.id,
      scan_count:          conn.scan_count      || 1,
      engagement_score:    conn.engagement_score || 10,
      intent_score:        conn.intent_score     || 15,
      relationship_status: conn.relationship_status || 'prospect',
    },
    offerings: products,
    actions,
    _ms: Date.now() - t0,
  }

  return NextResponse.json({ experience })
}
