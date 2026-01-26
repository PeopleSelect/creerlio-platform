'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SearchMap from '@/components/SearchMap'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Job {
  id: string | number
  title: string
  description: string | null
  location: string | null
  city: string | null
  state: string | null
  country: string | null
  status: string
  created_at: string
}

interface Talent {
  id: string | number
  name: string
  title: string | null
  bio: string | null
  skills: string[] | null
  location: string | null
  latitude?: number | null
  longitude?: number | null
}

interface Business {
  id: string
  name: string
  tagline?: string | null
  mission?: string | null
  slug?: string | null
  location?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface MapMarker {
  id: string | number
  lat: number
  lng: number
  title: string
  description?: string
  type: 'talent' | 'business' | 'job'
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  )
}

function SearchPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const isEmbedded = params?.get('embedded') === '1'
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userType, setUserType] = useState<string | null>(null)
  const [activeRole, setActiveRole] = useState<'talent' | 'business' | null>(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'jobs' | 'talent' | 'business'>('jobs')
  const [location, setLocation] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ place_name: string; center: [number, number] }>>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    jobs?: Job[]
    talent?: Talent[]
    businesses?: Business[]
  }>({})
  // Store business data for marker navigation (id -> slug mapping)
  const [businessMap, setBusinessMap] = useState<Map<string, Business>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([])
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isMapExpanded, setIsMapExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    
    // Check Supabase session (source of truth)
    supabase.auth.getSession().then(async (res: any) => {
      const data = res?.data
      const uid = data.session?.user?.id ?? null
      const email = data.session?.user?.email ?? null
      
      if (!uid) {
        // Not authenticated
        if (!cancelled) {
          setIsAuthenticated(false)
          setIsAdmin(false)
          setUserType(null)
          setActiveRole(null)
        }
        return
      }

      if (!cancelled) {
        setIsAuthenticated(true)
      }

      const { data: { user: freshUser } } = await supabase.auth.getUser()
      const meta = (freshUser || data.session?.user)?.user_metadata || {}
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
      const emailLower = (freshUser?.email || email || '').toLowerCase()
      const hasAdminFlag = meta.is_admin === true || meta.admin === true
      if (!cancelled) {
        setIsAdmin(hasAdminFlag || (!!emailLower && adminEmails.includes(emailLower)))
      }

      // CRITICAL: Determine actual user type by checking which profile exists
      // This prevents showing wrong dashboard buttons
      const [talentCheck, businessCheck] = await Promise.all([
        supabase.from('talent_profiles').select('id').eq('user_id', uid).maybeSingle(),
        supabase.from('business_profiles').select('id').eq('user_id', uid).maybeSingle()
      ])

      const hasTalentProfile = !!talentCheck.data && !talentCheck.error
      const hasBusinessProfile = !!businessCheck.data && !businessCheck.error

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/app/search/page.tsx:mount:profile_check',message:'Checking actual user profiles to determine type',data:{hasTalentProfile,hasBusinessProfile,talentError:talentCheck.error?.code,businessError:businessCheck.error?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'search-auth',hypothesisId:'S1'})}).catch(()=>{});
      // #endregion

      if (!cancelled) {
        // Set user type based on actual profiles (prioritize talent if both exist for now)
        if (hasTalentProfile && !hasBusinessProfile) {
          setUserType('talent')
          setActiveRole('talent')
          try {
            localStorage.setItem('user_type', 'talent')
            localStorage.setItem('creerlio_active_role', 'talent')
          } catch {}
        } else if (hasBusinessProfile && !hasTalentProfile) {
          setUserType('business')
          setActiveRole('business')
          try {
            localStorage.setItem('user_type', 'business')
            localStorage.setItem('creerlio_active_role', 'business')
          } catch {}
        } else if (hasTalentProfile && hasBusinessProfile) {
          // User has both - use activeRole from localStorage or default to talent
          const storedActiveRole = localStorage.getItem('creerlio_active_role')
          if (storedActiveRole === 'business') {
            setUserType('business')
            setActiveRole('business')
          } else {
            setUserType('talent')
            setActiveRole('talent')
            try {
              localStorage.setItem('creerlio_active_role', 'talent')
            } catch {}
          }
        } else {
          // No profiles found - not fully set up
          setUserType(null)
          setActiveRole(null)
        }
      }

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/app/search/page.tsx:mount:auth_set',message:'Search auth set from Supabase',data:{hasSession:!!data.session?.user?.id,hasEmail:!!email,determinedUserType:hasTalentProfile&&!hasBusinessProfile?'talent':hasBusinessProfile&&!hasTalentProfile?'business':hasTalentProfile&&hasBusinessProfile?'both':null},timestamp:Date.now(),sessionId:'debug-session',runId:'search-auth',hypothesisId:'S2'})}).catch(()=>{});
      // #endregion
    }).catch(() => {
      if (!cancelled) {
        setIsAuthenticated(false)
        setUserType(null)
        setActiveRole(null)
      }
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/app/search/page.tsx:mount',message:'Search Supabase session check failed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'search-auth',hypothesisId:'S2'})}).catch(()=>{});
      // #endregion
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const from = params?.get('from') || null
    const context = params?.get('context') || null
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'search-auth',hypothesisId:'S4',location:'frontend/app/search/page.tsx:params',message:'Search page context params',data:{from,context,path:typeof window!=='undefined'?window.location.pathname+window.location.search:null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isEmbedded) return

    const handleEmbeddedLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return

      event.preventDefault()
      window.top?.location?.assign(href)
    }

    document.addEventListener('click', handleEmbeddedLinkClick, true)
    return () => document.removeEventListener('click', handleEmbeddedLinkClick, true)
  }, [isEmbedded])

  const allowTalentSearch = isAuthenticated && userType === 'business' && activeRole !== 'talent'
  const isPublicTalentAudience = !isAuthenticated || userType !== 'business' || activeRole === 'talent'

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'search-auth',hypothesisId:'S3',location:'frontend/app/search/page.tsx:computed',message:'Search computed auth/cta',data:{isAuthenticated,userType,activeRole,showSignInCTA:!isAuthenticated,allowTalentSearch,isPublicTalentAudience},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [isAuthenticated, userType, activeRole, allowTalentSearch, isPublicTalentAudience])

  useEffect(() => {
    // If Talent search is not allowed in this context, ensure we aren't stuck on that tab.
    if (!allowTalentSearch && searchType === 'talent') {
      setSearchType('jobs')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowTalentSearch])

  // Geocode location string to coordinates using Mapbox Geocoding API
  const geocodeLocation = async (location: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiY3JlZXJsaW8iLCJhIjoiY21pY3IxZHljMXFwNTJzb2FydzR4b3F1YSJ9.Is8-GyfEdqwKKEo2cGO65g'
      const u = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json`)
      u.searchParams.set('access_token', MAPBOX_TOKEN)
      u.searchParams.set('limit', '1')

      const res = await fetch(u.toString())
      if (!res.ok) return null
      const data: any = await res.json().catch(() => null)

      if (data?.features && data.features.length > 0) {
        const center = data.features[0]?.center
        const lng = Array.isArray(center) ? center[0] : null
        const lat = Array.isArray(center) ? center[1] : null
        if (typeof lng === 'number' && typeof lat === 'number') return { lat, lng }
      }
      return null
    } catch (err) {
      console.error('Geocoding error:', err)
      return null
    }
  }

  // Fetch location suggestions from Mapbox Geocoding API
  const fetchLocationSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setLocationSuggestions([])
      setShowLocationSuggestions(false)
      return
    }

    setIsLoadingSuggestions(true)
    try {
      const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiY3JlZXJsaW8iLCJhIjoiY21pY3IxZHljMXFwNTJzb2FydzR4b3F1YSJ9.Is8-GyfEdqwKKEo2cGO65g'
      const u = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`)
      u.searchParams.set('access_token', MAPBOX_TOKEN)
      u.searchParams.set('limit', '5')
      u.searchParams.set('types', 'place,locality,neighborhood,address')

      const res = await fetch(u.toString())
      if (!res.ok) {
        setLocationSuggestions([])
        return
      }
      const data: any = await res.json().catch(() => null)

      if (data?.features && data.features.length > 0) {
        const suggestions = data.features.map((feature: any) => ({
          place_name: feature.place_name || '',
          center: feature.center || [0, 0]
        }))
        setLocationSuggestions(suggestions)
        setShowLocationSuggestions(true)
      } else {
        setLocationSuggestions([])
        setShowLocationSuggestions(false)
      }
    } catch (err) {
      console.error('Location suggestions error:', err)
      setLocationSuggestions([])
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  // Debounce location suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (location) {
        fetchLocationSuggestions(location)
      } else {
        setLocationSuggestions([])
        setShowLocationSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [location])

  // Process search results and create map markers
  useEffect(() => {
    const processMarkers = async () => {
      if (Object.keys(searchResults).length === 0) {
        setMapMarkers([])
        return
      }
      if (searchType === 'talent' && !allowTalentSearch) {
        setMapMarkers([])
        return
      }

      setIsGeocoding(true)
      const markers: MapMarker[] = []

      // Process Jobs results
      if (searchType === 'jobs' && searchResults.jobs && searchResults.jobs.length > 0) {
        for (const job of searchResults.jobs) {
          let lat: number | null = null
          let lng: number | null = null

          // Build location string from available fields
          const locationStr = [job.location, job.city, job.state, job.country].filter(Boolean).join(', ')
          
          if (locationStr) {
            // Geocode location string
            const coords = await geocodeLocation(locationStr)
            if (coords) {
              lat = coords.lat
              lng = coords.lng
            }
          }

          if (lat !== null && lng !== null) {
            markers.push({
              id: job.id,
              lat,
              lng,
              title: job.title,
              description: job.location || undefined,
              type: 'job'
            })
          }
        }
      }

      // Process Talent results
      if (searchType === 'talent' && searchResults.talent && searchResults.talent.length > 0) {
        for (const talent of searchResults.talent) {
          let lat: number | null = null
          let lng: number | null = null

          // Use existing coordinates if available
          if (talent.latitude && talent.longitude) {
            lat = talent.latitude
            lng = talent.longitude
          } else if (talent.location) {
            // Geocode location string
            const coords = await geocodeLocation(talent.location)
            if (coords) {
              lat = coords.lat
              lng = coords.lng
            }
          }

          if (lat !== null && lng !== null) {
            markers.push({
              id: talent.id,
              lat,
              lng,
              title: talent.name,
              description: talent.title || undefined,
              type: 'talent'
            })
          }
        }
      }

      // Process Business results - show businesses on map whenever they're in results
      if (searchResults.businesses && searchResults.businesses.length > 0) {
        console.log('[SearchMap] Processing businesses for markers:', {
          count: searchResults.businesses.length,
          searchType,
          businesses: searchResults.businesses.map(b => ({ id: b.id, name: b.name, hasLat: !!b.latitude, hasLng: !!b.longitude, location: b.location, city: b.city }))
        })
        
        for (const business of searchResults.businesses) {
          let lat: number | null = null
          let lng: number | null = null

          // Use existing coordinates if available
          if (business.latitude && business.longitude) {
            lat = business.latitude
            lng = business.longitude
            console.log('[SearchMap] Using existing coordinates for business:', business.name, { lat, lng })
          } else {
            // Try to fetch location data from business_profiles if missing
            if (business.id && (!business.latitude || !business.longitude)) {
              try {
                const businessId = typeof business.id === 'string' ? parseInt(business.id, 10) : business.id
                // businessId might be UUID string or number, handle both
                const businessIdStr = typeof businessId === 'string' ? businessId : String(businessId)
                if (businessIdStr) {
                  console.log('[SearchMap] Fetching missing location data for business:', business.name, businessIdStr)
                  const { data: profileData, error: profileError } = await supabase
                    .from('business_profiles')
                    .select('*')
                    .eq('id', businessIdStr)
                    .maybeSingle()

                  if (!profileError && profileData) {
                    // Handle both latitude/longitude and lat/lng column names
                    const profileLat = profileData.latitude ?? profileData.lat ?? null
                    const profileLng = profileData.longitude ?? profileData.lng ?? null
                    
                    if (profileLat && profileLng) {
                      lat = profileLat
                      lng = profileLng
                      console.log('[SearchMap] Fetched coordinates from database:', business.name, { lat, lng })
                    } else if (profileData.location) {
                      business.location = profileData.location
                    } else if (profileData.city || profileData.state || profileData.country) {
                      business.city = profileData.city
                      business.state = profileData.state
                      business.country = profileData.country
                    }
                  } else if (profileError) {
                    console.warn('[SearchMap] Error fetching profile data:', profileError)
                  }
                }
              } catch (err) {
                console.warn('[SearchMap] Exception fetching profile data:', err)
              }
            }

            // If still no coordinates, try geocoding
            if (!lat || !lng) {
              if (business.location) {
                // Geocode location string
                console.log('[SearchMap] Geocoding location for business:', business.name, business.location)
                const coords = await geocodeLocation(business.location)
                if (coords) {
                  lat = coords.lat
                  lng = coords.lng
                  console.log('[SearchMap] Geocoded coordinates:', { lat, lng })
                }
              } else if (business.city || business.state || business.country) {
                // Build location string from city/state/country
                const locationParts = [business.city, business.state, business.country].filter(Boolean)
                if (locationParts.length > 0) {
                  const locationStr = locationParts.join(', ')
                  console.log('[SearchMap] Geocoding city/state/country for business:', business.name, locationStr)
                  const coords = await geocodeLocation(locationStr)
                  if (coords) {
                    lat = coords.lat
                    lng = coords.lng
                    console.log('[SearchMap] Geocoded coordinates from city/state/country:', { lat, lng })
                  }
                }
              }
            }
          }

          if (lat !== null && lng !== null) {
            console.log('[SearchMap] Adding business marker:', business.name, { lat, lng })
            markers.push({
              id: business.id,
              lat,
              lng,
              title: business.name,
              description: business.tagline || business.mission || undefined,
              type: 'business'
            })
          } else {
            console.warn('[SearchMap] Could not get coordinates for business:', business.name, {
              hasLat: !!business.latitude,
              hasLng: !!business.longitude,
              location: business.location,
              city: business.city,
              state: business.state,
              country: business.country
            })
          }
        }
      }

      console.log('[SearchMap] Final markers:', {
        total: markers.length,
        byType: {
          jobs: markers.filter(m => m.type === 'job').length,
          businesses: markers.filter(m => m.type === 'business').length,
          talent: markers.filter(m => m.type === 'talent').length
        },
        markers: markers.map(m => ({ id: m.id, type: m.type, title: m.title, lat: m.lat, lng: m.lng }))
      })
      
      setMapMarkers(markers)
      setIsGeocoding(false)
    }

    processMarkers()
  }, [searchResults, searchType, allowTalentSearch])

  // Handle marker click - navigate to job or business page
  const handleMarkerClick = (markerId: string | number) => {
    // Find the marker to determine its type
    const marker = mapMarkers.find(m => m.id === markerId)
    if (!marker) return

    if (marker.type === 'job') {
      // Navigate to job detail page with search parameters to allow returning
      const searchParams = new URLSearchParams()
      searchParams.set('fromSearch', 'true')
      if (searchQuery) searchParams.set('searchQuery', searchQuery)
      if (location) searchParams.set('location', location)
      if (searchType) searchParams.set('searchType', searchType)
      router.push(`/jobs/${markerId}?${searchParams.toString()}`)
    } else if (marker.type === 'business') {
      // Navigate to public business profile page
      const business = businessMap.get(String(markerId))
      if (business?.id) {
        router.push(`/dashboard/business/view?id=${encodeURIComponent(String(business.id))}`)
      } else if (business?.slug) {
        router.push(`/dashboard/business/view?slug=${encodeURIComponent(business.slug)}`)
      } else {
        router.push(`/dashboard/business/view?id=${markerId}`)
      }
    }
    // Talent markers handled elsewhere if needed
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    setError(null)
    setSearchResults({})

    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/page.tsx:58',message:'Starting search',data:{searchType,query:searchQuery,location},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (searchType === 'jobs') {
        const q = (searchQuery || '').trim()
        const loc = (location || '').trim()

        // Jobs are stored in Supabase (if table exists). If it's not configured yet, show a calm message.
        let qb: any = supabase
          .from('jobs')
          .select('id,title,description,location,city,state,country,status,created_at,business_profile_id')
          .limit(100)
        
        // Build OR conditions - combine keyword and location into one OR clause
        const allConditions: string[] = []
        if (q) {
          allConditions.push(`title.ilike.%${q}%`)
          allConditions.push(`description.ilike.%${q}%`)
        }
        if (loc) {
          allConditions.push(`location.ilike.%${loc}%`)
          allConditions.push(`city.ilike.%${loc}%`)
          allConditions.push(`state.ilike.%${loc}%`)
          allConditions.push(`country.ilike.%${loc}%`)
        }
        
        // Apply OR filter if we have conditions
        if (allConditions.length > 0) {
          qb = qb.or(allConditions.join(','))
        }
        
        // Prefer published + active jobs if columns exist
        let res: any = await qb.ilike('status', 'published%').or('is_active.is.true,is_active.is.null')
        
        // If error, retry without is_active (older schema)
        if (res.error) {
          const msg = String(res.error?.message || '')
          if (/is_active/i.test(msg) || /column.*is_active/i.test(msg)) {
            res = await qb.ilike('status', 'published%')
          }
        }
        
        // If still error, try again without status filter (schema may not have it)
        if (res.error) {
          qb = supabase
            .from('jobs')
            .select('id,title,description,location,city,state,country,created_at,business_profile_id')
            .limit(100)
          
          if (allConditions.length > 0) {
            qb = qb.or(allConditions.join(','))
          }
          
          res = await qb
        }

        // Check for specific error types
        if (res.error) {
          const errorMsg = String(res.error?.message || '')
          const errorCode = String(res.error?.code || '')
          
          // If it's a missing table/column error, show helpful message
          if (errorCode === 'PGRST204' || /Could not find the .* column/i.test(errorMsg) || /relation.*does not exist/i.test(errorMsg)) {
            console.error('Jobs search error:', res.error)
            setSearchResults({ jobs: [] })
            setError('Jobs search is not available yet (missing jobs table or permissions).')
            return
          }
          
          // For other errors, try a simpler query without filters
          try {
            const simpleRes = await supabase
              .from('jobs')
              .select('id,title,description,location,city,country,created_at,business_profile_id')
              .limit(100)
            
            if (simpleRes.error) {
              console.error('Jobs search error:', simpleRes.error)
              setSearchResults({ jobs: [] })
              setError('Jobs search is not available yet (missing jobs table or permissions).')
              return
            }
            
            // Filter results manually if query failed
            let filteredData = simpleRes.data || []
            if (q) {
              const qLower = q.toLowerCase()
              filteredData = filteredData.filter((j: any) => 
                (j.title || '').toLowerCase().includes(qLower) ||
                (j.description || '').toLowerCase().includes(qLower)
              )
            }
            if (loc) {
              const locLower = loc.toLowerCase()
              filteredData = filteredData.filter((j: any) =>
                (j.location || '').toLowerCase().includes(locLower) ||
                (j.city || '').toLowerCase().includes(locLower) ||
                (j.state || '').toLowerCase().includes(locLower) ||
                (j.country || '').toLowerCase().includes(locLower)
              )
            }
            
            res = { data: filteredData, error: null }
          } catch (fallbackError) {
            console.error('Jobs search fallback error:', fallbackError)
            setSearchResults({ jobs: [] })
            setError('Jobs search is not available yet (missing jobs table or permissions).')
            return
          }
        }
        
        // Map the results to match the Job interface
        const mappedJobs: Job[] = (res.data || []).map((j: any) => ({
          id: String(j?.id || ''),
          title: typeof j?.title === 'string' ? j.title : 'Job',
          description: typeof j?.description === 'string' ? j.description : null,
          location: typeof j?.location === 'string' ? j.location : null,
          city: typeof j?.city === 'string' ? j.city : null,
          state: typeof j?.state === 'string' ? j.state : null,
          country: typeof j?.country === 'string' ? j.country : null,
          status: typeof j?.status === 'string' ? j.status : 'published',
          created_at: typeof j?.created_at === 'string' ? j.created_at : new Date().toISOString(),
        }))
        
        setSearchResults({ jobs: mappedJobs })
        setError(null)
      } else if (searchType === 'talent') {
        if (!allowTalentSearch) {
          setError('Talent search is only available to Business accounts.')
          return
        }
        const q = (searchQuery || '').trim().toLowerCase()
        const loc = (location || '').trim().toLowerCase()

        // Schema-tolerant select: try common naming patterns.
        const selectors = [
          'id, name, title, bio, skills, location, latitude, longitude',
          'id, full_name, title, bio, skills, location, latitude, longitude',
          'id, display_name, title, bio, skills, location, latitude, longitude',
          'id, first_name, last_name, title, bio, skills, location, latitude, longitude',
          'id, name, location',
          'id, full_name, location',
          'id, display_name, location',
        ]

        let rows: any[] | null = null
        for (const sel of selectors) {
          const r: any = await (supabase.from('talent_profiles').select(sel) as any).limit(200)
          if (!r.error) {
            rows = r.data || []
            break
          }
          // If missing-column, try next selector; otherwise stop and show error
          const msg = String(r.error?.message ?? '')
          const code = String(r.error?.code ?? '')
          const isMissingCol = code === 'PGRST204' || /Could not find the .* column/i.test(msg)
          if (!isMissingCol) {
            setSearchResults({ talent: [] })
            setError('Talent search is not available (permissions or schema mismatch).')
            return
          }
        }

        const mapped: Talent[] = (rows || []).map((t: any) => {
          const name =
            (typeof t?.name === 'string' && t.name) ||
            (typeof t?.full_name === 'string' && t.full_name) ||
            (typeof t?.display_name === 'string' && t.display_name) ||
            (typeof t?.first_name === 'string' || typeof t?.last_name === 'string'
              ? `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
              : '') ||
            'Talent'

          const skills = Array.isArray(t?.skills) ? (t.skills as any[]).map((s) => String(s)) : null

          return {
            id: t?.id ?? String(Math.random()),
            name,
            title: typeof t?.title === 'string' ? t.title : null,
            bio: typeof t?.bio === 'string' ? t.bio : null,
            skills,
            location: typeof t?.location === 'string' ? t.location : null,
            latitude: typeof t?.latitude === 'number' ? t.latitude : null,
            longitude: typeof t?.longitude === 'number' ? t.longitude : null,
          }
        })

        const filtered = mapped.filter((t) => {
          const blob = `${t.name} ${t.title ?? ''} ${t.bio ?? ''} ${(t.skills || []).join(' ')} ${t.location ?? ''}`.toLowerCase()
          if (q && !blob.includes(q)) return false
          if (loc && !(t.location || '').toLowerCase().includes(loc)) return false
          return true
        })

        setSearchResults({ talent: filtered.slice(0, 100) })
      } else if (searchType === 'business') {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/page.tsx:business_search_start',message:'Business search started',data:{searchQuery,searchType,location},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'BUS_SEARCH'})}).catch(()=>{});
        // #endregion
        // IMPORTANT: do not depend on localhost:8000 backend (often offline in this environment).
        // Search published business profiles directly from Supabase (RLS-safe public read).
        const q = (searchQuery || '').trim()
        const loc = (location || '').trim().toLowerCase()

        let pagesQuery = supabase
          .from('business_profile_pages')
          .select('business_id, slug, name, tagline, mission')
          .eq('is_published', true)

        // If query is provided, filter by name/tagline/mission/slug
        if (q) {
          const pagesOr = `name.ilike.%${q}%,tagline.ilike.%${q}%,mission.ilike.%${q}%,slug.ilike.%${q}%`
          pagesQuery = pagesQuery.or(pagesOr)
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/page.tsx:business_pages_query',message:'Querying business_profile_pages',data:{q,loc,hasQuery:!!q,hasLocation:!!loc},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'BUS_SEARCH'})}).catch(()=>{});
        // #endregion
        const pagesRes = await pagesQuery.limit(50)

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/page.tsx:business_pages_search',message:'Business pages search result',data:{q,ok:!pagesRes.error,count:(pagesRes.data||[]).length,errCode:(pagesRes.error as any)?.code,errMsg:(pagesRes.error as any)?.message,errDetails:(pagesRes.error as any)?.details,firstResult:(pagesRes.data||[])[0]||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'BUS_SEARCH'})}).catch(()=>{});
        // #endregion

        let businesses: Business[] = []
        
        // Add businesses from published pages
        if (!pagesRes.error && pagesRes.data && pagesRes.data.length > 0) {
          // business_id is UUID, keep as string
          const pageBusinessIds = pagesRes.data
            .map((r: any) => {
              const id = r.business_id
              // Keep as UUID string (business_profiles.id is UUID)
              if (typeof id === 'string') return id
              if (typeof id === 'number') return String(id)
              return null
            })
            .filter((id: any): id is string => id != null && typeof id === 'string')
          
          // Fetch location data for businesses from business_profile_pages
          const locationMap = new Map<string, any>()
          if (pageBusinessIds.length > 0) {
            console.log('[BusinessSearch] Fetching location data for business IDs:', pageBusinessIds)
            
            // Try batch query first
            let locationData: any[] | null = null
            let locationError: any = null
            
            try {
              // Use select('*') to get all columns, then extract what we need
              // business_profiles.id is UUID, so pageBusinessIds should be UUID strings
              const result = await supabase
                .from('business_profiles')
                .select('*')
                .in('id', pageBusinessIds)
              
              locationData = result.data
              locationError = result.error
              
              if (locationError) {
                console.error('[BusinessSearch] Batch query error:', {
                  error: locationError,
                  message: locationError.message,
                  details: locationError.details,
                  hint: locationError.hint,
                  businessIds: pageBusinessIds
                })
              }
            } catch (err) {
              console.warn('[BusinessSearch] Batch query exception, trying individual queries:', err)
              locationError = err
            }
            
            // If batch query failed, try individual queries as fallback
            if (locationError || !locationData || locationData.length === 0) {
              console.log('[BusinessSearch] Batch query failed or returned no data, fetching individually...')
              locationData = []
              
              for (const businessId of pageBusinessIds) {
                try {
                  // businessId is already a UUID string
                  const { data: singleData, error: singleError } = await supabase
                    .from('business_profiles')
                    .select('*')
                    .eq('id', businessId)
                    .maybeSingle()
                  
                  if (!singleError && singleData) {
                    locationData.push(singleData)
                  } else if (singleError) {
                    console.warn(`[BusinessSearch] Error fetching location for business ${businessId}:`, {
                      error: singleError,
                      message: singleError.message,
                      details: singleError.details
                    })
                  }
                } catch (err) {
                  console.warn(`[BusinessSearch] Exception fetching location for business ${businessId}:`, err)
                }
              }
            }
            
            if (locationError && locationData && locationData.length === 0) {
              console.error('[BusinessSearch] Error fetching location data:', {
                error: locationError,
                message: locationError?.message,
                details: locationError?.details,
                hint: locationError?.hint,
                businessIds: pageBusinessIds
              })
            } else {
              console.log('[BusinessSearch] Successfully fetched location data:', {
                count: locationData?.length || 0,
                ids: locationData?.map((d: any) => d.id) || []
              })
            }
            
            // Create a map of business_id to location data
            if (locationData && locationData.length > 0) {
              locationData.forEach((loc: any) => {
                locationMap.set(String(loc.id), loc)
              })
            }
            
            console.log('[BusinessSearch] Fetched location data:', {
              pageBusinessIds,
              locationDataCount: locationData?.length || 0,
              locationMapSize: locationMap.size
            })
            
            // Map businesses with location data
            businesses = pagesRes.data.map((r: any) => {
              const businessId = String(r.business_id)
              const location = locationMap.get(businessId)
              // Handle both latitude/longitude and lat/lng column names
              const lat = location?.latitude ?? location?.lat ?? null
              const lng = location?.longitude ?? location?.lng ?? null
              return {
                id: businessId,
                slug: typeof r.slug === 'string' ? r.slug : null,
                name: typeof r.name === 'string' ? r.name : 'Business',
                tagline: typeof r.tagline === 'string' ? r.tagline : null,
                mission: typeof r.mission === 'string' ? r.mission : null,
                location: location?.location || null,
                city: location?.city || null,
                state: location?.state || null,
                country: location?.country || null,
                latitude: typeof lat === 'number' ? lat : null,
                longitude: typeof lng === 'number' ? lng : null,
              }
            })
          } else {
            // Fallback if no valid IDs
            businesses = pagesRes.data.map((r: any) => ({
              id: String(r.business_id),
              slug: typeof r.slug === 'string' ? r.slug : null,
              name: typeof r.name === 'string' ? r.name : 'Business',
              tagline: typeof r.tagline === 'string' ? r.tagline : null,
              mission: typeof r.mission === 'string' ? r.mission : null,
            }))
          }
        }
        
        // Also search business_profiles table (combine results from both tables)
        // Note: business_profiles table has 'name' and 'description' columns
        const existingIds = new Set(businesses.map(b => b.id))
        let profilesQuery = supabase
          .from('business_profiles')
          .select('id, name, description, user_id, location, city, state, country, latitude, longitude')

        // If query is provided, filter by name/description
        if (q) {
          const profilesOr = `name.ilike.%${q}%,description.ilike.%${q}%`
          profilesQuery = profilesQuery.or(profilesOr)
        }

        // If location is provided, filter by location fields (AND condition with query if exists)
        if (loc) {
          const locationOr = `location.ilike.%${loc}%,city.ilike.%${loc}%,state.ilike.%${loc}%,country.ilike.%${loc}%`
          if (q) {
            // If we have both query and location, we need to combine them
            // Supabase doesn't support AND between OR groups easily, so we filter after
            // For now, we'll apply location filter after fetching
          } else {
            // If only location is provided, filter by location
            profilesQuery = profilesQuery.or(locationOr)
          }
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/page.tsx:business_profiles_query',message:'Querying business_profiles',data:{q,loc,hasQuery:!!q,hasLocation:!!loc},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'BUS_SEARCH'})}).catch(()=>{});
        // #endregion
        const profilesRes = await profilesQuery.limit(50)

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/page.tsx:business_profiles_search',message:'Business profiles search result',data:{q,loc,ok:!profilesRes.error,count:(profilesRes.data||[]).length,errCode:(profilesRes.error as any)?.code,errMsg:(profilesRes.error as any)?.message,errDetails:(profilesRes.error as any)?.details,firstResult:(profilesRes.data||[])[0]||null,allResults:(profilesRes.data||[]).map((r:any)=>({id:r.id,name:r.name,description:r.description?.substring(0,50)||null}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'BUS_SEARCH'})}).catch(()=>{});
        // #endregion

        if (!profilesRes.error && profilesRes.data && profilesRes.data.length > 0) {
          // Filter by location if location is provided and query is also provided (client-side filter)
          let filteredData = profilesRes.data
          if (loc && q) {
            filteredData = profilesRes.data.filter((r: any) => {
              const locationStr = (r.location || '').toLowerCase()
              const cityStr = (r.city || '').toLowerCase()
              const stateStr = (r.state || '').toLowerCase()
              const countryStr = (r.country || '').toLowerCase()
              return locationStr.includes(loc) || cityStr.includes(loc) || stateStr.includes(loc) || countryStr.includes(loc)
            })
          }
          
          // Add businesses from profiles table, avoiding duplicates
          const profileBusinesses = filteredData
            .filter((r: any) => !existingIds.has(String(r.id)))
            .map((r: any) => ({
              id: String(r.id),
              slug: null,
              name: typeof r.name === 'string' && r.name ? r.name : 'Business',
              tagline: null,
              mission: typeof r.description === 'string' ? r.description : null,
              location: typeof r.location === 'string' ? r.location : null,
              city: typeof r.city === 'string' ? r.city : null,
              state: typeof r.state === 'string' ? r.state : null,
              country: typeof r.country === 'string' ? r.country : null,
              latitude: typeof r.latitude === 'number' ? r.latitude : null,
              longitude: typeof r.longitude === 'number' ? r.longitude : null,
            }))
          businesses = [...businesses, ...profileBusinesses]
        }

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/page.tsx:business_search_final',message:'Business search final results',data:{query:q,location:loc,resultCount:businesses.length,allResults:businesses.map(b=>({id:b.id,name:b.name,slug:b.slug}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'BUS_SEARCH'})}).catch(()=>{});
        // #endregion

        // Store business map for marker navigation
        const businessMapData = new Map<string, Business>()
        businesses.forEach(b => businessMapData.set(b.id, b))
        setBusinessMap(businessMapData)

        setSearchResults({ businesses })
      }
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/page.tsx:101',message:'Search failed',data:{error:err.message,code:err.code,hasResponse:!!err.response,status:err.response?.status,searchType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error('Search error:', err)
      
      // Format error message - handle FastAPI validation errors (arrays) and string errors
      let errorMessage = 'Search failed. Please try again.'
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail
        if (Array.isArray(detail)) {
          // FastAPI validation errors come as an array of objects
          errorMessage = detail.map((error: any) => {
            const field = error.loc?.join('.') || 'field'
            const msg = error.msg || 'Validation error'
            return `${field}: ${msg}`
          }).join(', ')
        } else if (typeof detail === 'string') {
          errorMessage = detail
        } else {
          errorMessage = JSON.stringify(detail)
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className={isEmbedded ? 'h-full bg-white' : 'min-h-screen bg-white'}>
      {!isEmbedded && (
        <header className="sticky top-0 z-50 bg-black border-0">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-white hover:text-[#2B4EA2] transition-colors">
                Creerlio
              </Link>

              <nav className="hidden lg:flex items-center gap-x-8 text-sm text-white">
                <Link href="/about" className="hover:text-[#2B4EA2] transition-colors">About</Link>
                <Link href="/#talent" className="hover:text-[#2B4EA2] transition-colors">Talent</Link>
                <Link href="/#business" className="hover:text-[#2B4EA2] transition-colors">Business</Link>
                <Link href="/search" className="hover:text-[#2B4EA2] transition-colors text-[#2B4EA2]">Search</Link>
                <Link href="/jobs" className="hover:text-[#2B4EA2] transition-colors">Jobs</Link>
                {isAdmin && (
                  <Link href="/admin" className="hover:text-[#2B4EA2] transition-colors">
                    Admin
                  </Link>
                )}
                {isAuthenticated ? (
                  <>
                    {userType === 'business' ? (
                      <Link 
                        href="/dashboard/business" 
                        className="hover:text-[#2B4EA2] transition-colors"
                      >
                        Business Dashboard
                      </Link>
                    ) : userType === 'talent' ? (
                      <Link 
                        href="/dashboard/talent" 
                        className="hover:text-[#2B4EA2] transition-colors"
                      >
                        Talent Dashboard
                      </Link>
                    ) : null}
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut()
                        localStorage.removeItem('access_token')
                        localStorage.removeItem('user_email')
                        localStorage.removeItem('user_type')
                        localStorage.removeItem('creerlio_active_role')
                        setIsAuthenticated(false)
                        setUserType(null)
                        setActiveRole(null)
                        router.push('/')
                      }}
                      className="hover:text-[#2B4EA2] transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : null}
              </nav>

              {!isAuthenticated ? (
                <>
                  <Link
                    href="/login/talent?mode=signup&redirect=/dashboard/talent"
                    className="px-4 py-2 rounded-lg bg-[#2B4EA2] hover:bg-[#243F86] font-semibold text-sm text-white transition-colors"
                  >
                    Create Talent Account
                  </Link>
                  <Link
                    href="/login/business?mode=signup&redirect=/dashboard/business"
                    className="px-4 py-2 rounded-lg bg-[#2B4EA2] hover:bg-[#243F86] font-semibold text-sm text-white transition-colors"
                  >
                    Create Business Account
                  </Link>
                  <Link
                    href="/login/talent?mode=signin&redirect=/dashboard/talent"
                    className="px-5 py-2 rounded-lg bg-[#2B4EA2] hover:bg-[#243F86] font-semibold text-sm text-white transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <>
                  {userType === 'talent' ? (
                    <Link
                      href="/dashboard/talent"
                      className="px-5 py-2 rounded-lg bg-[#2B4EA2] hover:bg-[#243F86] font-semibold text-sm text-white transition-colors"
                    >
                      Talent Dashboard
                    </Link>
                  ) : null}
                  {userType === 'business' ? (
                    <Link
                      href="/dashboard/business"
                      className="px-5 py-2 rounded-lg bg-[#2B4EA2] hover:bg-[#243F86] font-semibold text-sm text-white transition-colors"
                    >
                      Business Dashboard
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={isEmbedded ? 'h-full px-6 py-6' : 'max-w-7xl mx-auto px-8 py-16'}>
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight text-gray-900">
              Search <span className="text-[#2B4EA2]">{isPublicTalentAudience ? 'Businesses or Jobs' : 'Talent, Businesses or Jobs'}</span>
            </h1>
            {!isAuthenticated ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/login?redirect=/portfolio"
                  className="px-6 py-3 rounded-xl bg-[#2B4EA2] hover:bg-[#243F86] font-semibold text-white transition-colors"
                >
                  Create your free Talent Portfolio
                </Link>
                <Link
                  href="/jobs"
                  className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Browse jobs
                </Link>
              </div>
            ) : null}
          </div>

          {/* Search Interface with Map */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Search Form and Results - Left Side */}
            <div className="lg:col-span-1 space-y-6">
              {/* Search Form */}
              <div className="dashboard-card rounded-2xl p-8">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="space-y-3">
                    {/* Search Type */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSearchType('jobs')}
                        className={`flex-1 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                          searchType === 'jobs'
                            ? 'bg-[#2B4EA2] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Jobs
                      </button>
                      {allowTalentSearch ? (
                      <button
                        type="button"
                        onClick={() => setSearchType('talent')}
                        className={`flex-1 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                          searchType === 'talent'
                            ? 'bg-[#2B4EA2] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Talent
                      </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setSearchType('business')}
                        className={`flex-1 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                          searchType === 'business'
                            ? 'bg-[#2B4EA2] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Business
                      </button>
                    </div>

                    {/* Search Input */}
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        searchType === 'jobs'
                          ? 'Search jobs… (e.g. receptionist, aged care, apprentice)'
                          : searchType === 'business'
                            ? 'Search businesses… (e.g. industry, company, program)'
                            : 'Search talent…'
                      }
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#2B4EA2] transition-colors text-sm"
                    />

                    {/* Location Filter with Autocomplete */}
                    <div className="relative">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => {
                          setLocation(e.target.value)
                          setShowLocationSuggestions(true)
                        }}
                        onFocus={() => {
                          if (locationSuggestions.length > 0) {
                            setShowLocationSuggestions(true)
                          }
                        }}
                        onBlur={() => {
                          // Delay hiding to allow click on suggestion
                          setTimeout(() => setShowLocationSuggestions(false), 200)
                        }}
                        placeholder="Location (optional)"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#2B4EA2] transition-colors text-sm"
                      />
                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {isLoadingSuggestions ? (
                            <div className="px-4 py-3 text-gray-500 text-sm">Loading suggestions...</div>
                          ) : (
                            locationSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  setLocation(suggestion.place_name)
                                  setShowLocationSuggestions(false)
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                              >
                                <div className="text-gray-900 text-sm">{suggestion.place_name}</div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Search Button */}
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="w-full px-4 py-3 bg-[#2B4EA2] hover:bg-[#243F86] rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-300 p-6">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {/* Search Results - Directly under search form */}
              {Object.keys(searchResults).length > 0 && (
                <div className="space-y-6">
                  {searchResults.jobs && searchResults.jobs.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4 text-gray-900">Jobs ({searchResults.jobs.length})</h2>
                      <div className="grid md:grid-cols-1 gap-4">
                        {searchResults.jobs.map((job) => (
                          <Link
                            key={job.id}
                            href={`/jobs/${job.id}`}
                            className="dashboard-card rounded-xl p-6 hover:border-[#2B4EA2] transition-colors"
                          >
                            <h3 className="text-xl font-semibold mb-2 text-gray-900">{job.title}</h3>
                            {job.description && (
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{job.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-700">
                              {job.location && <span>📍 {job.location}</span>}
                              <span className={`px-2 py-1 rounded ${
                                job.status === 'published' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}>
                                {job.status}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {allowTalentSearch && searchResults.talent && searchResults.talent.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4 text-gray-900">Talent ({searchResults.talent.length})</h2>
                      {mapMarkers.length === 0 && searchResults.talent.some(t => t.location) && (
                        <p className="text-gray-600 text-sm mb-4">
                          Note: Some talent profiles may not have location data available for mapping.
                        </p>
                      )}
                      <div className="grid md:grid-cols-1 gap-4">
                        {searchResults.talent.map((talent) => (
                          <div
                            key={talent.id}
                            className="dashboard-card rounded-xl p-6"
                          >
                            <h3 className="text-xl font-semibold mb-2 text-gray-900">{talent.name}</h3>
                            {talent.title && (
                              <p className="text-[#2B4EA2] mb-2">{talent.title}</p>
                            )}
                            {talent.bio && (
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{talent.bio}</p>
                            )}
                            {talent.skills && talent.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {talent.skills.slice(0, 5).map((skill, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                            {talent.location && (
                              <p className="text-gray-700 text-sm">📍 {talent.location}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.businesses && searchResults.businesses.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4 text-gray-900">Businesses ({searchResults.businesses.length})</h2>
                      {mapMarkers.length === 0 && (
                        <p className="text-gray-600 text-sm mb-4">
                          Map pins require business location coordinates. Businesses can only connect after a Talent requests a connection. Map search shows a basic overview of Talent without revealing identity.
                        </p>
                      )}
                      <div className="grid md:grid-cols-1 gap-4">
                        {searchResults.businesses.map((business) => (
                          <div
                            key={business.id}
                            className="dashboard-card rounded-xl p-6"
                          >
                            <h3 className="text-xl font-semibold mb-2 text-gray-900">{business.name}</h3>
                            {business.tagline ? (
                              <p className="text-[#2B4EA2] mb-2">{business.tagline}</p>
                            ) : null}
                            {business.mission ? (
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{business.mission}</p>
                            ) : null}
                            {business.id ? (
                              <Link
                                href={`/dashboard/business/view?id=${encodeURIComponent(String(business.id))}`}
                                className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                              >
                                View Business Profile →
                              </Link>
                            ) : business.slug ? (
                              <Link
                                href={`/dashboard/business/view?slug=${encodeURIComponent(business.slug)}`}
                                className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                              >
                                View Business Profile →
                              </Link>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results */}
                  {((searchResults.jobs && searchResults.jobs.length === 0) ||
                    (allowTalentSearch && searchResults.talent && searchResults.talent.length === 0) ||
                    (searchResults.businesses && searchResults.businesses.length === 0)) && (
                    <div className="text-center py-12">
                      <p className="text-gray-600 text-lg">No results found. Try different search terms.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Map - Right Side */}
            {isMapExpanded ? (
              <div 
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                onClick={() => setIsMapExpanded(false)}
                style={{ width: '100vw', height: '100vh' }}
              >
                <div 
                  className="absolute inset-0 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-2xl"
                  style={{ width: '100%', height: '100%' }}
                >
                  {isGeocoding ? (
                    <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-[#2B4EA2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-700">Geocoding locations...</p>
                      </div>
                    </div>
                  ) : (
                    <SearchMap markers={mapMarkers} isExpanded={true} onMarkerClick={handleMarkerClick} />
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsMapExpanded(false)
                  }}
                  className="absolute top-4 right-4 z-10 px-4 py-2 bg-white hover:bg-gray-100 rounded-lg text-gray-900 font-semibold border border-gray-300 shadow-lg"
                >
                  Close
                </button>
              </div>
            ) : (
              <div 
                className="lg:col-span-2 dashboard-card rounded-2xl p-6 transition-all relative"
              >
                <div className="h-[600px] w-full">
                  {isGeocoding ? (
                    <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-[#2B4EA2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-700">Geocoding locations...</p>
                      </div>
                    </div>
                  ) : (
                    <SearchMap markers={mapMarkers} isExpanded={false} onMarkerClick={handleMarkerClick} />
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsMapExpanded(true)
                  }}
                  className="absolute bottom-6 right-6 px-3 py-1 bg-[#2B4EA2] hover:bg-[#243F86] rounded-lg text-white text-sm font-medium cursor-pointer transition-colors shadow-lg"
                >
                  Click to expand
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

