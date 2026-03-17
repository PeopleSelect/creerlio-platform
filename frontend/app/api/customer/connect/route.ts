import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// POST /api/customer/connect
// Creates (or retrieves) a customer-business connection and sends the first message.
// Body: { business_id, body, enquiry_type? }
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { business_id, body: messageBody, enquiry_type } = body

  if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400 })
  if (!messageBody?.trim()) return NextResponse.json({ error: 'message body required' }, { status: 400 })

  const svc = supabaseServiceServer()

  // Get customer profile
  const { data: cp } = await svc
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cp) return NextResponse.json({ error: 'Customer profile not found. Please complete your registration.' }, { status: 404 })

  // Verify business exists
  const { data: biz } = await svc
    .from('business_profiles')
    .select('id')
    .eq('id', business_id)
    .maybeSingle()

  if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  // Upsert connection (one connection per customer-business pair)
  const { data: conn, error: connErr } = await svc
    .from('customer_connections')
    .upsert(
      { customer_id: cp.id, business_id, status: 'open', updated_at: new Date().toISOString() },
      { onConflict: 'customer_id,business_id' }
    )
    .select('id')
    .maybeSingle()

  if (connErr) return NextResponse.json({ error: connErr.message }, { status: 500 })

  // Insert message
  const { data: msg, error: msgErr } = await svc
    .from('customer_messages')
    .insert({
      connection_id: conn!.id,
      sender_type:   'customer',
      sender_id:     cp.id,
      body:          messageBody.trim(),
      enquiry_type:  enquiry_type || 'general',
    })
    .select()
    .maybeSingle()

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  return NextResponse.json({ connection_id: conn!.id, message: msg })
}
