'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Search, MapPin, Building2, ArrowRight, Loader2 } from 'lucide-react'

interface BusinessResult {
  slug: string
  name: string
  tagline: string | null
  logo_url: string | null
  industry: string | null
  location: string | null
  description: string | null
  industries_served: string[]
  badges: string[]
  website_url: string | null
  enquiry_enabled: boolean
}

function BadgePill({ label }: { label: string }) {
  const colours: Record<string, string> = {
    'Verified Business':     'bg-emerald-100 text-emerald-700',
    'Active Employer':       'bg-blue-100 text-blue-700',
    'Talent Recommended':    'bg-violet-100 text-violet-700',
  }
  const cls = colours[label] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function BusinessCard({ biz }: { biz: BusinessResult }) {
  return (
    <Link
      href={`/businesses/${biz.slug}`}
      className="group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
    >
      <div className="flex items-start gap-4">
        {biz.logo_url ? (
          <img
            src={biz.logo_url}
            alt={`${biz.name} logo`}
            className="h-12 w-12 rounded-xl object-cover border border-gray-100 shrink-0"
          />
        ) : (
          <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6 text-blue-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
              {biz.name}
            </h3>
            {biz.badges.slice(0, 2).map(b => <BadgePill key={b} label={b} />)}
          </div>

          {biz.tagline && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{biz.tagline}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
            {biz.industry && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {biz.industry}
              </span>
            )}
            {biz.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {biz.location}
              </span>
            )}
          </div>

          {biz.industries_served.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {biz.industries_served.slice(0, 4).map((ind: string) => (
                <span
                  key={ind}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                >
                  {ind}
                </span>
              ))}
            </div>
          )}
        </div>

        <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 mt-1" />
      </div>
    </Link>
  )
}

function BusinessesPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ]                       = useState(params?.get('q') || '')
  const [industry, setIndustry]         = useState(params?.get('industry') || '')
  const [location, setLocation]         = useState(params?.get('location') || '')
  const [results, setResults]           = useState<BusinessResult[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(false)
  const [searched, setSearched]         = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function runSearch(query: string, ind: string, loc: string) {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setSearched(true)
    try {
      const sp = new URLSearchParams()
      if (query) sp.set('q', query)
      if (ind)   sp.set('industry', ind)
      if (loc)   sp.set('location', loc)
      const res = await fetch(`/api/businesses/search?${sp}`, { signal: abortRef.current.signal })
      if (!res.ok) throw new Error('Search failed')
      const json = await res.json()
      setResults(json.businesses || [])
      setTotal(json.total || 0)
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setResults([])
        setTotal(0)
      }
    } finally {
      setLoading(false)
    }
  }

  // Run search on mount if params present
  useEffect(() => {
    const initQ = params?.get('q') || ''
    const initI = params?.get('industry') || ''
    const initL = params?.get('location') || ''
    if (initQ || initI || initL) runSearch(initQ, initI, initL)
    else runSearch('', '', '')  // load all on first visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const sp = new URLSearchParams()
    if (q)        sp.set('q', q)
    if (industry) sp.set('industry', industry)
    if (location) sp.set('location', location)
    router.replace(`/businesses?${sp}`)
    runSearch(q, industry, location)
  }

  const EXAMPLE_SEARCHES = [
    'Law firm', 'Marketing agency', 'Software company', 'Accountant Sydney',
    'Recruitment agency', 'Financial services',
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold text-gray-900 shrink-0">
            Creerlio
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link href="/businesses" className="text-blue-600 font-medium">Find Businesses</Link>
            <Link href="/login/business?mode=signin" className="hover:text-blue-600 transition-colors">Business Login</Link>
            <Link href="/login/talent?mode=signin" className="hover:text-blue-600 transition-colors">Talent Login</Link>
          </nav>
          <Link
            href="/login/business?mode=signup&redirect=/dashboard/business"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            List Your Business
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Find Businesses on Creerlio
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Discover law firms, agencies, studios, and more. Search by name, industry, or location.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Business name or keyword…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder="Industry (e.g. Legal, Finance)"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Location (e.g. Sydney, Melbourne)"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_SEARCHES.map(ex => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => { setQ(ex); runSearch(ex, industry, location) }}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shrink-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </div>
        </form>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : searched ? (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {total === 0 ? 'No businesses found.' : `${total} business${total !== 1 ? 'es' : ''} found`}
            </p>
            <div className="space-y-3">
              {results.map(biz => <BusinessCard key={biz.slug} biz={biz} />)}
            </div>
            {results.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                <Building2 className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No businesses matched your search. Try different keywords or browse all.</p>
                <button
                  onClick={() => { setQ(''); setIndustry(''); setLocation(''); runSearch('', '', '') }}
                  className="mt-4 text-sm text-blue-600 hover:underline"
                >
                  Clear filters and browse all
                </button>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}

export default function BusinessesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <BusinessesPageInner />
    </Suspense>
  )
}
