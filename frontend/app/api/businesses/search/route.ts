import { NextRequest, NextResponse } from 'next/server'
import { supabaseAnonServer, supabaseServiceServer } from '@/lib/supabaseServer'

// GET /api/businesses/search?q=...&industry=...&location=...&limit=20&offset=0
// Public endpoint — returns BUSINESSES ONLY. Talent profiles are never included.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q        = (searchParams.get('q') || '').trim().toLowerCase()
  const industry = (searchParams.get('industry') || '').trim().toLowerCase()
  const location = (searchParams.get('location') || '').trim().toLowerCase()
  const limit    = Math.min(Number(searchParams.get('limit') || 20), 50)
  const offset   = Math.max(Number(searchParams.get('offset') || 0), 0)

  // Public search — use anon client (matches public RLS on business_profile_pages)
  // Falls back to service role if anon key missing
  let svc: ReturnType<typeof supabaseAnonServer>
  try {
    svc = supabaseAnonServer()
  } catch {
    svc = supabaseServiceServer()
  }

  // Step 1: Fetch all published business pages (no joins — maximally reliable)
  let pagesQuery = svc
    .from('business_profile_pages')
    .select('business_id, slug, name, tagline, logo_url, industries_served, hiring_interests, badges, website_url, contact_email, enquiry_enabled')
    .eq('is_published', true)
    .order('name')
    .limit(500)

  if (q) {
    pagesQuery = pagesQuery.or(`name.ilike.%${q}%,tagline.ilike.%${q}%`)
  }

  const { data: pages, error: pagesError } = await pagesQuery

  if (pagesError || !pages || pages.length === 0) {
    return NextResponse.json({ businesses: [], total: 0, _debug: pagesError?.message })
  }

  // Step 2: Fetch business_profiles for enrichment (location + industry)
  const businessIds = pages.map((p: any) => p.business_id).filter(Boolean)
  const { data: profiles } = businessIds.length > 0
    ? await svc
        .from('business_profiles')
        .select('id, city, state, country, location, website, description, industry, business_name')
        .in('id', businessIds)
    : { data: [] }

  const profileMap: Record<string, any> = {}
  for (const p of profiles || []) profileMap[p.id] = p

  // Step 3: Shape and merge
  let businesses = pages.map((row: any) => {
    const prof = profileMap[row.business_id] || {}
    return {
      slug:              row.slug,
      name:              row.name,
      tagline:           row.tagline,
      logo_url:          row.logo_url,
      industry:          prof.industry || null,
      location:          [prof.city, prof.state, prof.country].filter(Boolean).join(', ') || prof.location || null,
      description:       prof.description || null,
      industries_served: Array.isArray(row.industries_served) ? row.industries_served : [],
      badges:            Array.isArray(row.badges) ? row.badges : [],
      website_url:       row.website_url || prof.website || null,
      enquiry_enabled:   row.enquiry_enabled ?? true,
    }
  })

  // Step 4: JS-side filters
  if (industry) {
    businesses = businesses.filter((b: any) => {
      const bizIndustry = (b.industry || '').toLowerCase()
      const servedList  = (b.industries_served as string[]).map(s => s.toLowerCase())
      return bizIndustry.includes(industry) || servedList.some(s => s.includes(industry))
    })
  }

  if (location) {
    businesses = businesses.filter((b: any) =>
      (b.location || '').toLowerCase().includes(location)
    )
  }

  const total = businesses.length
  const paginated = businesses.slice(offset, offset + limit)

  return NextResponse.json({ businesses: paginated, total })
}
