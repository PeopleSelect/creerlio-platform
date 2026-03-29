import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// GET /api/talent/outreach — list incoming business outreach requests for this talent
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = supabaseServiceServer()

  const { data: tp } = await svc
    .from('talent_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tp) return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 })

  const { data, error } = await svc
    .from('business_outreach_requests')
    .select(`
      id, status, message, created_at, responded_at,
      business_id,
      business_profiles ( id, name, business_name, industry, city,
        business_profile_pages ( slug )
      )
    `)
    .eq('talent_profile_id', tp.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data || [] })
}

// PATCH /api/talent/outreach — accept or decline a business outreach request
// Body: { request_id, action: 'accept' | 'decline' }
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { request_id, action } = await req.json().catch(() => ({}))
  if (!request_id || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'request_id and action (accept|decline) required' }, { status: 400 })
  }

  const svc = supabaseServiceServer()

  const { data: tp } = await svc
    .from('talent_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tp) return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 })

  const { data, error } = await svc
    .from('business_outreach_requests')
    .update({
      status:       action === 'accept' ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', request_id)
    .eq('talent_profile_id', tp.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // On accept, mirror into talent_connection_requests so the business shows up
  // in Career Connections with full messaging/video/meeting buttons
  if (action === 'accept' && data) {
    await svc
      .from('talent_connection_requests')
      .upsert({
        talent_id:        tp.id,
        business_id:      data.business_id,
        status:           'accepted',
        initiated_by:     'business',
        selected_sections: [],
        responded_at:     new Date().toISOString(),
      }, { onConflict: 'talent_id,business_id', ignoreDuplicates: false })
  }

  return NextResponse.json({ request: data })
}
