import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

async function getBusinessId(svc: ReturnType<typeof supabaseServiceServer>, userId: string) {
  const { data } = await svc
    .from('business_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

// GET /api/business/products — list products for authed business
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc   = supabaseServiceServer()
  const bizId = await getBusinessId(svc, user.id)
  if (!bizId) return NextResponse.json({ products: [] })

  const { data, error } = await svc
    .from('business_products')
    .select('*')
    .eq('business_id', bizId)
    .order('is_service', { ascending: true })
    .order('name',       { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data || [] })
}

// POST /api/business/products — create product/service
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc   = supabaseServiceServer()
  const bizId = await getBusinessId(svc, user.id)
  if (!bizId) return NextResponse.json({ error: 'Business profile not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { name, description, category, price_from, price_to, price_unit, is_service } = body

  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error } = await svc
    .from('business_products')
    .insert({
      business_id: bizId,
      name:        name.trim(),
      description: description?.trim() || null,
      category:    category?.trim()    || null,
      price_from:  price_from          ?? null,
      price_to:    price_to            ?? null,
      price_unit:  price_unit          || 'flat',
      is_service:  !!is_service,
      is_active:   true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product: data }, { status: 201 })
}

// PATCH /api/business/products — update a product
// Body: { id, ...fields }
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc   = supabaseServiceServer()
  const bizId = await getBusinessId(svc, user.id)
  if (!bizId) return NextResponse.json({ error: 'Business profile not found' }, { status: 404 })

  const { id, ...fields } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['name','description','category','price_from','price_to','price_unit','is_service','is_active']
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of allowed) if (k in fields) update[k] = fields[k]

  const { data, error } = await svc
    .from('business_products')
    .update(update)
    .eq('id', id)
    .eq('business_id', bizId) // ownership check
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product: data })
}

// DELETE /api/business/products?id=<id>
export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id  = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const svc   = supabaseServiceServer()
  const bizId = await getBusinessId(svc, user.id)
  if (!bizId) return NextResponse.json({ error: 'Business profile not found' }, { status: 404 })

  const { error } = await svc
    .from('business_products')
    .delete()
    .eq('id', id)
    .eq('business_id', bizId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
