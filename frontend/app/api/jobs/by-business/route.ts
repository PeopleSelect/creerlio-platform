export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('business_id')

    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }

    const jobSelect =
      'id,title,description,location,city,state,country,employment_type,status,business_profile_id,business_id,location_id,is_active,created_at'

    // Try location-scoped jobs first (new model)
    let data: any[] | null = null
    let error: any = null

    const { data: locationRows, error: locErr } = await supabase
      .from('locations')
      .select('id')
      .eq('business_id', businessId)

    if (!locErr && Array.isArray(locationRows) && locationRows.length > 0) {
      const locationIds = locationRows.map((l: any) => l.id)
      const res = await supabase
        .from('jobs')
        .select(jobSelect)
        .in('location_id', locationIds)
        .ilike('status', 'published%')
        .or('is_active.is.true,is_active.is.null')
        .order('created_at', { ascending: false })
      data = res.data
      error = res.error
    }

    // Fallback: legacy business_profile_id or business_id
    if (error || !data || data.length === 0) {
      const res = await supabase
        .from('jobs')
        .select(jobSelect)
        .or(`business_profile_id.eq.${businessId},business_id.eq.${businessId}`)
        .ilike('status', 'published%')
        .or('is_active.is.true,is_active.is.null')
        .order('created_at', { ascending: false })
      data = res.data
      error = res.error
    }

    if (error) {
      console.error('[API /jobs/by-business] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch business name
    let businessName = 'Unknown Company'
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .maybeSingle()

    if (business?.name) {
      businessName = String(business.name).trim() || businessName
    } else if (data && data.length > 0) {
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('name, business_name')
        .eq('id', businessId)
        .maybeSingle()
      
      if (businessProfile) {
        businessName = (businessProfile.business_name && String(businessProfile.business_name).trim()) || 
                      (businessProfile.name && String(businessProfile.name).trim()) || 
                      businessName
      }
    }

    // Hydrate location details when jobs use location_id
    const locationIds = Array.from(
      new Set((data || []).map((job: any) => job.location_id).filter(Boolean))
    )
    const locationMap = new Map<string, any>()
    if (locationIds.length > 0) {
      const { data: locationRows } = await supabase
        .from('locations')
        .select('id,name,city,state,country,address')
        .in('id', locationIds as any)
      ;(locationRows || []).forEach((loc: any) => {
        locationMap.set(String(loc.id), loc)
      })
    }

    // Add business + location name to each job
    const jobs = (data || []).map((job: any) => {
      const loc = job.location_id ? locationMap.get(String(job.location_id)) : null
      const locationLabel =
        job.location ||
        [job.city, job.state, job.country].filter(Boolean).join(', ') ||
        (loc
          ? [loc.name, loc.city, loc.state, loc.country].filter(Boolean).join(', ')
          : null)
      return {
        ...job,
        business_name: businessName,
        location_name: loc?.name || null,
        location_label: locationLabel || null,
        city: job.city || loc?.city || null,
        state: job.state || loc?.state || null,
        country: job.country || loc?.country || null,
      }
    })

    return NextResponse.json({ jobs, business_name: businessName }, { status: 200 })
  } catch (err: any) {
    console.error('[API /jobs/by-business] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
