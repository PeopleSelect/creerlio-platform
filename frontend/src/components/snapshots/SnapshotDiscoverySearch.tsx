'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import AnonymousCandidateCard, { SnapshotResult } from './AnonymousCandidateCard'
import RequestAccessModal from './RequestAccessModal'

const INDUSTRY_OPTIONS = [
  'Technology', 'Finance', 'Healthcare', 'Marketing', 'Sales',
  'Engineering', 'Design', 'Legal', 'Education', 'Consulting',
  'Media', 'Logistics', 'Retail', 'Manufacturing', 'Non-profit',
]

interface Filters {
  skills: string
  industry: string
  location: string
  min_years: string
  max_years: string
}

const DEFAULT_FILTERS: Filters = {
  skills: '',
  industry: '',
  location: '',
  min_years: '',
  max_years: '',
}

export default function SnapshotDiscoverySearch() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [results, setResults] = useState<SnapshotResult[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [requestTarget, setRequestTarget] = useState<SnapshotResult | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const setFilter = (k: keyof Filters, v: string) =>
    setFilters((f) => ({ ...f, [k]: v }))

  const toggleIndustry = (tag: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const buildQuery = useCallback(
    (p = 1) => {
      const params = new URLSearchParams()
      if (filters.skills.trim()) params.set('skills', filters.skills.trim())
      if (selectedIndustries.length) params.set('industry', selectedIndustries.join(','))
      if (filters.location.trim()) params.set('location', filters.location.trim())
      if (filters.min_years) params.set('min_years', filters.min_years)
      if (filters.max_years) params.set('max_years', filters.max_years)
      params.set('page', String(p))
      params.set('limit', '20')
      return params.toString()
    },
    [filters, selectedIndustries]
  )

  const search = useCallback(
    async (p = 1) => {
      setLoading(true)
      setSearched(true)
      try {
        const res = await fetch(`/api/snapshots/search?${buildQuery(p)}`)
        const json = await res.json()
        if (res.ok) {
          if (p === 1) {
            setResults(json.results || [])
          } else {
            setResults((prev) => [...prev, ...(json.results || [])])
          }
          setTotal(json.total)
          setPage(p)
        }
      } finally {
        setLoading(false)
      }
    },
    [buildQuery]
  )

  const hasActiveFilters =
    filters.skills.trim() !== '' ||
    filters.location.trim() !== '' ||
    filters.min_years !== '' ||
    filters.max_years !== '' ||
    selectedIndustries.length > 0

  // Auto-search on filter change (debounced) — only when at least one filter is set
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!hasActiveFilters) {
      setResults([])
      setTotal(null)
      setSearched(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      search(1)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [filters, selectedIndustries, search, hasActiveFilters])

  const hasMore = total !== null && results.length < total

  return (
    <div className="space-y-6">
      {/* Search filters */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Skills */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Skills</label>
            <input
              type="text"
              value={filters.skills}
              onChange={(e) => setFilter('skills', e.target.value)}
              placeholder="React, TypeScript, Python…"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Location</label>
            <input
              type="text"
              value={filters.location}
              onChange={(e) => setFilter('location', e.target.value)}
              placeholder="Dublin, London, Remote…"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Experience range */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Experience (years)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={filters.min_years}
                onChange={(e) => setFilter('min_years', e.target.value)}
                placeholder="Min"
                min={0}
                max={60}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <span className="text-slate-600">–</span>
              <input
                type="number"
                value={filters.max_years}
                onChange={(e) => setFilter('max_years', e.target.value)}
                placeholder="Max"
                min={0}
                max={60}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Industry tags */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Industry</label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleIndustry(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedIndustries.includes(tag)
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results header */}
      {searched && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {loading && results.length === 0
              ? 'Searching…'
              : total === null
              ? ''
              : `${total} anonymous candidate${total !== 1 ? 's' : ''} found`}
          </p>
          {(filters.skills || filters.location || selectedIndustries.length > 0) && (
            <button
              onClick={() => { setFilters(DEFAULT_FILTERS); setSelectedIndustries([]) }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Loading spinner (initial) */}
      {loading && results.length === 0 && (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Prompt when no filters entered */}
      {!hasActiveFilters && (
        <div className="text-center py-12 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">Start your search</p>
          <p className="text-slate-600 text-sm mt-1">Enter a skill, location, or industry to find anonymous candidates</p>
        </div>
      )}

      {/* Empty state — filters active but no results */}
      {!loading && searched && hasActiveFilters && results.length === 0 && (
        <div className="text-center py-12 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">No anonymous candidates match your search</p>
          <p className="text-slate-600 text-sm mt-1">Try broadening your filters</p>
        </div>
      )}

      {/* Results grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {results.map((snapshot) => (
            <AnonymousCandidateCard
              key={snapshot.id}
              snapshot={snapshot}
              onRequestAccess={setRequestTarget}
              onViewDetails={(s) => window.open(`/dashboard/business/candidates/${s.id}`, '_blank')}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="flex justify-center">
          <button
            onClick={() => search(page + 1)}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
          >
            Load more candidates
          </button>
        </div>
      )}

      {loading && results.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Request access modal */}
      {requestTarget && (
        <RequestAccessModal
          snapshot={requestTarget}
          onClose={() => setRequestTarget(null)}
        />
      )}
    </div>
  )
}
