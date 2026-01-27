'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type PublicLiteProfile = {
  id?: string
  user_id?: string
  business_profile_id?: string | null
  is_public: boolean
  name: string
  summary: string
  industries: string[]
  company_size: string
  locations: string[]
  what_company_does: string
  culture_values: string
  work_environment: string
  typical_roles: string
  website: string
  logo_url: string
  banner_url: string
  source_url?: string
  source_text?: string
}

const emptyProfile: PublicLiteProfile = {
  is_public: false,
  name: '',
  summary: '',
  industries: [],
  company_size: '',
  locations: [],
  what_company_does: '',
  culture_values: '',
  work_environment: '',
  typical_roles: '',
  website: '',
  logo_url: '',
  banner_url: '',
}

const toList = (value: string) =>
  value
    .split(/[,\\n]/)
    .map((v) => v.trim())
    .filter(Boolean)

export default function PublicLiteBusinessProfilePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<PublicLiteProfile>(emptyProfile)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importUrl, setImportUrl] = useState('')
  const [importText, setImportText] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [summaryGenerating, setSummaryGenerating] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [locationsInput, setLocationsInput] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ id: string; label: string }>>([])
  const [locationSuggestionsOpen, setLocationSuggestionsOpen] = useState(false)
  const [locationSuggestionsLoading, setLocationSuggestionsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const uid = sessionRes.session?.user?.id
        if (!uid) {
          router.replace('/login?redirect=/dashboard/business/public-lite')
          return
        }

        const { data: liteRes, error: liteError } = await supabase
          .from('public_lite_business_profiles')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle()

        if (!cancelled && liteError) {
          setError(liteError.message)
        }

        if (!cancelled && liteRes) {
          setProfileId(liteRes.id)
          setProfile({
            ...emptyProfile,
            ...liteRes,
            industries: Array.isArray(liteRes.industries) ? liteRes.industries : [],
            locations: Array.isArray(liteRes.locations) ? liteRes.locations : [],
            name: liteRes.name || '',
            summary: liteRes.summary || '',
            company_size: liteRes.company_size || '',
            what_company_does: liteRes.what_company_does || '',
            culture_values: liteRes.culture_values || '',
            work_environment: liteRes.work_environment || '',
            typical_roles: liteRes.typical_roles || '',
            website: liteRes.website || '',
            logo_url: liteRes.logo_url || '',
            banner_url: liteRes.banner_url || '',
          })
        } else if (!cancelled) {
          const { data: businessRes } = await supabase
            .from('business_profiles')
            .select('id, business_name, name, website, industry, location, city, state, country')
            .eq('user_id', uid)
            .maybeSingle()
          if (businessRes) {
            setProfile((prev) => ({
              ...prev,
              business_profile_id: businessRes.id,
              name: businessRes.business_name || businessRes.name || prev.name,
              website: businessRes.website || prev.website,
              industries: businessRes.industry ? [businessRes.industry] : prev.industries,
              locations: [
                [
                  businessRes.location,
                  businessRes.city,
                  businessRes.state,
                  businessRes.country,
                ]
                  .filter(Boolean)
                  .join(', ')
              ].filter(Boolean),
            }))
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
    if (!locationSuggestionsOpen || !locationsInput.trim() || locationsInput.trim().length < 2 || !token) {
      setLocationSuggestions([])
      return
    }
    const timeout = setTimeout(async () => {
      setLocationSuggestionsLoading(true)
      try {
        const u = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationsInput.trim())}.json`)
        u.searchParams.set('access_token', token)
        u.searchParams.set('limit', '6')
        u.searchParams.set('types', 'place,locality,neighborhood,postcode,address')
        const res = await fetch(u.toString())
        const data = await res.json()
        const feats = Array.isArray(data?.features) ? data.features : []
        const suggestions = feats
          .map((f: any) => ({
            id: String(f?.id || ''),
            label: String(f?.place_name || '').trim(),
          }))
          .filter((s: any) => s.id && s.label)
        setLocationSuggestions(suggestions)
      } catch (err) {
        console.error('Location suggestions error:', err)
        setLocationSuggestions([])
      } finally {
        setLocationSuggestionsLoading(false)
      }
    }, 250)
    return () => clearTimeout(timeout)
  }, [locationsInput, locationSuggestionsOpen])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const uid = sessionRes.session?.user?.id
      if (!uid) {
        setError('Please sign in to save.')
        return
      }

      const safe = (value: any) => String(value || '').trim()
      const payload = {
        id: profileId || undefined,
        user_id: uid,
        business_profile_id: profile.business_profile_id || null,
        is_public: profile.is_public,
        name: safe(profile.name),
        summary: safe(profile.summary),
        industries: profile.industries,
        company_size: safe(profile.company_size) || null,
        locations: profile.locations,
        what_company_does: safe(profile.what_company_does),
        culture_values: safe(profile.culture_values),
        work_environment: safe(profile.work_environment),
        typical_roles: safe(profile.typical_roles),
        website: safe(profile.website),
        logo_url: safe(profile.logo_url),
        banner_url: safe(profile.banner_url),
        source_url: profile.source_url || null,
        source_text: profile.source_text || null,
        updated_at: new Date().toISOString(),
      }

      const { data, error: saveError } = await supabase
        .from('public_lite_business_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select('id')
        .single()

      if (saveError) {
        setError(saveError.message)
        return
      }

      setProfileId(data?.id || profileId)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearAll = () => {
    if (!confirm('Clear all fields in this draft? This will not delete the profile until you click Save.')) {
      return
    }
    setProfile((prev) => ({
      ...emptyProfile,
      business_profile_id: prev.business_profile_id || null,
    }))
    setImportUrl('')
    setImportText('')
    setImportError(null)
  }

  const handleImport = async () => {
    const url = importUrl.trim()
    const text = importText.trim()
    if (!url && !text) {
      setImportError('Add a website URL or paste text to import.')
      return
    }
    setImportLoading(true)
    setImportError(null)
    try {
      const res = await fetch('/api/public-lite/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, pastedText: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data?.error || 'Failed to import.')
        return
      }
      setProfile((prev) => ({
        ...prev,
        name: data.name || prev.name,
        summary: data.summary || prev.summary,
        industries: Array.isArray(data.industries) && data.industries.length ? data.industries : prev.industries,
        locations: Array.isArray(data.locations) && data.locations.length ? data.locations : prev.locations,
        what_company_does: data.what_company_does || prev.what_company_does,
        culture_values: data.culture_values || prev.culture_values,
        work_environment: data.work_environment || prev.work_environment,
        typical_roles: data.typical_roles || prev.typical_roles,
        website: data.website || prev.website,
        logo_url: data.logo_url || prev.logo_url,
        banner_url: data.banner_url || prev.banner_url,
        source_url: data.source_url || prev.source_url,
        source_text: data.source_text || prev.source_text,
      }))
    } finally {
      setImportLoading(false)
    }
  }

  const handleGenerateSummary = async () => {
    setSummaryGenerating(true)
    setSummaryError(null)
    try {
      const res = await fetch('/api/ai/public-lite-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: {
            name: profile.name,
            industries: profile.industries,
            locations: profile.locations,
            what_company_does: profile.what_company_does,
            culture_values: profile.culture_values,
            work_environment: profile.work_environment,
            typical_roles: profile.typical_roles,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSummaryError(data?.error || 'Failed to generate summary.')
        return
      }
      setProfile((prev) => ({ ...prev, summary: data.summary || prev.summary }))
    } finally {
      setSummaryGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Public Talent Profile (Lite)</h1>
            <p className="text-sm text-gray-600">Public profile visible to talent. Keep it concise and clear.</p>
          </div>
          <div className="flex items-center gap-3">
            {profileId && (
              <Link
                href={`/business/public-lite/${profileId}?preview=1`}
                className="px-4 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                Preview as Talent
              </Link>
            )}
            <button
              onClick={handleClearAll}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Clear All
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Profile Basics</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business name</label>
                <input
                  value={profile.name}
                  onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Short summary (2–4 sentences)</label>
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    disabled={summaryGenerating}
                    className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-60"
                  >
                    {summaryGenerating ? 'Writing…' : 'Write with OpenAI'}
                  </button>
                </div>
                <textarea
                  value={profile.summary}
                  onChange={(e) => setProfile((prev) => ({ ...prev, summary: e.target.value }))}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
                {summaryError && <p className="text-sm text-red-600 mt-2">{summaryError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary industries</label>
                <input
                  value={profile.industries.join(', ')}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, industries: toList(e.target.value) }))
                  }
                  placeholder="e.g., Hospitality, Food & Beverage"
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company size range</label>
                <input
                  value={profile.company_size}
                  onChange={(e) => setProfile((prev) => ({ ...prev, company_size: e.target.value }))}
                  placeholder="e.g., 11–50"
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Locations</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {profile.locations.map((loc) => (
                      <span key={loc} className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                        {loc}
                        <button
                          type="button"
                          onClick={() =>
                            setProfile((prev) => ({
                              ...prev,
                              locations: prev.locations.filter((l) => l !== loc),
                            }))
                          }
                          className="ml-2 text-blue-500 hover:text-blue-700"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      value={locationsInput}
                      onChange={(e) => {
                        setLocationsInput(e.target.value)
                        setLocationSuggestionsOpen(true)
                      }}
                      onFocus={() => setLocationSuggestionsOpen(true)}
                      onBlur={() => setTimeout(() => setLocationSuggestionsOpen(false), 150)}
                      placeholder="Search and add a location..."
                      className="w-full p-2 border border-gray-300 rounded text-gray-900"
                    />
                    {locationSuggestionsOpen && (
                      <div className="absolute left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-10">
                        {locationSuggestionsLoading ? (
                          <div className="px-3 py-2 text-sm text-gray-500">Loading suggestions…</div>
                        ) : locationSuggestions.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">No suggestions</div>
                        ) : (
                          locationSuggestions.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setProfile((prev) => ({
                                  ...prev,
                                  locations: prev.locations.includes(s.label)
                                    ? prev.locations
                                    : [...prev.locations, s.label],
                                }))
                                setLocationsInput('')
                                setLocationSuggestionsOpen(false)
                              }}
                            >
                              {s.label}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Talent-Focused Details</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What the company does</label>
                <textarea
                  value={profile.what_company_does}
                  onChange={(e) => setProfile((prev) => ({ ...prev, what_company_does: e.target.value }))}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Culture & values</label>
                <textarea
                  value={profile.culture_values}
                  onChange={(e) => setProfile((prev) => ({ ...prev, culture_values: e.target.value }))}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What it’s like to work here</label>
                <textarea
                  value={profile.work_environment}
                  onChange={(e) => setProfile((prev) => ({ ...prev, work_environment: e.target.value }))}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Typical roles hired</label>
                <textarea
                  value={profile.typical_roles}
                  onChange={(e) => setProfile((prev) => ({ ...prev, typical_roles: e.target.value }))}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Visibility</h2>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={profile.is_public}
                  onChange={(e) => setProfile((prev) => ({ ...prev, is_public: e.target.checked }))}
                />
                Public profile visible to talent
              </label>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Media</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  value={profile.website}
                  onChange={(e) => setProfile((prev) => ({ ...prev, website: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                <input
                  value={profile.logo_url}
                  onChange={(e) => setProfile((prev) => ({ ...prev, logo_url: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banner URL</label>
                <input
                  value={profile.banner_url}
                  onChange={(e) => setProfile((prev) => ({ ...prev, banner_url: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Import from website</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                <input
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paste text (optional)</label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              {importError && <p className="text-sm text-red-600">{importError}</p>}
              <button
                type="button"
                onClick={handleImport}
                disabled={importLoading}
                className="w-full px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold disabled:opacity-60"
              >
                {importLoading ? 'Importing…' : 'Import & Fill Draft'}
              </button>
              <p className="text-xs text-gray-500">
                Import fills the draft only. Click Save to publish updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
