/**
 * Admin API — Seed a Business Profile from structured JSON
 * POST /api/admin/seed-business-profile
 *
 * Accepts a body with { profile_id?, slug, name, website_url, sections[], jobs[], socials[] }
 * and writes it into business_profiles, business_profile_pages, business_bank_items, and
 * business_talent_requests so that /business/[slug]/about renders it immediately.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

function isAdminUser(user: { email?: string | null; user_metadata?: Record<string, any> | null }) {
  const metadata = user.user_metadata || {}
  if (metadata.is_admin === true || metadata.admin === true) return true
  const email = (user.email || '').toLowerCase()
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  return !!email && adminEmails.includes(email)
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

function generateClaimToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authz = req.headers.get('authorization') || ''
  const token = authz.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = getAdminClient()

  // ── Parse body ───────────────────────────────────────────────────────────
  const body = await req.json()
  const {
    profile_id: providedId,
    name,
    slug: providedSlug,
    website_url,
    tagline,
    mission,
    industry,
    city,
    state,
    country,
    sections = [],
    jobs = [],
    socials = [],
    overall_confidence,
  } = body

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const slug = providedSlug || slugify(name)
  // Use a stable profile_id — check if one already exists for this slug
  let profileId = providedId
  if (!profileId) {
    const { data: existing } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    profileId = existing?.id || crypto.randomUUID()
  }

  const location = [city, state, country].filter(Boolean).join(', ')

  // Extract social URLs
  const linkedinUrl = socials.find((s: any) => s.platform?.toLowerCase() === 'linkedin')?.url || null
  const youtubeUrl  = socials.find((s: any) => s.platform?.toLowerCase() === 'youtube')?.url   || null
  const instagramUrl= socials.find((s: any) => s.platform?.toLowerCase() === 'instagram')?.url || null
  const twitterUrl  = socials.find((s: any) => /^x$|twitter/i.test(s.platform || ''))?.url    || null

  // Separate dynamic sections from the benefits section
  const benefitsSection = sections.find((s: any) => s.key === 'benefits_and_perks')
  const dynamicSections = sections.filter((s: any) => s.key !== 'benefits_and_perks')

  // Derive culture values from the community/culture section (or default)
  const cultureSection = sections.find((s: any) =>
    s.key === 'community_and_culture' || s.key === 'life_at_the_company'
  )

  const errors: string[] = []
  const log: string[] = []

  // ── 1. businesses ─────────────────────────────────────────────────────────
  const { error: bizErr } = await supabase.from('businesses').upsert(
    { id: profileId, name, industry: industry || null },
    { onConflict: 'id' }
  )
  if (bizErr) errors.push('businesses: ' + bizErr.message)
  else log.push('✓ businesses')

  // ── 2. business_profiles ──────────────────────────────────────────────────
  // user_id is intentionally omitted — seeded profiles have no auth.users row.
  // The migration 20260325c_seed_profile_fixes.sql makes user_id nullable.
  const { error: bpErr } = await supabase.from('business_profiles').upsert({
    id: profileId, business_id: profileId,
    name, business_name: name,
    description: (sections[0]?.content && typeof sections[0].content === 'string'
      ? (sections[0].content as string).slice(0, 500) : null),
    slug, industry: industry || null,
    location, city: city || null, state: state || null, country: country || 'United States',
    website: website_url || null,
    is_active: true, talent_community_enabled: true,
    visibility: 'public',
    claim_token: generateClaimToken(),
    claim_token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    claim_status: 'pending', is_ai_generated: true,
  }, { onConflict: 'id' })
  if (bpErr) errors.push('business_profiles: ' + bpErr.message)
  else log.push('✓ business_profiles')

  // ── 3. business_profile_pages ─────────────────────────────────────────────
  const { error: bppErr } = await supabase.from('business_profile_pages').upsert({
    business_id: profileId, slug, is_published: true, name,
    tagline: tagline || null,
    mission: mission || null,
    website_url: website_url || null,
    linkedin_url: linkedinUrl,
    youtube_url: youtubeUrl,
    twitter_url: twitterUrl,
    culture_values: [],
    impact_stats: [], benefits: [], programs: [], social_proof: [],
    business_areas: [], badges: [],
    live_roles_count: jobs.length,
    talent_community_enabled: true,
    portfolio_intake_enabled: true,
    enquiry_enabled: true,
  }, { onConflict: 'business_id' })
  if (bppErr) errors.push('business_profile_pages: ' + bppErr.message)
  else log.push('✓ business_profile_pages')

  // ── 4. Delete old bank items so re-seeding is clean ───────────────────────
  await supabase.from('business_bank_items')
    .delete()
    .eq('user_id', profileId)
    .in('item_type', ['dynamic_sections', 'structured_benefits', 'profile_quality_score'])

  // ── 5. dynamic_sections bank item ─────────────────────────────────────────
  if (dynamicSections.length > 0) {
    const { error: dsErr } = await supabase.from('business_bank_items').insert({
      user_id: profileId,
      item_type: 'dynamic_sections',
      title: `${name} — Dynamic Profile`,
      metadata: {
        sections: dynamicSections,
        overall_confidence: overall_confidence || null,
        generated_at: new Date().toISOString(),
      },
      is_active: true,
    })
    if (dsErr) errors.push('dynamic_sections: ' + dsErr.message)
    else log.push(`✓ dynamic_sections (${dynamicSections.length} sections)`)
  }

  // ── 6. structured_benefits bank item ─────────────────────────────────────
  if (benefitsSection?.content && typeof benefitsSection.content === 'object') {
    const { error: sbErr } = await supabase.from('business_bank_items').insert({
      user_id: profileId,
      item_type: 'structured_benefits',
      title: `${name} — Benefits & Perks`,
      metadata: {
        ...(benefitsSection.content as object),
        generated_at: new Date().toISOString(),
      },
      is_active: true,
    })
    if (sbErr) errors.push('structured_benefits: ' + sbErr.message)
    else log.push('✓ structured_benefits')
  }

  // ── 7. profile quality score ──────────────────────────────────────────────
  if (overall_confidence) {
    await supabase.from('business_bank_items').insert({
      user_id: profileId,
      item_type: 'profile_quality_score',
      title: `${name} — Profile Quality`,
      metadata: {
        overall: overall_confidence,
        completeness: overall_confidence,
        depth: overall_confidence,
        source_diversity: 80,
        generated_at: new Date().toISOString(),
      },
      is_active: true,
    })
    log.push('✓ profile_quality_score')
  }

  // ── 8. Jobs → business_talent_requests ────────────────────────────────────
  if (jobs.length > 0) {
    // Clear old requests first
    await supabase.from('business_talent_requests')
      .delete()
      .eq('business_id', profileId)

    const requestRows = jobs.map((j: any) => ({
      business_id: profileId,
      role_title: j.title,
      location: j.location || null,
      experience_level: j.employment_type || null,
      notes: j.inferred ? '(inferred from company context)' : null,
      is_active: true,
    }))

    const { error: jErr } = await supabase.from('business_talent_requests').insert(requestRows)
    if (jErr) errors.push('business_talent_requests: ' + jErr.message)
    else log.push(`✓ business_talent_requests (${jobs.length} roles)`)
  }

  return NextResponse.json({
    ok: errors.length === 0,
    profile_id: profileId,
    slug,
    url: `/business/${slug}/about`,
    log,
    errors: errors.length > 0 ? errors : undefined,
  })
}
