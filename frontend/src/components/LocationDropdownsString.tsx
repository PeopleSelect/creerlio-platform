'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useCountries, useStates, useCities } from '@/hooks/useLocations'

interface LocationDropdownsStringProps {
  country: string
  state: string
  city: string
  onCountryChange: (country: string) => void
  onStateChange: (state: string) => void
  onCityChange: (city: string) => void
  onLocationChange?: (location: { label: string; lat: number; lng: number } | null) => void
  className?: string
  required?: boolean
  disabled?: boolean
}

export default function LocationDropdownsString({
  country,
  state,
  city,
  onCountryChange,
  onStateChange,
  onCityChange,
  onLocationChange,
  className = '',
  required = false,
  disabled = false,
}: LocationDropdownsStringProps) {
  const { countries, loading: countriesLoading } = useCountries()
  
  // Find country ID from country name
  const selectedCountry = countries.find(c => c.name === country || c.code === country)
  const countryId = selectedCountry?.id || null
  
  const { states, loading: statesLoading } = useStates(countryId)
  
  // Find state ID from state name
  const selectedState = states.find(s => s.name === state || s.code === state)
  const stateId = selectedState?.id || null
  
  const { cities, loading: citiesLoading } = useCities(countryId, stateId)

  // City autocomplete state
  const [cityQuery, setCityQuery] = useState(city || '')
  const [citySuggestions, setCitySuggestions] = useState<Array<{ id: string; label: string; lng: number; lat: number }>>([])
  const [citySuggestionsOpen, setCitySuggestionsOpen] = useState(false)
  const [cityActiveIdx, setCityActiveIdx] = useState(0)
  const [cityQueryDebounced, setCityQueryDebounced] = useState('')
  const cityAbortRef = useRef<AbortController | null>(null)
  const cityInputRef = useRef<HTMLInputElement>(null)

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountry = countries.find(c => c.id === parseInt(e.target.value, 10))
    onCountryChange(selectedCountry?.name || '')
    // Reset state and city when country changes
    onStateChange('')
    onCityChange('')
  }

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedState = states.find(s => s.id === parseInt(e.target.value, 10))
    onStateChange(selectedState?.name || '')
    // Reset city when state changes
    onCityChange('')
  }

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCity = cities.find(c => c.id === parseInt(e.target.value, 10))
    onCityChange(selectedCity?.name || '')
  }

  // Debounce city query
  useEffect(() => {
    const timer = setTimeout(() => {
      setCityQueryDebounced(cityQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [cityQuery])

  // Fetch city suggestions from Mapbox
  useEffect(() => {
    const fetchCitySuggestions = async (q: string) => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
      const qq = q.trim()
      if (!qq || qq.length < 2) {
        setCitySuggestions([])
        setCityActiveIdx(0)
        return
      }
      if (!token) return
      
      cityAbortRef.current?.abort()
      const ac = new AbortController()
      cityAbortRef.current = ac
      
      try {
        // Build query with country/state context if available
        let query = qq
        if (state) {
          query = `${qq}, ${state}`
        }
        if (country) {
          query = `${query}, ${country}`
        }
        
        const u = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`)
        u.searchParams.set('access_token', token)
        u.searchParams.set('limit', '6')
        u.searchParams.set('types', 'place,locality,neighborhood,postcode,address')
        
        // Add country filter if country is selected
        if (country === 'Australia' || country === 'AU') {
          u.searchParams.set('country', 'AU')
        }
        
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
        setCitySuggestions(next)
        setCityActiveIdx(0)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching city suggestions:', err)
        }
      }
    }

    if (citySuggestionsOpen && cityQueryDebounced.trim().length >= 2) {
      fetchCitySuggestions(cityQueryDebounced)
    } else {
      setCitySuggestions([])
    }
  }, [cityQueryDebounced, citySuggestionsOpen, state, country])

  // Update city query when city prop changes externally
  useEffect(() => {
    if (city && city !== cityQuery) {
      setCityQuery(city)
    }
  }, [city])

  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCityQuery(value)
    setCitySuggestionsOpen(true)
    onCityChange(value)
  }

  const handleCitySuggestionSelect = (suggestion: { id: string; label: string; lng: number; lat: number }) => {
    // Extract just the city name (first part before comma) instead of full place_name
    const cityName = suggestion.label.split(',')[0].trim()
    setCityQuery(cityName)
    setCitySuggestionsOpen(false)
    onCityChange(cityName)
    if (onLocationChange) {
      onLocationChange({ ...suggestion, label: cityName })
    }
  }

  // Find current selections
  const selectedCountryId = selectedCountry?.id || ''
  const selectedStateId = states.find(s => s.name === state)?.id || ''
  const selectedCityId = cities.find(c => c.name === city)?.id || ''

  // Show error if countries failed to load
  if (countries.length === 0 && !countriesLoading) {
    return (
      <div className={`grid md:grid-cols-3 gap-4 ${className}`}>
        <div className="col-span-3 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
          <p className="text-sm text-yellow-400">
            Location dropdowns are not available. Please ensure the database migration <code className="bg-black/20 px-1 rounded">2025122502_location_tables.sql</code> has been run.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`grid md:grid-cols-3 gap-4 ${className}`}>
      {/* Country */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Country {required && <span className="text-red-400">*</span>}
        </label>
        <select
          value={selectedCountryId}
          onChange={handleCountryChange}
          disabled={disabled || countriesLoading}
          required={required}
          className="w-full px-4 py-3 bg-white border border-blue-500/20 rounded-lg text-black focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select Country</option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
        {countriesLoading && <p className="text-xs text-gray-400 mt-1">Loading countries...</p>}
      </div>

      {/* State/Province */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          State/Province {required && <span className="text-red-400">*</span>}
        </label>
        <select
          value={selectedStateId}
          onChange={handleStateChange}
          disabled={disabled || statesLoading || !countryId}
          required={required}
          className="w-full px-4 py-3 bg-white border border-blue-500/20 rounded-lg text-black focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select State/Province</option>
          {states.map((state) => (
            <option key={state.id} value={state.id}>
              {state.name}
            </option>
          ))}
        </select>
        {statesLoading && <p className="text-xs text-gray-400 mt-1">Loading states...</p>}
      </div>

      {/* City - Autocomplete */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          City/Town/Suburb {required && <span className="text-red-400">*</span>}
        </label>
        <input
          ref={cityInputRef}
          type="text"
          value={cityQuery}
          onChange={handleCityInputChange}
          onFocus={() => setCitySuggestionsOpen(true)}
          onBlur={() => setTimeout(() => setCitySuggestionsOpen(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setCitySuggestionsOpen(false)
              return
            }
            if (!citySuggestionsOpen || !citySuggestions.length) {
              return
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setCityActiveIdx((i) => Math.min(citySuggestions.length - 1, i + 1))
              return
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setCityActiveIdx((i) => Math.max(0, i - 1))
              return
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              const pick = citySuggestions[cityActiveIdx]
              if (pick) {
                handleCitySuggestionSelect(pick)
              }
              return
            }
          }}
          disabled={disabled}
          required={required}
          placeholder="Start typing city, town, or suburb..."
          className="w-full px-4 py-3 bg-white border border-blue-500/20 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={citySuggestionsOpen}
        />
        {/* City suggestions dropdown */}
        {citySuggestionsOpen && citySuggestions.length > 0 && (
          <div
            role="listbox"
            className="absolute left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-50 max-h-60 overflow-y-auto"
          >
            {citySuggestions.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  idx === cityActiveIdx ? 'bg-blue-50 text-blue-900' : 'bg-white text-gray-900 hover:bg-gray-50'
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleCitySuggestionSelect(s)}
                role="option"
                aria-selected={idx === cityActiveIdx}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
