import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const user = await getUserFromBearer(token)

    const body = await req.json()
    const { snapshot_id, requester_name, requester_company, requester_email, reason } = body

    // Validation
    if (!snapshot_id) {
      return NextResponse.json({ error: 'snapshot_id is required' }, { status: 400 })
    }
    if (!requester_name?.trim()) {
      return NextResponse.json({ error: 'Your name is required' }, { status: 400 })
    }
    if (!requester_email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requester_email.trim())) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    const supabase = supabaseServiceServer()

    // Verify snapshot exists and is active
    const { data: snapshot, error: snapErr } = await supabase
      .from('talent_snapshots')
      .select('id, talent_id, is_active')
      .eq('id', snapshot_id)
      .maybeSingle()

    if (snapErr || !snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }
    if (!snapshot.is_active) {
      return NextResponse.json({ error: 'This snapshot is not currently active' }, { status: 410 })
    }

    // Prevent self-request
    if (user) {
      const { data: ownProfile } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (ownProfile?.id === snapshot.talent_id) {
        return NextResponse.json({ error: 'You cannot request access to your own snapshot' }, { status: 400 })
      }
    }

    // Check for existing pending request from same email to prevent spam
    const { data: existingRequest } = await supabase
      .from('snapshot_access_requests')
      .select('id, status')
      .eq('snapshot_id', snapshot_id)
      .eq('requester_email', requester_email.trim().toLowerCase())
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    if (existingRequest) {
      return NextResponse.json({
        success: true,
        request_id: existingRequest.id,
        status: existingRequest.status,
        message: existingRequest.status === 'approved'
          ? 'Your request was already approved.'
          : 'You already have a pending request for this candidate.',
        is_duplicate: true,
      })
    }

    // Create the access request
    const { data: request, error: insertErr } = await supabase
      .from('snapshot_access_requests')
      .insert({
        snapshot_id,
        requester_user_id: user?.id || null,
        requester_name: requester_name.trim(),
        requester_company: requester_company?.trim() || null,
        requester_email: requester_email.trim().toLowerCase(),
        reason: reason?.trim() || null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('snapshot request-access insert error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Notify the talent (insert into talent_notifications)
    const { data: tp } = await supabase
      .from('talent_profiles')
      .select('user_id')
      .eq('id', snapshot.talent_id)
      .maybeSingle()

    if (tp?.user_id) {
      await supabase.from('talent_notifications').insert({
        talent_id: snapshot.talent_id,
        notification_type: 'snapshot_access_request',
        title: 'Someone wants to see your full profile',
        message: `${requester_name.trim()}${requester_company?.trim() ? ` from ${requester_company.trim()}` : ''} has requested access to your full profile through your anonymous snapshot.`,
        metadata: {
          snapshot_id,
          request_id: request.id,
          requester_name: requester_name.trim(),
          requester_company: requester_company?.trim() || null,
          requester_email: requester_email.trim().toLowerCase(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      request_id: request.id,
      message: 'Access request sent. The candidate will be notified.',
    }, { status: 201 })
  } catch (e: any) {
    console.error('snapshot request-access error:', e)
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

// GET — list all access requests for the authenticated talent's snapshots
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const user = await getUserFromBearer(token)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const supabase = supabaseServiceServer()

    const { data: tp } = await supabase
      .from('talent_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!tp) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Get all snapshots for this talent
    const { data: snapshots } = await supabase
      .from('talent_snapshots')
      .select('id')
      .eq('talent_id', tp.id)

    const snapshotIds = (snapshots || []).map((s: any) => s.id)
    if (snapshotIds.length === 0) {
      return NextResponse.json({ requests: [] })
    }

    const { data: requests, error } = await supabase
      .from('snapshot_access_requests')
      .select('id, snapshot_id, requester_name, requester_company, requester_email, reason, status, decided_at, approved_share_token, created_at')
      .in('snapshot_id', snapshotIds)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ requests: requests || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

// PATCH — talent approves or declines a request
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const user = await getUserFromBearer(token)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { request_id, status, decision_note } = await req.json()
    if (!request_id || !['approved', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'request_id and status (approved|declined) required' }, { status: 400 })
    }

    const supabase = supabaseServiceServer()

    const { data: tp } = await supabase
      .from('talent_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!tp) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Verify ownership via snapshot → talent_id
    const { data: existing } = await supabase
      .from('snapshot_access_requests')
      .select('id, snapshot_id')
      .eq('id', request_id)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const { data: snap } = await supabase
      .from('talent_snapshots')
      .select('talent_id')
      .eq('id', existing.snapshot_id)
      .maybeSingle()

    if (!snap || snap.talent_id !== tp.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {
      status,
      decided_at: new Date().toISOString(),
      decision_note: decision_note?.trim() || null,
    }

    const { error: updateErr } = await supabase
      .from('snapshot_access_requests')
      .update(updates)
      .eq('id', request_id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ success: true, status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
