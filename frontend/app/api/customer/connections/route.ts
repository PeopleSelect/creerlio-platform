import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// GET /api/customer/connections  — list all connections for the authed customer
// Also used by businesses: GET /api/customer/connections?business_id=<id>
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc        = supabaseServiceServer()
  const businessId = new URL(req.url).searchParams.get('business_id')

  // Is caller a customer?
  const { data: cp } = await svc.from('customer_profiles').select('id').eq('user_id', user.id).maybeSingle()

  // Is caller a business owner?
  const { data: bp } = await svc.from('business_profiles').select('id').eq('user_id', user.id).maybeSingle()

  if (!cp && !bp) return NextResponse.json({ connections: [] })

  let query = svc
    .from('customer_connections')
    .select(`
      id, status, created_at, updated_at,
      customer_profiles ( id, name, email, phone, company, location ),
      business_profiles ( id, name, business_name, industry, city, state, country )
    `)
    .order('updated_at', { ascending: false })

  if (cp && !businessId) {
    // Customer viewing their own connections
    query = query.eq('customer_id', cp.id)
  } else if (bp) {
    // Business viewing their customer connections
    query = query.eq('business_id', bp.id)
  } else {
    return NextResponse.json({ connections: [] })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Collect all business_ids and fetch business_profile_pages in one query
  const bizIds = [...new Set((data || []).map((c: any) => c.business_profiles?.id).filter(Boolean))]
  let pagesByBizId: Record<string, { slug: string; logo_url: string | null }> = {}
  if (bizIds.length > 0) {
    const { data: pages } = await svc
      .from('business_profile_pages')
      .select('business_id, slug, logo_url')
      .in('business_id', bizIds)
    if (Array.isArray(pages)) {
      for (const p of pages) {
        pagesByBizId[p.business_id] = { slug: p.slug, logo_url: p.logo_url }
      }
    }
  }

  // For each connection, get the latest message
  const connections = await Promise.all(
    (data || []).map(async (conn: any) => {
      const { data: latest } = await svc
        .from('customer_messages')
        .select('body, sender_type, created_at')
        .eq('connection_id', conn.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const bizId = conn.business_profiles?.id
      return {
        ...conn,
        business_profile_pages: bizId ? (pagesByBizId[bizId] ?? null) : null,
        latest_message: latest,
      }
    })
  )

  return NextResponse.json({ connections })
}

// PATCH /api/customer/connections  — update connection status (business only)
// Body: { connection_id, status }
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { connection_id, status } = await req.json().catch(() => ({}))
  const validStatuses = ['open', 'in_progress', 'closed']
  if (!connection_id || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'connection_id and valid status required' }, { status: 400 })
  }

  const svc = supabaseServiceServer()

  // Verify caller is party to the connection
  const { data: conn } = await svc
    .from('customer_connections')
    .select('id, customer_id, business_id, customer_profiles(user_id), business_profiles(user_id)')
    .eq('id', connection_id)
    .maybeSingle()

  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cpUser  = (conn as any).customer_profiles?.user_id
  const bizUser = (conn as any).business_profiles?.user_id

  if (cpUser !== user.id && bizUser !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await svc
    .from('customer_connections')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', connection_id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ connection: data })
}
