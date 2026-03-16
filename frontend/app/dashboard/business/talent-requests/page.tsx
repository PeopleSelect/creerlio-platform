'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Briefcase, Plus, Trash2, MapPin, Loader2, Users, ChevronLeft,
  ShieldCheck, AlertCircle, CheckCircle2,
} from 'lucide-react'

interface TalentRequest {
  id: string
  role_title: string
  location: string | null
  experience_level: string | null
  notes: string | null
  created_at: string
}

interface Signal {
  role: string
  count: number
}

export default function BusinessTalentRequestsPage() {
  const router = useRouter()
  const [accessToken, setAccessToken]   = useState<string | null>(null)
  const [businessId, setBusinessId]     = useState<string | null>(null)
  const [businessSlug, setBusinessSlug] = useState<string | null>(null)
  const [requests, setRequests]         = useState<TalentRequest[]>([])
  const [signals, setSignals]           = useState<Signal[]>([])
  const [totalSignals, setTotalSignals] = useState(0)
  const [loading, setLoading]           = useState(true)
  const [authError, setAuthError]       = useState(false)

  // Create form state
  const [roleTitle, setRoleTitle]         = useState('')
  const [location, setLocation]           = useState('')
  const [expLevel, setExpLevel]           = useState('')
  const [notes, setNotes]                 = useState('')
  const [creating, setCreating]           = useState(false)
  const [createError, setCreateError]     = useState('')
  const [createSuccess, setCreateSuccess] = useState(false)
  const [showForm, setShowForm]           = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setAuthError(true); setLoading(false); return }
      const token = session.access_token
      setAccessToken(token)

      // Get business id + slug
      const { data: bp } = await supabase
        .from('business_profiles')
        .select('id, business_id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      // Try user_business_roles for the business id
      let bId = bp?.business_id || null
      if (!bId) {
        const { data: role } = await supabase
          .from('user_business_roles')
          .select('business_id')
          .eq('user_id', session.user.id)
          .in('role', ['super_admin', 'business_admin'])
          .maybeSingle()
        bId = role?.business_id || null
      }

      if (!bId) { setAuthError(true); setLoading(false); return }
      if (!cancelled) setBusinessId(bId)

      // Get slug from business_profile_pages
      const { data: page } = await supabase
        .from('business_profile_pages')
        .select('slug')
        .eq('business_id', bId)
        .maybeSingle()
      if (!cancelled && page?.slug) setBusinessSlug(page.slug)

      // Load requests
      const reqRes = await fetch(`/api/businesses/talent-requests?business_id=${bId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (reqRes.ok) {
        const j = await reqRes.json()
        if (!cancelled) setRequests(j.requests || [])
      }

      // Load signals
      const sigRes = await fetch(`/api/businesses/talent-signals?business_id=${bId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (sigRes.ok) {
        const j = await sigRes.json()
        if (!cancelled) { setSignals(j.signals || []); setTotalSignals(j.total_interested || 0) }
      }

      if (!cancelled) setLoading(false)
    }
    init().catch(() => { setLoading(false); setAuthError(true) })
    return () => { cancelled = true }
  }, [])

  async function createRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !accessToken || !roleTitle.trim()) return
    setCreating(true)
    setCreateError('')
    setCreateSuccess(false)
    try {
      const res = await fetch('/api/businesses/talent-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ business_id: businessId, role_title: roleTitle, location, experience_level: expLevel, notes }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to create')
      }
      const j = await res.json()
      setRequests(prev => [j.request, ...prev])
      setRoleTitle(''); setLocation(''); setExpLevel(''); setNotes('')
      setCreateSuccess(true)
      setShowForm(false)
      setTimeout(() => setCreateSuccess(false), 3000)
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function deleteRequest(id: string) {
    if (!accessToken) return
    const res = await fetch(`/api/businesses/talent-requests?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.ok) setRequests(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  if (authError) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <AlertCircle className="h-10 w-10 text-red-400" />
      <p className="text-gray-600">You need to be a business admin to view this page.</p>
      <Link href="/dashboard/business" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard/business" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-semibold text-gray-800">Talent Requests & Signals</h1>
          {businessSlug && (
            <Link
              href={`/businesses/${businessSlug}`}
              className="ml-auto text-xs text-blue-600 hover:underline"
              target="_blank"
            >
              View Public Page
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Anonymous Talent Signals */}
        <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Anonymous Talent Interest</h2>
            <span className="ml-auto rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              Only visible to you
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Talent who have granted your business access — grouped anonymously by role. No identities are revealed.
          </p>

          {signals.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No talent have signalled interest yet.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                {totalSignals} professional{totalSignals !== 1 ? 's' : ''} interested in your business:
              </p>
              {signals.map(s => (
                <div key={s.role} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-gray-700">{s.role}</span>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    {s.count} interested
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Talent Requests */}
        <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Talent Access Requests</h2>
            <button
              onClick={() => setShowForm(v => !v)}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Request
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Post the types of professionals you are looking to connect with.
            These requests appear on your public business page and are visible to talent.
          </p>

          {createSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Request created and published to your public page.
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <form onSubmit={createRequest} className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-blue-800">New Talent Request</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role / Expertise *</label>
                  <input
                    required value={roleTitle} onChange={e => setRoleTitle(e.target.value)}
                    placeholder="e.g. Corporate Lawyer"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                  <input
                    value={location} onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Sydney, Remote"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Experience Level</label>
                  <input
                    value={expLevel} onChange={e => setExpLevel(e.target.value)}
                    placeholder="e.g. 5+ years, Senior, Graduate"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Additional Notes</label>
                  <textarea
                    value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    placeholder="e.g. Commercial contract experience preferred"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Publish Request
                </button>
              </div>
            </form>
          )}

          {/* Request list */}
          {requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No talent requests yet. Add your first one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{req.role_title}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                      {req.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.location}</span>}
                      {req.experience_level && <span>{req.experience_level}</span>}
                    </div>
                    {req.notes && <p className="mt-2 text-sm text-gray-600">{req.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteRequest(req.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                    title="Remove request"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
