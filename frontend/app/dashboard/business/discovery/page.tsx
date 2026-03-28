'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { X, Send, Loader2, CheckCircle2 } from 'lucide-react'

type PublicTalent = {
  talent_profile_id: string
  username: string
  headline?: string | null
  short_bio?: string | null
  selected_skills?: string[] | null
}

export const dynamic = 'force-dynamic'

// ── Request Connection Modal ────────────────────────────────────────────────
function RequestModal({
  talent,
  token,
  onClose,
  onSent,
}: {
  talent: PublicTalent
  token: string
  onClose: () => void
  onSent: (id: string) => void
}) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/business/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ talent_profile_id: talent.talent_profile_id, message: message.trim() || null }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to send request')
      onSent(talent.talent_profile_id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-bold text-white text-lg">Request Connection</h2>
            <p className="text-xs text-slate-400 mt-0.5">This talent will remain anonymous until they accept</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {talent.headline && (
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white font-medium">
              {talent.headline}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Introduction message <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Introduce your business and why you'd like to connect..."
              className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function RecruiterDiscoveryPage() {
  const router = useRouter()
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [talent, setTalent]         = useState<PublicTalent[]>([])
  const [requestedIds, setRequested] = useState<Set<string>>(new Set())
  const [token, setToken]           = useState<string | null>(null)
  const [q, setQ]                   = useState('')
  const [modal, setModal]           = useState<PublicTalent | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const session = sessionRes.session
        if (!session) { router.replace('/login?redirect=/dashboard/business/discovery'); return }

        setToken(session.access_token)

        // Load existing outreach requests so we know which are already sent
        const existing = await fetch('/api/business/outreach', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).then(r => r.json()).catch(() => ({ requests: [] }))

        const sentIds = new Set<string>(
          (existing.requests || []).map((r: any) => String(r.talent_profile_id))
        )
        if (!cancelled) setRequested(sentIds)

        const res = await supabase
          .from('public_talent_profiles')
          .select('talent_profile_id, username, headline, short_bio, selected_skills')
          .eq('is_public', true)
          .order('updated_at', { ascending: false })
          .limit(100)

        if (res.error) { setError(res.error.message); return }
        if (!cancelled) setTalent((res.data as any) || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [router])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return talent
    return talent.filter((t) => {
      const hay = [
        t.headline,
        t.short_bio,
        ...(Array.isArray(t.selected_skills) ? t.selected_skills : []),
      ].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(s)
    })
  }, [talent, q])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {modal && token && (
        <RequestModal
          talent={modal}
          token={token}
          onClose={() => setModal(null)}
          onSent={(id) => {
            setRequested(prev => new Set(prev).add(id))
            setModal(null)
          }}
        />
      )}

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xl font-bold">Talent Discovery</div>
            <div className="text-xs text-slate-400">Browse anonymous talent — identity revealed only after connection accepted</div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/business" className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-100 text-sm">{error}</div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by skill, title, bio..."
            className="w-full sm:max-w-md rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-sm text-slate-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((t) => {
            const sent = requestedIds.has(t.talent_profile_id)
            return (
              <div key={t.talent_profile_id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-700 border border-white/10 shrink-0 flex items-center justify-center">
                    <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500 font-mono mb-1">
                      Anonymous Talent · {t.talent_profile_id.slice(0, 8)}
                    </div>
                    {t.headline && <div className="font-semibold text-white break-words">{t.headline}</div>}
                    {t.short_bio && <div className="text-xs text-slate-300 mt-2 line-clamp-3">{t.short_bio}</div>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(Array.isArray(t.selected_skills) ? t.selected_skills : []).slice(0, 10).map((s) => (
                        <span key={s} className="px-2 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-slate-200">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4">
                      {sent ? (
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Request Sent
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setModal(t)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition-colors"
                        >
                          <Send className="h-3.5 w-3.5" /> Request Connection
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
