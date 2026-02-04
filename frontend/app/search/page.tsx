'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BusinessDiscoveryMap, { type BusinessFeature, type RouteState, type BusinessDiscoveryMapHandle } from '@/components/BusinessDiscoveryMap'

export const dynamic = 'force-dynamic'

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
  const mapRef = useRef<BusinessDiscoveryMapHandle>(null)

  // --- Auth detection ---
  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(async (res: any) => {
      const data = res?.data
      const uid = data.session?.user?.id ?? null
      const email = data.session?.user?.email ?? null

      if (!uid) {
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

      const [talentCheck, businessCheck] = await Promise.all([
        supabase.from('talent_profiles').select('id').eq('user_id', uid).maybeSingle(),
        supabase.from('business_profiles').select('id').eq('user_id', uid).maybeSingle()
      ])

      const hasTalentProfile = !!talentCheck.data && !talentCheck.error
      const hasBusinessProfile = !!businessCheck.data && !businessCheck.error

      if (!cancelled) {
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
          setUserType(null)
          setActiveRole(null)
        }
      }
    }).catch(() => {
      if (!cancelled) {
        setIsAuthenticated(false)
        setUserType(null)
        setActiveRole(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  // Embedded link click handler
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

  // --- Map state ---
  const [mapActiveStyle, setMapActiveStyle] = useState<'dark' | 'light' | 'satellite' | 'streets'>('streets')
  const [mapFiltersCollapsed, setMapFiltersCollapsed] = useState(false)
  const [mapPanelsCollapsed, setMapPanelsCollapsed] = useState(false)
  const [mapLocQuery, setMapLocQuery] = useState('')
  const [mapLocSuggestions, setMapLocSuggestions] = useState<Array<{ id: string; label: string; lng: number; lat: number }>>([])
  const [mapLocOpen, setMapLocOpen] = useState(false)
  const [mapLocActiveIdx, setMapLocActiveIdx] = useState(0)
  const [mapRadiusKm, setMapRadiusKm] = useState<number>(5)
  const [mapFlyTo, setMapFlyTo] = useState<{ lng: number; lat: number; zoom?: number } | null>(null)
  const [mapSearchCenter, setMapSearchCenter] = useState<{ lng: number; lat: number; label?: string } | null>(null)
  const [mapShowAllBusinesses, setMapShowAllBusinesses] = useState<boolean>(true)
  const [mapShowAllJobs, setMapShowAllJobs] = useState<boolean>(false)
  const [mapRadiusSearchType, setMapRadiusSearchType] = useState<'jobs' | 'business' | null>(null)
  const [mapResults, setMapResults] = useState<BusinessFeature[]>([])
  const [mapJobResults, setMapJobResults] = useState<any[]>([])
  const [mapSelectedBusinessId, setMapSelectedBusinessId] = useState<string | null>(null)
  const [mapSelectBusinessId, setMapSelectBusinessId] = useState<string | null>(null)
  const [mapSelectedBusiness, setMapSelectedBusiness] = useState<BusinessFeature | null>(null)
  const [mapRouteState, setMapRouteState] = useState<RouteState | null>(null)
  const [mapRouteQuery, setMapRouteQuery] = useState('')
  const [mapCommittedRouteQuery, setMapCommittedRouteQuery] = useState('')
  const [mapRouteSuggestions, setMapRouteSuggestions] = useState<Array<{ id: string; label: string; lng: number; lat: number }>>([])
  const [mapRouteSuggestionsOpen, setMapRouteSuggestionsOpen] = useState(false)
  const [mapRouteActiveIdx, setMapRouteActiveIdx] = useState(0)
  const mapRouteAbortRef = useRef<AbortController | null>(null)
  const [mapRouteQueryDebounced, setMapRouteQueryDebounced] = useState('')
  const [mapToggles, setMapToggles] = useState({
    businesses: true,
    context: false,
    schools: false,
    commute: false,
    transport: false,
    shopping: false,
    property: false,
  })
  const [mapMapResizeTrigger, setMapMapResizeTrigger] = useState(0)
  const [mapMapFitBounds, setMapMapFitBounds] = useState<[[number, number], [number, number]] | null>(null)
  const mapLocAbortRef = useRef<AbortController | null>(null)

  // Australia bounds constant
  const AU_BOUNDS: [[number, number], [number, number]] = [
    [113.0, -44.0],
    [154.0, -10.0]
  ]

  // Set initial map bounds to show all of Australia on mount
  useEffect(() => {
    if (mapShowAllBusinesses) {
      setMapMapFitBounds(AU_BOUNDS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounce route query
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapRouteQueryDebounced(mapRouteQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [mapRouteQuery])

  // Calculate zoom level from radius in km
  const getZoomFromRadius = useCallback((radiusKm: number): number => {
    const zoom = 14 - Math.log2(radiusKm)
    return Math.max(7, Math.min(16, zoom))
  }, [])

  // Re-zoom when radius changes and there's a selected location
  useEffect(() => {
    if (mapSearchCenter && mapSearchCenter.lat && mapSearchCenter.lng) {
      const newZoom = getZoomFromRadius(mapRadiusKm)
      setMapFlyTo({ lng: mapSearchCenter.lng, lat: mapSearchCenter.lat, zoom: newZoom })
    }
  }, [mapRadiusKm, mapSearchCenter, getZoomFromRadius])

  // Debounce location query
  const [mapLocDebouncedValue, setMapLocDebouncedValue] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapLocDebouncedValue(mapLocQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [mapLocQuery])

  // Fetch location suggestions
  useEffect(() => {
    const fetchLocSuggestions = async (q: string) => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
      const qq = q.trim()
      if (!qq || qq.length < 1) {
        setMapLocSuggestions([])
        setMapLocActiveIdx(0)
        return
      }
      if (!token) return
      mapLocAbortRef.current?.abort()
      const ac = new AbortController()
      mapLocAbortRef.current = ac
      try {
        let feats: any[] = []
        if (token) {
          const u = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(qq)}.json`)
          u.searchParams.set('access_token', token)
          u.searchParams.set('limit', '6')
          u.searchParams.set('types', 'place,locality,neighborhood,postcode,region')
          u.searchParams.set('country', 'AU')
          const res = await fetch(u.toString(), { signal: ac.signal })
          const json: any = await res.json().catch(() => null)
          feats = Array.isArray(json?.features) ? json.features : []
        } else {
          const res = await fetch(`/api/map/geocode?q=${encodeURIComponent(qq)}`, { signal: ac.signal })
          const json: any = await res.json().catch(() => null)
          feats = Array.isArray(json?.features) ? json.features : []
        }

        if (!feats.length) {
          const res = await fetch(`/api/map/geocode?q=${encodeURIComponent(qq)}`, { signal: ac.signal })
          const json: any = await res.json().catch(() => null)
          feats = Array.isArray(json?.features) ? json.features : []
        }
        const next = feats
          .map((f: any) => {
            const id = String(f?.id || '')
            const label = String(f?.place_name || '').trim()
            const center = f?.center
            const lng = Array.isArray(center) ? center[0] : null
            const lat = Array.isArray(center) ? center[1] : null
            if (!id || !label || typeof lng !== 'number' || typeof lat !== 'number') return null
            return { id, label, lng, lat }
          })
          .filter(Boolean)
          .slice(0, 6) as any
        setMapLocSuggestions(next)
        setMapLocActiveIdx(0)
        if (next.length > 0) {
          setMapLocOpen(true)
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching location suggestions:', err)
        }
      }
    }

    if (mapLocDebouncedValue.trim().length > 0) {
      fetchLocSuggestions(mapLocDebouncedValue)
    } else {
      setMapLocSuggestions([])
    }
  }, [mapLocDebouncedValue])

  // Update map resize trigger when panels collapse/expand
  useEffect(() => {
    setMapMapResizeTrigger(prev => prev + 1)
  }, [mapPanelsCollapsed])

  // Memoize onResults callback
  const handleMapResults = useCallback((items: BusinessFeature[]) => {
    setMapResults(items)
  }, [])

  // Fetch jobs when filters change
  useEffect(() => {
    const fetchJobs = async () => {
      const shouldFetchJobs = mapShowAllJobs || (mapRadiusSearchType === 'jobs' && !!mapSearchCenter)

      if (!shouldFetchJobs) {
        setMapJobResults([])
        return
      }

      try {
        const params = new URLSearchParams()
        const useRadius =
          mapRadiusSearchType === 'jobs' && !!mapSearchCenter && !mapShowAllJobs
        if (useRadius && mapSearchCenter) {
          params.set('lat', String(mapSearchCenter.lat))
          params.set('lng', String(mapSearchCenter.lng))
          params.set('radius', String(mapRadiusKm))
        } else {
          params.set('show_all', '1')
        }

        const response = await fetch(`/api/map/jobs?${params.toString()}`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch jobs')
        }

        const data = await response.json()
        const jobsList = Array.isArray(data?.jobs) ? data.jobs : []
        setMapJobResults(jobsList)
      } catch (error: any) {
        console.error('[SearchPage] Failed to fetch jobs:', error.message)
        setMapJobResults([])
      }
    }

    fetchJobs()
  }, [mapShowAllJobs, mapSearchCenter, mapRadiusKm, mapRadiusSearchType])

  // Memoize stable filters object
  const mapFilters = useMemo(() => ({ q: '', industries: [] as string[], work: '' }), [])

  // Memoize jobs array
  const memoizedMapJobs = useMemo(() => {
    const shouldShowJobs =
      (mapShowAllJobs || mapRadiusSearchType === 'jobs') &&
      mapJobResults.length > 0

    if (!shouldShowJobs) return []

    return mapJobResults.map((job: any) => {
      if (job?.lat != null && job?.lng != null) return job
      if (mapSearchCenter) {
        return { ...job, lat: mapSearchCenter.lat, lng: mapSearchCenter.lng }
      }
      return { ...job, lat: -25.2744, lng: 133.7751 }
    })
  }, [mapJobResults, mapShowAllJobs, mapRadiusSearchType, mapSearchCenter])

  // Memoize callback props
  const handleMapToggle = useCallback((next: Partial<typeof mapToggles>) => {
    setMapToggles(prev => ({ ...prev, ...next }))
  }, [])

  const handleMapSelectedBusinessId = useCallback((id: string | null) => {
    setMapSelectedBusinessId(id)
    if (id && id.startsWith('job:')) {
      setMapPanelsCollapsed(false)
    }
  }, [])

  // Set map fit bounds when show all businesses is enabled
  useEffect(() => {
    if (mapShowAllBusinesses && !mapSearchCenter) {
      setMapMapFitBounds(AU_BOUNDS)
    } else {
      setMapMapFitBounds(null)
    }
  }, [mapShowAllBusinesses, mapSearchCenter])

  // Fetch route suggestions
  useEffect(() => {
    const fetchRouteSuggestions = async (q: string) => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
      const qq = q.trim()
      if (!qq || qq.length < 2) {
        setMapRouteSuggestions([])
        setMapRouteActiveIdx(0)
        return
      }
      if (!token) return
      mapRouteAbortRef.current?.abort()
      const ac = new AbortController()
      mapRouteAbortRef.current = ac
      try {
        const u = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(qq)}.json`)
        u.searchParams.set('access_token', token)
        u.searchParams.set('limit', '6')
        u.searchParams.set('types', 'address,place,locality,neighborhood,postcode,region')
        u.searchParams.set('country', 'AU')
        const res = await fetch(u.toString(), { signal: ac.signal })
        const json: any = await res.json().catch(() => null)
        const feats = Array.isArray(json?.features) ? json.features : []
        const next = feats
          .map((f: any) => {
            const id = String(f?.id || '')
            const label = String(f?.place_name || '').trim()
            const center = f?.center
            const lng = Array.isArray(center) ? center[0] : null
            const lat = Array.isArray(center) ? center[1] : null
            if (!id || !label || typeof lng !== 'number' || typeof lat !== 'number') return null
            return { id, label, lng, lat }
          })
          .filter(Boolean)
          .slice(0, 6) as any
        setMapRouteSuggestions(next)
        setMapRouteActiveIdx(0)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching route suggestions:', err)
        }
      }
    }

    if (mapRouteSuggestionsOpen && mapRouteQueryDebounced.trim().length >= 2) {
      fetchRouteSuggestions(mapRouteQueryDebounced)
    } else {
      setMapRouteSuggestions([])
    }
  }, [mapRouteQueryDebounced, mapRouteSuggestionsOpen])

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
      <main className={isEmbedded ? 'h-full px-6 py-6' : 'max-w-7xl mx-auto px-8 py-4'}>
        <div className="space-y-4">
          {/* CTA buttons for non-auth users */}
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

          {/* 3-panel layout: Filters | Route Intelligence | Map */}
          <div className="flex flex-col lg:flex-row gap-4 relative h-auto lg:h-[calc(100vh-12rem)]">
            {/* LEFT SIDEBAR: Filters */}
            <aside className={`${mapFiltersCollapsed ? 'lg:w-16' : 'lg:w-80'} w-full flex-shrink-0 overflow-y-auto z-20 transition-all duration-300`}>
              <div className="rounded-xl p-4 border border-gray-200 bg-white h-auto lg:h-full relative">
                {/* Collapse/Expand Button */}
                <button
                  type="button"
                  onClick={() => setMapFiltersCollapsed(!mapFiltersCollapsed)}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 transition-colors z-10"
                  title={mapFiltersCollapsed ? 'Expand filters' : 'Collapse filters'}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-300 ${mapFiltersCollapsed ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {mapFiltersCollapsed && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-gray-900 font-semibold text-sm whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      FILTERS
                    </div>
                  </div>
                )}

                {!mapFiltersCollapsed && (
                  <>
                    <div className="mb-1">
                      <div className="text-gray-900 font-semibold text-sm">Filters</div>
                    </div>
                    <div className="text-xs text-gray-500 mb-5">Filters update the map in real time. No page reloads.</div>

                    <div className="space-y-2">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
                        <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-blue-500"
                            checked={mapShowAllBusinesses}
                            onChange={(e) => {
                              const nextChecked = e.target.checked
                              setMapShowAllBusinesses(nextChecked)
                              if (nextChecked) {
                                setMapMapFitBounds(AU_BOUNDS)
                              } else if (!mapShowAllJobs) {
                                setMapResults([])
                              }
                            }}
                          />
                          <span className="leading-snug">
                            <span className="font-semibold text-gray-900">Show all businesses in Creerlio</span>
                          </span>
                        </label>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
                        <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-blue-500"
                            checked={mapShowAllJobs}
                            onChange={(e) => {
                              const nextChecked = e.target.checked
                              setMapShowAllJobs(nextChecked)
                              if (nextChecked) {
                                setMapMapFitBounds(AU_BOUNDS)
                              } else if (!mapShowAllBusinesses) {
                                setMapJobResults([])
                              }
                            }}
                          />
                          <span className="leading-snug">
                            <span className="font-semibold text-gray-900">Show all jobs in Creerlio</span>
                          </span>
                        </label>
                      </div>

                      {/* Radius search filters */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
                        <div className="text-sm font-medium text-gray-700 mb-1">Search within radius:</div>
                        <div className="space-y-1">
                          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              className="accent-blue-500"
                              checked={mapRadiusSearchType === 'business'}
                              onChange={(e) =>
                                setMapRadiusSearchType(e.target.checked ? 'business' : null)
                              }
                            />
                            <span className="leading-snug">
                              <span className="font-semibold text-gray-900">Show Business</span>
                            </span>
                          </label>
                          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              className="accent-blue-500"
                              checked={mapRadiusSearchType === 'jobs'}
                              onChange={(e) =>
                                setMapRadiusSearchType(e.target.checked ? 'jobs' : null)
                              }
                            />
                            <span className="leading-snug">
                              <span className="font-semibold text-gray-900">Show Jobs</span>
                            </span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-0">
                          Within
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={mapRadiusKm}
                            onChange={(e) => setMapRadiusKm(Number(e.target.value))}
                            className="mx-2 w-24 align-middle"
                          />
                          <span className="font-semibold text-gray-900">{mapRadiusKm} km</span> of…
                        </label>
                        <div className="relative">
                          <input
                            value={mapLocQuery}
                            onChange={(e) => {
                              const newValue = e.target.value
                              setMapLocQuery(newValue)
                              if (newValue.trim().length > 0) {
                                setMapLocOpen(true)
                              } else {
                                setMapLocOpen(false)
                                setMapLocSuggestions([])
                              }
                            }}
                            onFocus={() => {
                              if (mapLocQuery.trim().length > 0 && mapLocSuggestions.length > 0) {
                                setMapLocOpen(true)
                              }
                            }}
                            onBlur={() => setTimeout(() => setMapLocOpen(false), 200)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setMapLocOpen(false)
                                return
                              }
                              if (!mapLocOpen || !mapLocSuggestions.length) return
                              if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                setMapLocActiveIdx((i) => Math.min(mapLocSuggestions.length - 1, i + 1))
                                return
                              }
                              if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                setMapLocActiveIdx((i) => Math.max(0, i - 1))
                                return
                              }
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const pick = mapLocSuggestions[mapLocActiveIdx]
                                if (pick) {
                                  setMapLocQuery(pick.label)
                                  setMapSearchCenter({ lng: pick.lng, lat: pick.lat, label: pick.label })
                                  setMapLocOpen(false)
                                  setMapFlyTo({ lng: pick.lng, lat: pick.lat, zoom: getZoomFromRadius(mapRadiusKm) })
                                }
                              }
                            }}
                            placeholder="Search location..."
                            className="w-full px-3 py-2 pr-8 bg-white text-gray-900 rounded-lg text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={mapLocOpen}
                          />
                          {mapLocQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setMapLocQuery('')
                                setMapSearchCenter(null)
                                setMapLocOpen(false)
                                setMapLocSuggestions([])
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Clear"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          {mapLocOpen && mapLocSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 mt-1.5 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-20">
                              {mapLocSuggestions.map((s, idx) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                    idx === mapLocActiveIdx ? 'bg-blue-50 text-blue-900' : 'bg-white text-gray-900 hover:bg-gray-50'
                                  }`}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setMapLocQuery(s.label)
                                    setMapSearchCenter({ lng: s.lng, lat: s.lat, label: s.label })
                                    setMapLocOpen(false)
                                    setMapFlyTo({ lng: s.lng, lat: s.lat, zoom: getZoomFromRadius(mapRadiusKm) })
                                  }}
                                  role="option"
                                  aria-selected={idx === mapLocActiveIdx}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Results Section */}
                {!mapFiltersCollapsed && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-gray-900 font-semibold text-sm">Results</div>
                    <div className="text-xs text-gray-500">
                      {(() => {
                        const jobsActive = mapShowAllJobs || mapRadiusSearchType === 'jobs'
                        const businessesActive =
                          mapShowAllBusinesses || mapRadiusSearchType === 'business'
                        if (jobsActive && !businessesActive) return `${mapJobResults.length} found`
                        if (!jobsActive && businessesActive) return `${mapResults.length} found`
                        if (!jobsActive && !businessesActive) return `0 found`
                        return `${mapResults.length + mapJobResults.length} found`
                      })()}
                    </div>
                  </div>
                  {(() => {
                    const jobsActive = mapShowAllJobs || mapRadiusSearchType === 'jobs'
                    const businessesActive =
                      mapShowAllBusinesses || mapRadiusSearchType === 'business'
                    const showOnlyJobs = jobsActive && !businessesActive
                    const showOnlyBusinesses = businessesActive && !jobsActive
                    const showNone = !jobsActive && !businessesActive

                    const hasResults = showNone
                      ? false
                      : showOnlyJobs
                      ? mapJobResults.length > 0
                      : showOnlyBusinesses
                      ? mapResults.length > 0
                      : mapResults.length > 0 || mapJobResults.length > 0

                    if (!hasResults) {
                      return (
                        <div className="text-center py-4 text-gray-400 text-xs">
                          No results found
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                        {/* Businesses */}
                        {!showOnlyJobs && mapResults.map((business: BusinessFeature, idx: number) => {
                          const bizId = business?.properties?.id || business?.id || `biz-${idx}`

                          let bizName = 'Unknown Business'
                          if (business?.properties?.name) {
                            const trimmed = String(business.properties.name).trim()
                            if (trimmed) bizName = trimmed
                          } else if (business?.name) {
                            const trimmed = String(business.name).trim()
                            if (trimmed) bizName = trimmed
                          } else if (business?.properties?.business_name) {
                            const trimmed = String(business.properties.business_name).trim()
                            if (trimmed) bizName = trimmed
                          } else if (business?.business_name) {
                            const trimmed = String(business.business_name).trim()
                            if (trimmed) bizName = trimmed
                          }
                          const industries = business?.properties?.industries || business?.industries
                          const industry = Array.isArray(industries) && industries.length > 0 ? industries[0] : null
                          const intentStatus = business?.properties?.intentStatus || business?.intent_status
                          const intentVisible = business?.properties?.intentVisible || business?.intent_visibility

                          const displayText = industry
                            ? `${bizName} • ${industry}`
                            : bizName

                          return (
                            <button
                              key={bizId}
                              type="button"
                              onClick={() => {
                                setMapSelectedBusinessId(business.properties?.id || null)
                                setMapSelectBusinessId(business.properties?.id || null)
                                setMapSelectedBusiness(business)
                                if (business.properties?.id) {
                                  const zoom = getZoomFromRadius(mapRadiusKm)
                                  mapRef.current?.zoomToMarkerAndOpenPopup('business', business.properties.id, zoom)
                                }
                              }}
                              className={`w-full text-left p-2 rounded border transition-all ${
                                mapSelectedBusinessId === business.properties?.id
                                  ? 'bg-blue-50 border-blue-500'
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {intentVisible && intentStatus ? (
                                  <span
                                    className={`inline-flex h-2 w-2 rounded-full flex-shrink-0 ${
                                      intentStatus === 'actively_building_talent' ? 'bg-emerald-400' :
                                      intentStatus === 'future_planning' ? 'bg-blue-400' :
                                      'bg-gray-400'
                                    }`}
                                    title={`Intent: ${String(intentStatus).replace(/_/g, ' ')}`}
                                  />
                                ) : null}
                                <div className="font-medium text-gray-900 text-sm truncate">{displayText}</div>
                              </div>
                            </button>
                          )
                        })}
                        {/* Jobs */}
                        {!showOnlyBusinesses && mapJobResults.map((job: any, idx: number) => {
                          const jobId = `job-${job.id || idx}`
                          const businessName = job.business_name || 'Unknown Company'
                          const jobTitle = job.title || 'Untitled Job'
                          const displayText = `${businessName} ${jobTitle}`
                          const locationText =
                            job.location ||
                            [job.city, job.state, job.country].filter(Boolean).join(', ')

                          return (
                            <button
                              key={jobId}
                              type="button"
                              onClick={() => {
                                const jobSelectId = `job:${job.id}`
                                setMapSelectedBusinessId(jobSelectId)
                                setMapSelectBusinessId(null)
                                setMapSelectedBusiness({
                                  id: jobSelectId,
                                  type: 'Feature',
                                  geometry: {
                                    type: 'Point',
                                    coordinates: [job.lng ?? 0, job.lat ?? 0]
                                  },
                                  properties: {
                                    id: jobSelectId,
                                    name: job.business_name || job.title || 'Job',
                                    slug: '',
                                    industries: [],
                                    lat: job.lat ?? 0,
                                    lng: job.lng ?? 0
                                  }
                                })
                                if (job.id && (job.lat != null && job.lng != null)) {
                                  const zoom = getZoomFromRadius(mapRadiusKm)
                                  mapRef.current?.zoomToMarkerAndOpenPopup('job', job.id, zoom)
                                } else {
                                  router.push(`/jobs/${job.id}?fromMap=true&returnTo=${encodeURIComponent('/search')}`)
                                }
                              }}
                              className="w-full text-left p-2 rounded border transition-all bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300"
                            >
                              <div className="flex items-center gap-2">
                                <div className="inline-flex h-2 w-2 rounded-full flex-shrink-0 bg-purple-400" title="Job" />
                                <div className="font-medium text-gray-900 text-sm truncate">{displayText}</div>
                              </div>
                              {locationText && (
                                <div className="text-xs text-gray-600 mt-1 truncate">{locationText}</div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
                )}
              </div>
            </aside>

            {/* RIGHT SIDE: Horizontal layout with Route Intelligence and Map */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4">
              {/* Route Intelligence Panel */}
              {mapPanelsCollapsed ? (
                <div className="flex-shrink-0 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setMapPanelsCollapsed(false)}
                    className="h-auto lg:h-full px-2 py-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-2"
                    title="Expand Route Intelligence"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="text-gray-900 font-semibold text-xs whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      {mapRouteState?.drivingMins ? `${mapRouteState.drivingMins}m drive` : 'Route Intelligence'}
                    </div>
                  </button>
                  <div className="flex flex-col gap-1 px-2">
                    <button
                      type="button"
                      onClick={() => setMapActiveStyle('streets')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        mapActiveStyle === 'streets'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title="Street view"
                    >
                      Street
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapActiveStyle('satellite')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        mapActiveStyle === 'satellite'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title="Satellite view"
                    >
                      Satellite
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full lg:w-72 flex-shrink-0 rounded-xl p-4 border border-gray-200 bg-white overflow-y-auto relative">
                  <button
                    type="button"
                    onClick={() => setMapPanelsCollapsed(true)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 transition-colors z-10"
                    title="Collapse Route Intelligence"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="font-semibold text-gray-900 mb-3 text-sm">Route Intelligence</div>
                  {!mapSelectedBusiness ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      Select a business from the Results panel to calculate routes and commute times.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs text-gray-500 mb-3">
                        Point A: {mapSelectedBusiness.properties.name} • Point B: your chosen living location
                      </div>
                      <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                          <input
                            value={mapRouteQuery}
                            onChange={(e) => {
                              setMapRouteQuery(e.target.value)
                              setMapRouteSuggestionsOpen(true)
                            }}
                            onFocus={() => setMapRouteSuggestionsOpen(true)}
                            onBlur={() => setTimeout(() => setMapRouteSuggestionsOpen(false), 120)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setMapRouteSuggestionsOpen(false)
                                return
                              }
                              if (!mapRouteSuggestionsOpen || !mapRouteSuggestions.length) {
                                if (e.key === 'Enter' && mapRouteQuery.trim()) {
                                  setMapCommittedRouteQuery(mapRouteQuery.trim())
                                  setMapPanelsCollapsed(true)
                                }
                                return
                              }
                              if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                setMapRouteActiveIdx((i) => Math.min(mapRouteSuggestions.length - 1, i + 1))
                                return
                              }
                              if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                setMapRouteActiveIdx((i) => Math.max(0, i - 1))
                                return
                              }
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const pick = mapRouteSuggestions[mapRouteActiveIdx]
                                if (pick) {
                                  setMapRouteQuery(pick.label)
                                  setMapRouteSuggestionsOpen(false)
                                  setMapCommittedRouteQuery(pick.label)
                                  setMapPanelsCollapsed(true)
                                }
                                return
                              }
                            }}
                            placeholder="Set living location…"
                            className="w-full px-3 py-2 pr-8 bg-white text-gray-900 rounded-lg text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={mapRouteSuggestionsOpen}
                            aria-controls="search-map-route-suggestions"
                          />
                          {mapRouteQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setMapRouteQuery('')
                                setMapCommittedRouteQuery('')
                                setMapRouteSuggestions([])
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Clear"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          {mapRouteSuggestionsOpen && mapRouteSuggestions.length > 0 && (
                            <div
                              id="search-map-route-suggestions"
                              role="listbox"
                              className="absolute left-0 right-0 mt-1.5 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-20"
                            >
                              {mapRouteSuggestions.map((s, idx) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                    idx === mapRouteActiveIdx ? 'bg-blue-50 text-blue-900' : 'bg-white text-gray-900 hover:bg-gray-50'
                                  }`}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setMapRouteQuery(s.label)
                                    setMapRouteSuggestionsOpen(false)
                                    setMapCommittedRouteQuery(s.label)
                                    setMapPanelsCollapsed(true)
                                  }}
                                  role="option"
                                  aria-selected={idx === mapRouteActiveIdx}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (mapRouteQuery.trim()) {
                              setMapCommittedRouteQuery(mapRouteQuery.trim())
                              setMapPanelsCollapsed(true)
                            }
                          }}
                          disabled={!mapRouteQuery.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {mapRouteState?.busy ? '…' : 'Set'}
                        </button>
                      </div>
                      {mapRouteState?.to && (
                        <div className="text-xs text-gray-600 mb-3">
                          Living location: {mapRouteState.to.label}
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 rounded border border-gray-200 bg-gray-50 text-center">
                          <div className="text-xs text-gray-500 mb-1">Car</div>
                          {mapRouteState?.drivingKm ? (
                            <>
                              <div className="text-gray-900 font-medium text-sm">{mapRouteState.drivingKm} km</div>
                              <div className="text-gray-500 text-xs">{mapRouteState.drivingMins} min</div>
                            </>
                          ) : (
                            <div className="text-gray-900 font-medium text-sm">—</div>
                          )}
                        </div>
                        <div className="p-2 rounded border border-gray-200 bg-gray-50 text-center">
                          <div className="text-xs text-gray-500 mb-1">Public</div>
                          <div className="text-gray-900 font-medium text-sm">N/A</div>
                        </div>
                        <div className="p-2 rounded border border-gray-200 bg-gray-50 text-center">
                          <div className="text-xs text-gray-500 mb-1">Bike</div>
                          {mapRouteState?.cyclingKm ? (
                            <>
                              <div className="text-gray-900 font-medium text-sm">{mapRouteState.cyclingKm} km</div>
                              <div className="text-gray-500 text-xs">{mapRouteState.cyclingMins} min</div>
                            </>
                          ) : (
                            <div className="text-gray-900 font-medium text-sm">—</div>
                          )}
                        </div>
                      </div>
                      {/* Map View Buttons */}
                      <div className="flex items-center gap-1 pt-2 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setMapActiveStyle('streets')}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            mapActiveStyle === 'streets'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Street view"
                        >
                          Street
                        </button>
                        <button
                          type="button"
                          onClick={() => setMapActiveStyle('satellite')}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            mapActiveStyle === 'satellite'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Satellite view"
                        >
                          Satellite
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Map Container */}
              <div className="flex-1 min-w-0 min-h-[60vh] sm:min-h-[70vh] lg:min-h-0">
                <div className="rounded-xl border border-gray-200 bg-white h-full relative overflow-hidden">
                  <BusinessDiscoveryMap
                    ref={mapRef}
                    returnTo="/search"
                    filters={mapFilters}
                    toggles={mapToggles}
                    onToggle={handleMapToggle}
                    flyTo={mapFlyTo}
                    searchCenter={mapSearchCenter}
                    radiusKm={mapRadiusKm}
                    showAllBusinesses={mapShowAllBusinesses}
                    radiusBusinessesActive={!!mapSearchCenter && mapRadiusSearchType === 'business'}
                    onResults={handleMapResults}
                    selectedBusinessId={mapSelectedBusinessId}
                    onSelectedBusinessId={handleMapSelectedBusinessId}
                    selectBusinessId={mapSelectBusinessId}
                    hideLegend={true}
                    activeStyle={mapActiveStyle}
                    onStyleChange={setMapActiveStyle}
                    onSelectedBusinessChange={setMapSelectedBusiness}
                    onRouteStateChange={setMapRouteState}
                    onRouteQueryChange={setMapRouteQuery}
                    externalRouteQuery={mapCommittedRouteQuery}
                    triggerResize={mapMapResizeTrigger}
                    intentStatus=""
                    intentCompatibility={false}
                    fitBounds={mapMapFitBounds}
                    jobs={memoizedMapJobs}
                  />
                  <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900 text-sm font-medium shadow-lg z-10">
                    {mapResults.length + mapJobResults.length} {mapResults.length + mapJobResults.length === 1 ? 'result' : 'results'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
