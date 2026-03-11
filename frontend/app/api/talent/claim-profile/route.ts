import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password } = body

    if (!token || typeof token !== 'string' || !token.trim()) {
      return NextResponse.json({ error: 'Claim token is required' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const supabase = supabaseServiceServer()

    // 1. Look up the placeholder
    const { data: placeholder, error: lookupErr } = await supabase
      .from('placeholder_profiles')
      .select('*')
      .eq('claim_token', token.trim())
      .maybeSingle()

    if (lookupErr) {
      return NextResponse.json({ error: lookupErr.message }, { status: 500 })
    }
    if (!placeholder) {
      return NextResponse.json({ error: 'Invalid claim token' }, { status: 404 })
    }
    if (placeholder.status === 'claimed') {
      return NextResponse.json({ error: 'This profile has already been claimed.' }, { status: 409 })
    }
    if (new Date(placeholder.claim_token_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This claim link has expired.' }, { status: 410 })
    }

    // 2. Create Supabase auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: placeholder.email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'talent',
        full_name: placeholder.name,
        claimed_from_placeholder: placeholder.id,
      },
    })

    if (authErr) {
      // If user already exists with this email, fail cleanly
      if (authErr.message?.toLowerCase().includes('already')) {
        return NextResponse.json({
          error: 'An account with this email already exists. Please log in instead.',
          code: 'email_exists',
        }, { status: 409 })
      }
      console.error('claim-profile auth error:', authErr)
      return NextResponse.json({ error: authErr.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'User creation failed' }, { status: 500 })
    }

    const userId = authData.user.id

    // 3. Generate a URL-friendly slug from name
    const slug = placeholder.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50)

    // 4. Create talent_profile row
    const { data: profile, error: profileErr } = await supabase
      .from('talent_profiles')
      .insert({
        id: userId,
        user_id: userId,
        name: placeholder.name,
        skills: placeholder.skills || [],
        title: placeholder.headline || null,
        profile_status: 'claimed',
        claimed_from_placeholder_id: placeholder.id,
        claimed_at: new Date().toISOString(),
        username: slug,
        slug,
        visibility_default: 'public',
      })
      .select('id')
      .single()

    if (profileErr) {
      // Rollback: delete the auth user so they can retry
      await supabase.auth.admin.deleteUser(userId)
      console.error('claim-profile talent_profile insert error:', profileErr)
      return NextResponse.json({ error: 'Failed to create talent profile: ' + profileErr.message }, { status: 500 })
    }

    // 5. Mark placeholder as claimed
    await supabase
      .from('placeholder_profiles')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        claimed_by_user_id: userId,
        talent_profile_id: profile.id,
      })
      .eq('id', placeholder.id)

    // 6. Sign in and return session token so user lands logged in
    const { data: sessionData, error: sessionErr } = await supabase.auth.signInWithPassword({
      email: placeholder.email,
      password,
    })

    return NextResponse.json({
      success: true,
      user_id: userId,
      email: placeholder.email,
      name: placeholder.name,
      session: sessionErr ? null : sessionData.session,
      message: 'Profile claimed successfully. Welcome to Creerlio!',
    })

  } catch (e: any) {
    console.error('claim-profile error:', e)
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
