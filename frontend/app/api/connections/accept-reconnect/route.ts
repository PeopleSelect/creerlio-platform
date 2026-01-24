export const dynamic = 'force-dynamic'

/**
 * API Route: Accept Reconnection Request
 * Allows businesses to accept reconnection requests from talents.
 * This restores the connection to 'accepted' status, preserving all previous
 * messages, video chat history, and shared sections.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '') || null

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient(accessToken)

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { connection_request_id } = body

    if (!connection_request_id) {
      return NextResponse.json(
        { error: 'connection_request_id is required' },
        { status: 400 }
      )
    }

    console.log('[Accept Reconnect] Processing request:', {
      connection_request_id,
      user_id: user.id
    })

    // Verify the user owns this business profile
    const { data: businessProfile, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, business_name, name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (businessError || !businessProfile) {
      console.error('[Accept Reconnect] Business profile error:', businessError)
      return NextResponse.json(
        { error: 'Business profile not found', details: businessError?.message },
        { status: 403 }
      )
    }

    console.log('[Accept Reconnect] Business profile found:', {
      business_id: businessProfile.id,
      business_name: businessProfile.business_name || businessProfile.name
    })

    // Verify the connection request exists and belongs to this business
    // For reconnection requests, status could be:
    // - 'pending' (updated from 'discontinued' by request-reconnect)
    // - 'discontinued' (original state, if request-reconnect hasn't updated it yet)
    // We'll check business_id match first, then validate status
    const { data: connectionRequest, error: connError } = await supabase
      .from('talent_connection_requests')
      .select('id, talent_id, business_id, status, selected_sections, created_at, reconnect_requested_by')
      .eq('id', connection_request_id)
      .maybeSingle() // Don't filter by business_id here - we'll check it manually to get better error messages

    if (connError) {
      console.error('[Accept Reconnect] Error fetching connection request:', connError)
      return NextResponse.json(
        { error: 'Failed to fetch connection request', details: connError.message },
        { status: 400 }
      )
    }

    if (!connectionRequest) {
      console.error('[Accept Reconnect] Connection request not found:', {
        connection_request_id,
        expected_business_id: businessProfile.id
      })
      return NextResponse.json(
        { 
          error: 'Connection request not found',
          connection_request_id
        },
        { status: 400 }
      )
    }

    // Verify the connection request belongs to this business
    if (connectionRequest.business_id !== businessProfile.id) {
      console.error('[Accept Reconnect] Business ID mismatch:', {
        connection_request_id,
        connection_request_business_id: connectionRequest.business_id,
        expected_business_id: businessProfile.id
      })
      return NextResponse.json(
        { 
          error: 'Connection request does not belong to this business',
          connection_request_id,
          business_id_mismatch: true
        },
        { status: 403 }
      )
    }

    // Verify this is a valid reconnection request
    // Since this endpoint is specifically for accepting reconnection requests (called from notifications),
    // we should be lenient about the status. The connection request might be in various states:
    // - 'pending' (after request-reconnect updated it)
    // - 'discontinued' (original state, if request-reconnect hasn't updated it yet)
    // - Any other status (except 'accepted') - we're restoring a connection, so we should allow it
    // We'll only reject if it's already 'accepted' (can't re-accept an already accepted connection)
    const isAlreadyAccepted = connectionRequest.status === 'accepted'
    const isExplicitReconnect = connectionRequest.reconnect_requested_by === 'talent'
    const isPendingRequest = connectionRequest.status === 'pending'
    const isDiscontinued = connectionRequest.status === 'discontinued'
    
    // Accept any status except 'accepted' - we're restoring a connection
    // This is more lenient because the user is explicitly accepting a reconnection request
    const isValidReconnect = !isAlreadyAccepted

    console.log('[Accept Reconnect] Connection request validation:', {
      connection_request_id,
      status: connectionRequest.status,
      reconnect_requested_by: connectionRequest.reconnect_requested_by,
      isPending: isPendingRequest,
      isDiscontinued,
      isExplicitReconnect,
      isAlreadyAccepted,
      isValidReconnect
    })

    if (!isValidReconnect) {
      console.error('[Accept Reconnect] Connection already accepted - cannot re-accept:', {
        status: connectionRequest.status,
        connection_request_id,
        business_id: connectionRequest.business_id
      })
      return NextResponse.json(
        { 
          error: 'Connection is already accepted',
          current_status: connectionRequest.status,
          details: 'This connection is already in an accepted state. Cannot re-accept.'
        },
        { status: 400 }
      )
    }

    console.log('[Accept Reconnect] Valid reconnection request found:', {
      connection_request_id,
      status: connectionRequest.status,
      reconnect_requested_by: connectionRequest.reconnect_requested_by,
      talent_id: connectionRequest.talent_id
    })

    // Get talent name for the response
    const { data: talentProfile } = await supabase
      .from('talent_profiles')
      .select('id, name, title')
      .eq('id', connectionRequest.talent_id)
      .maybeSingle()

    const talentName = talentProfile?.name || talentProfile?.title || 'Talent'
    const businessName = businessProfile.business_name || businessProfile.name || 'Business'

    // Update the connection request status back to 'accepted'
    // This reinstates the connection with all previous history intact
    // (messages, video chats, and shared sections are linked by talent_id/business_id, not by status)
    const { error: updateError } = await supabase
      .from('talent_connection_requests')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('id', connection_request_id)

    if (updateError) {
      console.error('[Accept Reconnect] Error updating connection status:', updateError)
      return NextResponse.json(
        { error: 'Failed to accept reconnection request' },
        { status: 500 }
      )
    }

    // Create a notification for the talent to let them know they're reconnected
    try {
      const { error: notifError } = await supabase
        .from('talent_notifications')
        .insert({
          talent_id: connectionRequest.talent_id,
          business_id: businessProfile.id,
          connection_request_id,
          notification_type: 'reconnect_accepted',
          title: `Reconnection Accepted by ${businessName}`,
          message: `Great news! ${businessName} has accepted your reconnection request. Your previous messages and history have been restored. You can now message them again.`,
          metadata: {
            accepted_by_user_id: user.id,
            business_name: businessName,
            original_connection_id: connection_request_id
          }
        })

      if (notifError) {
        // Table might not exist - that's okay, the connection status update is the main action
        if (!notifError.message?.includes('relation') && !notifError.message?.includes('does not exist')) {
          console.warn('[Accept Reconnect] Warning creating notification:', notifError.message)
        }
      }
    } catch (notifErr) {
      // Ignore notification errors - the main action (status update) succeeded
      console.log('[Accept Reconnect] Notification table may not exist, skipping notification')
    }

    // Mark any related business notification as read
    try {
      await supabase
        .from('business_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('connection_request_id', connection_request_id)
        .eq('business_id', businessProfile.id)
    } catch (err) {
      // Ignore - table may not exist
    }

    console.log('[Accept Reconnect] Connection restored:', {
      connection_request_id,
      talent_id: connectionRequest.talent_id,
      business_id: businessProfile.id,
      talent_name: talentName,
      business_name: businessName
    })

    return NextResponse.json({
      success: true,
      message: 'Reconnection accepted successfully. Previous messages and history have been restored.',
      talent_name: talentName
    })

  } catch (error: any) {
    console.error('[Accept Reconnect] Exception:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
