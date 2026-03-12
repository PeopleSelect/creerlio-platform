export const dynamic = 'force-dynamic'

/**
 * GET /api/messages?talent_id=<id>&business_id=<id>
 * Load (or create) a conversation and return its messages.
 * Caller must be authenticated as either the talent or the business.
 * Uses service role to bypass RLS.
 * Returns: { conversation_id: string | null, messages: Message[] }
 *
 * POST /api/messages
 * Send a message in a conversation.
 * Body: { talent_id, business_id, sender_type: 'talent'|'business', body: string }
 * Returns: { message: Message }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromBearer, supabaseServiceServer } from '@/lib/supabaseServer'

async function resolveIdentity(userId: string, supabase: ReturnType<typeof supabaseServiceServer>) {
  // Returns { business_id, talent_profile_id } for the given auth user id
  const [bizRes, talentRes] = await Promise.all([
    supabase.from('business_profiles').select('id').eq('user_id', userId).maybeSingle(),
    supabase.from('talent_profiles').select('id').or(`user_id.eq.${userId},id.eq.${userId}`).maybeSingle(),
  ])
  return {
    businessId: (bizRes.data as any)?.id as string | null,
    talentProfileId: (talentRes.data as any)?.id as string | null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || null
    const user = await getUserFromBearer(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const talentId = request.nextUrl.searchParams.get('talent_id')?.trim()
    const businessId = request.nextUrl.searchParams.get('business_id')?.trim()
    if (!talentId || !businessId) {
      return NextResponse.json({ error: 'talent_id and business_id are required' }, { status: 400 })
    }

    const supabase = supabaseServiceServer()

    // Verify caller is the talent or the business
    const { businessId: callerBizId, talentProfileId: callerTalentId } = await resolveIdentity(user.id, supabase)
    const isTalent = callerTalentId === talentId
    const isBusiness = callerBizId === businessId
    if (!isTalent && !isBusiness) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify there is an accepted connection
    const { data: conn } = await supabase
      .from('talent_connection_requests')
      .select('id')
      .eq('talent_id', talentId)
      .eq('business_id', businessId)
      .eq('status', 'accepted')
      .limit(1)
      .maybeSingle()

    if (!conn) {
      return NextResponse.json({ error: 'No accepted connection for this pair' }, { status: 403 })
    }

    // Find or create conversation
    let { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('talent_id', talentId)
      .eq('business_id', businessId)
      .maybeSingle()

    let conversationId: string | null = (conv as any)?.id || null

    if (!conversationId) {
      // Create it
      const { data: newConv, error: createErr } = await supabase
        .from('conversations')
        .insert({ talent_id: talentId, business_id: businessId })
        .select('id')
        .single()

      if (createErr) {
        // Might be a race condition — try fetching again
        const { data: refetch } = await supabase
          .from('conversations')
          .select('id')
          .eq('talent_id', talentId)
          .eq('business_id', businessId)
          .maybeSingle()
        conversationId = (refetch as any)?.id || null
      } else {
        conversationId = (newConv as any)?.id || null
      }
    }

    if (!conversationId) {
      return NextResponse.json({ conversation_id: null, messages: [] })
    }

    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('id, sender_type, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

    return NextResponse.json({ conversation_id: conversationId, messages: messages || [] })
  } catch (error: any) {
    console.error('[Messages API GET] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || null
    const user = await getUserFromBearer(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const talentId = String(body?.talent_id || '').trim()
    const businessId = String(body?.business_id || '').trim()
    const senderType = String(body?.sender_type || '').trim()
    const messageBody = String(body?.body || '').trim()

    if (!talentId || !businessId || !senderType || !messageBody) {
      return NextResponse.json({ error: 'talent_id, business_id, sender_type, and body are required' }, { status: 400 })
    }
    if (senderType !== 'talent' && senderType !== 'business') {
      return NextResponse.json({ error: 'sender_type must be talent or business' }, { status: 400 })
    }

    const supabase = supabaseServiceServer()

    // Verify caller matches sender_type
    const { businessId: callerBizId, talentProfileId: callerTalentId } = await resolveIdentity(user.id, supabase)
    if (senderType === 'business' && callerBizId !== businessId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (senderType === 'talent' && callerTalentId !== talentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify accepted connection
    const { data: conn } = await supabase
      .from('talent_connection_requests')
      .select('id')
      .eq('talent_id', talentId)
      .eq('business_id', businessId)
      .eq('status', 'accepted')
      .limit(1)
      .maybeSingle()

    if (!conn) {
      return NextResponse.json({ error: 'No accepted connection for this pair' }, { status: 403 })
    }

    // Find or create conversation
    let { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('talent_id', talentId)
      .eq('business_id', businessId)
      .maybeSingle()

    let conversationId: string | null = (conv as any)?.id || null
    if (!conversationId) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ talent_id: talentId, business_id: businessId })
        .select('id')
        .single()
      conversationId = (newConv as any)?.id || null
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'Could not create conversation' }, { status: 500 })
    }

    const { data: message, error: insertErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: senderType,
        sender_user_id: user.id,
        body: messageBody,
      })
      .select('id, sender_type, body, created_at')
      .single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('[Messages API POST] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
