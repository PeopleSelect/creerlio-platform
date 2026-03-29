import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// GET /api/business/outreach — list this business's outreach requests
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = supabaseServiceServer()

  const { data: biz } = await svc
    .from('business_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const { data, error } = await svc
    .from('business_outreach_requests')
    .select(`
      id, status, message, created_at, responded_at,
      talent_profile_id,
      talent_profiles ( id, user_id, headline, skills )
    `)
    .eq('business_id', biz.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data || [] })
}

// POST /api/business/outreach — send a connection request to anonymous talent
// Body: { talent_profile_id, message? }
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { talent_profile_id, message } = await req.json().catch(() => ({}))
  if (!talent_profile_id) return NextResponse.json({ error: 'talent_profile_id required' }, { status: 400 })

  const svc = supabaseServiceServer()

  const { data: biz } = await svc
    .from('business_profiles')
    .select('id, name, business_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!biz) return NextResponse.json({ error: 'Business profile not found' }, { status: 404 })

  const { data, error } = await svc
    .from('business_outreach_requests')
    .upsert({
      business_id:       biz.id,
      talent_profile_id,
      status:            'pending',
      message:           message?.trim() || null,
    }, { onConflict: 'business_id,talent_profile_id', ignoreDuplicates: false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: data }, { status: 201 })
}
