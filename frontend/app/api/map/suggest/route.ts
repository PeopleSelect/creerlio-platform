export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q') || ''
    const showAll = searchParams.get('show_all') === '1'

    if (!q.trim()) {
      return NextResponse.json({ businesses: [] }, { status: 200 })
    }

    // Search for businesses by name (try both business_name and name columns)
    const searchTerm = q.trim()
    let query = supabase
      .from('business_profiles')
      .select('*')
      .or(`business_name.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
      .limit(20) // Show more results
    
    // If show_all is true, don't apply any filters (already handled by or clause above)
    // The show_all parameter is passed but not used here since we want to show all matching businesses

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const businesses = (data || []).map((b: any) => ({
      id: b.id,
      name: b.business_name || b.name || 'Unnamed Business',
      slug: b.slug || `business-${b.id}`,
      industry: Array.isArray(b.industry) ? b.industry[0] : (b.industry || null),
      location: b.location || [b.city, b.state, b.country].filter(Boolean).join(', ') || null,
      lat: b.latitude || b.lat,
      lng: b.longitude || b.lng,
    }))

    return NextResponse.json({ businesses }, { status: 200 })
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
