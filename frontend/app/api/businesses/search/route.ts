import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// GET /api/businesses/search?q=...&industry=...&location=...&limit=20&offset=0
// Public endpoint — returns BUSINESSES ONLY. Talent profiles are never included.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q        = (searchParams.get('q') || '').trim()
  const industry = (searchParams.get('industry') || '').trim()
  const location = (searchParams.get('location') || '').trim()
  const limit    = Math.min(Number(searchParams.get('limit') || 20), 50)
  const offset   = Math.max(Number(searchParams.get('offset') || 0), 0)

  const svc = supabaseServiceServer()

  // Join business_profile_pages (published) with businesses and business_profiles
  // for searchable fields: name, industry, location, tagline, services
  let query = svc
    .from('business_profile_pages')
    .select(`
      slug,
      name,
      tagline,
      logo_url,
      industries_served,
      hiring_interests,
      badges,
      website_url,
      contact_email,
      enquiry_enabled,
      businesses!inner (
        id,
        industry
      ),
      business_profiles!inner (
        id,
        city,
        state,
        country,
        location,
        website,
        description,
        industry
      )
    `, { count: 'exact' })
    .eq('is_published', true)

  // Text search across name, tagline, description
  if (q) {
    query = query.or(
      `name.ilike.%${q}%,tagline.ilike.%${q}%,business_profiles.description.ilike.%${q}%`
    )
  }

  // Industry filter
  if (industry) {
    query = query.or(
      `businesses.industry.ilike.%${industry}%,business_profiles.industry.ilike.%${industry}%`
    )
  }

  // Location filter
  if (location) {
    query = query.or(
      `business_profiles.city.ilike.%${location}%,business_profiles.state.ilike.%${location}%,business_profiles.country.ilike.%${location}%,business_profiles.location.ilike.%${location}%`
    )
  }

  const { data, count, error } = await query
    .order('name')
    .range(offset, offset + limit - 1)

  if (error) {
    // Fallback: simpler query without joins if schema differs
    const fallback = await svc
      .from('business_profile_pages')
      .select('slug, name, tagline, logo_url, industries_served, badges, website_url, contact_email, enquiry_enabled', { count: 'exact' })
      .eq('is_published', true)
      .ilike('name', q ? `%${q}%` : '%')
      .order('name')
      .range(offset, offset + limit - 1)

    return NextResponse.json({
      businesses: fallback.data || [],
      total: fallback.count || 0,
    })
  }

  // Shape response — never expose talent data
  const businesses = (data || []).map((row: any) => ({
    slug:              row.slug,
    name:              row.name,
    tagline:           row.tagline,
    logo_url:          row.logo_url,
    industry:          row.businesses?.industry || row.business_profiles?.industry || null,
    location:          [row.business_profiles?.city, row.business_profiles?.state, row.business_profiles?.country]
                         .filter(Boolean).join(', ') || row.business_profiles?.location || null,
    description:       row.business_profiles?.description || null,
    industries_served: Array.isArray(row.industries_served) ? row.industries_served : [],
    badges:            Array.isArray(row.badges) ? row.badges : [],
    website_url:       row.website_url || row.business_profiles?.website || null,
    enquiry_enabled:   row.enquiry_enabled ?? true,
  }))

  return NextResponse.json({ businesses, total: count || 0 })
}
