export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// Mirror the about page's proven query approach using the anon client.
// Anon client + RLS is what the public profile page uses — and it works.
function supabaseAnon() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, anon, { auth: { persistSession: false } })
}

export async function GET(request: NextRequest) {
  try {
    const supabase    = supabaseServiceServer()
    const supabaseAno = supabaseAnon()
    const businessId  = request.nextUrl.searchParams.get('business_id')

    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }

    // ── Step 1: Resolve profile (name + extra UUIDs) ─────────────────────────
    const { data: bpRow, error: bpErr } = await supabase
      .from('business_profiles')
      .select('id, user_id, business_id, name, business_name')
      .eq('id', businessId)
      .maybeSingle()
    if (bpErr) console.error('[by-business] profile lookup error:', bpErr.message)

    const idSet = new Set<string>([businessId])
    if (bpRow?.user_id)    idSet.add(String(bpRow.user_id))
    if (bpRow?.business_id) idSet.add(String(bpRow.business_id))
    const ids = Array.from(idSet).filter(Boolean)

    const businessName =
      (bpRow?.business_name && String(bpRow.business_name).trim()) ||
      (bpRow?.name           && String(bpRow.name).trim())           ||
      'Business'

    console.log('[by-business] businessId:', businessId, '| ids:', ids, '| name:', businessName)

    // ── Step 2: Use the exact same query chain as the public about page ───────
    // The about page (anon key, published filter) is proven to show all jobs.
    // We run the same three-fallback pattern here.
    const JOB_COLS = 'id,title,description,employment_type,location,city,state,country,status,is_active,created_at'
    let jobs: any[] | null = null

    // 2a. by business_id (UUID column, added for seeded/AI profiles)
    for (const id of ids) {
      if (jobs && jobs.length > 0) break
      const { data, error } = await supabaseAno
        .from('jobs')
        .select(JOB_COLS)
        .eq('business_id', id)
        .eq('status', 'published')
      if (error) console.warn('[by-business] business_id eq error:', error.message)
      else if (Array.isArray(data) && data.length > 0) {
        jobs = data
        console.log('[by-business] Found', data.length, 'jobs via business_id =', id)
      }
    }

    // 2b. by business_profile_id (legacy / seeded numeric or UUID)
    if (!jobs || jobs.length === 0) {
      for (const id of ids) {
        if (jobs && jobs.length > 0) break
        const { data, error } = await supabaseAno
          .from('jobs')
          .select(JOB_COLS)
          .eq('business_profile_id', id)
          .eq('status', 'published')
        if (error) console.warn('[by-business] business_profile_id eq error:', error.message)
        else if (Array.isArray(data) && data.length > 0) {
          jobs = data
          console.log('[by-business] Found', data.length, 'jobs via business_profile_id =', id)
        }
      }
    }

    // 2c. Try location-scoped jobs (new location hierarchy model)
    if (!jobs || jobs.length === 0) {
      const { data: locRows } = await supabase
        .from('locations')
        .select('id')
        .in('business_id', ids)
      if (Array.isArray(locRows) && locRows.length > 0) {
        const locIds = locRows.map((l: any) => l.id)
        const { data, error } = await supabaseAno
          .from('jobs')
          .select(JOB_COLS)
          .in('location_id', locIds)
          .eq('status', 'published')
        if (error) console.warn('[by-business] location_id query error:', error.message)
        else if (Array.isArray(data) && data.length > 0) {
          jobs = data
          console.log('[by-business] Found', data.length, 'jobs via location_id')
        }
      }
    }

    // 2d. Service-role fallback — no status filter, catches drafts or schema variants
    if (!jobs || jobs.length === 0) {
      for (const id of ids) {
        if (jobs && jobs.length > 0) break
        const { data, error } = await supabase
          .from('jobs')
          .select(JOB_COLS)
          .eq('business_id', id)
        if (error) console.warn('[by-business] service business_id error:', error.message)
        else if (Array.isArray(data) && data.length > 0) {
          jobs = data
          console.log('[by-business] Found', data.length, 'jobs via service-role business_id =', id)
        }
      }
    }
    if (!jobs || jobs.length === 0) {
      for (const id of ids) {
        if (jobs && jobs.length > 0) break
        const { data, error } = await supabase
          .from('jobs')
          .select(JOB_COLS)
          .eq('business_profile_id', id)
        if (error) console.warn('[by-business] service business_profile_id error:', error.message)
        else if (Array.isArray(data) && data.length > 0) {
          jobs = data
          console.log('[by-business] Found', data.length, 'jobs via service-role business_profile_id =', id)
        }
      }
    }

    jobs = jobs || []
    console.log('[by-business] Returning', jobs.length, 'jobs for business', businessId)

    const result = jobs.map((job: any) => {
      const locationLabel =
        job.location ||
        [job.city, job.state, job.country].filter(Boolean).join(', ') ||
        null
      return {
        id: job.id,
        title: job.title,
        description: job.description,
        employment_type: job.employment_type,
        status: job.status,
        location: job.location || null,
        city: job.city || null,
        state: job.state || null,
        country: job.country || null,
        location_label: locationLabel,
        business_name: businessName,
      }
    })

    return NextResponse.json({ jobs: result, business_name: businessName }, { status: 200 })
  } catch (err: any) {
    console.error('[by-business] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
