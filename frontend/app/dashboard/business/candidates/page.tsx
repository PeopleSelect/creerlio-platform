'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import SnapshotDiscoverySearch from '@/components/snapshots/SnapshotDiscoverySearch'

interface SentRequest {
  id: string
  snapshot_id: string
  snapshot_headline: string | null
  snapshot_location: string | null
  snapshot_experience_years: number | null
  requester_name: string
  requester_company: string | null
  reason: string | null
  status: 'pending' | 'approved' | 'declined'
  decided_at: string | null
  created_at: string
  talent_id: string | null
}

type Tab = 'search' | 'requests'

function MyRequestsPanel({ accessToken }: { accessToken: string }) {
  const [requests, setRequests] = useState<SentRequest[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/snapshots/my-requests', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const json = await res.json()
        setRequests(json.requests || [])
      }
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <p className="font-semibold text-white mb-1">No access requests sent yet</p>
        <p className="text-slate-500 text-sm">Use the Search tab to find anonymous candidates and request access to their full profiles.</p>
      </div>
    )
  }

  const pending  = requests.filter(r => r.status === 'pending')
  const approved = requests.filter(r => r.status === 'approved')
  const declined = requests.filter(r => r.status === 'declined')

  return (
    <div className="space-y-6">
      {/* Approved */}
      {approved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
            Approved — Profile Access Granted ({approved.length})
          </h2>
          <div className="space-y-3">
            {approved.map(r => (
              <div key={r.id} className="rounded-xl bg-slate-900 border border-emerald-500/30 px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm mb-0.5">{r.snapshot_headline || 'Anonymous Candidate'}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-2">
                    {r.snapshot_experience_years != null && <span>{r.snapshot_experience_years} yrs exp.</span>}
                    {r.snapshot_location && <span>{r.snapshot_location}</span>}
                    <span className="text-emerald-400 font-medium">Approved {r.decided_at ? new Date(r.decided_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                  </div>
                  {r.reason && (
                    <p className="text-xs text-slate-500 italic mb-2">Your message: &ldquo;{r.reason}&rdquo;</p>
                  )}
                </div>
                {r.talent_id ? (
                  <Link
                    href={`/dashboard/business/talent/${r.talent_id}`}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    View Profile
                  </Link>
                ) : (
                  <span className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-400 text-xs">Profile unavailable</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3">
            Awaiting Response ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(r => (
              <div key={r.id} className="rounded-xl bg-slate-900 border border-amber-500/20 px-5 py-4">
                <p className="font-semibold text-white text-sm mb-0.5">{r.snapshot_headline || 'Anonymous Candidate'}</p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-1">
                  {r.snapshot_experience_years != null && <span>{r.snapshot_experience_years} yrs exp.</span>}
                  {r.snapshot_location && <span>{r.snapshot_location}</span>}
                  <span className="text-amber-400 font-medium">Requested {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                {r.reason && (
                  <p className="text-xs text-slate-500 italic">Your message: &ldquo;{r.reason}&rdquo;</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Declined */}
      {declined.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Declined ({declined.length})
          </h2>
          <div className="space-y-3">
            {declined.map(r => (
              <div key={r.id} className="rounded-xl bg-slate-900 border border-slate-800 px-5 py-4 opacity-60">
                <p className="font-semibold text-white text-sm mb-0.5">{r.snapshot_headline || 'Anonymous Candidate'}</p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  {r.snapshot_experience_years != null && <span>{r.snapshot_experience_years} yrs exp.</span>}
                  {r.snapshot_location && <span>{r.snapshot_location}</span>}
                  <span className="text-slate-500">Declined {r.decided_at ? new Date(r.decided_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default function CandidatesDiscoveryPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('search')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setAccessToken(session.access_token)
      setChecking(false)
    })
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard/business" className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="font-bold text-white">Anonymous Candidate Discovery</h1>
            <p className="text-xs text-slate-500">Search talent snapshots. Identity revealed only with candidate approval.</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 rounded-xl p-1 mb-6 w-fit">
          <button
            type="button"
            onClick={() => setTab('search')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'search' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Search Candidates
          </button>
          <button
            type="button"
            onClick={() => setTab('requests')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'requests' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-300'}`}
          >
            My Access Requests
          </button>
        </div>

        {tab === 'search' && (
          <>
            {/* Privacy banner */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 mb-6">
              <svg className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-sm text-blue-300">
                All candidates are fully anonymous. No names, photos, or contact details are shown. Request full profile access and the candidate will be notified to approve or decline.
              </p>
            </div>
            <SnapshotDiscoverySearch />
          </>
        )}

        {tab === 'requests' && accessToken && (
          <MyRequestsPanel accessToken={accessToken} />
        )}
      </div>
    </div>
  )
}
