export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// GET /api/onboarding/opportunities
// Returns published businesses to populate the onboarding opportunity feed.
// No auth required — this is public discovery data.
export async function GET() {
  try {
    const svc = supabaseServiceServer()

    // Fetch published business profile pages joined with business profile data
    const { data: pages, error } = await svc
      .from('business_profile_pages')
      .select(`
        id,
        slug,
        name,
        tagline,
        business_id,
        business_profiles ( id, industry, city, name, business_name )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) {
      console.error('[onboarding/opportunities]', error.message)
      return NextResponse.json({ opportunities: [] })
    }

    const opportunities = (pages || []).map((page: any) => {
      const bp = page.business_profiles || {}
      return {
        id: bp.id || page.business_id,
        name: page.name || bp.business_name || bp.name || 'Business',
        industry: bp.industry || null,
        city: bp.city || null,
        tagline: page.tagline || null,
        slug: page.slug || null,
      }
    }).filter((o: any) => o.id)

    return NextResponse.json({ opportunities })
  } catch (err: any) {
    console.error('[onboarding/opportunities] unexpected:', err)
    return NextResponse.json({ opportunities: [] })
  }
}
