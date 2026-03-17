import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

async function getCustomerId(svc: any, userId: string) {
  const { data } = await svc.from('customer_profiles').select('id').eq('user_id', userId).maybeSingle()
  return data?.id || null
}

// GET /api/customer/saved  — list saved businesses
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = supabaseServiceServer()
  const customerId = await getCustomerId(svc, user.id)
  if (!customerId) return NextResponse.json({ saved: [] })

  const { data, error } = await svc
    .from('customer_saved_businesses')
    .select('id, business_id, created_at, business_profiles(id, name, industry, city, state, country)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: data || [] })
}

// POST /api/customer/saved  — save a business
// Body: { business_id }
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id } = await req.json().catch(() => ({}))
  if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400 })

  const svc = supabaseServiceServer()
  const customerId = await getCustomerId(svc, user.id)
  if (!customerId) return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 })

  const { error } = await svc
    .from('customer_saved_businesses')
    .upsert({ customer_id: customerId, business_id }, { onConflict: 'customer_id,business_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/customer/saved?business_id=<id>  — unsave a business
export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = new URL(req.url).searchParams.get('business_id')
  if (!businessId) return NextResponse.json({ error: 'business_id required' }, { status: 400 })

  const svc = supabaseServiceServer()
  const customerId = await getCustomerId(svc, user.id)
  if (!customerId) return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 })

  const { error } = await svc
    .from('customer_saved_businesses')
    .delete()
    .eq('customer_id', customerId)
    .eq('business_id', businessId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
