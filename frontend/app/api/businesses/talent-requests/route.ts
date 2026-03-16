import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// GET /api/businesses/talent-requests?business_id=...
// Returns active talent requests for a business (public — no talent data exposed).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business_id')

  const svc = supabaseServiceServer()

  let query = svc
    .from('business_talent_requests')
    .select('id, business_id, role_title, location, experience_level, notes, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (businessId) query = query.eq('business_id', businessId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data || [] })
}

// POST /api/businesses/talent-requests
// Business admin creates a new talent request.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { business_id, role_title, location, experience_level, notes } = body || {}
  if (!business_id || !role_title?.trim()) {
    return NextResponse.json({ error: 'business_id and role_title are required' }, { status: 422 })
  }

  const svc = supabaseServiceServer()

  // Verify caller has admin role in the business
  const { data: { user }, error: authErr } = await svc.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleRow } = await svc
    .from('user_business_roles')
    .select('role')
    .eq('business_id', business_id)
    .eq('user_id', user.id)
    .in('role', ['super_admin', 'business_admin'])
    .maybeSingle()

  if (!roleRow) return NextResponse.json({ error: 'Forbidden — not a business admin' }, { status: 403 })

  const { data, error } = await svc
    .from('business_talent_requests')
    .insert({
      business_id,
      role_title:      role_title.trim(),
      location:        location?.trim() || null,
      experience_level: experience_level?.trim() || null,
      notes:           notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: data })
}

// DELETE /api/businesses/talent-requests?id=...
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const svc = supabaseServiceServer()
  const { data: { user }, error: authErr } = await svc.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Soft-delete: set is_active = false
  const { error } = await svc
    .from('business_talent_requests')
    .update({ is_active: false })
    .eq('id', id)
    .in('business_id',
      svc.from('user_business_roles')
        .select('business_id')
        .eq('user_id', user.id)
        .in('role', ['super_admin', 'business_admin']) as any
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
