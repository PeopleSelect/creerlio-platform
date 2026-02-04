'use client'

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useRouter } from 'next/navigation'

// Dynamic import for mapbox-gl to avoid SSR issues
let mapboxgl: any = null
if (typeof window !== 'undefined') {
  mapboxgl = require('mapbox-gl')
}

export interface BusinessFeature {
  id: string
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: {
    id: string
    name: string
    slug: string
    industries: string[]
    lat: number
    lng: number
    sizeBand?: string
    openness?: string
    intentStatus?: string | null
    intentVisible?: boolean
  }
}

export interface RouteState {
  to?: { label: string; lat: number; lng: number }
  drivingMins?: number
  drivingKm?: number
  cyclingMins?: number
  cyclingKm?: number
  busy: boolean
  error?: string
}

export interface BusinessDiscoveryMapHandle {
  zoomToMarkerAndOpenPopup: (type: 'business' | 'job', id: string | number, zoom?: number) => void
}

interface BusinessDiscoveryMapProps {
  filters: {
    q: string
    industries: string[]
    work: string
  }
  toggles: {
    businesses: boolean
    context: boolean
    schools: boolean
    commute: boolean
    transport: boolean
    shopping: boolean
    property: boolean
  }
  onToggle: (toggles: Partial<BusinessDiscoveryMapProps['toggles']>) => void
  flyTo: { lng: number; lat: number; zoom?: number } | null
  searchCenter: { lng: number; lat: number; label?: string } | null
  radiusKm: number
  showAllBusinesses: boolean
  radiusBusinessesActive?: boolean
  onResults: (results: any[]) => void
  selectedBusinessId: string | null
  onSelectedBusinessId: (id: string | null) => void
  selectBusinessId: string | null
  hideLegend?: boolean
  activeStyle: 'dark' | 'light' | 'satellite' | 'streets'
  onStyleChange: (style: 'dark' | 'light' | 'satellite' | 'streets') => void
  onSelectedBusinessChange: (business: BusinessFeature | null) => void
  onRouteStateChange: (state: RouteState | null) => void
  onRouteQueryChange: (query: string) => void
  externalRouteQuery: string
  triggerResize?: number
  intentStatus?: string
  intentCompatibility?: boolean
  fitBounds?: [[number, number], [number, number]] | null
  returnTo?: string
  jobs?: Array<{
    id: string | number
    title: string
    business_name: string
    business_profile_id?: string | number | null
    lat: number | null
    lng: number | null
    location?: string
    city?: string
    country?: string
  }>
}

const mapStyles: Record<string, string> = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  streets: 'mapbox://styles/mapbox/streets-v12',
}

const DEBUG_LOG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_LOG_ENABLED === 'true'
const DEBUG_ENDPOINT = 'http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc'
const emitDebugLog = (payload: Record<string, unknown>) => {
  if (!DEBUG_LOG_ENABLED) return
  fetch(DEBUG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {})
}

