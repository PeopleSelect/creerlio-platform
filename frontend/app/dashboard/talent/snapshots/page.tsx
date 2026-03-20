'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import SnapshotBuilder from '@/components/snapshots/SnapshotBuilder'
import SnapshotAnalyticsPanel from '@/components/snapshots/SnapshotAnalyticsPanel'

interface SnapshotRow {
  id: string
  snapshot_title: string
  headline: string
  experience_years: number | null
  location: string | null
  skills_json: string[]
  industry_tags: string[]
  summary: string | null
  is_active: boolean
  view_count: number
  search_appearance_count: number
  created_at: string
  updated_at: string
}

interface AccessRequest {
  id: string
  snapshot_id: string
  requester_name: string
  requester_company: string | null
  requester_email: string
  reason: string | null
  status: string
  decided_at: string | null
  created_at: string
}

type Tab = 'snapshots' | 'analytics' | 'requests'

function SnapshotInfoTooltip() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        title="What are Anonymous Snapshots?"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="w-5 h-5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center transition-colors shrink-0"
        aria-label="What are Anonymous Snapshots?"
      >
        ?
      </button>
      {open && (
        <div className="absolute left-7 top-1/2 -translate-y-1/2 z-50 w-80 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl p-4 text-left">
          {/* Arrow */}
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-800 border-l border-b border-slate-700 rotate-45" />
          <p className="font-semibold text-white text-sm mb-2">What are Anonymous Snapshots?</p>
          <p className="text-slate-400 text-xs leading-relaxed mb-3">
            A snapshot lets you be discovered by recruiters and businesses <span className="text-white font-medium">without revealing your name or identity</span>. Only your skills, experience level, location, and summary are visible — recruiters must request access before seeing your full profile.
          </p>
          <p className="font-semibold text-white text-xs mb-1.5">How to use:</p>
          <ol className="text-slate-400 text-xs leading-relaxed space-y-1.5 list-none">
            <li className="flex gap-2"><span className="text-emerald-400 font-bold shrink-0">1.</span><span>Click <span className="text-white font-medium">+ New snapshot</span> and fill in your headline, skills, and a brief summary.</span></li>
            <li className="flex gap-2"><span className="text-emerald-400 font-bold shrink-0">2.</span><span>Toggle your snapshot <span className="text-white font-medium">Active</span> so it appears in recruiter searches.</span></li>
            <li className="flex gap-2"><span className="text-emerald-400 font-bold shrink-0">3.</span><span>When a recruiter is interested, they send an <span className="text-white font-medium">access request</span> — you decide whether to share your full profile.</span></li>
            <li className="flex gap-2"><span className="text-emerald-400 font-bold shrink-0">4.</span><span>Track views and search appearances in the <span className="text-white font-medium">Analytics</span> tab.</span></li>
          </ol>
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-slate-500 text-xs">You can create up to 10 snapshots — useful for targeting different roles or industries.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TalentSnapshotsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([])
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [tab, setTab] = useState<Tab>('snapshots')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [profileDefaults, setProfileDefaults] = useState<{ location?: string; experience_years?: number }>({})

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setAccessToken(session.access_token)
      // Load talent profile to pre-fill snapshot defaults
      const { data: tp } = await supabase
        .from('talent_profiles')
        .select('city, country, experience_years')
        .eq('id', session.user.id)
        .maybeSingle()
      if (tp) {
        const locParts = [tp.city, tp.country].filter(Boolean)
        setProfileDefaults({
          location: locParts.length > 0 ? locParts.join(', ') : undefined,
          experience_years: tp.experience_years ?? undefined,
        })
      }
    })
  }, [router])

  const loadData = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      // Load snapshots
      const { data: { session } } = await supabase.auth.getSession()
      const tok = session?.access_token
      if (!tok) return

      // Use supabase client directly for snapshot reads (owner policy)
      const { data: snaps } = await supabase
        .from('talent_snapshots')
        .select('*')
        .order('created_at', { ascending: false })

      setSnapshots((snaps || []) as SnapshotRow[])

      // Load access requests
      const res = await fetch('/api/snapshots/request-access', {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.ok) {
        const json = await res.json()
        setRequests(json.requests || [])
      }
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { if (accessToken) loadData() }, [accessToken, loadData])

  const toggleActive = async (snapshot: SnapshotRow) => {
    setTogglingId(snapshot.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`/api/snapshots/${snapshot.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ is_active: !snapshot.is_active }),
      })
      setSnapshots((prev) =>
        prev.map((s) => s.id === snapshot.id ? { ...s, is_active: !s.is_active } : s)
      )
    } finally {
      setTogglingId(null)
    }
  }

  const deleteSnapshot = async (id: string) => {
    if (!confirm('Delete this snapshot? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/snapshots/create', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ snapshot_id: id }),
      })
      setSnapshots((prev) => prev.filter((s) => s.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const decideRequest = async (requestId: string, status: 'approved' | 'declined') => {
    setDecidingId(requestId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/snapshots/request-access', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ request_id: requestId, status }),
      })
      setRequests((prev) =>
        prev.map((r) => r.id === requestId ? { ...r, status, decided_at: new Date().toISOString() } : r)
      )
    } finally {
      setDecidingId(null)
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const analyticsData = snapshots.map((sn) => ({
    id: sn.id,
    snapshot_title: sn.snapshot_title,
    headline: sn.headline,
    is_active: sn.is_active,
    view_count: sn.view_count,
    search_appearance_count: sn.search_appearance_count,
    pending_requests: requests.filter((r) => r.snapshot_id === sn.id && r.status === 'pending').length,
    approved_requests: requests.filter((r) => r.snapshot_id === sn.id && r.status === 'approved').length,
    declined_requests: requests.filter((r) => r.snapshot_id === sn.id && r.status === 'declined').length,
    created_at: sn.created_at,
  }))

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard/talent/edit" className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white">Anonymous Snapshots</h1>
              <SnapshotInfoTooltip />
            </div>
            <p className="text-xs text-slate-500">Discover opportunities without revealing your identity</p>
          </div>
          {!creating && editingId === null && (
            <button
              onClick={() => setCreating(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-colors"
            >
              + New snapshot
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 rounded-xl p-1 mb-6 w-fit">
          {([
            { key: 'snapshots', label: 'My Snapshots' },
            { key: 'analytics', label: 'Analytics' },
            { key: 'requests', label: `Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Create form */}
        {creating && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 mb-6">
            <h2 className="font-semibold text-white mb-4">Create new snapshot</h2>
            <SnapshotBuilder
              initial={profileDefaults}
              onSaved={(snap) => {
                setSnapshots((prev) => [{ ...snap, skills_json: snap.skills ?? [], view_count: 0, search_appearance_count: 0 }, ...prev])
                setCreating(false)
              }}
              onCancel={() => setCreating(false)}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Snapshots tab */}
        {!loading && tab === 'snapshots' && (
          <>
            {snapshots.length === 0 && !creating && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="font-semibold text-white mb-1">No snapshots yet</p>
                <p className="text-slate-500 text-sm mb-5">Create an anonymous snapshot to be discoverable by recruiters without revealing who you are.</p>
                <button
                  onClick={() => setCreating(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors"
                >
                  Create your first snapshot
                </button>
              </div>
            )}

            <div className="space-y-4">
              {snapshots.map((sn) => (
                <div key={sn.id} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
                  {editingId === sn.id ? (
                    <div className="p-6">
                      <h3 className="font-semibold text-white mb-4">Edit snapshot</h3>
                      <SnapshotBuilder
                        initial={{
                          id: sn.id,
                          snapshot_title: sn.snapshot_title,
                          headline: sn.headline,
                          experience_years: sn.experience_years ?? undefined,
                          location: sn.location ?? '',
                          skills: sn.skills_json,
                          industry_tags: sn.industry_tags,
                          summary: sn.summary ?? '',
                          is_active: sn.is_active,
                        }}
                        onSaved={(updated) => {
                          setSnapshots((prev) => prev.map((s) => s.id === sn.id ? { ...s, ...updated } : s))
                          setEditingId(null)
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  ) : (
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-white">{sn.snapshot_title}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              sn.is_active
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}>
                              {sn.is_active ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">{sn.headline}</p>
                        </div>

                        {/* Toggle active */}
                        <button
                          onClick={() => toggleActive(sn)}
                          disabled={togglingId === sn.id}
                          className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${sn.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${sn.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
                        {sn.experience_years != null && <span>{sn.experience_years} yrs exp.</span>}
                        {sn.location && <span>{sn.location}</span>}
                        <span>{sn.view_count} views</span>
                        <span>{sn.search_appearance_count} appearances</span>
                      </div>

                      {/* Skills preview */}
                      {sn.skills_json?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {sn.skills_json.slice(0, 5).map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700">{s}</span>
                          ))}
                          {sn.skills_json.length > 5 && (
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-xs rounded-lg border border-slate-700">+{sn.skills_json.length - 5}</span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-3 border-t border-slate-800">
                        <button
                          onClick={() => setEditingId(sn.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSnapshot(sn.id)}
                          disabled={deletingId === sn.id}
                          className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-medium transition-colors"
                        >
                          {deletingId === sn.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Analytics tab */}
        {!loading && tab === 'analytics' && (
          <SnapshotAnalyticsPanel snapshots={analyticsData} />
        )}

        {/* Requests tab */}
        {!loading && tab === 'requests' && (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center">
                <p className="text-slate-500 text-sm">No access requests yet.</p>
                <p className="text-slate-600 text-xs mt-1">When recruiters request your full profile you'll see them here.</p>
              </div>
            ) : (
              requests.map((r) => (
                <div key={r.id} className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-medium text-white text-sm">{r.requester_name}</p>
                      {r.requester_company && <p className="text-xs text-slate-500">{r.requester_company}</p>}
                      <p className="text-xs text-slate-600">{r.requester_email}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                      r.status === 'pending'  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                                'bg-red-500/20 text-red-300 border-red-500/40'
                    }`}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </div>

                  {r.reason && (
                    <p className="text-xs text-slate-400 mb-3 bg-slate-800 rounded-lg px-3 py-2">{r.reason}</p>
                  )}

                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => decideRequest(r.id, 'approved')}
                        disabled={decidingId === r.id}
                        className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-colors"
                      >
                        Approve & share profile
                      </button>
                      <button
                        onClick={() => decideRequest(r.id, 'declined')}
                        disabled={decidingId === r.id}
                        className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 mt-2">
                    {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
