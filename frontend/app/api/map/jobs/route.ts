export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const supabase = await createClient()
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

    // Fetch jobs - need latitude/longitude for map markers
    // Match the exact select string format (no spaces after commas)
    // NOTE: RLS policy only allows reading published+active jobs, so we always filter by status
    // "show_all" means "show all published jobs" not "show all jobs regardless of status"
    let query = supabase
      .from('jobs')
      .select('id,title,description,location,city,state,country,employment_type,status,business_profile_id,latitude,longitude')
      .eq('status', 'published') // RLS requires this

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
    
    // If error is about undefined column (likely latitude/longitude), try without them
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      console.log('[API /map/jobs] Column error detected (likely latitude/longitude), trying without them:', error.message)
      query = supabase
        .from('jobs')
        .select('id,title,description,location,city,state,country,employment_type,status,business_profile_id')
        .eq('status', 'published')
      
      if (!showAll && q.trim()) {
        const searchTerm = q.trim()
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }
      
      const retryResult = await query
      data = retryResult.data
      error = retryResult.error
    }

    if (error) {
      const errorDetails = {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2)
      }
      console.error('[API /map/jobs] Database error:', errorDetails)
      console.error('[API /map/jobs] Full error object:', error)
      console.error('[API /map/jobs] Query that failed:', { showAll, hasStatusFilter: !showAll })
      
      // Return detailed error to help debug
      return NextResponse.json({ 
        error: 'Database query failed',
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        queryInfo: {
          showAll,
          columns: 'id,title,description,location,city,country,employment_type,status,business_profile_id'
        }
      }, { status: 500 })
    }

    console.log('[API /map/jobs] Jobs fetched:', {
      count: data?.length || 0,
      showAll,
      sample: data?.[0] ? {
        id: data[0].id,
        title: data[0].title,
        hasStatus: 'status' in (data[0] || {}),
        status: data[0]?.status
      } : null
    })

    // Fetch business profiles separately to avoid join issues
    const businessIds = new Set<string>()
    if (data && Array.isArray(data)) {
      data.forEach((job: any) => {
        if (job.business_profile_id) {
          businessIds.add(String(job.business_profile_id))
        }
      })
    }

    console.log('[API /map/jobs] Business IDs to fetch:', Array.from(businessIds))

    const businessMap = new Map<string, { name?: string; business_name?: string }>()
    if (businessIds.size > 0) {
      const { data: businesses, error: bizError } = await supabase
        .from('business_profiles')
        .select('id, name, business_name')
        .in('id', Array.from(businessIds))
      
      if (bizError) {
        console.error('[API /map/jobs] Business profiles fetch error:', {
          message: bizError.message,
          code: bizError.code,
          details: bizError.details
        })
      } else if (businesses) {
        console.log('[API /map/jobs] Business profiles fetched:', businesses.length)
        businesses.forEach((biz: any) => {
          businessMap.set(String(biz.id), {
            name: biz.name,
            business_name: biz.business_name
          })
        })
      }
    }

    // Map jobs and geocode those without coordinates
    let jobs = await Promise.all((data || []).map(async (job: any) => {
      // Get business name from separate query
      const business = businessMap.get(String(job.business_profile_id)) || {}
      const businessName = (business.business_name && String(business.business_name).trim()) || 
                          (business.name && String(business.name).trim()) || 
                          'Unknown Company'

      // Get coordinates from database columns
      let lat = job.latitude ?? null
      let lng = job.longitude ?? null
      let approx = false

      // If no coordinates but has location data, try to geocode
      if ((lat == null || lng == null) && (job.location || job.city || job.state || job.country)) {
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
        business_profile_id: job.business_profile_id,
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
