export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// POST /api/onboarding/complete
// Marks onboarding as complete in the database and logs the activity.
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ ok: false }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const svc = supabaseServiceServer()

  await svc.from('onboarding_sessions').upsert({
    user_id: user.id,
    completed_at: new Date().toISOString(),
    step_reached: 8,
  }, { onConflict: 'user_id' }).catch(() => {})

  return NextResponse.json({ ok: true })
}
