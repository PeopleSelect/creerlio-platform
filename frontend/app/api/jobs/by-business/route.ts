export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

const JOB_SELECT =
  'id,title,description,location,city,state,country,employment_type,status,business_profile_id,business_id,location_id,is_active,created_at'

async function findPublishedJobs(supabase: ReturnType<typeof supabaseServiceServer>, businessId: string) {
  // 1. Try location_id-based jobs (new model: businesses → locations → jobs)
  const { data: locationRows } = await supabase
    .from('locations')
    .select('id')
    .eq('business_id', businessId)

  if (Array.isArray(locationRows) && locationRows.length > 0) {
    const locationIds = locationRows.map((l: any) => l.id)
    const { data, error } = await supabase
      .from('jobs')
      .select(JOB_SELECT)
      .in('location_id', locationIds)
      .eq('status', 'published')
      .or('is_active.is.true,is_active.is.null')
      .order('created_at', { ascending: false })
    if (!error && data && data.length > 0) return data
  }

  // 2. Try matching on business_id UUID column
  const { data: byBizId } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('business_id', businessId)
    .eq('status', 'published')
    .or('is_active.is.true,is_active.is.null')
    .order('created_at', { ascending: false })
  if (Array.isArray(byBizId) && byBizId.length > 0) return byBizId

  // 3. Try matching on business_profile_id (UUID or BIGINT — try as-is, ignore type errors)
  const { data: byBpId } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('business_profile_id', businessId)
    .eq('status', 'published')
    .or('is_active.is.true,is_active.is.null')
    .order('created_at', { ascending: false })
  if (Array.isArray(byBpId) && byBpId.length > 0) return byBpId

  // 4. No status filter fallback — shows AI-generated jobs that may have any status
  const { data: anyStatus } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('business_id', businessId)
    .or('is_active.is.true,is_active.is.null')
    .order('created_at', { ascending: false })
  if (Array.isArray(anyStatus) && anyStatus.length > 0) return anyStatus

  const { data: anyStatusBp } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('business_profile_id', businessId)
    .or('is_active.is.true,is_active.is.null')
    .order('created_at', { ascending: false })
  return anyStatusBp || []
}

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServiceServer()
    const businessId = request.nextUrl.searchParams.get('business_id')

    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }

    const data = await findPublishedJobs(supabase, businessId)

    // Fetch business name
    let businessName = 'Unknown Company'
    const { data: bizProfile } = await supabase
      .from('business_profiles')
      .select('name, business_name')
      .eq('id', businessId)
      .maybeSingle()
    if (bizProfile) {
      businessName =
        (bizProfile.business_name && String(bizProfile.business_name).trim()) ||
        (bizProfile.name && String(bizProfile.name).trim()) ||
        businessName
    }

    // Hydrate location details
    const locationIds = Array.from(
      new Set((data || []).map((job: any) => job.location_id).filter(Boolean))
    )
    const locationMap = new Map<string, any>()
    if (locationIds.length > 0) {
      const { data: locs } = await supabase
        .from('locations')
        .select('id,name,city,state,country,address')
        .in('id', locationIds as any)
      ;(locs || []).forEach((loc: any) => locationMap.set(String(loc.id), loc))
    }

    const jobs = (data || []).map((job: any) => {
      const loc = job.location_id ? locationMap.get(String(job.location_id)) : null
      const locationLabel =
        job.location ||
        [job.city, job.state, job.country].filter(Boolean).join(', ') ||
        (loc ? [loc.name, loc.city, loc.state, loc.country].filter(Boolean).join(', ') : null)
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
