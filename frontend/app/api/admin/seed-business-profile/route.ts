/**
 * Admin API — Seed a Business Profile from structured JSON
 * POST /api/admin/seed-business-profile
 *
 * Accepts a body with { profile_id?, slug, name, website_url, sections[], jobs[], socials[], products[] }
 * and writes it into business_profiles, business_profile_pages, business_bank_items,
 * business_talent_requests, business_products_services*, and jobs so that both
 * /business/[slug]/about (public page) and /dashboard/business/view (internal editor)
 * render content immediately.
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

/** Extract plain-text bio from sections array. Prefers company_overview / about key. */
function deriveBio(sections: any[], mission?: string): string {
  const overviewSection = sections.find((s: any) =>
    /company_overview|about|mission|overview/i.test(s.key || '')
  )
  const content = overviewSection?.content || sections[0]?.content
  if (typeof content === 'string' && content.trim()) return content.trim().slice(0, 2000)
  return mission || ''
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
    products = [],       // optional: array of product/service cards
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

  // Separate dynamic sections from the benefits section
  const benefitsSection = sections.find((s: any) => s.key === 'benefits_and_perks')
  const dynamicSections = sections.filter((s: any) => s.key !== 'benefits_and_perks')

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
    .in('item_type', ['dynamic_sections', 'structured_benefits', 'profile_quality_score', 'profile'])

  // ── 5. profile bank item (editor form state) ──────────────────────────────
  // The BusinessProfileEditor reads ALL form fields from the 'profile' bank item metadata.
  const bio = deriveBio(sections, mission)
  const socialLinks = socials.map((s: any) => ({ platform: s.platform || 'Website', url: s.url }))

  // Map culture sections from sections[] by key pattern matching
  const findSection = (pattern: RegExp) =>
    sections.find((s: any) => pattern.test(s.key || ''))
  const cultureDecisions = (() => {
    const s = findSection(/decision/i)
    return typeof s?.content === 'string' ? s.content : ''
  })()
  const cultureFeedback = (() => {
    const s = findSection(/feedback/i)
    return typeof s?.content === 'string' ? s.content : ''
  })()
  const cultureConflict = (() => {
    const s = findSection(/conflict/i)
    return typeof s?.content === 'string' ? s.content : ''
  })()
  const cultureSuccess = (() => {
    const s = findSection(/success|celebrat/i)
    return typeof s?.content === 'string' ? s.content : ''
  })()

  // Always insert the profile bank item (even if bio is empty) so the editor loads data
  {
    const { error: profileItemErr } = await supabase.from('business_bank_items').insert({
      user_id: profileId,
      item_type: 'profile',
      title: `${name} — Profile`,
      metadata: {
        bio: bio || '',
        name,
        title: tagline || '',
        businessName: name,
        industry: industry || null,
        website: website_url || null,
        location,
        tagline: tagline || null,
        socialLinks,
        cultureDecisions,
        cultureFeedback,
        cultureConflict,
        cultureSuccess,
      },
      is_active: true,
    })
    if (profileItemErr) errors.push('profile bank item: ' + profileItemErr.message)
    else log.push('✓ profile bank item (editor fields)')
  }

  // ── 6. dynamic_sections bank item ─────────────────────────────────────────
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

  // ── 7. structured_benefits bank item ─────────────────────────────────────
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

  // ── 8. profile quality score ──────────────────────────────────────────────
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

  // ── 9. Products & Services → dashboard view ────────────────────────────────
  // Requires migration 20260325d_seed_dashboard_fills.sql (user_id nullable in products tables).
  if (products.length > 0 || sections.some((s: any) => /products|services/i.test(s.key || ''))) {
    // Clear old products for this profile
    await supabase.from('business_products_services').delete().eq('business_id', profileId)
    await supabase.from('business_products_services_overview').delete().eq('business_id', profileId)

    // Overview
    const overviewSection = sections.find((s: any) => /products|services|overview/i.test(s.key || ''))
    const overviewSummary = typeof overviewSection?.content === 'string'
      ? overviewSection.content.slice(0, 1000)
      : tagline || `${name} products and services`

    const { error: ovrErr } = await supabase.from('business_products_services_overview').insert({
      business_id: profileId,
      // user_id intentionally omitted — made nullable by migration 20260325d
      short_headline: tagline || `${name} Products & Services`,
      summary: overviewSummary,
      primary_industries: industry ? [industry] : [],
      business_model: 'Other',
      is_public: true,
    })
    if (ovrErr) errors.push('products_overview: ' + ovrErr.message)
    else log.push('✓ products_services_overview')

    // Individual product cards (from optional products[] array)
    if (products.length > 0) {
      const productRows = products.map((p: any, i: number) => ({
        business_id: profileId,
        // user_id intentionally omitted — made nullable by migration 20260325d
        name: p.name || `Product ${i + 1}`,
        category: p.category || 'Product',
        short_description: p.short_description || p.description || '',
        who_it_is_for: p.who_it_is_for || p.target_audience || 'Everyone',
        problem_it_solves: p.problem_it_solves || p.value_prop || '',
        external_link: p.url || p.link || null,
        lifecycle_stage: p.lifecycle_stage || 'Live',
        order_index: i,
        is_published: true,
        is_active: true,
      }))

      const { error: prodErr } = await supabase.from('business_products_services').insert(productRows)
      if (prodErr) errors.push('products_services: ' + prodErr.message)
      else log.push(`✓ products_services (${products.length} cards)`)
    }
  }

  // ── 10. Jobs → business_talent_requests + jobs table ──────────────────────
  if (jobs.length > 0) {
    // Clear old talent requests
    await supabase.from('business_talent_requests').delete().eq('business_id', profileId)
    // Clear old seeded jobs (identified by business_id UUID column)
    await supabase.from('jobs').delete().eq('business_id', profileId)

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

    // Also write to jobs table so /dashboard/business/view shows them
    // Requires migration 20260325d_seed_dashboard_fills.sql (business_id uuid column on jobs).
    const jobRows = jobs.map((j: any) => ({
      business_id: profileId,   // UUID column added by migration
      business_profile_id: 0,   // BIGINT NOT NULL placeholder (no real BIGINT id exists)
      title: j.title,
      description: j.description || null,
      location: j.location || null,
      employment_type: j.employment_type || null,
      status: 'published',
      is_active: true,
    }))
    const { error: jobsErr } = await supabase.from('jobs').insert(jobRows)
    if (jobsErr) errors.push('jobs table: ' + jobsErr.message)
    else log.push(`✓ jobs table (${jobs.length} published)`)
  }

  return NextResponse.json({
    ok: errors.length === 0,
    profile_id: profileId,
    slug,
    url: `/business/${slug}/about`,
    dashboard_url: `/dashboard/business/view?id=${profileId}`,
    log,
    errors: errors.length > 0 ? errors : undefined,
  })
}
