export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// Geocode address to coordinates using Mapbox Geocoding API
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!MAPBOX_TOKEN) return null

    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    const response = await fetch(geocodeUrl)
    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      return { lat, lng }
    }
  } catch (error) {
    console.error('Geocoding error:', error)
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServiceServer()
    const searchParams = request.nextUrl.searchParams

    const q = searchParams.get('q') || ''
    const showAll = searchParams.get('show_all') === '1'
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = parseFloat(searchParams.get('radius') || '5')

    console.log('[API /map/jobs] Request params:', { q, showAll, lat, lng, radius })

    // Test if jobs table is accessible and get total count
    const testQuery = await supabase.from('jobs').select('id', { count: 'exact', head: true })
    if (testQuery.error) {
      const testError = {
        message: testQuery.error.message,
        code: testQuery.error.code,
        details: testQuery.error.details,
        hint: testQuery.error.hint
      }
      console.error('[API /map/jobs] Table access test failed:', testError)
      return NextResponse.json({
        error: 'Cannot access jobs table',
        ...testError
      }, { status: 500 })
    }
    console.log('[API /map/jobs] Table access test passed, total jobs:', testQuery.count || 0)

    // DIAGNOSTIC: count all jobs + count published ones (safe columns only)
    const diagAll   = await supabase.from('jobs').select('id,status,business_id,business_profile_id,city,state,country', { count: 'exact' }).limit(200)
    const diagPub   = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'published')
    console.log('[API /map/jobs] DIAGNOSTIC jobs in DB:', {
      all: diagAll.count ?? diagAll.data?.length ?? 0,
      allErr: diagAll.error?.message,
      published: diagPub.count ?? 0,
      pubErr: diagPub.error?.message,
      sample: diagAll.data?.slice(0, 5).map((j: any) => ({
        id: String(j.id).substring(0, 8),
        status: j.status,
        biz_id: j.business_id ? String(j.business_id).substring(0, 8) : null,
        city: j.city, state: j.state, country: j.country
      }))
    })

    // Fetch published jobs — service role bypasses RLS so no is_active filter needed.
    // Keep the SELECT minimal (no latitude/longitude) to avoid column-not-found errors.
    let query = supabase
      .from('jobs')
      .select('id,title,description,location,city,state,country,employment_type,status,business_profile_id,business_id')
      .eq('status', 'published')
      .limit(500)

    // If show_all is false, only show jobs that match filters
    if (!showAll) {
      if (q.trim()) {
        const searchTerm = q.trim()
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }
      
      const hasLocationSearch = lat && lng
      if (!q.trim() && !hasLocationSearch) {
        return NextResponse.json({ jobs: [] }, { status: 200 })
      }
    }

    let { data, error } = await query

    console.log('[API /map/jobs] Jobs fetched:', {
      count: data?.length || 0,
      error: error?.message,
      showAll,
      sample: (data || []).slice(0, 5).map((j: any) => ({
        id: String(j.id).substring(0, 8),
        title: j.title,
        status: j.status,
        city: j.city,
        biz_id: j.business_id ? String(j.business_id).substring(0, 8) : null
      }))
    })

    if (error) {
      console.error('[API /map/jobs] Jobs query error:', error.message, error.code)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch business profiles separately to avoid join issues.
    // Collect every UUID variant (business_profile_id, business_id) so we can find
    // the business profile even when the generator stored a different UUID in each column.
    const rawIds = new Set<string>()
    if (data && Array.isArray(data)) {
      data.forEach((job: any) => {
        if (job.business_profile_id) rawIds.add(String(job.business_profile_id))
        if (job.business_id) rawIds.add(String(job.business_id))
      })
    }

    console.log('[API /map/jobs] Business IDs to fetch:', Array.from(rawIds))

    // businessMap key → canonical profile data
    // We also build a reverse map: any UUID that belongs to a profile → profile id
    const businessMap = new Map<string, {
      name?: string
      business_name?: string
    }>()

    if (rawIds.size > 0) {
      const idList = Array.from(rawIds)
      // Safe select — only columns guaranteed to exist in business_profiles.
      // lat/lng/location/city/state/country are omitted because column names
      // vary between environments (some use latitude/longitude, some lat/lng).
      // A column-not-found error silently returns null data, emptying businessMap.
      const BP_SAFE = 'id, user_id, name, business_name'

      // Always-safe queries: by primary key and by user_id
      const [byId, byUserId] = await Promise.all([
        supabase.from('business_profiles').select(BP_SAFE).in('id', idList),
        supabase.from('business_profiles').select(BP_SAFE).in('user_id', idList),
      ])

      // Optional query: by business_id column (may not exist — ignore error)
      const byBizId = await supabase
        .from('business_profiles')
        .select(BP_SAFE + ', business_id')
        .in('business_id', idList)

      // Deduplicate by profile id before registering
      const seen = new Set<string>()
      const allBizRows = [
        ...(byId.data || []),
        ...(byUserId.data || []),
        ...(byBizId.error ? [] : (byBizId.data || [])),
      ]
      const businesses = allBizRows.filter((b: any) => {
        const key = String(b.id)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      console.log('[API /map/jobs] Business profiles fetched:', businesses.length, {
        byId: byId.data?.length || 0,
        byUserId: byUserId.data?.length || 0,
        byBizId: byBizId.error ? `err:${byBizId.error.message}` : (byBizId.data?.length || 0),
        byIdErr: byId.error?.message,
        byUserIdErr: byUserId.error?.message,
      })

      businesses.forEach((biz: any) => {
        const profile = {
          name: biz.name,
          business_name: biz.business_name,
        }
        // Register under every ID variant so job lookups always hit
        if (biz.id) businessMap.set(String(biz.id), profile)
        if (biz.user_id) businessMap.set(String(biz.user_id), profile)
        if (biz.business_id) businessMap.set(String(biz.business_id), profile)
      })
    }

    // Orphan filter: only used when NOT in show_all mode (e.g. radius search).
    // In show_all mode every published job should appear regardless of whether
    // its business profile resolved in businessMap.
    const filteredData = (data || []).filter((job: any) => {
      if (showAll) return true          // never drop jobs in show-all mode
      if (businessMap.size === 0) return true  // map empty → can't filter, pass all
      const byBpId = job.business_profile_id && businessMap.has(String(job.business_profile_id))
      const byBizId = job.business_id && businessMap.has(String(job.business_id))
      return byBpId || byBizId
    })

    // Map jobs and geocode those without coordinates
    let jobs = await Promise.all(filteredData.map(async (job: any) => {
      // Get business info — try business_profile_id first, fall back to business_id
      const business = (job.business_profile_id && businessMap.get(String(job.business_profile_id)))
                    || (job.business_id && businessMap.get(String(job.business_id)))
                    || {}
      const businessName = (business.business_name && String(business.business_name).trim()) ||
                          (business.name && String(business.name).trim()) ||
                          'Unknown Company'

      // Geocode from job location text (no lat/lng columns selected)
      let lat: number | null = null
      let lng: number | null = null
      let approx = false

      if (job.location || job.city || job.state || job.country) {
        const locationParts = [job.location, job.city, job.state, job.country].filter(Boolean)
        if (locationParts.length > 0) {
          const locationString = locationParts.join(', ')
          const geocoded = await geocodeAddress(locationString)
          if (geocoded) {
            lat = geocoded.lat
            lng = geocoded.lng
            approx = true
          }
        }
      }

      // (Business profile coords not available in businessMap — geocoded from job location above)

      // If still no coordinates and we have a search center (for show_all mode), use search center as fallback
      if ((lat == null || lng == null) && showAll && searchParams.get('lat') && searchParams.get('lng')) {
        const searchLat = parseFloat(searchParams.get('lat') || '')
        const searchLng = parseFloat(searchParams.get('lng') || '')
        if (Number.isFinite(searchLat) && Number.isFinite(searchLng)) {
          lat = searchLat
          lng = searchLng
          approx = true
        }
      }

      return {
        id: job.id,
        title: job.title,
        description: job.description,
        business_profile_id: job.business_profile_id || job.business_id,
        business_id: job.business_id,
        business_name: businessName,
        lat,
        lng,
        city: job.city || null,
        state: job.state || null,
        country: job.country || null,
        location: job.location || null,
        address: job.address || null,
        employment_type: job.employment_type || null,
        approx,
      }
    }))

    // Filter by geographic radius ONLY if showAll is false
    // When showAll is true, return ALL jobs regardless of location
    if (!showAll && lat && lng) {
      const centerLat = parseFloat(lat)
      const centerLng = parseFloat(lng)

      jobs = jobs.filter((job: any) => {
        // If job has coordinates, check if it's within radius
        if (job.lat != null && job.lng != null && Number.isFinite(job.lat) && Number.isFinite(job.lng)) {
          const distance = haversineDistance(centerLat, centerLng, job.lat, job.lng)
          return distance <= radius
        }
        // If job doesn't have coordinates but has location text, include it (for jobs that can be geocoded)
        if (job.location || job.city || job.country) {
          return true
        }
        return false
      })
    } else if (!showAll && !lat && !lng) {
      // If no location filter and show_all is false, only exclude jobs with absolutely no location data
      jobs = jobs.filter((job: any) => {
        return job.lat != null || job.lng != null || job.location || job.city || job.country
      })
    }
    // When showAll is true, don't filter - return all jobs

    console.log('[API /map/jobs] Returning jobs:', {
      total: jobs.length,
      withCoordinates: jobs.filter((j: any) => j.lat != null && j.lng != null).length,
      withoutCoordinates: jobs.filter((j: any) => j.lat == null || j.lng == null).length,
      showAll,
      hasLocationFilter: !!(lat && lng),
      sampleJobs: jobs.slice(0, 3).map((j: any) => ({
        id: j.id,
        title: j.title,
        business_name: j.business_name,
        lat: j.lat,
        lng: j.lng,
        hasCoords: !!(j.lat && j.lng)
      }))
    })

    // Include diagnostic data in response for debugging
    const debug = searchParams.get('debug') === '1'
    if (debug) {
      const recentJobs = allJobsDiag.data || []
      const recentBusinessIds = Array.from(
        new Set(
          recentJobs
            .map((j: any) => j.business_profile_id)
            .filter((id: any) => id != null)
        )
      )

      // Check which business profiles are visible (active) via RLS
      const businessCheck = recentBusinessIds.length
        ? await supabase
            .from('business_profiles')
            .select('id,is_active')
            .in('id', recentBusinessIds)
        : { data: [], error: null }

      const visibleBusinessIds = new Set<string>(
        (businessCheck.data || []).map((b: any) => String(b.id))
      )
      const missingBusinessIds = recentBusinessIds.filter(
        (id: any) => !visibleBusinessIds.has(String(id))
      )
      const jobsWithMissingBusiness = recentJobs
        .filter((j: any) => missingBusinessIds.includes(j.business_profile_id))
        .map((j: any) => ({
          id: j.id,
          title: j.title,
          status: j.status,
          business_profile_id: j.business_profile_id
        }))

      return NextResponse.json({
        jobs,
        _debug: {
          totalJobsInDB: testQuery.count,
          allRecentJobs: allJobsDiag.data?.map((j: any) => ({
            id: j.id,
            title: j.title,
            status: j.status,
            business_profile_id: j.business_profile_id,
            city: j.city,
            state: j.state,
            hasLatLng: !!(j.latitude && j.longitude)
          })),
          publishedJobsCount: data?.length || 0,
          publishedJobs: data?.map((j: any) => ({
            id: j.id,
            title: j.title,
            status: j.status,
            business_profile_id: j.business_profile_id,
            city: j.city,
            state: j.state
          })),
          returnedJobsCount: jobs.length,
          businessProfilesVisible: businessCheck.data?.map((b: any) => ({
            id: b.id,
            is_active: b.is_active
          })),
          businessProfilesMissing: missingBusinessIds,
          jobsWithMissingBusinessProfiles: jobsWithMissingBusiness,
          businessProfilesCheckError: businessCheck.error?.message || null
        }
      }, { status: 200 })
    }

    return NextResponse.json({ jobs }, { status: 200 })
  } catch (err: any) {
    console.error('[API /map/jobs] Unexpected error:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    })
    return NextResponse.json({ 
      error: err.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 })
  }
}

// Haversine formula to calculate distance between two lat/lng points in km
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
