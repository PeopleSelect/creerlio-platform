import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// ── GET /api/connect?b=<business_id> ─────────────────────────────────────
// Public endpoint — returns business info for the QR landing page.
export async function GET(req: NextRequest) {
  const bizId = new URL(req.url).searchParams.get('b')
  if (!bizId) return NextResponse.json({ error: 'Missing business id' }, { status: 400 })

  const svc = supabaseServiceServer()

  const { data: biz } = await svc
    .from('business_profiles')
    .select('id, name, business_name, industry, city, state, country, description')
    .eq('id', bizId)
    .eq('is_active', true)
    .maybeSingle()

  if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const { data: page } = await svc
    .from('business_profile_pages')
    .select('slug, logo_url, tagline')
    .eq('business_id', bizId)
    .maybeSingle()

  // Count existing connections so we can show social proof
  const { count } = await svc
    .from('customer_connections')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', bizId)

  return NextResponse.json({
    business: {
      ...biz,
      display_name: biz.name || biz.business_name,
      page:         page ?? null,
      connection_count: count ?? 0,
    },
  })
}

// ── POST /api/connect ─────────────────────────────────────────────────────
// Authenticated endpoint — creates or returns existing connection.
// Body: { business_id, qr_source? }
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, qr_source } = await req.json().catch(() => ({}))
  if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400 })

  const svc = supabaseServiceServer()

  // Verify business exists
  const { data: biz } = await svc
    .from('business_profiles')
    .select('id, name, business_name')
    .eq('id', business_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  // Resolve or create customer_profile
  let { data: cp } = await svc
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cp) {
    const meta = user.user_metadata || {}
    const { data: newCp } = await svc
      .from('customer_profiles')
      .insert({
        user_id: user.id,
        name:    meta.full_name || meta.name || user.email?.split('@')[0] || 'Customer',
        email:   user.email,
      })
      .select('id')
      .single()
    cp = newCp
  }

  if (!cp) return NextResponse.json({ error: 'Could not resolve customer profile' }, { status: 500 })

  // Idempotent — return existing connection if it already exists
  const { data: existing } = await svc
    .from('customer_connections')
    .select('id, status, relationship_status')
    .eq('customer_id', cp.id)
    .eq('business_id', business_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      connection:        existing,
      already_connected: true,
      business_name:     biz.name || biz.business_name,
    })
  }

  // Create fresh connection
  const { data: conn, error } = await svc
    .from('customer_connections')
    .insert({
      customer_id:        cp.id,
      business_id,
      status:             'open',
      relationship_status: 'prospect',
      qr_source:          qr_source || 'qr',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Activity event
  await svc.from('activity_events').insert({
    user_id:  user.id,
    type:     'connection_created_via_qr',
    metadata: { business_id, qr_source: qr_source || 'qr', business_name: biz.name || biz.business_name },
  }).catch(() => {})

  return NextResponse.json({
    connection:        conn,
    already_connected: false,
    business_name:     biz.name || biz.business_name,
  })
}
