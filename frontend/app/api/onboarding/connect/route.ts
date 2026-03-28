export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// POST /api/onboarding/connect
// Records the user's first connection during onboarding.
// Body: { business_profile_id: string }
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { business_profile_id } = body

  if (!business_profile_id) {
    return NextResponse.json({ ok: false, error: 'business_profile_id required' }, { status: 400 })
  }

  const svc = supabaseServiceServer()

  // Get user's talent profile
  const { data: tp } = await svc
    .from('talent_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tp) {
    // No talent profile yet — log the intent as an onboarding event and continue
    await svc.from('onboarding_sessions').upsert({
      user_id: user.id,
      first_connection_business_id: business_profile_id,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).catch(() => {})
    return NextResponse.json({ ok: true, skipped: true })
  }

  // Create connection request in talent_connection_requests
  const { error } = await svc
    .from('talent_connection_requests')
    .upsert({
      talent_id: tp.id,
      business_id: business_profile_id,
      status: 'pending',
      selected_sections: [],
    }, { onConflict: 'talent_id,business_id' })

  if (error) {
    console.error('[onboarding/connect]', error.message)
    // Non-fatal — still log the session
  }

  // Update onboarding session
  await svc.from('onboarding_sessions').upsert({
    user_id: user.id,
    first_connection_business_id: business_profile_id,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }).catch(() => {})

  return NextResponse.json({ ok: true })
}
