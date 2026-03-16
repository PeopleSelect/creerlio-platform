import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// GET /api/businesses/[slug]
// Public — returns full business page data. Never returns talent data.
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params?.slug
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const svc = supabaseServiceServer()

  const { data: page, error } = await svc
    .from('business_profile_pages')
    .select(`
      *,
      businesses!inner ( id, industry ),
      business_profiles!inner (
        id, city, state, country, location, website, description, industry
      )
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  if (error || !page) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch services
  const { data: services } = await svc
    .from('business_products_services')
    .select('id, name, category, short_description, who_it_is_for, problem_it_solves, logo_or_icon')
    .eq('business_id', page.businesses?.id || '')
    .order('name')

  // Fetch active talent requests (anonymous — no talent data)
  const { data: requests } = await svc
    .from('business_talent_requests')
    .select('id, role_title, location, experience_level, notes, created_at')
    .eq('business_id', page.businesses?.id || '')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const bp: any = page.business_profiles
  const biz: any = page.businesses

  return NextResponse.json({
    slug:              page.slug,
    business_id:       biz?.id || null,
    name:              page.name,
    tagline:           page.tagline,
    mission:           page.mission,
    logo_url:          page.logo_url,
    hero_image_url:    page.hero_image_url,
    value_prop_headline: page.value_prop_headline,
    value_prop_body:   page.value_prop_body,
    industry:          biz?.industry || bp?.industry || null,
    location:          [bp?.city, bp?.state, bp?.country].filter(Boolean).join(', ') || bp?.location || null,
    website_url:       (page as any).website_url || bp?.website || null,
    contact_email:     (page as any).contact_email || null,
    enquiry_enabled:   (page as any).enquiry_enabled ?? true,
    description:       bp?.description || null,
    industries_served: Array.isArray((page as any).industries_served) ? (page as any).industries_served : [],
    hiring_interests:  Array.isArray((page as any).hiring_interests) ? (page as any).hiring_interests : [],
    badges:            Array.isArray((page as any).badges) ? (page as any).badges : [],
    impact_stats:      Array.isArray(page.impact_stats) ? page.impact_stats : [],
    culture_values:    Array.isArray(page.culture_values) ? page.culture_values : [],
    benefits:          Array.isArray(page.benefits) ? page.benefits : [],
    programs:          Array.isArray(page.programs) ? page.programs : [],
    social_proof:      Array.isArray(page.social_proof) ? page.social_proof : [],
    services:          services || [],
    talent_requests:   requests || [],
  })
}
