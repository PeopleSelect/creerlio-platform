'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type PublicTalent = {
  talent_profile_id: string
  username: string
  name?: string | null
  headline?: string | null
  profile_photo_url?: string | null
  short_bio?: string | null
  selected_skills?: string[] | null
}

export const dynamic = 'force-dynamic'

export default function RecruiterDiscoveryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [talent, setTalent] = useState<PublicTalent[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
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
          router.replace('/login?redirect=/dashboard/business/discovery')
          return
        }

        const { data: saved } = await supabase
          .from('recruiter_saved_talent')
          .select('talent_profile_id')
          .eq('recruiter_user_id', uid)
          .limit(500)

        const set = new Set<string>((saved || []).map((r: any) => String(r.talent_profile_id)))
        if (!cancelled) setSavedIds(set)

        const res = await supabase
          .from('public_talent_profiles')
          .select('talent_profile_id, username, name, headline, profile_photo_url, short_bio, selected_skills')
          .eq('is_public', true)
          .order('updated_at', { ascending: false })
          .limit(100)

        if (res.error) {
          setError(res.error.message)
          return
        }

        if (!cancelled) setTalent((res.data as any) || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [router])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return talent
    return talent.filter((t) => {
      const hay = [
        t.username,
        t.name,
        t.headline,
        t.short_bio,
        ...(Array.isArray(t.selected_skills) ? t.selected_skills : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(s)
    })
  }, [talent, q])

  const toggleSave = async (t: PublicTalent) => {
    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const uid = sessionRes.session?.user?.id
      if (!uid) return

      const already = savedIds.has(t.talent_profile_id)
      if (already) {
        await supabase
          .from('recruiter_saved_talent')
          .delete()
          .eq('recruiter_user_id', uid)
          .eq('talent_profile_id', t.talent_profile_id)
        setSavedIds((prev) => {
          const next = new Set(prev)
          next.delete(t.talent_profile_id)
          return next
        })
      } else {
        await supabase
          .from('recruiter_saved_talent')
          .insert({ recruiter_user_id: uid, talent_profile_id: t.talent_profile_id })
        setSavedIds((prev) => new Set(prev).add(t.talent_profile_id))
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xl font-bold">Recruiter Discovery</div>
            <div className="text-xs text-slate-300">Recently created and updated talent public profiles</div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/business" className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm">
              Dashboard
            </Link>
            <Link href="/dashboard/business/saved-talent" className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-sm font-semibold">
              Saved
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
            placeholder="Search by skill, title, name..."
            className="w-full sm:max-w-md rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white outline-none"
          />
          <div className="text-sm text-slate-300">{filtered.length} results</div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <div key={t.talent_profile_id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-white/10 shrink-0">
                  {t.profile_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.profile_photo_url} alt="" className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-lg">
                      {(t.name || t.username || 'T').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-lg break-words">{t.name || t.username}</div>
                  {t.headline ? <div className="text-sm text-slate-300 break-words">{t.headline}</div> : null}
                  {t.short_bio ? <div className="text-xs text-slate-300 mt-2 line-clamp-3">{t.short_bio}</div> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Array.isArray(t.selected_skills) ? t.selected_skills : []).slice(0, 10).map((s) => (
                      <span key={s} className="px-2 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-slate-200">
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/${t.username}`} className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm">
                      View public profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleSave(t)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                        savedIds.has(t.talent_profile_id)
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {savedIds.has(t.talent_profile_id) ? 'Saved' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

