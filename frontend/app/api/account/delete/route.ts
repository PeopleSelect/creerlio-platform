import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// POST /api/account/delete  — permanently deletes the authenticated user's account
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = supabaseServiceServer()

  // Delete profile rows (best-effort — foreign key cascades may handle some)
  await svc.from('talent_profiles').delete().eq('user_id', user.id)
  await svc.from('business_profiles').delete().eq('user_id', user.id)
  await svc.from('customer_profiles').delete().eq('user_id', user.id)

  // Delete the auth user (this is irreversible)
  const { error } = await svc.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
