import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const user = await getUserFromBearer(token)

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const { name, email, headline, skills, linkedin_url } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    const supabase = supabaseServiceServer()

    // Check for existing pending placeholder with same email (prevent duplicates)
    const { data: existing } = await supabase
      .from('placeholder_profiles')
      .select('id, claim_token, status')
      .eq('email', email.trim().toLowerCase())
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://creerlio.com'
      return NextResponse.json({
        success: true,
        placeholder_id: existing.id,
        claim_token: existing.claim_token,
        claim_url: `${baseUrl}/claim/${existing.claim_token}`,
        message: 'A pending placeholder already exists for this email.',
        is_duplicate: true,
      })
    }

    // Parse skills — accept array or comma-separated string
    let parsedSkills: string[] = []
    if (Array.isArray(skills)) {
      parsedSkills = skills.filter((s: any) => typeof s === 'string' && s.trim()).map((s: string) => s.trim())
    } else if (typeof skills === 'string' && skills.trim()) {
      parsedSkills = skills.split(',').map((s) => s.trim()).filter(Boolean)
    }

    const { data: placeholder, error: insertErr } = await supabase
      .from('placeholder_profiles')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        headline: headline?.trim() || null,
        skills: parsedSkills,
        linkedin_url: linkedin_url?.trim() || null,
        created_by_user_id: user.id,
      })
      .select('id, claim_token, name, email')
      .single()

    if (insertErr) {
      console.error('create-placeholder insert error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://creerlio.com'
    const claimUrl = `${baseUrl}/claim/${placeholder.claim_token}`

    return NextResponse.json({
      success: true,
      placeholder_id: placeholder.id,
      claim_token: placeholder.claim_token,
      claim_url: claimUrl,
      name: placeholder.name,
      email: placeholder.email,
    }, { status: 201 })

  } catch (e: any) {
    console.error('create-placeholder error:', e)
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
