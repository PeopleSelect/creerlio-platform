import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// GET /api/businesses/search?q=...&industry=...&location=...&limit=20&offset=0
// Public endpoint — returns BUSINESSES ONLY. Talent profiles are never included.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q        = (searchParams.get('q') || '').trim().toLowerCase()
  const industry = (searchParams.get('industry') || '').trim().toLowerCase()
  const location = (searchParams.get('location') || '').trim().toLowerCase()
  const limit    = Math.min(Number(searchParams.get('limit') || 20), 50)
  const offset   = Math.max(Number(searchParams.get('offset') || 0), 0)

  const svc = supabaseServiceServer()

  // Fetch all published business pages with profile data joined
  // Industry filter is applied in JS because PostgREST .or() across two embedded
  // tables (businesses + business_profiles) doesn't work via the JS client
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
      business_profiles (
        id,
        city,
        state,
        country,
        location,
        website,
        description,
        industry
      )
    `)
    .eq('is_published', true)
    .order('name')
    .limit(500) // fetch all, paginate in JS after industry filter

  // Keyword filter on DB-side columns (name, tagline)
  if (q) {
    query = query.or(`name.ilike.%${q}%,tagline.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    // Fallback: simpler query without joins
    const fallback = await svc
      .from('business_profile_pages')
      .select('slug, name, tagline, logo_url, industries_served, badges, website_url, contact_email, enquiry_enabled')
      .eq('is_published', true)
      .ilike('name', q ? `%${q}%` : '%')
      .order('name')
      .limit(200)

    return NextResponse.json({
      businesses: fallback.data || [],
      total: (fallback.data || []).length,
    })
  }

  // Shape rows
  let businesses = (data || []).map((row: any) => ({
    slug:              row.slug,
    name:              row.name,
    tagline:           row.tagline,
    logo_url:          row.logo_url,
    // Canonical industry: check business_profiles first (editor saves here), then businesses
    industry:          row.business_profiles?.industry || row.businesses?.industry || null,
    location:          [row.business_profiles?.city, row.business_profiles?.state, row.business_profiles?.country]
                         .filter(Boolean).join(', ') || row.business_profiles?.location || null,
    description:       row.business_profiles?.description || null,
    industries_served: Array.isArray(row.industries_served) ? row.industries_served : [],
    badges:            Array.isArray(row.badges) ? row.badges : [],
    website_url:       row.website_url || row.business_profiles?.website || null,
    enquiry_enabled:   row.enquiry_enabled ?? true,
  }))

  // JS-side filters (reliable cross-field matching)
  if (industry) {
    businesses = businesses.filter(b => {
      const bizIndustry  = (b.industry || '').toLowerCase()
      const servedList   = b.industries_served.map((s: string) => s.toLowerCase())
      return bizIndustry.includes(industry) || servedList.some(s => s.includes(industry))
    })
  }

  if (location) {
    businesses = businesses.filter(b =>
      (b.location || '').toLowerCase().includes(location)
    )
  }

  const total = businesses.length
  const paginated = businesses.slice(offset, offset + limit)

  return NextResponse.json({ businesses: paginated, total })
}
