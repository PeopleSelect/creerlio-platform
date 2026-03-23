/**
 * POST /api/business/claim
 * Execute a business profile claim or removal request.
 *
 * Body (claim):
 *   { action: 'claim', token: string, name: string, email: string, password: string }
 *
 * Body (remove):
 *   { action: 'remove', token: string, reason?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, token, name, email, password, reason } = body

  if (!token || !action) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = getAdminClient()

  // Validate token
  const { data: profile, error: profileErr } = await supabase
    .from('business_profiles')
    .select('id, name, business_name, slug, claim_status, claim_token_expires_at, user_id')
    .eq('claim_token', token)
    .maybeSingle()

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Invalid claim link' }, { status: 404 })
  }

  if (profile.claim_status === 'claimed') {
    return NextResponse.json({ error: 'This profile has already been claimed' }, { status: 410 })
  }

  if (profile.claim_status === 'removed') {
    return NextResponse.json({ error: 'This profile has been removed at the business\'s request' }, { status: 410 })
  }

  if (profile.claim_token_expires_at && new Date(profile.claim_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This claim link has expired. Please contact Creerlio for a new link.' }, { status: 410 })
  }

  // ── REMOVAL REQUEST ────────────────────────────────────────────────────────
  if (action === 'remove') {
    const { error: removeErr } = await supabase
      .from('business_profiles')
      .update({ claim_status: 'removed', visibility: 'removed' })
      .eq('id', profile.id)

    if (removeErr) {
      return NextResponse.json({ error: 'Failed to process removal request' }, { status: 500 })
    }

    // Set profile page to unpublished
    await supabase
      .from('business_profile_pages')
      .update({ is_published: false })
      .eq('business_id', profile.id)

    // Log event
    await supabase.from('business_claim_events').insert({
      business_id: profile.id,
      event_type: 'profile_removed',
      metadata: { reason: reason || 'No reason provided' },
    })

    return NextResponse.json({ success: true, action: 'removed' })
  }

  // ── CLAIM ACTION ───────────────────────────────────────────────────────────
  if (action !== 'claim') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Name, email and password are required to claim' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Create or find auth user with the provided email
  let newUserId: string

  // Check if a user with this email already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (existingUser) {
    // User exists — verify ownership by checking if they already own a business profile
    const { data: existingBp } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', existingUser.id)
      .neq('id', profile.id)
      .maybeSingle()

    if (existingBp) {
      return NextResponse.json({
        error: 'An account with this email already exists and owns a different business profile. Please contact support.',
      }, { status: 409 })
    }
    newUserId = existingUser.id
  } else {
    // Create new auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'business',
        display_name: name,
      },
    })

    if (authErr || !authData.user) {
      return NextResponse.json({ error: authErr?.message || 'Failed to create account' }, { status: 500 })
    }
    newUserId = authData.user.id
  }

  // Transfer business profile ownership to new user
  const { error: updateBpErr } = await supabase
    .from('business_profiles')
    .update({
      user_id: newUserId,
      visibility: 'public',
      claim_status: 'claimed',
      claimed_at: new Date().toISOString(),
      claimed_by_user_id: newUserId,
    })
    .eq('id', profile.id)

  if (updateBpErr) {
    return NextResponse.json({ error: 'Failed to transfer profile ownership' }, { status: 500 })
  }

  // Publish the profile page
  await supabase
    .from('business_profile_pages')
    .update({ is_published: true })
    .eq('business_id', profile.id)

  // Update business roles — give new user business_admin
  await supabase
    .from('user_business_roles')
    .upsert(
      { user_id: newUserId, business_id: profile.id, role: 'business_admin' },
      { onConflict: 'user_id,business_id' }
    )

  // Update user preferences
  await supabase
    .from('user_preferences')
    .upsert(
      { user_id: newUserId, active_business_id: profile.id },
      { onConflict: 'user_id' }
    )

  // Log event
  await supabase.from('business_claim_events').insert({
    business_id: profile.id,
    event_type: 'profile_claimed',
    user_id: newUserId,
    metadata: { email, name },
  })

  // Sign the new user in to return a session
  const { data: sessionData, error: signInErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  // Return success with slug for redirect
  return NextResponse.json({
    success: true,
    action: 'claimed',
    slug: profile.slug,
    business_name: profile.name || profile.business_name,
    // Return sign-in link if available, otherwise frontend handles login
    magic_link: sessionData?.properties?.action_link || null,
  })
}
