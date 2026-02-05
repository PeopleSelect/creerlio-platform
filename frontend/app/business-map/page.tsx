'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'

// Dynamically import SearchMap to avoid SSR issues (it supports markers)
const SearchMap = dynamicImport(() => import('@/components/SearchMap'), { ssr: false })

type LocSuggestion = { id: string; label: string; lng: number; lat: number }

interface AnonymizedTalent {
  id: string
  title: string | null
  skills: string[] | null
  experience_years: number | null
  bio: string | null
  city: string | null
  state: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  distance_km?: number
  search_summary: string | null
  availability_description: string | null
  intent_status?: string | null
  intent_visibility?: boolean
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

const SKILLS_OPTIONS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js', 'Vue.js', 'Angular',
  'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Git',
  'HTML', 'CSS', 'SASS', 'Tailwind CSS', 'GraphQL', 'REST API', 'Microservices',
  'Machine Learning', 'Data Science', 'Analytics', 'Project Management', 'Agile', 'Scrum',
  'UI/UX Design', 'Figma', 'Adobe Creative Suite', 'Marketing', 'Sales', 'Customer Service',
  'Accounting', 'Finance', 'HR', 'Recruiting', 'Business Analysis', 'Consulting'
] as const

const ROLE_TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Full Stack Developer', 'Frontend Developer',
  'Backend Developer', 'DevOps Engineer', 'Data Scientist', 'Data Analyst', 'Machine Learning Engineer',
  'Product Manager', 'Project Manager', 'Business Analyst', 'UX Designer', 'UI Designer',
  'Marketing Manager', 'Sales Manager', 'Account Manager', 'HR Manager', 'Recruiter',
  'Accountant', 'Financial Analyst', 'Consultant', 'Operations Manager', 'Customer Success Manager'
] as const

export default function BusinessMapPage() {
  return (
    <Suspense fallback={null}>
      <BusinessMapPageInner />
    </Suspense>
  )
}

function BusinessMapPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const embedded = searchParams?.get('embed') === '1'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [businessProfileId, setBusinessProfileId] = useState<string | null>(null)
  const [businessUserId, setBusinessUserId] = useState<string | null>(null)

  // Simplified search state
  const [searchQuery, setSearchQuery] = useState('') // Main search bar
  const [locQuery, setLocQuery] = useState('')
  const [locBusy, setLocBusy] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [locOpen, setLocOpen] = useState(false)
  const [locSuggestions, setLocSuggestions] = useState<LocSuggestion[]>([])
  const [locActiveIdx, setLocActiveIdx] = useState(0)
  const RADIUS_KEY = 'creerlio_business_map_radius_km_v1'
  const [radiusKm, setRadiusKm] = useState<number>(50) // Increased default radius
  const [searchCenter, setSearchCenter] = useState<{ lng: number; lat: number; label?: string } | null>(null)
  const [showAdvancedFilters] = useState(true)
  const [resultsCollapsed, setResultsCollapsed] = useState(false)
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)

  // Simplified filters
  const [filters, setFilters] = useState({
    role: '',
    skills: [] as string[],
    minExperience: '',
    location: ''
  })
  const [intentStatusFilter, setIntentStatusFilter] = useState<string>('')

  const [skillsInput, setSkillsInput] = useState('')
  const [skillsInputOpen, setSkillsInputOpen] = useState(false)
  const [skillsInputActiveIdx, setSkillsInputActiveIdx] = useState(0)

  const [talents, setTalents] = useState<AnonymizedTalent[]>([])
  const [selectedTalentId, setSelectedTalentId] = useState<string | null>(null)
  const [selectedTalent, setSelectedTalent] = useState<AnonymizedTalent | null>(null)
  const [requestingConnection, setRequestingConnection] = useState(false)
  const [showTalentPopup, setShowTalentPopup] = useState(false)

  const searchQueryDebounced = useDebouncedValue(searchQuery, 500)
  const locDebounced = useDebouncedValue(locQuery, 300)
  const roleDebounced = useDebouncedValue(filters.role, 300)
  const skillsDebounced = useDebouncedValue(filters.skills.join(','), 300)
  const locAbort = useRef<AbortController | null>(null)

  // Check authentication
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        if (cancelled) return
        const uid = session?.session?.user?.id ?? null
        setIsAuthenticated(!!uid)

        if (uid) {
          const selectors = ['id, user_id', 'id']
          let businessProfile: any = null
          
          for (const sel of selectors) {
            const { data: bp, error: bpError } = await supabase
              .from('business_profiles')
              .select(sel)
              .eq('user_id', uid)
              .maybeSingle()
            
            if (bp && !bpError) {
              businessProfile = bp
              break
            }
            
            const msg = String(bpError?.message ?? '')
            const code = String(bpError?.code ?? '')
            const isMissingCol = code === 'PGRST204' || /Could not find the .* column/i.test(msg)
            if (!isMissingCol) break
          }

          if (businessProfile?.id) {
            setBusinessProfileId(String(businessProfile.id))
            if (businessProfile.user_id) {
              setBusinessUserId(businessProfile.user_id)
            } else {
              const { data: bpFull } = await supabase
                .from('business_profiles')
                .select('user_id')
                .eq('id', businessProfile.id)
                .maybeSingle()
              if (bpFull?.user_id) {
                setBusinessUserId(bpFull.user_id)
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Auth check error:', err)
        setError(err.message || 'Authentication error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // Location search
  useEffect(() => {
    if (!locDebounced || locDebounced.length < 2) {
      setLocSuggestions([])
      setLocOpen(false)
      return
    }

    setLocBusy(true)
    setLocError(null)
    locAbort.current?.abort()
    const ac = new AbortController()
    locAbort.current = ac

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      setLocError('Mapbox token not configured')
      setLocBusy(false)
      return
    }

    ;(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locDebounced)}.json?access_token=${token}&limit=6&types=place,locality,neighborhood,postcode,region&country=AU`
        const res = await fetch(url, { signal: ac.signal })
        if (ac.signal.aborted) return
        const json: any = await res.json()
        const feats = Array.isArray(json?.features) ? json.features : []
        const suggestions: LocSuggestion[] = feats.map((f: any) => ({
          id: String(f?.id || ''),
          label: String(f?.place_name || '').trim(),
          lng: Array.isArray(f?.center) ? f.center[0] : 0,
          lat: Array.isArray(f?.center) ? f.center[1] : 0
        }))
        if (ac.signal.aborted) return
        setLocSuggestions(suggestions)
        setLocOpen(true)
        setLocActiveIdx(0)
      } catch (err: any) {
        if (err.name === 'AbortError') return
        console.error('Location search error:', err)
        setLocError(err.message || 'Location search failed')
      } finally {
        if (!ac.signal.aborted) setLocBusy(false)
      }
    })()
  }, [locDebounced])

  // Load talents - now works with or without location
  useEffect(() => {
    const loadTalents = async () => {
      setLoading(true)
      setError(null)
      try {
        const selectors = [
          'id,title,skills,experience_years,bio,city,state,country,latitude,longitude,search_summary,availability_description',
          'id,title,skills,experience_years,bio,city,state,country,latitude,longitude,search_summary',
          'id,title,skills,bio,city,state,country,latitude,longitude',
          'id,title,skills,bio,latitude,longitude',
          'id,title,skills,bio',
          'id,title,skills',
          'id,title'
        ]
        
        let data: any[] | null = null
        let lastErr: any = null
        
        for (const sel of selectors) {
          let query = supabase
            .from('talent_profiles')
            .select(sel)
          
          try {
            query = query.eq('is_active', true)
          } catch {
            // Column doesn't exist, continue without filter
          }
          
          const res = await query.limit(500) // Increased limit for broader search
          
          if (!res.error && res.data) {
            data = res.data
            lastErr = null
            break
          }
          
          lastErr = res.error
          const msg = String(res.error?.message ?? '')
          const code = String(res.error?.code ?? '')
          const isMissingCol = code === 'PGRST204' || /Could not find the .* column/i.test(msg)
          if (!isMissingCol) break
        }
        
        if (lastErr && !data) {
          throw lastErr
        }

        // Client-side filtering for search visibility
        if (data) {
          data = data.filter((t: any) => {
            if (typeof t.search_visible === 'boolean') {
              if (t.search_visible === false) return false
              if (t.search_visible === true) {
                const hasSummary = typeof t.search_summary === 'string' && t.search_summary.trim().length > 0
                return hasSummary
              }
            }
            return true
          })
        }

        // Attach intent modes
        if (data && data.length > 0) {
          const talentIds = data.map((t: any) => t.id).filter(Boolean)
          const { data: intents } = await supabase
            .from('intent_modes')
            .select('profile_id,intent_status,visibility')
            .eq('profile_type', 'talent')
            .in('profile_id', talentIds)

          const intentMap = new Map<string, { intent_status: string; visibility: boolean }>()
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

          data = data.map((t: any) => {
            const intent = intentMap.get(String(t.id))
            return {
              ...t,
              intent_status: intent?.intent_status ?? null,
              intent_visibility: intent?.visibility ?? false,
            }
          })

          if (intentStatusFilter) {
            data = data.filter((t: any) => t.intent_visibility && t.intent_status === intentStatusFilter)
          }
        }
        
        // Now filter by search query, location, and other criteria
        const centerLat = searchCenter?.lat
        const centerLng = searchCenter?.lng

        const geocodeTalentLocation = async (t: any): Promise<{ lat: number; lng: number } | null> => {
          if (t.latitude && t.longitude) {
            return { lat: t.latitude, lng: t.longitude }
          }

          // Extract just the city name if it contains commas (e.g., "Cooma, New South Wales, Australia" -> "Cooma")
          const cityName = t.city?.split(',')[0]?.trim() || null
          const locationParts = [cityName, t.state, t.country].filter(Boolean)
          if (locationParts.length === 0) return null

          const locationString = locationParts.join(', ')
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
          if (!token) return null

          try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationString)}.json?access_token=${token}&limit=1&country=AU`
            const response = await fetch(url)
            const geocodeData = await response.json()
            
            if (geocodeData.features && geocodeData.features.length > 0) {
              const [lng, lat] = geocodeData.features[0].center
              return { lat, lng }
            }
          } catch (err) {
            console.warn('Geocoding failed for talent:', err)
          }
          
          return null
        }

        // Process all talents
        const processedTalents = await Promise.all(
          (data || []).map(async (t: any) => {
            // Filter by main search query (searches title, bio, skills)
            if (searchQueryDebounced.trim()) {
              const queryLower = searchQueryDebounced.toLowerCase()
              const titleMatch = t.title?.toLowerCase().includes(queryLower)
              const bioMatch = t.bio?.toLowerCase().includes(queryLower)
              const skillsMatch = Array.isArray(t.skills) && t.skills.some((s: any) => 
                String(s).toLowerCase().includes(queryLower)
              )
              if (!titleMatch && !bioMatch && !skillsMatch) {
                return null
              }
            }

            // Filter by role
            if (filters.role && t.title) {
              if (!t.title.toLowerCase().includes(filters.role.toLowerCase())) {
                return null
              }
            }

            // Filter by skills
            const talentSkills = Array.isArray(t.skills) ? t.skills.map((s: any) => String(s).toLowerCase()) : []
            if (filters.skills.length > 0) {
              const hasMatchingSkill = filters.skills.some(skill => 
                talentSkills.includes(skill.toLowerCase())
              )
              if (!hasMatchingSkill) return null
            }

            // Filter by minimum experience
            if (filters.minExperience && t.experience_years !== null && t.experience_years !== undefined) {
              const minExp = parseInt(filters.minExperience)
              if (!isNaN(minExp) && t.experience_years < minExp) {
                return null
              }
            }

            // Location filtering (only if location is specified)
            let coords: { lat: number; lng: number } | null = null
            let distanceKm: number | null = null

            if (searchCenter) {
              coords = await geocodeTalentLocation(t)
              if (!coords) {
                // If location is required and we can't geocode, skip
                return null
              }
              
              const lat = coords.lat
              const lng = coords.lng
              
              // Calculate distance
              const R = 6371000
              const dLat = ((lat - centerLat!) * Math.PI) / 180
              const dLng = ((lng - centerLng!) * Math.PI) / 180
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((centerLat! * Math.PI) / 180) *
                  Math.cos((lat * Math.PI) / 180) *
                  Math.sin(dLng / 2) *
                  Math.sin(dLng / 2)
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
              const distanceMeters = R * c
              distanceKm = distanceMeters / 1000

              if (distanceKm > radiusKm) return null
            } else {
              // No location filter - just get coordinates for display if available
              coords = await geocodeTalentLocation(t)
            }

            return {
              id: String(t.id),
              title: t.title || null,
              skills: Array.isArray(t.skills) ? t.skills : null,
              experience_years: t.experience_years !== null && t.experience_years !== undefined ? t.experience_years : null,
              bio: t.bio ? t.bio.substring(0, 200) : null,
              city: t.city || null,
              state: t.state || null,
              country: t.country || null,
              latitude: coords?.lat || null,
              longitude: coords?.lng || null,
              distance_km: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
              search_summary: (typeof t.search_summary === 'string' && t.search_summary) || null,
              availability_description: (typeof t.availability_description === 'string' && t.availability_description) || null,
              intent_status: t.intent_status || null,
              intent_visibility: t.intent_visibility || false,
            } as AnonymizedTalent
          })
        )

        const filtered = processedTalents.filter((t): t is AnonymizedTalent => t !== null)

        // Sort by distance if location is set, otherwise by relevance
        if (searchCenter) {
          filtered.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0))
        }

        setTalents(filtered)
      } catch (err: any) {
        console.error('Error loading talents:', err)
        setError(err.message || 'Failed to load talent')
      } finally {
        setLoading(false)
      }
    }

    loadTalents()
  }, [searchQueryDebounced, searchCenter, radiusKm, filters.role, filters.skills, filters.minExperience, intentStatusFilter])

  // Handle location selection
  const handleLocationSelect = (suggestion: LocSuggestion) => {
    setLocQuery(suggestion.label)
    setSearchCenter({ lng: suggestion.lng, lat: suggestion.lat, label: suggestion.label })
    setLocOpen(false)
    setFilters(prev => ({ ...prev, location: suggestion.label }))
  }

  // Handle skills input
  const handleSkillsInputChange = (value: string) => {
    setSkillsInput(value)
    const matching = SKILLS_OPTIONS.filter(s => s.toLowerCase().includes(value.toLowerCase()))
    if (matching.length > 0) {
      setSkillsInputOpen(true)
      setSkillsInputActiveIdx(0)
    } else {
      setSkillsInputOpen(false)
    }
  }

  const handleAddSkill = (skill: string) => {
    if (!filters.skills.includes(skill)) {
      setFilters(prev => ({ ...prev, skills: [...prev.skills, skill] }))
    }
    setSkillsInput('')
    setSkillsInputOpen(false)
  }

  const handleRemoveSkill = (skill: string) => {
    setFilters(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))
  }

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('')
    setLocQuery('')
    setSearchCenter(null)
    setFilters({ role: '', skills: [], minExperience: '', location: '' })
    setIntentStatusFilter('')
  }

  // Request connection handler (same as before)
  const handleRequestConnection = async (talentId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to request connections')
      return
    }

    let currentBusinessProfileId = businessProfileId
    let currentBusinessUserId = businessUserId

    if (!currentBusinessProfileId || !currentBusinessUserId) {
      try {
        const { data: session } = await supabase.auth.getSession()
        const uid = session?.session?.user?.id ?? null
        if (!uid) {
          alert('Please sign in to request connections')
          return
        }

        const { data: bp } = await supabase
          .from('business_profiles')
          .select('id, user_id')
          .eq('user_id', uid)
          .maybeSingle()

        if (!bp?.id) {
          alert('Business profile not found. Please create a business profile first.')
          return
        }

        currentBusinessProfileId = String(bp.id)
        if (bp.user_id) {
          currentBusinessUserId = bp.user_id
          setBusinessUserId(bp.user_id)
        }
      } catch (err: any) {
        console.error('Error verifying business profile:', err)
        alert(`Failed to verify business profile: ${err.message}`)
        return
      }
    }

    setRequestingConnection(true)
    try {
      const bpId = currentBusinessProfileId
      if (!bpId) {
        throw new Error('Business profile not found')
      }
      
      const { data: existing } = await supabase
        .from('talent_connection_requests')
        .select('id, status')
        .eq('business_id', bpId)
        .eq('talent_id', talentId)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'pending') {
          alert('Connection request already pending')
        } else if (existing.status === 'accepted') {
          alert('You are already connected with this talent')
        } else {
          alert('Connection request was previously declined')
        }
        setRequestingConnection(false)
        return
      }

      const { data: newRequest, error: insertError } = await supabase
        .from('talent_connection_requests')
        .insert({
          business_id: bpId,
          talent_id: talentId,
          status: 'pending',
          selected_sections: []
        })
        .select()
        .single()

      if (insertError) throw insertError

      try {
        const { data: businessData } = await supabase
          .from('business_profiles')
          .select('business_name, name, company_name, user_id')
          .eq('id', bpId)
          .maybeSingle()

        const businessName = businessData?.business_name || businessData?.name || businessData?.company_name || 'A business'
        const currentBusinessUserId = businessUserId || businessData?.user_id

        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('talent_id', talentId)
          .eq('business_id', bpId)
          .maybeSingle()

        let conversationId = existingConv?.id

        if (!conversationId) {
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              talent_id: talentId,
              business_id: bpId,
              last_message_at: new Date().toISOString()
            })
            .select()
            .single()

          if (!convError && newConv) {
            conversationId = newConv.id
          }
        }

        if (conversationId && currentBusinessUserId) {
          const messageBody = `${businessName} has requested to connect with you. Review their profile in the Connection Requests section of your dashboard to accept or decline.`
          
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_type: 'business',
              sender_user_id: currentBusinessUserId,
              body: messageBody
            })
        }
      } catch (msgErr) {
        console.warn('Failed to create notification message:', msgErr)
      }

      alert('Connection request sent! The talent has been notified and can review your business profile before accepting.')
      setShowTalentPopup(false)
      setSelectedTalent(null)
    } catch (err: any) {
      console.error('Error requesting connection:', err)
      alert(err.message || 'Failed to send connection request')
    } finally {
      setRequestingConnection(false)
    }
  }

  useEffect(() => {
    if (showTalentPopup && !businessProfileId && isAuthenticated) {
      ;(async () => {
        try {
          const { data: session } = await supabase.auth.getSession()
          const uid = session?.session?.user?.id ?? null
          
          if (uid) {
            const { data: bp } = await supabase
              .from('business_profiles')
              .select('id, user_id')
              .eq('user_id', uid)
              .maybeSingle()

            if (bp?.id) {
              setBusinessProfileId(String(bp.id))
              if (bp.user_id) {
                setBusinessUserId(bp.user_id)
              }
            }
          }
        } catch (err) {
          console.error('[Business Map] Error reloading business profile:', err)
        }
      })()
    }
  }, [showTalentPopup, businessProfileId, isAuthenticated])

  const handleTalentMarkerClick = (talentId: string | number) => {
    const talentIdStr = String(talentId)
    const talent = talents.find(t => t.id === talentIdStr)
    if (talent) {
      setSelectedTalentId(talentIdStr)
      setSelectedTalent(talent)
      setShowTalentPopup(true)
    }
  }

  const mapMarkers = useMemo(() => {
    return talents
      .filter(t => t.latitude !== null && t.longitude !== null)
      .map(t => ({
        id: t.id,
        lat: t.latitude!,
        lng: t.longitude!,
        type: 'talent' as const,
        title: t.title || 'Talent',
        description: (() => {
          // Extract just the city name if it contains commas (e.g., "Cooma, New South Wales, Australia" -> "Cooma")
          const cityName = t.city?.split(',')[0]?.trim() || null
          const location = cityName && t.state ? `${cityName}, ${t.state}` : cityName || t.state || 'Location not specified'
          const intent = t.intent_visibility && t.intent_status ? `Intent: ${t.intent_status.replace(/_/g, ' ')}` : null
          return intent ? `${location} • ${intent}` : location
        })()
      }))
  }, [talents])

  const mapCenter = searchCenter || (talents.length > 0 && talents[0].latitude && talents[0].longitude 
    ? { lat: talents[0].latitude, lng: talents[0].longitude }
    : { lat: -33.8688, lng: 151.2093 })

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-6">Please sign in to use the Business Map.</p>
          <Link
            href="/login?redirect=/business-map"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`${embedded ? 'bg-transparent' : 'min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900'} text-white`}>
      {!embedded && (
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                Creerlio
              </Link>

              <nav className="hidden lg:flex items-center gap-x-8 text-sm text-gray-600">
                <Link href="/talent" className="hover:text-blue-600 transition-colors">Talent</Link>
                <Link href="/business" className="hover:text-blue-600 transition-colors">Business</Link>
                <Link href="/search" className="hover:text-blue-600 transition-colors">Search</Link>
              </nav>

              <div className="flex gap-3">
                <Link
                  href="/login/talent?mode=signup&redirect=/dashboard/talent"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-sm text-white transition-colors"
                >
                  Create Talent Account
                </Link>
                <Link
                  href="/login/business?mode=signup&redirect=/dashboard/business"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-sm text-white transition-colors"
                >
                  Create Business Account
                </Link>
                <Link
                  href="/login/talent?mode=signin&redirect=/dashboard/talent"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-sm text-white transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className={`${embedded ? 'px-0 py-0' : 'max-w-7xl mx-auto px-8 py-6'}`}>
        {/* Map and Filters Layout */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Filters Section - 1/4 width */}
          <aside className={`${filtersCollapsed ? 'w-16' : 'lg:w-[320px]'} flex-shrink-0 overflow-y-auto z-20 transition-all duration-300`}>
            <div className="rounded-xl p-4 border border-white/10 bg-slate-900/50 backdrop-blur-sm h-full relative">
              {filtersCollapsed && (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-white font-semibold text-sm whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    FILTERS
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors z-10"
                title={filtersCollapsed ? 'Expand filters' : 'Collapse filters'}
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-300 ${filtersCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {!filtersCollapsed && (
              <>
              <div className="mb-1">
                <div className="text-white font-semibold text-sm">Filters</div>
              </div>
              <div className="text-xs text-slate-400 mb-5">Filters update the map in real time. No page reloads.</div>
            
            {/* Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-200 mb-2.5">Search</label>
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Role, skill, or industry…"
                  className="w-full px-4 py-2.5 rounded-lg bg-white text-black border border-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                />
                <button
                  type="button"
                  disabled={!searchQuery.trim()}
                  className="px-5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shrink-0"
                >
                  Go
                </button>
              </div>
            </div>

            {/* Location */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-200 mb-2.5">
                Within {radiusKm} km of…
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={locQuery}
                  onChange={(e) => setLocQuery(e.target.value)}
                  onFocus={() => locSuggestions.length > 0 && setLocOpen(true)}
                  onBlur={() => setTimeout(() => setLocOpen(false), 150)}
                  placeholder="Suburb, city, or region…"
                  className="w-full px-4 py-2.5 rounded-lg bg-white text-black border border-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                />
                {locOpen && locSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1.5 rounded-lg border border-white/10 bg-slate-950/98 backdrop-blur shadow-2xl overflow-hidden z-50">
                    {locSuggestions.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleLocationSelect(s)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          idx === locActiveIdx ? 'bg-blue-500/20 text-white' : 'bg-transparent text-slate-200 hover:bg-white/5'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Radius: {radiusKm} km</span>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                  className="w-32 accent-blue-500"
                />
              </div>
              {locError ? <div className="mt-2 text-xs text-red-400 font-medium">{locError}</div> : null}
            </div>

            {/* Advanced Filters (Collapsible) */}
            {showAdvancedFilters && (
              <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                {/* Role Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2.5">Role/Title</label>
                  <input
                    type="text"
                    value={filters.role}
                    onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="e.g., Software Engineer"
                    className="w-full px-3 py-2 rounded-lg bg-white text-black border border-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                  />
                </div>

                {/* Skills Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2.5">Skills</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={skillsInput}
                      onChange={(e) => handleSkillsInputChange(e.target.value)}
                      placeholder="Type to search skills…"
                      className="w-full px-3 py-2 rounded-lg bg-white text-black border border-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                    />
                    {skillsInputOpen && (
                      <div className="absolute left-0 right-0 mt-1 rounded-lg border border-white/10 bg-slate-950/95 backdrop-blur shadow-xl overflow-hidden z-20">
                        {SKILLS_OPTIONS.filter(s => s.toLowerCase().includes(skillsInput.toLowerCase()))
                          .slice(0, 10)
                          .map((skill, idx) => (
                            <button
                              key={skill}
                              type="button"
                              className={`w-full text-left px-3 py-2 text-sm ${
                                idx === skillsInputActiveIdx ? 'bg-white/10 text-white' : 'bg-transparent text-slate-200 hover:bg-white/5'
                              }`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleAddSkill(skill)}
                            >
                              {skill}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  {filters.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {filters.skills.map(skill => (
                        <span key={skill} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-200 text-xs">
                          {skill}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="text-blue-200 hover:text-white"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Experience Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2.5">Minimum experience (years)</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.minExperience}
                    onChange={(e) => setFilters(prev => ({ ...prev, minExperience: e.target.value }))}
                    placeholder="e.g., 5"
                    className="w-full px-3 py-2 rounded-lg bg-white text-black border border-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                  />
                </div>

                {/* Intent Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2.5">Intent filters</label>
                  <select
                    value={intentStatusFilter}
                    onChange={(e) => setIntentStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-sm"
                  >
                    <option value="">All intent statuses</option>
                    <option value="open_to_conversations">Open to conversations</option>
                    <option value="passive_exploring">Passive exploring</option>
                    <option value="not_available">Not available</option>
                  </select>
                </div>
              </div>
            )}

            <div className="pt-3 flex items-center justify-between gap-3 border-t border-white/10 mt-4">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 text-xs font-medium transition-colors"
                onClick={handleClearFilters}
              >
                Clear filters
              </button>
            </div>

            {/* Results Count */}
            {!loading && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <p className="text-xs text-gray-300">
                  {talents.length} {talents.length === 1 ? 'talent found' : 'talents found'}
                  {searchCenter && ` within ${radiusKm} km`}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/50 rounded-lg text-xs text-red-400">
                {error}
              </div>
            )}

            {loading && (
              <div className="mt-2 text-center py-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-gray-400 mt-1">Searching...</p>
              </div>
            )}
              </>
              )}
            </div>
          </aside>

          {/* Right side: Results + Map (Talent Map layout without Route Intelligence) */}
          <div className="flex-1 flex gap-4">
            {/* Results Panel */}
            {resultsCollapsed ? (
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setResultsCollapsed(false)}
                  className="h-full px-2 py-4 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-sm hover:bg-white/5 transition-colors flex flex-col items-center justify-center gap-2"
                  title="Expand Results"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="text-white font-semibold text-xs whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    Results ({talents.length})
                  </div>
                </button>
              </div>
            ) : (
              <div className="w-56 flex-shrink-0 rounded-xl p-3 border border-white/10 bg-slate-900/50 backdrop-blur-sm overflow-y-auto relative">
                <button
                  type="button"
                  onClick={() => setResultsCollapsed(true)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors z-10"
                  title="Collapse Results"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-semibold text-sm">Results</div>
                  <div className="text-xs text-slate-400">{talents.length}</div>
                </div>

                {talents.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs">
                    No talent found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {talents.map((talent) => (
                      <button
                        key={talent.id}
                        type="button"
                        onClick={() => handleTalentMarkerClick(talent.id)}
                        className="w-full text-left p-2 rounded border transition-all bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                      >
                        {talent.title ? (
                          <div className="flex items-center gap-2">
                            {talent.intent_visibility && talent.intent_status ? (
                              <span
                                className={`inline-flex h-2 w-2 rounded-full ${
                                  talent.intent_status === 'open_to_conversations' ? 'bg-emerald-400' :
                                  talent.intent_status === 'passive_exploring' ? 'bg-blue-400' :
                                  'bg-slate-400'
                                }`}
                                title={`Intent: ${talent.intent_status.replace(/_/g, ' ')}`}
                              />
                            ) : null}
                            <div className="font-medium text-white text-xs truncate">{talent.title}</div>
                          </div>
                        ) : (
                          <div className="font-medium text-white text-xs truncate">Talent</div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {talent.skills && talent.skills.length ? talent.skills[0] : 'Skills not set'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Map */}
            <div className="flex-1">
              <div className="dashboard-card rounded-xl p-0 overflow-hidden" style={{ height: '70vh' }}>
                {typeof window !== 'undefined' && (searchCenter || talents.length > 0) ? (
                  <SearchMap
                    markers={mapMarkers}
                    center={mapCenter}
                    zoom={mapMarkers.length > 0 ? (mapMarkers.length === 1 ? 12 : 11) : 10}
                    className="w-full h-full"
                    onMarkerClick={handleTalentMarkerClick}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <p className="text-lg mb-2">📍 Search for Talent</p>
                      <p className="text-sm">Enter a search term above to find talent</p>
                      <p className="text-xs text-gray-500 mt-1">Location is optional - you can search everywhere or filter by location</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Talent Popup Modal - Same as before */}
      {showTalentPopup && selectedTalent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto border border-white/10 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Talent Summary</h2>
              <button
                onClick={() => {
                  setShowTalentPopup(false)
                  setSelectedTalent(null)
                  setSelectedTalentId(null)
                }}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {selectedTalent.title && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">{selectedTalent.title}</h3>
                </div>
              )}

              {selectedTalent.experience_years !== null && selectedTalent.experience_years !== undefined && (
                <div>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">{selectedTalent.experience_years}</span> {selectedTalent.experience_years === 1 ? 'year' : 'years'} of experience
                  </p>
                </div>
              )}

              {(selectedTalent.city || selectedTalent.state || selectedTalent.country) && (
                <div>
                  <p className="text-sm text-gray-300">
                    📍 {[selectedTalent.city?.split(',')[0]?.trim(), selectedTalent.state, selectedTalent.country].filter(Boolean).join(', ')}
                    {selectedTalent.distance_km && ` (${selectedTalent.distance_km} km away)`}
                  </p>
                </div>
              )}

              {selectedTalent.search_summary ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">About</h4>
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedTalent.search_summary}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-yellow-400 italic">No summary provided by this talent.</p>
                </div>
              )}

              {selectedTalent.availability_description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Availability</h4>
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedTalent.availability_description}</p>
                </div>
              )}

              {selectedTalent.skills && selectedTalent.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTalent.skills.slice(0, 8).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                    {selectedTalent.skills.length > 8 && (
                      <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                        +{selectedTalent.skills.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-300">
                  ℹ️ This is a brief summary provided by the talent. To see their full profile and contact them, you'll need to request a connection, which they can accept or decline after reviewing your business profile.
                </p>
              </div>

              <div className="flex gap-4 mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={() => handleRequestConnection(selectedTalent.id)}
                  disabled={requestingConnection}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {requestingConnection ? 'Sending Request...' : 'Request Connection'}
                </button>
                <button
                  onClick={() => {
                    setShowTalentPopup(false)
                    setSelectedTalent(null)
                    setSelectedTalentId(null)
                  }}
                  className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