const BusinessDiscoveryMap = forwardRef<BusinessDiscoveryMapHandle, BusinessDiscoveryMapProps>((props, ref) => {
  const returnTo = props.returnTo || '/dashboard/talent'
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const jobMarkersRef = useRef<any[]>([])
  const pointBMarkerRef = useRef<any>(null)
  const pointAMarkerRef = useRef<any>(null)
  const routeBoundsRef = useRef<any>(null)
  const routeGeoRef = useRef<any>(null)
  const routePointARef = useRef<[number, number] | null>(null)
  const lastProcessedSelectIdRef = useRef<string | null>(null)
  const routePointBRef = useRef<[number, number] | null>(null)
  const lastFlyToRef = useRef<{ lng: number; lat: number; zoom?: number } | null>(null)
  const router = useRouter()
  const [mapLoaded, setMapLoaded] = useState(false)
  const [businesses, setBusinesses] = useState<BusinessFeature[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [jobListModal, setJobListModal] = useState<{
    open: boolean
    businessId: string | number | null
    businessName: string
    jobs: Array<{
      id: string | number
      title: string
      business_name: string
      location?: string | null
      city?: string | null
      state?: string | null
      country?: string | null
    }>
  }>({
    open: false,
    businessId: null,
    businessName: '',
    jobs: []
  })
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFetchParamsRef = useRef<string>('')
  const hasFittedInitialBoundsRef = useRef<boolean>(false)
  const onResultsRef = useRef(props.onResults)
  const onSelectedBusinessChangeRef = useRef(props.onSelectedBusinessChange)
  const onSelectedBusinessIdRef = useRef(props.onSelectedBusinessId)
  const onRouteStateChangeRef = useRef(props.onRouteStateChange)

  const getPointAFromSelection = useCallback(() => {
    if (!props.selectedBusinessId) return null
    const selectId = String(props.selectedBusinessId)
    const jobId = selectId.startsWith('job:') ? selectId.slice(4) : null

    const jobMatch = (props.jobs || []).find((job) => {
      if (jobId) return String(job.id) === jobId
      return String(job.id) === selectId
    })
    if (jobMatch?.lat != null && jobMatch?.lng != null) {
      return {
        coords: [jobMatch.lng, jobMatch.lat] as [number, number],
        label: jobMatch.title || jobMatch.business_name || 'Job',
        selectedBiz: null,
      }
    }

    const selectedBiz = businesses.find((b) => {
      const bizId = String(b.properties.id)
      return bizId === selectId || Number(bizId) === Number(selectId)
    })
    if (selectedBiz?.geometry?.coordinates) {
      return {
        coords: selectedBiz.geometry.coordinates as [number, number],
        label: selectedBiz.properties?.name || 'Business',
        selectedBiz,
      }
    }
    return null
  }, [props.selectedBusinessId, props.jobs, businesses])

  // Keep refs updated
  useEffect(() => {
    onResultsRef.current = props.onResults
    onSelectedBusinessChangeRef.current = props.onSelectedBusinessChange
    onSelectedBusinessIdRef.current = props.onSelectedBusinessId
    onRouteStateChangeRef.current = props.onRouteStateChange
  }, [props.onResults, props.onSelectedBusinessChange, props.onSelectedBusinessId, props.onRouteStateChange])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || typeof window === 'undefined' || !mapboxgl) return
    if (map.current) return // Only initialize once

    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!MAPBOX_TOKEN) {
      console.error('NEXT_PUBLIC_MAPBOX_TOKEN is not set')
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyles[props.activeStyle],
      center: [151.2093, -33.8688], // Default to Sydney
      zoom: 11,
      attributionControl: false,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Handle resize when container size changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    // Small delay to ensure DOM has updated
    const timer = setTimeout(() => {
      const container = map.current?.getContainer?.()
      const width = container?.clientWidth
      const height = container?.clientHeight
      // #region agent log
      emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'BusinessDiscoveryMap.tsx:resize',message:'map resize',data:{triggerResize:props.triggerResize,mapLoaded,container:{width,height}},timestamp:Date.now()})
      // #endregion
      map.current?.resize()
      const hasRouteSource = !!map.current?.getSource?.('route-source')
      const bounds = map.current?.getBounds?.()
      // #region agent log
      emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'BusinessDiscoveryMap.tsx:resize',message:'post-resize state',data:{hasRouteSource,bounds:bounds?.toArray?.()},timestamp:Date.now()})
      // #endregion
      if (routeBoundsRef.current && map.current?.fitBounds) {
        // #region agent log
        emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'BusinessDiscoveryMap.tsx:resize',message:'reapply route bounds after resize',data:{bounds:routeBoundsRef.current.toArray?.()},timestamp:Date.now()})
        // #endregion
        map.current.fitBounds(routeBoundsRef.current, {
          padding: { top: 120, bottom: 120, left: 120, right: 120 },
          maxZoom: 13,
          duration: 600,
        })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [props.triggerResize, mapLoaded])

  useEffect(() => {
    if (!map.current || !mapLoaded || !mapContainer.current) return
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      map.current?.resize()
      if (routeBoundsRef.current && map.current?.fitBounds) {
        // #region agent log
        emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'BusinessDiscoveryMap.tsx:resize-observer',message:'resize observer reapply route bounds',data:{bounds:routeBoundsRef.current.toArray?.()},timestamp:Date.now()})
        // #endregion
        map.current.fitBounds(routeBoundsRef.current, {
          padding: { top: 120, bottom: 120, left: 120, right: 120 },
          maxZoom: 13,
          duration: 600,
        })
      }
    })
    observer.observe(mapContainer.current)
    return () => observer.disconnect()
  }, [mapLoaded])

  // Handle map style changes
  useEffect(() => {
    if (map.current && mapLoaded && props.activeStyle) {
      map.current.setStyle(mapStyles[props.activeStyle])
      map.current.once('style.load', () => {
        // Re-render markers after style change
        updateMarkers()
        if (routeGeoRef.current && map.current) {
          const routeSourceId = 'route-source'
          const routeLayerId = 'route-layer'
          if (map.current.getLayer(routeLayerId)) {
            map.current.removeLayer(routeLayerId)
          }
          if (map.current.getSource(routeSourceId)) {
            map.current.removeSource(routeSourceId)
          }
          map.current.addSource(routeSourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: routeGeoRef.current,
            },
          })
          map.current.addLayer({
            id: routeLayerId,
            type: 'line',
            source: routeSourceId,
            paint: {
              'line-color': '#10b981',
              'line-width': 4,
              'line-opacity': 0.8,
            },
          })
          // #region agent log
          emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',location:'BusinessDiscoveryMap.tsx:style-load',message:'route layer restored after style change',data:{hasRouteGeo:!!routeGeoRef.current,routeBounds:routeBoundsRef.current?.toArray?.()},timestamp:Date.now()})
          // #endregion
          if (routeBoundsRef.current) {
            map.current.fitBounds(routeBoundsRef.current, {
              padding: { top: 120, bottom: 120, left: 120, right: 120 },
              maxZoom: 13,
              duration: 600,
            })
          }
        }
      })
    }
  }, [props.activeStyle, mapLoaded])

  // Expose method to zoom to marker and open popup
  useImperativeHandle(ref, () => ({
    zoomToMarkerAndOpenPopup: (type: 'business' | 'job', id: string | number, zoom?: number) => {
      if (!map.current || !mapLoaded) return

      let marker: any = null
      let coords: [number, number] | null = null

      if (type === 'business') {
        marker = markersRef.current.find((m: any) => m._businessId === String(id))
        if (marker) {
          const business = businesses.find((b: BusinessFeature) => b.properties.id === String(id))
          if (business?.geometry?.coordinates) {
            coords = business.geometry.coordinates as [number, number]
          }
        }
      } else if (type === 'job') {
        marker = jobMarkersRef.current.find((m: any) => m._jobId === String(id))
        if (marker) {
          const job = props.jobs?.find((j) => String(j.id) === String(id))
          if (job?.lat != null && job?.lng != null) {
            coords = [job.lng, job.lat]
          }
        }
      }

      if (marker && coords) {
        // Close any open popups first
        markersRef.current.forEach((m: any) => {
          if (m._isPopupOpen && m._popup) {
            m._popup.remove()
            m._isPopupOpen = false
          }
        })
        jobMarkersRef.current.forEach((m: any) => {
          if (m._isPopupOpen && m._popup) {
            m._popup.remove()
            m._isPopupOpen = false
          }
        })

        // Zoom to marker
        map.current.flyTo({
          center: coords,
          zoom: zoom || 14,
          essential: true,
        })

        // Open popup after zoom animation
        setTimeout(() => {
          if (marker._popup && map.current) {
            marker._popup.setLngLat(coords).addTo(map.current)
            marker._isPopupOpen = true
          }
        }, 500) // Wait for flyTo animation to complete
      }
    }
  }), [mapLoaded, businesses, props.jobs])

  // Handle flyTo - prevent infinite loops by tracking last flyTo
  useEffect(() => {
    if (!map.current || !mapLoaded || !props.flyTo) return
    
    // Check if this is the same flyTo as last time to prevent loops
    const currentFlyTo = props.flyTo
    const lastFlyTo = lastFlyToRef.current
    
    if (lastFlyTo && 
        Math.abs(lastFlyTo.lng - currentFlyTo.lng) < 0.0001 &&
        Math.abs(lastFlyTo.lat - currentFlyTo.lat) < 0.0001 &&
        lastFlyTo.zoom === currentFlyTo.zoom) {
      // Same location, skip to prevent loop
      return
    }
    
    lastFlyToRef.current = { ...currentFlyTo }
    
    map.current.flyTo({
      center: [currentFlyTo.lng, currentFlyTo.lat],
      zoom: currentFlyTo.zoom || 12,
      essential: true,
    })
  }, [props.flyTo, mapLoaded])

  useEffect(() => {
    if (!map.current || !mapLoaded || !props.fitBounds) return
    if (routeBoundsRef.current) return
    // #region agent log
    emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H10',location:'BusinessDiscoveryMap.tsx:fit-bounds-prop',message:'fit bounds from parent',data:{bounds:props.fitBounds},timestamp:Date.now()})
    // #endregion
    const bounds = new mapboxgl.LngLatBounds(props.fitBounds[0], props.fitBounds[1])
    map.current.fitBounds(bounds, {
      padding: { top: 80, bottom: 80, left: 80, right: 80 },
      maxZoom: 5,
      duration: 800,
    })
  }, [props.fitBounds, mapLoaded])

  const buildBusinessParams = useCallback(() => {
    const params = new URLSearchParams()
    if (props.filters.q) params.set('q', props.filters.q)
    if (props.filters.industries.length > 0) params.set('industries', props.filters.industries.join(','))
    if (props.filters.work) params.set('work', props.filters.work)

    const useRadius = !!(props.radiusBusinessesActive && props.searchCenter)

    console.log('[BusinessDiscoveryMap] buildBusinessParams:', {
      showAllBusinesses: props.showAllBusinesses,
      radiusBusinessesActive: props.radiusBusinessesActive,
      searchCenter: props.searchCenter,
      useRadius,
      filters: props.filters
    })

    if (props.showAllBusinesses && !useRadius) {
      params.set('show_all', '1')
    }

    if (props.intentStatus) params.set('intent_status', props.intentStatus)
    if (props.intentCompatibility) params.set('intent_compatibility', '1')
    if (useRadius && props.searchCenter) {
      params.set('lat', String(props.searchCenter.lat))
      params.set('lng', String(props.searchCenter.lng))
      params.set('radius', String(props.radiusKm))
    }

    return { params, useRadius }
  }, [
    props.filters.q,
    props.filters.industries?.join(','),
    props.filters.work,
    props.radiusBusinessesActive,
    props.searchCenter?.lat,
    props.searchCenter?.lng,
    props.showAllBusinesses,
    props.intentStatus,
    props.intentCompatibility,
    props.radiusKm,
  ])

  // Fetch businesses from API
  const fetchBusinesses = useCallback(async () => {
    if (!mapLoaded) return
    
    // Don't fetch businesses if global toggle is off AND radius search is not active
    if (!props.showAllBusinesses && !props.radiusBusinessesActive) {
      setBusinesses([])
      onResultsRef.current([])
      return
    }

    const { params, useRadius } = buildBusinessParams()
    const paramsString = params.toString()
    
    // Skip if we're already fetching with the same parameters
    if (lastFetchParamsRef.current === paramsString && isLoading) {
      return
    }
    
    // Update last fetch params
    lastFetchParamsRef.current = paramsString

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const ac = new AbortController()
    abortControllerRef.current = ac

    setIsLoading(true)

    try {
      console.log('[BusinessDiscoveryMap] Fetching businesses with URL:', `/api/map/businesses?${paramsString}`)
      const response = await fetch(`/api/map/businesses?${paramsString}`, {
        signal: ac.signal,
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch businesses')
      }

      const data = await response.json()
      const bizList = Array.isArray(data?.businesses) ? data.businesses : []
      
      // Log first business details for debugging
      if (bizList.length > 0) {
        const firstBiz = bizList[0]
        console.log('[BusinessDiscoveryMap] First business from API:', {
          id: firstBiz.id,
          name: firstBiz.name,
          business_name: firstBiz.business_name,
          nameType: typeof firstBiz.name,
          hasName: !!firstBiz.name,
          hasBusinessName: !!firstBiz.business_name,
          allKeys: Object.keys(firstBiz)
        })
      }
      console.log('[BusinessDiscoveryMap] Total businesses fetched:', bizList.length)

      // Convert to GeoJSON features
      // When showAllBusinesses is true, show ALL businesses, even without coordinates
      // For businesses without coordinates, use a default location (center of Australia) or search center
      const features: BusinessFeature[] = bizList
        .map((b: any) => {
          // Determine display coordinates
          let displayLat = b.lat
          let displayLng = b.lng
          
          // If no coordinates, try to use search center or default to center of Australia
          if ((displayLat == null || displayLng == null || !Number.isFinite(displayLat) || !Number.isFinite(displayLng))) {
            if (useRadius && props.searchCenter) {
              // Use search center as approximate location
              displayLat = props.searchCenter.lat
              displayLng = props.searchCenter.lng
            } else if (props.showAllBusinesses) {
              // When showing all businesses, use center of Australia as default location
              // This ensures all businesses appear on the map even without coordinates
              displayLat = -25.2744 // Center of Australia
              displayLng = 133.7751
            } else {
              // If no coordinates and no search center and not showing all, skip this business
              return null
            }
          }
          
          // Ensure we have valid coordinates
          if (displayLat == null || displayLng == null || !Number.isFinite(displayLat) || !Number.isFinite(displayLng)) {
            return null
          }
          
          return {
            id: String(b.id),
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [Number(displayLng), Number(displayLat)],
            },
            properties: {
              id: String(b.id),
              // Try multiple name fields and ensure we have a valid name
              name: (b.name && String(b.name).trim()) || 
                    (b.business_name && String(b.business_name).trim()) || 
                    (b.company_name && String(b.company_name).trim()) ||
                    (b.display_name && String(b.display_name).trim()) ||
                    'Business',
              slug: String(b.slug || ''),
              industries: Array.isArray(b.industries) ? b.industries : (b.industry ? [b.industry] : []),
              lat: Number(displayLat),
              lng: Number(displayLng),
              sizeBand: b.size_band || b.sizeBand,
              openness: b.openness,
              intentStatus: b.intent_status ?? null,
              intentVisible: !!b.intent_visibility,
            },
          }
        })
        .filter((f): f is BusinessFeature => f !== null)

      // Debug: Log all features before and after filtering
      console.log('[BusinessDiscoveryMap] Features created:', {
        beforeFilter: bizList.length,
        afterFilter: features.length,
        allFeatures: features.map(f => ({
          id: f.properties.id,
          name: f.properties.name,
          lat: f.properties.lat,
          lng: f.properties.lng
        }))
      })

      setBusinesses(features)

      // Pass the full BusinessFeature objects so all properties are available in the results
      onResultsRef.current(features)
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch businesses:', error)
        setBusinesses([])
        onResultsRef.current([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [mapLoaded, props.showAllBusinesses, buildBusinessParams])

  // Trigger fetch when filters change - but only if params actually changed
  useEffect(() => {
    if (!mapLoaded) return
    
    const { params } = buildBusinessParams()
    const paramsString = params.toString()

    const shouldForceRefetch = props.showAllBusinesses && businesses.length === 0

    // Only fetch if params actually changed (don't check isLoading to avoid blocking)
    if (lastFetchParamsRef.current !== paramsString || shouldForceRefetch) {
      fetchBusinesses()
    }
  }, [mapLoaded, props.showAllBusinesses, businesses.length, buildBusinessParams, fetchBusinesses])

  // Clear businesses when both global toggle and radius search are off
  useEffect(() => {
    if (!props.showAllBusinesses && !props.radiusBusinessesActive) {
      setBusinesses([])
      onResultsRef.current([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.showAllBusinesses, props.radiusBusinessesActive])

  // Ensure toggling showAllBusinesses or radius search always refetches fresh data
  useEffect(() => {
    // Reset cached params so the next toggle forces a refetch
    lastFetchParamsRef.current = ''
    // Reset initial bounds flag so we fit bounds again
    hasFittedInitialBoundsRef.current = false
    if (props.showAllBusinesses || props.radiusBusinessesActive) {
      fetchBusinesses()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.showAllBusinesses, props.radiusBusinessesActive])

  // Force refetch on component mount to handle navigation back to page
  useEffect(() => {
    // Reset refs on mount to ensure fresh data and bounds fitting
    lastFetchParamsRef.current = ''
    hasFittedInitialBoundsRef.current = false
    if (mapLoaded && props.showAllBusinesses) {
      fetchBusinesses()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]) // Only run when mapLoaded changes (i.e., on mount)

  // Fit map bounds to show ALL businesses when showAllBusinesses is true
  useEffect(() => {
    if (!map.current || !mapLoaded || !props.showAllBusinesses || businesses.length === 0) return

    // Only fit bounds once per showAllBusinesses toggle to avoid jarring map movement
    if (hasFittedInitialBoundsRef.current) return

    // Only fit bounds if we have businesses with valid coordinates
    const businessesWithCoords = businesses.filter(
      b => b.geometry?.coordinates &&
           Number.isFinite(b.geometry.coordinates[0]) &&
           Number.isFinite(b.geometry.coordinates[1])
    )

    if (businessesWithCoords.length === 0) return

    // Calculate bounds that include ALL businesses
    const bounds = new mapboxgl.LngLatBounds()
    businessesWithCoords.forEach(b => {
      bounds.extend(b.geometry.coordinates as [number, number])
    })

    // Add padding and fit the map to show all businesses
    console.log('[BusinessDiscoveryMap] Fitting bounds to all businesses:', {
      count: businessesWithCoords.length,
      bounds: bounds.toArray()
    })

    map.current.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      maxZoom: 12, // Don't zoom in too much
      duration: 1000
    })

    // Mark that we've fitted initial bounds
    hasFittedInitialBoundsRef.current = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses.length, mapLoaded, props.showAllBusinesses])

  // Create/update markers - only recreate when businesses change, not when selection changes
  const updateMarkers = useCallback(() => {
    if (!map.current || !mapLoaded) return

    // Get current business IDs
    const currentBusinessIds = businesses.map(b => b.properties.id)
    const existingMarkerIds = markersRef.current.map((m: any) => m._businessId)

    // Remove markers for businesses that no longer exist
    markersRef.current = markersRef.current.filter((marker: any) => {
      if (!currentBusinessIds.includes(marker._businessId)) {
        marker.remove()
        return false
      }
      return true
    })

    // Add markers for new businesses - created ONCE, never recreated
    businesses.forEach((business) => {
      if (!existingMarkerIds.includes(business.properties.id)) {
        // Create marker element - fixed dimensions, no transforms
        const el = document.createElement('div')
        el.className = 'business-marker'
        el.style.width = '24px'
        el.style.height = '24px'
        el.style.borderRadius = '50%'
        el.style.backgroundColor = '#10b981'
        el.style.border = '3px solid white'
        el.style.cursor = 'pointer'
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)'

        // Create popup - independent lifecycle, NOT attached to marker
        const intentLabel = business.properties.intentVisible && business.properties.intentStatus
          ? `<div style="font-size: 10px; color: #0f766e; margin-bottom: 4px;">Intent: ${business.properties.intentStatus.replace(/_/g, ' ')}</div>`
          : ''

        const popupContent = `
          <div style="padding: 6px; min-width: 140px;">
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px; color: #1e293b;">
              ${business.properties.name}
            </div>
            ${intentLabel}
            <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
              ${business.properties.industries.length > 0 ? business.properties.industries[0] : 'Business'}
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <a
                href="/dashboard/business/view?id=${business.properties.id}&from=talent-map"
                class="business-profile-link"
                data-id="${business.properties.id}"
                data-slug="${business.properties.slug}"
                style="display: inline-block; padding: 4px 10px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; text-align: center;"
                onclick="window.location.href='/dashboard/business/view?id=${business.properties.id}&from=talent-map'; return false;"
              >
                View Business
              </a>
              <button
                class="business-jobs-btn"
                data-business-id="${business.properties.id}"
                style="display: inline-block; padding: 4px 10px; background: #8b5cf6; color: white; text-decoration: none; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; text-align: center;"
              >
                View Jobs
              </button>
            </div>
          </div>
        `

        const popup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          anchor: 'bottom',
          offset: 20,
          maxWidth: '220px'
        }).setHTML(popupContent)

        // Create marker - anchored to exact coordinates, NEVER moved
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center'
        })
          .setLngLat(business.geometry.coordinates)
          .addTo(map.current)

        // Log marker creation for verification
        console.log(`[MARKER CREATED] ID: ${business.properties.id}, LngLat:`, marker.getLngLat())

        // Store references
        ;(marker as any)._businessId = business.properties.id
        ;(marker as any)._element = el
        ;(marker as any)._popup = popup
        ;(marker as any)._isPopupOpen = false

        // CLICK handler - opens/closes popup, NO hover behavior
        el.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()

          // #region agent log
          emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'BusinessDiscoveryMap.tsx:marker-click',message:'marker clicked',data:{businessId:business.properties.id,hasRouteSource:!!map.current?.getSource?.('route-source'),routeBounds:routeBoundsRef.current?.toArray?.(),bounds:map.current?.getBounds?.()?.toArray?.()},timestamp:Date.now()})
          // #endregion

          // Verify marker coordinates haven't changed
          console.log(`[MARKER CLICK] ID: ${business.properties.id}, LngLat:`, marker.getLngLat())

          // Toggle popup
          if ((marker as any)._isPopupOpen) {
            popup.remove()
            ;(marker as any)._isPopupOpen = false
          } else {
            popup.setLngLat(business.geometry.coordinates).addTo(map.current)
            ;(marker as any)._isPopupOpen = true
          }

          // Update selection state
          onSelectedBusinessIdRef.current(business.properties.id)
          onSelectedBusinessChangeRef.current(business)
          onRouteStateChangeRef.current({ busy: false })
        })

        // Click handler for "View Jobs" button on business marker
        const handleBusinessViewJobsClick = async (e: Event) => {
          e.preventDefault()
          e.stopPropagation()
          
          const businessId = business.properties.id
          const businessName = business.properties.name
          
          // Close popup
          popup.remove()
          ;(marker as any)._isPopupOpen = false
          
          // Fetch all jobs for this business
          try {
            const response = await fetch(`/api/jobs/by-business?business_id=${businessId}`, {
              cache: 'no-store'
            })
            
            if (response.ok) {
              const data = await response.json()
              const jobsList = Array.isArray(data?.jobs) ? data.jobs : []
              const apiBusinessName = data?.business_name || businessName
              
              if (jobsList.length > 1) {
                // Multiple jobs - show modal
                setJobListModal({
                  open: true,
                  businessId: businessId,
                  businessName: apiBusinessName,
                  jobs: jobsList.map((j: any) => ({
                    id: j.id,
                    title: j.title || 'Untitled Job',
                    business_name: j.business_name || apiBusinessName,
                    location: j.location || null,
                    location_label: j.location_label || null,
                    location_name: j.location_name || null,
                    city: j.city || null,
                    state: j.state || null,
                    country: j.country || null,
                  }))
                })
              } else if (jobsList.length === 1) {
                // Single job - go directly to it
                router.push(`/jobs/${jobsList[0].id}?fromMap=true&returnTo=${encodeURIComponent(returnTo)}`)
              } else {
                // No jobs found - show message or navigate to business profile
                alert('No jobs available for this business.')
              }
            } else {
              // If API fails, show error
              alert('Unable to load jobs for this business.')
            }
          } catch (error) {
            console.error('[BusinessDiscoveryMap] Error fetching jobs for business:', error)
            alert('Unable to load jobs for this business.')
          }
        }
        
        // Attach click handler to "View Jobs" button after popup is added to DOM
        popup.on('open', () => {
          setTimeout(() => {
            const button = popup.getElement()?.querySelector('.business-jobs-btn')
            if (button) {
              button.addEventListener('click', handleBusinessViewJobsClick)
            }
          }, 100)
        })

        // Popup close handler
        popup.on('close', () => {
          ;(marker as any)._isPopupOpen = false
        })

        markersRef.current.push(marker)
      }
    })
  }, [businesses, mapLoaded, props.selectedBusinessId])

  // Update markers when businesses change
  useEffect(() => {
    updateMarkers()
  }, [updateMarkers])

  // Create/update job markers
  const updateJobMarkers = useCallback(() => {
    if (!map.current || !mapLoaded) return

    const jobs = props.jobs || []
    console.log('[BusinessDiscoveryMap] updateJobMarkers called:', {
      jobsCount: jobs.length,
      jobs: jobs.map((j: any) => ({
        id: j.id,
        title: j.title,
        business_name: j.business_name,
        lat: j.lat,
        lng: j.lng,
        hasCoords: !!(j.lat && j.lng)
      }))
    })
    const currentJobIds = jobs.map(j => String(j.id))
    const existingJobMarkerIds = jobMarkersRef.current.map((m: any) => m._jobId)

    // Remove markers for jobs that no longer exist
    jobMarkersRef.current = jobMarkersRef.current.filter((marker: any) => {
      if (!currentJobIds.includes(marker._jobId)) {
        marker.remove()
        return false
      }
      return true
    })

    // Add markers for new jobs
    jobs.forEach((job) => {
      if (!existingJobMarkerIds.includes(String(job.id))) {
        // Try to get coordinates - use job coordinates, or try to geocode from location
        let jobLat = job.lat
        let jobLng = job.lng
        
        // If no coordinates but has location data, try to use search center as approximate location
        // (for jobs that passed the location filter but don't have exact coordinates)
        if ((jobLat == null || jobLng == null || !Number.isFinite(jobLat) || !Number.isFinite(jobLng)) && props.searchCenter) {
          // Use search center as approximate location for jobs without coordinates
          jobLat = props.searchCenter.lat
          jobLng = props.searchCenter.lng
        }
        
        // Skip if still no coordinates
        if (jobLat == null || jobLng == null || !Number.isFinite(jobLat) || !Number.isFinite(jobLng)) {
          console.log('[BusinessDiscoveryMap] Skipping job marker - no coordinates:', {
            jobId: job.id,
            title: job.title,
            hasLat: job.lat != null,
            hasLng: job.lng != null,
            hasSearchCenter: !!props.searchCenter
          })
          return
        }

        // Create marker element - purple color for jobs
        const el = document.createElement('div')
        el.className = 'job-marker'
        el.style.width = '24px'
        el.style.height = '24px'
        el.style.borderRadius = '50%'
        el.style.backgroundColor = '#8b5cf6'
        el.style.border = '3px solid white'
        el.style.cursor = 'pointer'
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)'

        const businessName = job.business_name || 'Unknown Company'
        const jobTitle = job.title || 'Untitled Job'
        const location = job.location || job.city || job.country || ''

        const popupContent = `
          <div style="padding: 6px; min-width: 140px;">
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px; color: #1e293b;">
              ${businessName}
            </div>
            <div style="font-size: 12px; color: #475569; margin-bottom: 4px; font-weight: 500;">
              ${jobTitle}
            </div>
            ${location ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${location}</div>` : ''}
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <a
                href="/dashboard/business/view?id=${job.business_profile_id || ''}&from=talent-map"
                class="job-business-link"
                data-business-id="${job.business_profile_id || ''}"
                style="display: inline-block; padding: 4px 10px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; text-align: center;"
                onclick="window.location.href='/dashboard/business/view?id=${job.business_profile_id || ''}&from=talent-map'; return false;"
              >
                View Business
              </a>
              <button
                class="job-link-btn"
                data-job-id="${job.id}"
                data-business-id="${job.business_profile_id || ''}"
                style="display: inline-block; padding: 4px 10px; background: #8b5cf6; color: white; text-decoration: none; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; text-align: center;"
              >
                View Jobs
              </button>
            </div>
          </div>
        `

        const popup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          anchor: 'bottom',
          offset: 20,
          maxWidth: '220px'
        }).setHTML(popupContent)

        // Create marker
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center'
        })
          .setLngLat([jobLng, jobLat])
          .addTo(map.current)
        
        console.log('[BusinessDiscoveryMap] Created job marker:', {
          jobId: job.id,
          title: job.title,
          coords: [jobLng, jobLat]
        })

        // Store references
        ;(marker as any)._jobId = String(job.id)
        ;(marker as any)._businessId = String(job.business_profile_id || '')
        ;(marker as any)._element = el
        ;(marker as any)._popup = popup
        ;(marker as any)._isPopupOpen = false

        // Click handler for marker
        el.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()

        const jobSelectId = `job:${job.id}`
        onSelectedBusinessIdRef.current(jobSelectId)
        const jobBusinessName = job.business_name || job.title || 'Job'
        const selectedBusiness = {
          id: jobSelectId,
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [jobLng, jobLat]
          },
          properties: {
            id: jobSelectId,
            name: jobBusinessName,
            slug: '',
            industries: [],
            lat: jobLat,
            lng: jobLng
          }
        } as BusinessFeature
        onSelectedBusinessChangeRef.current(selectedBusiness)

          // Toggle popup
          if ((marker as any)._isPopupOpen) {
            popup.remove()
            ;(marker as any)._isPopupOpen = false
          } else {
            popup.setLngLat([job.lng, job.lat]).addTo(map.current)
            ;(marker as any)._isPopupOpen = true
          }
        })

        // Click handler for "View Jobs" button - fetch all jobs for this business
        const handleViewJobsClick = async (e: Event) => {
          e.preventDefault()
          e.stopPropagation()
          
          const businessId = (marker as any)._businessId
          const currentJobBusinessName = job.business_name || 'Unknown Company'
          
          // Close popup
          popup.remove()
          ;(marker as any)._isPopupOpen = false
          
          // Fetch all jobs for this business
          try {
            const response = await fetch(`/api/jobs/by-business?business_id=${businessId}`, {
              cache: 'no-store'
            })
            
            if (response.ok) {
              const data = await response.json()
              const jobsList = Array.isArray(data?.jobs) ? data.jobs : []
              const apiBusinessName = data?.business_name || currentJobBusinessName
              
              if (jobsList.length > 1) {
                // Multiple jobs - show modal
                setJobListModal({
                  open: true,
                  businessId: businessId,
                  businessName: apiBusinessName,
                  jobs: jobsList.map((j: any) => ({
                    id: j.id,
                    title: j.title || 'Untitled Job',
                    business_name: j.business_name || apiBusinessName,
                    location: j.location || null,
                    location_label: j.location_label || null,
                    location_name: j.location_name || null,
                    city: j.city || null,
                    state: j.state || null,
                    country: j.country || null,
                  }))
                })
              } else if (jobsList.length === 1) {
                // Single job - go directly to it
                router.push(`/jobs/${jobsList[0].id}?fromMap=true&returnTo=${encodeURIComponent(returnTo)}`)
              } else {
                // No jobs found - go to the job we clicked
                router.push(`/jobs/${job.id}?fromMap=true&returnTo=${encodeURIComponent(returnTo)}`)
              }
            } else {
              // If API fails, go to the job we clicked
              router.push(`/jobs/${job.id}?fromMap=true&returnTo=${encodeURIComponent(returnTo)}`)
            }
          } catch (error) {
            console.error('[BusinessDiscoveryMap] Error fetching jobs for business:', error)
            // On error, go to the job we clicked
            router.push(`/jobs/${job.id}?fromMap=true&returnTo=${encodeURIComponent(returnTo)}`)
          }
        }
        
        // Attach click handler to button after popup is added to DOM
        popup.on('open', () => {
          setTimeout(() => {
            const button = popup.getElement()?.querySelector('.job-link-btn')
            if (button) {
              button.addEventListener('click', handleViewJobsClick)
            }
          }, 100)
        })

        // Popup close handler
        popup.on('close', () => {
          ;(marker as any)._isPopupOpen = false
        })

        jobMarkersRef.current.push(marker)
      }
    })
  }, [props.jobs, mapLoaded])

  // Update job markers when jobs change
  useEffect(() => {
    updateJobMarkers()
  }, [updateJobMarkers])

  // Update marker colors and popups when selection changes (without recreating markers)
  useEffect(() => {
    markersRef.current.forEach((marker: any) => {
      const el = marker._element
      const popup = marker._popup
      const isSelected = marker._businessId === props.selectedBusinessId

      if (el) {
        // Update marker color
        el.style.backgroundColor = isSelected ? '#3b82f6' : '#10b981'
      }

      if (popup) {
        // Show popup for selected business, hide for others
        if (isSelected) {
          // #region agent log
          emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'BusinessDiscoveryMap.tsx:selection-popup',message:'popup add start',data:{businessId:marker._businessId,routeBounds:routeBoundsRef.current?.toArray?.(),bounds:map.current?.getBounds?.()?.toArray?.()},timestamp:Date.now()})
          // #endregion
          popup.addTo(map.current)
          // #region agent log
          emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'BusinessDiscoveryMap.tsx:selection-popup',message:'popup add end',data:{businessId:marker._businessId,bounds:map.current?.getBounds?.()?.toArray?.()},timestamp:Date.now()})
          // #endregion
        } else {
          popup.remove()
        }
      }
    })
  }, [props.selectedBusinessId])

  // Handle selectBusinessId prop - fly to location when business is selected
  useEffect(() => {
    const selectIdStr = props.selectBusinessId ? String(props.selectBusinessId).trim() : null
    
    // Skip if we've already processed this ID
    if (!selectIdStr || selectIdStr === lastProcessedSelectIdRef.current) {
      return
    }
    
    if (!map.current || !mapLoaded) {
      return
    }
    
    // Wait for businesses to load
    if (businesses.length === 0) {
      if (isLoading) {
        // Still loading, wait a bit more
        return
      }
      // Not loading but no businesses - business might not be in current results
      return
    }
    
    // Try multiple matching strategies
    const business = businesses.find(b => {
      const bizIdStr = String(b.properties.id).trim()
      const bizIdNum = Number(b.properties.id)
      const selectIdNum = Number(selectIdStr)
      
      // Try exact ID match (string)
      if (bizIdStr === selectIdStr) {
        return true
      }
      // Try numeric ID match (only if both are valid numbers)
      if (!isNaN(bizIdNum) && !isNaN(selectIdNum) && bizIdNum === selectIdNum) {
        return true
      }
      // Try slug match (if selectBusinessId is a slug)
      if (b.properties.slug && String(b.properties.slug).trim() === selectIdStr) {
        return true
      }
      // Try name match (case-insensitive)
      if (b.properties.name && String(b.properties.name).toLowerCase().trim() === selectIdStr.toLowerCase().trim()) {
        return true
      }
      return false
    })
    
    if (business) {
      lastProcessedSelectIdRef.current = selectIdStr
      onSelectedBusinessChangeRef.current(business)
      // Fly to the business location when selected from results
      const [lng, lat] = business.geometry.coordinates
      if (Number.isFinite(lng) && Number.isFinite(lat) && lng !== 0 && lat !== 0) {
        try {
          map.current.flyTo({
            center: [lng, lat],
            zoom: 14, // Zoom in closer when selecting a business
            duration: 1000, // Smooth animation
            essential: true, // Make it essential so it doesn't get cancelled
          })
        } catch (flyErr) {
          console.error('[BusinessDiscoveryMap] Fly-to error:', flyErr)
          // Fallback: just set the center without animation
          try {
            map.current.setCenter([lng, lat])
            map.current.setZoom(14)
          } catch (setErr) {
            console.error('[BusinessDiscoveryMap] Set center/zoom also failed:', setErr)
          }
        }
      }
    }
  }, [props.selectBusinessId, businesses, mapLoaded, isLoading])

  // Draw commute rings around selected business
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const sourceId = 'commute-rings-source'
    const layerId = 'commute-rings-layer'

    // Remove existing layers and sources
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId)
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId)
    }

    // Only draw if commute toggle is enabled and business is selected
    if (!props.toggles.commute || !props.selectedBusinessId) return

    const selectedBiz = businesses.find(b => b.properties.id === props.selectedBusinessId)
    if (!selectedBiz) return

    const center = selectedBiz.geometry.coordinates
    const radiusInKm = props.radiusKm

    // Create concentric circles at different distances
    const createCircle = (radiusKm: number) => {
      const points = 64
      const coords = []
      const distanceX = radiusKm / (111.32 * Math.cos(center[1] * Math.PI / 180))
      const distanceY = radiusKm / 110.574

      for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI)
        const x = distanceX * Math.cos(theta)
        const y = distanceY * Math.sin(theta)
        coords.push([center[0] + x, center[1] + y])
      }
      coords.push(coords[0]) // Close the circle

      return coords
    }

    // Create multiple rings: 25%, 50%, 75%, 100% of radius
    const rings = [
      { distance: radiusInKm * 0.25, opacity: 0.15 },
      { distance: radiusInKm * 0.5, opacity: 0.12 },
      { distance: radiusInKm * 0.75, opacity: 0.09 },
      { distance: radiusInKm, opacity: 0.06 },
    ]

    const features = rings.map((ring, idx) => ({
      type: 'Feature' as const,
      properties: { opacity: ring.opacity },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [createCircle(ring.distance)],
      },
    }))

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: features,
      },
    })

    map.current.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': ['get', 'opacity'],
      },
    })

    // Add ring borders
    map.current.addLayer({
      id: `${layerId}-outline`,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#3b82f6',
        'line-width': 1,
        'line-opacity': 0.3,
      },
    })
  }, [mapLoaded, props.toggles.commute, props.selectedBusinessId, businesses, props.radiusKm])

  // Handle external route query changes (when user clicks "Set" button)
  // Also handle clearing the route when query is empty
  useEffect(() => {
    if (!mapLoaded) return

    // #region agent log
    emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'BusinessDiscoveryMap.tsx:external-route',message:'external route query change',data:{hasQuery:!!props.externalRouteQuery,queryLength:props.externalRouteQuery?.length ?? 0,selectedBusinessId:props.selectedBusinessId,mapLoaded},timestamp:Date.now()})
    // #endregion

    // If route query is cleared, remove route from map
    if (!props.externalRouteQuery || props.externalRouteQuery.trim() === '') {
      const routeSourceId = 'route-source'
      const routeLayerId = 'route-layer'
      
      // Remove route layer and source
      if (map.current.getLayer(routeLayerId)) {
        map.current.removeLayer(routeLayerId)
      }
      if (map.current.getSource(routeSourceId)) {
        map.current.removeSource(routeSourceId)
      }
      
      // Remove Point B marker
      if (pointBMarkerRef.current) {
        pointBMarkerRef.current.remove()
        pointBMarkerRef.current = null
      }

      // Remove Point A marker (for jobs)
      if (pointAMarkerRef.current) {
        pointAMarkerRef.current.remove()
        pointAMarkerRef.current = null
      }

      // Restore Point A marker to original position if it was offset (for businesses)
      const pointAInfo = getPointAFromSelection()
      if (pointAInfo?.selectedBiz) {
        const existingPointAMarker = markersRef.current.find(
          (m: any) => m._businessId === pointAInfo.selectedBiz.properties.id
        )
        if (existingPointAMarker && (existingPointAMarker as any)._originalLngLat) {
          existingPointAMarker.setLngLat((existingPointAMarker as any)._originalLngLat)
          delete (existingPointAMarker as any)._originalLngLat
        }
      }
      
      // Clear route state
      onRouteStateChangeRef.current({ busy: false, error: null, to: null, drivingMins: null, cyclingMins: null })
      return
    }

    if (!props.selectedBusinessId) return

    const pointAInfo = getPointAFromSelection()
    if (!pointAInfo) return
    const selectedBiz = pointAInfo.selectedBiz

    // Geocode the route query to get Point B
    const geocodePointB = async () => {
      const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      if (!MAPBOX_TOKEN) return

      onRouteStateChangeRef.current({ busy: true })

      try {
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(props.externalRouteQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
        const geocodeRes = await fetch(geocodeUrl)
        const geocodeData = await geocodeRes.json()

        if (!geocodeData.features || geocodeData.features.length === 0) {
          onRouteStateChangeRef.current({ busy: false, error: 'Location not found' })
          return
        }

        const pointB = geocodeData.features[0]
        const [lngB, latB] = pointB.center
        const pointBLabel = pointB.place_name

        // Calculate routes using Mapbox Directions API
        const pointA = pointAInfo.coords

        // Calculate driving route
        const drivingUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${pointA[0]},${pointA[1]};${lngB},${latB}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        const drivingRes = await fetch(drivingUrl)
        const drivingData = await drivingRes.json()

        // Calculate cycling route
        const cyclingUrl = `https://api.mapbox.com/directions/v5/mapbox/cycling/${pointA[0]},${pointA[1]};${lngB},${latB}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        const cyclingRes = await fetch(cyclingUrl)
        const cyclingData = await cyclingRes.json()

        const drivingMins = drivingData.routes?.[0]?.duration ? Math.round(drivingData.routes[0].duration / 60) : undefined
        const drivingKm = drivingData.routes?.[0]?.distance ? Math.round(drivingData.routes[0].distance / 100) / 10 : undefined // Convert meters to km with 1 decimal
        const cyclingMins = cyclingData.routes?.[0]?.duration ? Math.round(cyclingData.routes[0].duration / 60) : undefined
        const cyclingKm = cyclingData.routes?.[0]?.distance ? Math.round(cyclingData.routes[0].distance / 100) / 10 : undefined

        // Draw the driving route on the map
        if (drivingData.routes?.[0]?.geometry) {
          const routeSourceId = 'route-source'
          const routeLayerId = 'route-layer'

          // Remove existing route
          if (map.current.getLayer(routeLayerId)) {
            map.current.removeLayer(routeLayerId)
          }
          if (map.current.getSource(routeSourceId)) {
            map.current.removeSource(routeSourceId)
          }

          map.current.addSource(routeSourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: drivingData.routes[0].geometry,
            },
          })

          map.current.addLayer({
            id: routeLayerId,
            type: 'line',
            source: routeSourceId,
            paint: {
              'line-color': '#10b981',
              'line-width': 4,
              'line-opacity': 0.8,
            },
          })
          routeGeoRef.current = drivingData.routes[0].geometry
          routePointARef.current = [pointA[0], pointA[1]]
          routePointBRef.current = [lngB, latB]
        }

        // Create Point A marker for jobs (businesses already have their own markers)
        if (!selectedBiz) {
          // Job selected - create a dedicated Point A marker
          if (pointAMarkerRef.current) {
            pointAMarkerRef.current.remove()
            pointAMarkerRef.current = null
          }

          const pointAEl = document.createElement('div')
          pointAEl.style.width = '32px'
          pointAEl.style.height = '32px'
          pointAEl.style.borderRadius = '50%'
          pointAEl.style.backgroundColor = '#3b82f6' // Blue for Point A
          pointAEl.style.border = '3px solid white'
          pointAEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)'
          pointAEl.style.zIndex = '2'

          const pointAPopup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
            closeOnClick: false,
          }).setHTML(`
            <div style="background: #1e293b; color: white; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1);">
              <div style="color: #3b82f6; font-size: 10px; margin-bottom: 2px;">Point A</div>
              ${pointAInfo.label}
            </div>
          `)

          const pointAMarker = new mapboxgl.Marker({
            element: pointAEl,
            anchor: 'center',
            offset: [0, -40],
          })
            .setLngLat([pointA[0], pointA[1]]) // Use actual coordinates
            .setPopup(pointAPopup)
            .addTo(map.current)

          pointAMarker.togglePopup()
          pointAMarkerRef.current = pointAMarker
        }

        // Create or update draggable Point B marker (offset to avoid route)
        if (pointBMarkerRef.current) {
          pointBMarkerRef.current.remove()
        }

        const markerEl = document.createElement('div')
        markerEl.style.width = '32px'
        markerEl.style.height = '32px'
        markerEl.style.borderRadius = '50%'
        markerEl.style.backgroundColor = '#ef4444'
        markerEl.style.border = '3px solid white'
        markerEl.style.cursor = 'grab'
        markerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)'

        // Create popup for Point B
        const shortLabel = pointBLabel.split(',')[0] || 'Point B'
        const pointBPopup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false,
          className: 'point-b-popup',
        }).setHTML(`
          <div style="background: #1e293b; color: white; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1);">
            <div style="color: #ef4444; font-size: 10px; margin-bottom: 2px;">Point B</div>
            ${shortLabel}
          </div>
        `)

        // Store original Point B position for route calculations
        const pointBOriginalLngLat = [lngB, latB]
        
        const pointBMarker = new mapboxgl.Marker(markerEl, { draggable: true })
          .setLngLat([lngB, latB]) // Use actual coordinates
          .setPopup(pointBPopup)
          .addTo(map.current)
        
        // Store original position in marker for route calculations
        ;(pointBMarker as any)._originalLngLat = pointBOriginalLngLat

        // Show popup by default
        pointBMarker.togglePopup()

        // Fit map bounds to show entire route with padding
        // Use setTimeout to ensure this runs after any other map operations
        setTimeout(() => {
          if (!map.current) return

          const bounds = new mapboxgl.LngLatBounds()
          bounds.extend([pointA[0], pointA[1]]) // Point A (business)
          bounds.extend([lngB, latB]) // Point B (living location)

          // Also include route geometry points for a better fit
          if (drivingData.routes?.[0]?.geometry?.coordinates) {
            drivingData.routes[0].geometry.coordinates.forEach((coord: [number, number]) => {
              bounds.extend(coord)
            })
          }

          const padding = { top: 120, bottom: 120, left: 150, right: 150 }
          // #region agent log
          emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'BusinessDiscoveryMap.tsx:fitBounds',message:'fitting bounds for route',data:{bounds:bounds.toArray(),padding},timestamp:Date.now()})
          // #endregion
          routeBoundsRef.current = bounds
          map.current.fitBounds(bounds, {
            padding,
            maxZoom: 13,
            duration: 1200,
          })
          // #region agent log
          emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'BusinessDiscoveryMap.tsx:fitBounds',message:'fitBounds called',data:{padding},timestamp:Date.now()})
          // #endregion
        }, 300)

        // Recalculate route when marker is dragged
        pointBMarker.on('dragend', async () => {
          try {
            const pointAInfo = getPointAFromSelection()
            if (!pointAInfo) return

            const pointA = pointAInfo.coords

            // Get the dragged position directly
            const draggedLngLat = pointBMarker.getLngLat()
            const newLngLat = { lng: draggedLngLat.lng, lat: draggedLngLat.lat }

            // Recalculate driving route
            const drivingUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${pointA[0]},${pointA[1]};${newLngLat.lng},${newLngLat.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
            const drivingRes = await fetch(drivingUrl)
            const drivingData = await drivingRes.json()

            // Recalculate cycling route
            const cyclingUrl = `https://api.mapbox.com/directions/v5/mapbox/cycling/${pointA[0]},${pointA[1]};${newLngLat.lng},${newLngLat.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
            const cyclingRes = await fetch(cyclingUrl)
            const cyclingData = await cyclingRes.json()

            const newDrivingMins = drivingData.routes?.[0]?.duration ? Math.round(drivingData.routes[0].duration / 60) : undefined
            const newDrivingKm = drivingData.routes?.[0]?.distance ? Math.round(drivingData.routes[0].distance / 100) / 10 : undefined
            const newCyclingMins = cyclingData.routes?.[0]?.duration ? Math.round(cyclingData.routes[0].duration / 60) : undefined
            const newCyclingKm = cyclingData.routes?.[0]?.distance ? Math.round(cyclingData.routes[0].distance / 100) / 10 : undefined

            // Store the new position
            ;(pointBMarker as any)._originalLngLat = [newLngLat.lng, newLngLat.lat]

            // Update route on map
            if (drivingData.routes?.[0]?.geometry) {
              const routeSourceId = 'route-source'
              const source = map.current.getSource(routeSourceId)
              if (source) {
                source.setData({
                  type: 'Feature',
                  properties: {},
                  geometry: drivingData.routes[0].geometry,
                })
              }
              routeGeoRef.current = drivingData.routes[0].geometry
              routePointARef.current = [pointA[0], pointA[1]]
              routePointBRef.current = [newLngLat.lng, newLngLat.lat]
            }

            // Reverse geocode to get location name
            const reverseGeocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${newLngLat.lng},${newLngLat.lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
            const reverseRes = await fetch(reverseGeocodeUrl)
            const reverseData = await reverseRes.json()
            const newLabel = reverseData.features?.[0]?.place_name || `${newLngLat.lat.toFixed(4)}, ${newLngLat.lng.toFixed(4)}`

            // Update the input field with the new location
            props.onRouteQueryChange(newLabel)

            // Update the popup with new location
            const newShortLabel = newLabel.split(',')[0] || 'Point B'
            const popup = pointBMarker.getPopup()
            if (popup) {
              popup.setHTML(`
                <div style="background: #1e293b; color: white; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1);">
                  <div style="color: #ef4444; font-size: 10px; margin-bottom: 2px;">Point B</div>
                  ${newShortLabel}
                </div>
              `)
            }

            // Fit map bounds to show entire route with updated Point B
            setTimeout(() => {
              if (!map.current) return

              const newBounds = new mapboxgl.LngLatBounds()
              newBounds.extend([pointA[0], pointA[1]]) // Point A (business)
              newBounds.extend([newLngLat.lng, newLngLat.lat]) // Point B (new location)

              // Include route geometry for better fit
              if (drivingData.routes?.[0]?.geometry?.coordinates) {
                drivingData.routes[0].geometry.coordinates.forEach((coord: [number, number]) => {
                  newBounds.extend(coord)
                })
              }

              map.current.fitBounds(newBounds, {
                padding: { top: 120, bottom: 120, left: 150, right: 150 },
                maxZoom: 13,
                duration: 1200,
              })
              routeBoundsRef.current = newBounds
            }, 300)

            onRouteStateChangeRef.current({
              to: { label: newLabel, lat: newLngLat.lat, lng: newLngLat.lng },
              drivingMins: newDrivingMins,
              drivingKm: newDrivingKm,
              cyclingMins: newCyclingMins,
              cyclingKm: newCyclingKm,
              busy: false,
            })
          } catch (error) {
            console.error('Route recalculation error:', error)
          }
        })

        pointBMarkerRef.current = pointBMarker

        onRouteStateChangeRef.current({
          to: { label: pointBLabel, lat: latB, lng: lngB },
          drivingMins,
          drivingKm,
          cyclingMins,
          cyclingKm,
          busy: false,
        })
      } catch (error) {
        console.error('Route calculation error:', error)
        onRouteStateChangeRef.current({ busy: false, error: 'Failed to calculate route' })
      }
    }

    geocodePointB()
  }, [props.externalRouteQuery, props.selectedBusinessId, businesses, mapLoaded, getPointAFromSelection])

  // Real estate overlay - Heatmap layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const heatmapSourceId = 'real-estate-heatmap-source'
    const heatmapLayerId = 'real-estate-heatmap-layer'

    // Remove existing layers and sources
    if (map.current.getLayer(heatmapLayerId)) {
      map.current.removeLayer(heatmapLayerId)
    }
    if (map.current.getSource(heatmapSourceId)) {
      map.current.removeSource(heatmapSourceId)
    }

    // Only show if property toggle is enabled
    if (!props.toggles.property) return

    // Generate sample real estate data points (in production, this would come from an API)
    // For now, create a grid of sample data around the map center
    const bounds = map.current.getBounds()
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()

    const samplePoints = []
    const gridSize = 20

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const lng = sw.lng + (ne.lng - sw.lng) * (i / gridSize)
        const lat = sw.lat + (ne.lat - sw.lat) * (j / gridSize)

        // Generate random price (simulating rental prices from $300-$1000/week)
        const price = 300 + Math.random() * 700

        samplePoints.push({
          type: 'Feature' as const,
          properties: {
            price: price,
            intensity: price / 1000, // Normalize to 0-1 for heatmap
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat],
          },
        })
      }
    }

    map.current.addSource(heatmapSourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: samplePoints,
      },
    })

    map.current.addLayer({
      id: heatmapLayerId,
      type: 'heatmap',
      source: heatmapSourceId,
      paint: {
        // Increase weight as price increases
        'heatmap-weight': ['get', 'intensity'],
        // Increase intensity as zoom level increases
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
        // Color ramp for heatmap: blue (low) -> yellow -> red (high)
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33, 102, 172, 0)',
          0.2, 'rgb(103, 169, 207)',
          0.4, 'rgb(209, 229, 240)',
          0.6, 'rgb(253, 219, 199)',
          0.8, 'rgb(239, 138, 98)',
          1, 'rgb(178, 24, 43)'
        ],
        // Adjust the heatmap radius by zoom level
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
        // Transition from heatmap to circle layer by zoom level
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 15, 0.5],
      },
    })
  }, [mapLoaded, props.toggles.property])

  return (
    <>
      <div className="w-full h-full relative bg-gray-900 rounded-lg overflow-hidden">
        {isLoading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full" />
      </div>
      
      {/* Job List Modal */}
      {jobListModal.open && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setJobListModal({ open: false, businessId: null, businessName: '', jobs: [] })}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {jobListModal.businessName}
              </h2>
              <p className="text-sm text-gray-600">
                {jobListModal.jobs.length} {jobListModal.jobs.length === 1 ? 'job' : 'jobs'} available
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {jobListModal.jobs.map((job) => {
                  const locationLabel =
                    job.location_label ||
                    job.location ||
                    job.location_name ||
                    [job.city, job.state, job.country].filter(Boolean).join(', ')

                  return (
                    <div
                      key={job.id}
                      className="w-full p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">{job.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{job.business_name}</div>
                          {locationLabel && (
                            <div className="text-xs text-gray-500 mt-1">{locationLabel}</div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setJobListModal({ open: false, businessId: null, businessName: '', jobs: [] })
                            router.push(`/jobs/${job.id}?fromMap=true&returnTo=${encodeURIComponent(returnTo)}`)
                          }}
                          className="shrink-0 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
                        >
                          View Job
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setJobListModal({ open: false, businessId: null, businessName: '', jobs: [] })}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})

BusinessDiscoveryMap.displayName = 'BusinessDiscoveryMap'

export default BusinessDiscoveryMap
