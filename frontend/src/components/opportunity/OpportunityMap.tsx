'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Job, GeoInsight, AppMode } from '../../../../modules/opportunity-intelligence/shared/types'

interface Props {
  jobs: Job[]
  geoInsights: GeoInsight[]
  selectedJobId: string | null
  mode: AppMode
  showHeatmap: boolean
  homeLat: number | null
  homeLng: number | null
  onJobSelect: (job: Job) => void
  onMapMove: (center: { lat: number; lng: number }) => void
  onRouteCalc: (drivingMins: number, drivingKm: number, cyclingMins: number, cyclingKm: number) => void
  onHomeDrag: (lat: number, lng: number, label: string) => void
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
const SYDNEY = { lng: 151.2093, lat: -33.8688 }

function scoreToColor(score: number): string {
  if (score >= 70) return '#10b981'
  if (score >= 45) return '#f59e0b'
  return '#ef4444'
}

export default function OpportunityMap({
  jobs, geoInsights, selectedJobId, mode, showHeatmap,
  homeLat, homeLng, onJobSelect, onMapMove, onRouteCalc, onHomeDrag
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<mapboxgl.Map | null>(null)
  const markersRef   = useRef<mapboxgl.Marker[]>([])
  const popupRef     = useRef<mapboxgl.Popup | null>(null)
  const homeMarkerRef = useRef<mapboxgl.Marker | null>(null)

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [SYDNEY.lng, SYDNEY.lat],
      zoom: 11,
      attributionControl: false,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('moveend', () => {
      const c = map.getCenter()
      onMapMove({ lat: c.lat, lng: c.lng })
    })

    map.on('load', () => {
      // Heatmap source
      map.addSource('heat-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'heat-layer',
        type: 'heatmap',
        source: 'heat-src',
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': 1.2,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,   'rgba(0,0,0,0)',
            0.3, '#20C997',
            0.6, '#3b82f6',
            0.9, '#8b5cf6',
            1,   '#ec4899',
          ],
          'heatmap-radius': 40,
          'heatmap-opacity': 0.6,
        },
        layout: { visibility: 'none' },
      })

      // Route source + layers
      map.addSource('route-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      // Route casing (outline)
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route-src',
        paint: {
          'line-color': '#000',
          'line-width': 6,
          'line-opacity': 0.4,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
      })
      // Route fill
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-src',
        paint: {
          'line-color': '#20C997',
          'line-width': 4,
          'line-opacity': 0.9,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
      })
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update heatmap visibility
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    try {
      map.setLayoutProperty('heat-layer', 'visibility', showHeatmap ? 'visible' : 'none')
    } catch {}
  }, [showHeatmap])

  // Update heatmap data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const features = geoInsights.map((g) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [g.lng, g.lat] },
      properties: {
        weight: mode === 'talent' ? g.job_density / 100 : g.talent_density / 100,
      },
    }))
    try {
      (map.getSource('heat-src') as mapboxgl.GeoJSONSource)?.setData({
        type: 'FeatureCollection', features,
      })
    } catch {}
  }, [geoInsights, mode])

  // Compute and draw route when selected job + home both exist
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const job = jobs.find((j) => j.id === selectedJobId)

    const clearRoute = () => {
      try {
        (map.getSource('route-src') as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] })
        map.setLayoutProperty('route-line', 'visibility', 'none')
        map.setLayoutProperty('route-casing', 'visibility', 'none')
      } catch {}
      homeMarkerRef.current?.remove()
      homeMarkerRef.current = null
    }

    if (!job?.lat || !job?.lng || !homeLat || !homeLng) {
      clearRoute()
      return
    }

    const computeAndDrawRoute = async (fromLng: number, fromLat: number, toLng: number, toLat: number, fitMap = true) => {
      try {
        const [drivingRes, cyclingRes] = await Promise.all([
          fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`),
          fetch(`https://api.mapbox.com/directions/v5/mapbox/cycling/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`),
        ])
        const [drivingData, cyclingData] = await Promise.all([drivingRes.json(), cyclingRes.json()])

        const drivingMins = drivingData.routes?.[0]?.duration ? Math.round(drivingData.routes[0].duration / 60) : 0
        const drivingKm   = drivingData.routes?.[0]?.distance ? Math.round(drivingData.routes[0].distance / 100) / 10 : 0
        const cyclingMins = cyclingData.routes?.[0]?.duration ? Math.round(cyclingData.routes[0].duration / 60) : 0
        const cyclingKm   = cyclingData.routes?.[0]?.distance ? Math.round(cyclingData.routes[0].distance / 100) / 10 : 0

        onRouteCalc(drivingMins, drivingKm, cyclingMins, cyclingKm)

        if (drivingData.routes?.[0]?.geometry) {
          const src = map.getSource('route-src') as mapboxgl.GeoJSONSource
          src?.setData({ type: 'Feature', properties: {}, geometry: drivingData.routes[0].geometry } as any)
          map.setLayoutProperty('route-line', 'visibility', 'visible')
          map.setLayoutProperty('route-casing', 'visibility', 'visible')

          if (fitMap) {
            const bounds = new mapboxgl.LngLatBounds()
            bounds.extend([fromLng, fromLat])
            bounds.extend([toLng, toLat])
            drivingData.routes[0].geometry.coordinates.forEach((c: [number, number]) => bounds.extend(c))
            map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 60, right: 60 }, maxZoom: 13, duration: 1000 })
          }
        }
      } catch (e) {
        console.error('[OpportunityMap] route error', e)
      }
    }

    // Home marker (Point B) — draggable
    homeMarkerRef.current?.remove()
    const homeEl = document.createElement('div')
    homeEl.title = 'Drag to update your home location'
    homeEl.style.cssText = `
      width: 36px; height: 36px; border-radius: 50%;
      background: #3b82f6; border: 3px solid white;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 16px #3b82f680;
      font-size: 16px; cursor: grab;
    `
    homeEl.textContent = '🏠'

    const homeMarker = new mapboxgl.Marker({ element: homeEl, draggable: true })
      .setLngLat([homeLng, homeLat])
      .addTo(map)

    homeMarker.on('dragstart', () => {
      homeEl.style.cursor = 'grabbing'
    })

    homeMarker.on('dragend', async () => {
      homeEl.style.cursor = 'grab'
      const { lng, lat } = homeMarker.getLngLat()
      // Recalculate route from new position (no fitMap on drag)
      if (job?.lat && job?.lng) {
        await computeAndDrawRoute(lng, lat, job.lng, job.lat, false)
      }
      // Reverse geocode to get label
      try {
        const res = await fetch(`/api/map/geocode?q=${lng},${lat}&limit=1`)
        const data = await res.json()
        const label = data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        onHomeDrag(lat, lng, label)
      } catch {
        onHomeDrag(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      }
    })

    homeMarkerRef.current = homeMarker

    computeAndDrawRoute(homeLng, homeLat, job.lng!, job.lat!)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobId, homeLat, homeLng])

  // Render job markers
  const renderMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    popupRef.current?.remove()

    jobs.forEach((job) => {
      if (!job.lat || !job.lng) return

      const score = job.score?.total_score ?? null
      const isSelected = job.id === selectedJobId
      const color = score !== null ? scoreToColor(score) : '#64748b'

      const el = document.createElement('div')
      el.className = 'opp-marker'
      el.style.cssText = `
        width: ${isSelected ? '44px' : '36px'};
        height: ${isSelected ? '44px' : '36px'};
        border-radius: 50%;
        background: ${color};
        border: ${isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.3)'};
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        box-shadow: 0 0 ${isSelected ? '16px' : '8px'} ${color}60;
        transition: all 0.2s;
        font-size: 11px; font-weight: 700; color: white;
      `
      el.textContent = score !== null ? String(Math.round(score)) : '?'

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, maxWidth: '220px' })
        .setHTML(`
          <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:10px;color:white;font-family:system-ui">
            <p style="font-weight:700;font-size:13px;margin:0 0 2px">${job.title}</p>
            <p style="color:#94a3b8;font-size:11px;margin:0 0 6px">${job.business_name}</p>
            ${score !== null ? `<p style="color:${color};font-size:12px;font-weight:600;margin:0">Score: ${Math.round(score)} · ${job.score?.verdict}</p>` : ''}
          </div>
        `)

      el.addEventListener('mouseenter', () => popup.addTo(map))
      el.addEventListener('mouseleave', () => popup.remove())
      el.addEventListener('click', () => onJobSelect(job))

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([job.lng, job.lat])
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [jobs, selectedJobId, onJobSelect])

  useEffect(() => { renderMarkers() }, [renderMarkers])

  // Fly to selected job
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedJobId) return
    // Only fly if no home (route effect handles fitting when home is set)
    if (homeLat && homeLng) return
    const job = jobs.find((j) => j.id === selectedJobId)
    if (job?.lat && job?.lng) {
      map.flyTo({ center: [job.lng, job.lat], zoom: 14, duration: 800 })
    }
  }, [selectedJobId, jobs, homeLat, homeLng])

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700/60 rounded-lg px-3 py-2 flex items-center gap-4 text-xs text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Strong Move
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Consider
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />Avoid
        </span>
        {homeLat && (
          <span className="flex items-center gap-1.5 border-l border-slate-600 pl-3">
            <span className="text-base">🏠</span>
            <span className="text-[#20C997]">Your home</span>
          </span>
        )}
      </div>
    </div>
  )
}
