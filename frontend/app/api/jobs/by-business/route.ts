export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

const JOB_SELECT =
  'id,title,description,location,city,state,country,employment_type,status,business_profile_id,business_id,location_id,is_active,created_at'

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServiceServer()
    const businessId = request.nextUrl.searchParams.get('business_id')

    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }

    // ── Step 1: Resolve the business profile and collect ALL identifier variants ──
    // The generator may store different UUIDs in id vs user_id vs business_id.
    // We query by every identifier so a mismatch never causes "0 jobs found".
    const { data: bpRow } = await supabase
      .from('business_profiles')
      .select('id, user_id, business_id, name, business_name')
      .eq('id', businessId)
      .maybeSingle()

    // Collect every UUID that might appear in jobs rows
    const idSet = new Set<string>([businessId])
    if (bpRow?.user_id) idSet.add(String(bpRow.user_id))
    if (bpRow?.business_id) idSet.add(String(bpRow.business_id))
    const ids = Array.from(idSet).filter(Boolean)

    const businessName =
      (bpRow?.business_name && String(bpRow.business_name).trim()) ||
      (bpRow?.name && String(bpRow.name).trim()) ||
      'Business'

    // ── Step 2: Try location-scoped jobs (new model) ─────────────────────────
    let jobs: any[] | null = null

    const { data: locationRows } = await supabase
      .from('locations')
      .select('id')
      .in('business_id', ids)

    if (Array.isArray(locationRows) && locationRows.length > 0) {
      const locationIds = locationRows.map((l: any) => l.id)
      const { data } = await supabase
        .from('jobs')
        .select(JOB_SELECT)
        .in('location_id', locationIds)
        .order('created_at', { ascending: false })
      if (Array.isArray(data) && data.length > 0) jobs = data
    }

    // ── Step 3: Query jobs by business_id IN (all ids) ───────────────────────
    if (!jobs || jobs.length === 0) {
      const { data } = await supabase
        .from('jobs')
        .select(JOB_SELECT)
        .in('business_id', ids)
        .order('created_at', { ascending: false })
      if (Array.isArray(data) && data.length > 0) jobs = data
    }

    // ── Step 4: Query jobs by business_profile_id IN (all ids) ───────────────
    if (!jobs || jobs.length === 0) {
      const { data } = await supabase
        .from('jobs')
        .select(JOB_SELECT)
        .in('business_profile_id', ids)
        .order('created_at', { ascending: false })
      if (Array.isArray(data) && data.length > 0) jobs = data
    }

    jobs = jobs || []

    // ── Step 5: Hydrate location details ─────────────────────────────────────
    const locationIds = Array.from(
      new Set(jobs.map((job: any) => job.location_id).filter(Boolean))
    )
    const locationMap = new Map<string, any>()
    if (locationIds.length > 0) {
      const { data: locs } = await supabase
        .from('locations')
        .select('id,name,city,state,country,address')
        .in('id', locationIds as any)
      ;(locs || []).forEach((loc: any) => locationMap.set(String(loc.id), loc))
    }

    const result = jobs.map((job: any) => {
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

    return NextResponse.json({ jobs: result, business_name: businessName }, { status: 200 })
  } catch (err: any) {
    console.error('[API /jobs/by-business] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
