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
    const industries = searchParams.get('industries')?.split(',').filter(Boolean) || []
    const work = searchParams.get('work') || ''
    const showAll = searchParams.get('show_all') === '1'
    const intentStatus = searchParams.get('intent_status') || ''
    const intentCompatibility = searchParams.get('intent_compatibility') === '1'
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = parseFloat(searchParams.get('radius') || '5')

    let query = supabase
      .from('business_profiles')
      .select('*')
      .eq('is_active', true) // Only show active businesses

    // If show_all is false, only show businesses that match filters
    // If show_all is true AND no location is provided, ignore filters and show all businesses
    // If show_all is true BUT location is provided, still apply radius filter (user wants all businesses within radius)
    const hasLocationFilter = lat && lng
    
    if (!showAll) {
      // Apply filters when show_all is false
      if (q.trim()) {
        const searchTerm = q.trim()
        console.log('[API /map/businesses] Applying search filter:', {
          searchTerm,
          showAll,
          hasLocationFilter
        })
        // Search in both business_name and name columns using OR
        // Supabase PostgREST syntax: column.ilike.pattern (wildcards are part of the pattern string)
        query = query.or(`business_name.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
      }
      // Note: industries and work_types filters removed - columns don't exist in current schema
      // If no filters are applied and show_all is false, check for location search
      // Location search (lat, lng) is also a valid filter
      if (!q.trim() && industries.length === 0 && !work.trim() && !hasLocationFilter) {
        console.log('[API /map/businesses] No filters applied, returning empty array')
        return NextResponse.json({ businesses: [] }, { status: 200 })
      }
    } else if (!hasLocationFilter) {
      // show_all is true AND no location filter - ignore ALL filters and show all active businesses
      // This allows exploration of all businesses in Creerlio
      console.log('[API /map/businesses] show_all is true with no location, ignoring all filters')
    } else {
      // show_all is true BUT location is provided - still fetch all businesses but radius filter will be applied later
      console.log('[API /map/businesses] show_all is true with location - will apply radius filter')
    }

    const { data, error } = await query

    if (error) {
      console.error('[API /map/businesses] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log first business details for debugging
    if (data && data.length > 0) {
      const firstBiz = data[0]
      console.log('[API /map/businesses] First business from DB:', {
        id: firstBiz.id,
        business_name: firstBiz.business_name,
        name: firstBiz.name,
        hasBusinessName: !!firstBiz.business_name,
        hasName: !!firstBiz.name,
        allKeys: Object.keys(firstBiz).filter(k => k.includes('name') || k.includes('Name'))
      })
    }
    console.log('[API /map/businesses] Query result from database:', {
      showAll,
      count: data?.length || 0,
      hasLocationFilter: !!(lat && lng),
      queryParams: { q, industries, work, showAll, lat, lng, radius }
    })

    // Map businesses and geocode those without coordinates
    // IMPORTANT: When showAll is true, include ALL businesses even if geocoding fails
    let businessIndex = 0
    let businesses = await Promise.all((data || []).map(async (b: any) => {
      // Try multiple possible column names for lat/lng
      let lat = b.latitude || b.lat
      let lng = b.longitude || b.lng
      let approx = false

      // If no coordinates but has location data, try to geocode
      // Always attempt geocoding to improve data quality, but don't exclude businesses if it fails
      if ((lat == null || lng == null) && (b.location || b.city || b.state || b.country || b.address)) {
        const locationParts = [b.location, b.address, b.city, b.state, b.country].filter(Boolean)
        if (locationParts.length > 0) {
          const locationString = locationParts.join(', ')
          const geocoded = await geocodeAddress(locationString)
          if (geocoded) {
            lat = geocoded.lat
            lng = geocoded.lng
            approx = true // Mark as approximate since we geocoded it
          }
        }
      }

      // Get business name - check multiple fields and handle empty strings
      const businessName = (b.business_name && String(b.business_name).trim()) || 
                          (b.name && String(b.name).trim()) || 
                          null
      
      // Debug log for first business without name
      if (businessIndex === 0 && !businessName) {
        console.log('[API /map/businesses] First business without name:', {
          id: b.id,
          business_name: b.business_name,
          name: b.name,
          business_nameType: typeof b.business_name,
          nameType: typeof b.name,
          allKeys: Object.keys(b)
        })
      }
      businessIndex++
      
      return {
        id: b.id,
        name: businessName || 'Unnamed Business',
        slug: b.slug || `business-${b.id}`,
        industries: Array.isArray(b.industry) ? b.industry : (b.industry ? [b.industry] : []),
        work: b.work_types || [],
        lat,
        lng,
        city: b.city,
        state: b.state,
        country: b.country,
        address: b.address,
        location: b.location, // Include location text for frontend fallback
        approx,
      }
    }))

    // Filter by geographic radius if provided
    // Apply radius filter if location is provided, regardless of show_all
    // (If show_all is true but location is provided, user wants all businesses within that radius)
    if (lat && lng) {
      const centerLat = parseFloat(lat)
      const centerLng = parseFloat(lng)

      businesses = businesses.filter((b: any) => {
        // If business has coordinates, check if it's within radius
        if (b.lat != null && b.lng != null && Number.isFinite(b.lat) && Number.isFinite(b.lng)) {
          const distance = haversineDistance(centerLat, centerLng, b.lat, b.lng)
          return distance <= radius
        }
        // If business doesn't have coordinates but has location text, include it
        // This allows businesses like "Nova Solutions" in Parramatta to show up
        // even if they don't have exact lat/lng coordinates
        if (b.location || b.city || b.state || b.country || b.address) {
          return true
        }
        // Otherwise exclude businesses with no location data
        return false
      })
    } else if (!showAll) {
      // If no location filter and show_all is false, only exclude businesses with absolutely no location data
      businesses = businesses.filter((b: any) => {
        return b.lat != null || b.lng != null || b.location || b.city || b.state || b.country || b.address
      })
    }
    // If showAll is true AND no location filter, return ALL businesses regardless of coordinates
    // This ensures businesses like the one in Darwin appear even if they don't have coordinates

    // Attach intent modes (if any) and filter by intent if requested
    const businessIds = businesses.map((b: any) => b.id).filter(Boolean)
    const intentMap = new Map<string, { intent_status: string; visibility: boolean }>()

    if (businessIds.length > 0) {
      const { data: intents } = await supabase
        .from('intent_modes')
        .select('profile_id,intent_status,visibility')
        .eq('profile_type', 'business')
        .in('profile_id', businessIds)

      if (Array.isArray(intents)) {
        intents.forEach((row: any) => {
          if (row?.profile_id) {
            intentMap.set(String(row.profile_id), {
              intent_status: row.intent_status,
              visibility: !!row.visibility,
            })
          }
        })
      }
    }

    businesses = businesses.map((b: any) => {
      const intent = intentMap.get(String(b.id))
      return {
        ...b,
        intent_status: intent?.intent_status ?? null,
        intent_visibility: intent?.visibility ?? false,
      }
    })

    if (intentStatus) {
      businesses = businesses.filter((b: any) => b.intent_visibility && b.intent_status === intentStatus)
    } else if (intentCompatibility) {
      const compatible = new Set(['actively_building_talent', 'future_planning'])
      businesses = businesses.filter((b: any) => b.intent_visibility && compatible.has(b.intent_status))
    }

    console.log('[API /map/businesses] Returning businesses:', {
      total: businesses.length,
      withCoordinates: businesses.filter((b: any) => b.lat != null && b.lng != null).length,
      withoutCoordinates: businesses.filter((b: any) => b.lat == null || b.lng == null).length,
      showAll,
      hasLocationFilter: !!(lat && lng),
      // Log a few business IDs for debugging
      sampleIds: businesses.slice(0, 5).map((b: any) => ({ id: b.id, name: b.name, hasCoords: !!(b.lat && b.lng) }))
    })

    return NextResponse.json({ businesses }, { status: 200 })
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
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
