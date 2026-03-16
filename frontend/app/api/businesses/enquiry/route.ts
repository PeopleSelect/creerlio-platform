import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// POST /api/businesses/enquiry
// Public — any visitor can submit an enquiry to a business.
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { business_id, enquiry_type, name, email, message } = body || {}
  if (!business_id || !name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'business_id, name, and email are required' }, { status: 422 })
  }

  const svc = supabaseServiceServer()

  // Verify the business exists and is published
  const { data: biz } = await svc
    .from('business_profile_pages')
    .select('business_id, enquiry_enabled')
    .eq('business_id', business_id)
    .eq('is_published', true)
    .maybeSingle()

  if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  if (biz.enquiry_enabled === false) {
    return NextResponse.json({ error: 'This business is not accepting enquiries' }, { status: 403 })
  }

  const { error } = await svc.from('business_enquiries').insert({
    business_id,
    enquiry_type: enquiry_type || 'general',
    name:         name.trim(),
    email:        email.trim().toLowerCase(),
    message:      message?.trim() || null,
  })

  if (error) {
    console.error('[enquiry] insert error', error)
    return NextResponse.json({ error: 'Failed to submit enquiry' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
