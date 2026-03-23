/**
 * GET /api/business/claim/[token]
 * Validate a claim token and return the business profile preview (no auth required).
 * Used by the public /business/claim/[token] page.
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

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token?.trim()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = getAdminClient()

  // Look up the claim token
  const { data: profile, error } = await supabase
    .from('business_profiles')
    .select(`
      id, name, business_name, slug, website, industry, city, state, country,
      claim_token, claim_token_expires_at, claim_status, visibility
    `)
    .eq('claim_token', token)
    .maybeSingle()

  if (error || !profile) {
    return NextResponse.json({ error: 'Invalid or expired claim link' }, { status: 404 })
  }

  if (profile.claim_status === 'claimed') {
    return NextResponse.json({ error: 'This profile has already been claimed' }, { status: 410 })
  }

  if (profile.claim_status === 'removed') {
    return NextResponse.json({ error: 'This profile has been removed' }, { status: 410 })
  }

  if (profile.claim_token_expires_at && new Date(profile.claim_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This claim link has expired' }, { status: 410 })
  }

  // Fetch business_profile_pages for richer display data
  const { data: page } = await supabase
    .from('business_profile_pages')
    .select(`
      slug, name, tagline, mission, logo_url, hero_image_url,
      culture_values, benefits, business_areas, programs, social_proof,
      impact_stats, value_prop_headline, value_prop_body,
      media_assets, contact_email, website_url, linkedin_url, youtube_url,
      acknowledgement_of_country
    `)
    .eq('business_id', profile.id)
    .maybeSingle()

  // Fetch logo from bank items (most reliable source)
  const { data: bankItems } = await supabase
    .from('business_bank_items')
    .select('item_type, file_url, title')
    .eq('user_id', profile.id)
    .in('item_type', ['logo', 'image'])

  const logoItem = bankItems?.find(i => i.item_type === 'logo')
    ?? bankItems?.find(i => i.title?.toLowerCase().includes('logo'))
  const heroItem = bankItems?.find(i => i.title?.toLowerCase().includes('hero'))

  // Log claim_link_viewed event (fire and forget)
  supabase.from('business_claim_events').insert({
    business_id: profile.id,
    event_type: 'claim_link_viewed',
    metadata: { ip: req.headers.get('x-forwarded-for') || 'unknown' },
  }).then(() => {})

  return NextResponse.json({
    id: profile.id,
    name: profile.name || profile.business_name,
    slug: profile.slug,
    website: profile.website,
    industry: profile.industry,
    location: [profile.city, profile.state, profile.country].filter(Boolean).join(', '),
    claim_status: profile.claim_status,
    // Page content
    tagline: page?.tagline || '',
    mission: page?.mission || '',
    logo_url: logoItem?.file_url || page?.logo_url || null,
    hero_image_url: heroItem?.file_url || page?.hero_image_url || null,
    culture_values: page?.culture_values || [],
    benefits: page?.benefits || [],
    business_areas: page?.business_areas || [],
    programs: page?.programs || [],
    social_proof: page?.social_proof || [],
    impact_stats: page?.impact_stats || [],
    value_prop_headline: page?.value_prop_headline || '',
    value_prop_body: page?.value_prop_body || '',
    media_assets: page?.media_assets || {},
    contact_email: page?.contact_email || '',
    website_url: page?.website_url || profile.website || '',
    linkedin_url: page?.linkedin_url || '',
    youtube_url: page?.youtube_url || '',
    acknowledgement_of_country: page?.acknowledgement_of_country || '',
  })
}
