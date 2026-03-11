import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

export async function GET(req: NextRequest, ctx: { params: { token: string } }) {
  try {
    const { token } = ctx.params
    const t = String(token || '').trim()
    if (!t) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = supabaseServiceServer()

    const { data: placeholder, error } = await supabase
      .from('placeholder_profiles')
      .select('id, name, email, headline, skills, linkedin_url, status, claim_token_expires_at, claimed_at')
      .eq('claim_token', t)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!placeholder) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (placeholder.status === 'claimed') {
      return NextResponse.json({
        error: 'This profile has already been claimed.',
        status: 'claimed',
      }, { status: 410 })
    }
    if (new Date(placeholder.claim_token_expires_at).getTime() < Date.now()) {
      return NextResponse.json({
        error: 'This claim link has expired. Please contact the person who sent it.',
        status: 'expired',
      }, { status: 410 })
    }

    return NextResponse.json({
      success: true,
      profile: {
        name: placeholder.name,
        email: placeholder.email,
        headline: placeholder.headline,
        skills: placeholder.skills || [],
        linkedin_url: placeholder.linkedin_url,
      },
      expires_at: placeholder.claim_token_expires_at,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
