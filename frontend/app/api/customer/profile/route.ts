import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'
import { getUserFromBearer } from '@/lib/supabaseServer'

// GET /api/customer/profile  — returns the customer profile for the authed user
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = supabaseServiceServer()
  const { data, error } = await svc
    .from('customer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}

// POST /api/customer/profile  — upsert customer profile (called after signup/signin)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { name, email, phone, company, location, industry_interests } = body

  if (!name || !email) return NextResponse.json({ error: 'name and email required' }, { status: 400 })

  // Try to get user from bearer token first, fall back to finding by email
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const svc   = supabaseServiceServer()

  let userId: string | null = null
  if (token) {
    const user = await getUserFromBearer(token)
    userId = user?.id || null
  }

  if (!userId) {
    // Look up the user by email (used immediately after signup before token is set)
    const { data: authUser } = await svc.auth.admin.listUsers()
    const found = (authUser?.users || []).find((u: any) => u.email === email)
    userId = found?.id || null
  }

  if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data, error } = await svc
    .from('customer_profiles')
    .upsert(
      {
        user_id:            userId,
        name:               name.trim(),
        email:              email.trim().toLowerCase(),
        phone:              phone?.trim() || null,
        company:            company?.trim() || null,
        location:           location?.trim() || null,
        industry_interests: Array.isArray(industry_interests) ? industry_interests : [],
        updated_at:         new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}

// PATCH /api/customer/profile  — update profile fields
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const allowed = ['name', 'phone', 'company', 'location', 'industry_interests']
  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const svc = supabaseServiceServer()
  const { data, error } = await svc
    .from('customer_profiles')
    .update(update)
    .eq('user_id', user.id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
