import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// POST /api/customer/become-talent
// Creates a talent_profile for a customer and marks them with also_talent=true in metadata.
// This is a one-way upgrade — the customer keeps their customer portal access and gains
// access to the talent dashboard.
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = supabaseServiceServer()

  // Must be a customer to use this endpoint
  const { data: cp } = await svc
    .from('customer_profiles')
    .select('id, name, email')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cp) {
    return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 })
  }

  // Check if talent profile already exists
  const { data: existing } = await svc
    .from('talent_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    // Create a minimal talent profile seeded with customer's name
    const displayName = cp.name || user.email?.split('@')[0] || 'Talent'
    const { error: insertErr } = await svc.from('talent_profiles').insert({
      user_id:    user.id,
      name:       displayName,
      email:      cp.email || user.email || null,
      is_active:  true,
      is_public:  false,
      profile_status: 'draft',
    })
    if (insertErr) {
      console.error('[become-talent] Failed to create talent_profile:', insertErr.message)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }
  }

  // Mark user metadata with also_talent=true (Supabase admin merge keeps existing fields)
  const { error: metaErr } = await svc.auth.admin.updateUserById(user.id, {
    user_metadata: { also_talent: true },
  })
  if (metaErr) {
    console.error('[become-talent] Failed to update user_metadata:', metaErr.message)
    return NextResponse.json({ error: metaErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, already_existed: !!existing })
}
