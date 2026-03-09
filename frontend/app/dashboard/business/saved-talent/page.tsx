'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type SavedRow = { talent_profile_id: string }

export const dynamic = 'force-dynamic'

const STAGES = ['New discovery', 'Contacted', 'Interested', 'Interview stage', 'Offer', 'Hired', 'Not a fit'] as const

export default function SavedTalentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedRow[]>([])
  const [talent, setTalent] = useState<Record<string, any>>({})
  const [pipelines, setPipelines] = useState<Record<string, any>>({})
  const [q, setQ] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const uid = sessionRes.session?.user?.id
        if (!uid) {
          router.replace('/login?redirect=/dashboard/business/saved-talent')
          return
        }

        const s = await supabase
          .from('recruiter_saved_talent')
          .select('talent_profile_id')
          .eq('recruiter_user_id', uid)
          .limit(500)

        if (s.error) {
          setError(s.error.message)
          return
        }

        const rows = (s.data || []) as any[]
        if (!cancelled) setSaved(rows)

        const ids = rows.map((r) => String(r.talent_profile_id)).filter(Boolean)
        if (!ids.length) return

        const pub = await supabase
          .from('public_talent_profiles')
          .select('talent_profile_id, username, name, headline, profile_photo_url, selected_skills, short_bio')
          .in('talent_profile_id', ids)
          .limit(500)

        if (pub.error) {
          setError(pub.error.message)
          return
        }

        const byId: Record<string, any> = {}
        for (const p of pub.data || []) byId[String((p as any).talent_profile_id)] = p
        if (!cancelled) setTalent(byId)

        const pipe = await supabase
          .from('recruiter_pipelines')
          .select('*')
          .eq('recruiter_user_id', uid)
          .in('talent_profile_id', ids)
          .limit(500)

        const pipeBy: Record<string, any> = {}
        for (const p of pipe.data || []) pipeBy[String((p as any).talent_profile_id)] = p
        if (!cancelled) setPipelines(pipeBy)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [router])

  const ordered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const ids = saved.map((r) => String(r.talent_profile_id)).filter(Boolean)
    if (!s) return ids
    return ids.filter((id) => {
      const t = talent[id]
      const hay = [
        t?.username,
        t?.name,
        t?.headline,
        t?.short_bio,
        ...(Array.isArray(t?.selected_skills) ? t.selected_skills : []),
        pipelines[id]?.stage,
        pipelines[id]?.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(s)
    })
  }, [saved, talent, pipelines, q])

  const upsertPipeline = async (talent_profile_id: string, patch: { stage?: string; notes?: string }) => {
    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const uid = sessionRes.session?.user?.id
      if (!uid) return

      const current = pipelines[talent_profile_id] || {}
      const next = {
        recruiter_user_id: uid,
        talent_profile_id,
        stage: patch.stage ?? current.stage ?? 'New discovery',
        notes: patch.notes ?? current.notes ?? null,
        updated_at: new Date().toISOString(),
      }

      const res = await supabase
        .from('recruiter_pipelines')
        .upsert(next, { onConflict: 'recruiter_user_id,talent_profile_id' })
        .select('*')
        .single()

      if (!res.error && res.data) {
        setPipelines((prev) => ({ ...prev, [talent_profile_id]: res.data }))
      }
    } catch {}
  }

  const removeSaved = async (talent_profile_id: string) => {
    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const uid = sessionRes.session?.user?.id
      if (!uid) return
      await supabase
        .from('recruiter_saved_talent')
        .delete()
        .eq('recruiter_user_id', uid)
        .eq('talent_profile_id', talent_profile_id)
      setSaved((prev) => prev.filter((r) => String(r.talent_profile_id) !== talent_profile_id))
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xl font-bold">Saved Talent</div>
            <div className="text-xs text-slate-300">Bookmark profiles and manage your pipeline stages</div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/business/discovery" className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm">
              Discovery
            </Link>
            <Link href="/dashboard/business" className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-100 text-sm">{error}</div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search saved talent..."
            className="w-full sm:max-w-md rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white outline-none"
          />
          <div className="text-sm text-slate-300">{ordered.length} saved</div>
        </div>

        {!ordered.length ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-200">
            No saved talent yet. Go to <Link className="underline" href="/dashboard/business/discovery">Discovery</Link>.
          </div>
        ) : null}

        <div className="space-y-4">
          {ordered.map((id) => {
            const t = talent[id]
            const p = pipelines[id] || {}
            return (
              <div key={id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-white/10 shrink-0">
                    {t?.profile_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.profile_photo_url} alt="" className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-lg">
                        {(t?.name || t?.username || 'T').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-lg break-words">{t?.name || t?.username || 'Talent'}</div>
                        {t?.headline ? <div className="text-sm text-slate-300 break-words">{t.headline}</div> : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/${t?.username || ''}`} className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm">
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeSaved(id)}
                          className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">Pipeline stage</label>
                        <select
                          value={String(p.stage || 'New discovery')}
                          onChange={(e) => upsertPipeline(id, { stage: e.target.value })}
                          className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-slate-300 mb-1">Notes</label>
                        <textarea
                          value={String(p.notes || '')}
                          onChange={(e) => {
                            const v = e.target.value
                            setPipelines((prev) => ({ ...prev, [id]: { ...p, notes: v } }))
                          }}
                          onBlur={(e) => upsertPipeline(id, { notes: e.target.value })}
                          rows={2}
                          className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(Array.isArray(t?.selected_skills) ? t.selected_skills : []).slice(0, 12).map((s: string) => (
                        <span key={s} className="px-2 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-slate-200">
                          {s}
                        </span>
                      ))}
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

