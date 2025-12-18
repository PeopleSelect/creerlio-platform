'use client'

import { useEffect, useRef, useState } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'

// Dynamic import for mapbox-gl to avoid SSR issues
let mapboxgl: any = null
if (typeof window !== 'undefined') {
  mapboxgl = require('mapbox-gl')
}

interface MapboxMapProps {
  className?: string
  center?: { lat: number; lng: number }
  zoom?: number
}

export default function MapboxMap({ className = '', center, zoom = 11 }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!mapContainer.current || typeof window === 'undefined' || !mapboxgl) return

    // Mapbox token
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiY3JlZXJsaW8iLCJhIjoiY21pY3IxZHljMXFwNTJzb2FydzR4b3F1YSJ9.Is8-GyfEdqwKKEo2cGO65g'
    
    // Set Mapbox access token
    mapboxgl.accessToken = MAPBOX_TOKEN

    // Use provided center or default to Sydney
    const mapCenter = center ? [center.lng, center.lat] : [151.2093, -33.8688]

    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11', // Dark theme to match the design
        center: mapCenter,
        zoom: zoom,
        attributionControl: false, // Hide attribution for cleaner look
      })

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // Add a marker
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat(mapCenter)
        .addTo(map.current)

      map.current.on('load', () => {
        setIsLoading(false)
      })
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [center, zoom])

  return (
    <div className={`relative w-full h-full ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 rounded-lg z-10">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  )
}

