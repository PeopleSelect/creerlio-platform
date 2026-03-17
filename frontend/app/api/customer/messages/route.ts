import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// GET /api/customer/messages?connection_id=<id>
// Returns all messages for a connection. Caller must be a party to the connection.
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const connectionId = new URL(req.url).searchParams.get('connection_id')
  if (!connectionId) return NextResponse.json({ error: 'connection_id required' }, { status: 400 })

  const svc = supabaseServiceServer()

  // Verify caller is party to this connection
  const { data: conn } = await svc
    .from('customer_connections')
    .select('id, customer_id, business_id, status, customer_profiles(user_id), business_profiles(user_id)')
    .eq('id', connectionId)
    .maybeSingle()

  if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })

  const cpUserId  = (conn as any).customer_profiles?.user_id
  const bizUserId = (conn as any).business_profiles?.user_id

  if (cpUserId !== user.id && bizUserId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: messages, error } = await svc
    .from('customer_messages')
    .select('*')
    .eq('connection_id', connectionId)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: messages || [], connection: conn })
}

// POST /api/customer/messages  — send a reply in an existing connection
// Body: { connection_id, body }
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { connection_id, body: msgBody } = body

  if (!connection_id) return NextResponse.json({ error: 'connection_id required' }, { status: 400 })
  if (!msgBody?.trim()) return NextResponse.json({ error: 'body required' }, { status: 400 })

  const svc = supabaseServiceServer()

  // Verify caller is party and determine sender_type + sender_id
  const { data: conn } = await svc
    .from('customer_connections')
    .select('id, customer_id, business_id, customer_profiles(user_id, id), business_profiles(user_id, id)')
    .eq('id', connection_id)
    .maybeSingle()

  if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })

  const cpUserId  = (conn as any).customer_profiles?.user_id
  const bizUserId = (conn as any).business_profiles?.user_id
  const cpId      = (conn as any).customer_profiles?.id
  const bizId     = (conn as any).business_profiles?.id

  let senderType: 'customer' | 'business'
  let senderId: string

  if (cpUserId === user.id) {
    senderType = 'customer'
    senderId   = cpId
  } else if (bizUserId === user.id) {
    senderType = 'business'
    senderId   = bizId
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: msg, error } = await svc
    .from('customer_messages')
    .insert({ connection_id, sender_type: senderType, sender_id: senderId, body: msgBody.trim() })
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update connection timestamp
  await svc.from('customer_connections').update({ updated_at: new Date().toISOString() }).eq('id', connection_id)

  return NextResponse.json({ message: msg })
}
