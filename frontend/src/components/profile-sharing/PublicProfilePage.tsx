'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { RequestAccessModal } from './RequestAccessModal'

type PublicTalentProfile = {
  username: string
  name?: string | null
  headline?: string | null
  profile_photo_url?: string | null
  short_bio?: string | null
  selected_skills?: string[] | null
  portfolio_highlights?: any
  key_achievements?: any
}

export function PublicProfilePage({ profile }: { profile: PublicTalentProfile }) {
  const [requestOpen, setRequestOpen] = useState(false)

  const skills = useMemo(() => (Array.isArray(profile.selected_skills) ? profile.selected_skills : []), [profile.selected_skills])

  useEffect(() => {
    const sessionId = typeof window !== 'undefined' ? sessionStorage.getItem('creerlio_session_id') : null
    // Public view analytics (best-effort)
    fetch('/api/talent/log-view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionId ? { 'x-creerlio-session-id': sessionId } : {}),
      },
      body: JSON.stringify({ username: profile.username, view_type: 'public' }),
    }).catch(() => {})

    // Viral referral tracking (visit-level)
    if (sessionId) {
      fetch('/api/referrals/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-creerlio-session-id': sessionId },
        body: JSON.stringify({ username: profile.username, visitor_session_id: sessionId }),
      }).catch(() => {})
    }
  }, [profile.username])

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="font-bold text-xl">
            Creerlio
          </Link>
          <div className="text-sm text-slate-600">
            You are viewing <span className="font-semibold text-slate-900">{profile.name || profile.username}</span>&apos;s Creerlio Talent Profile.
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-600 to-blue-700 text-white overflow-hidden shadow-lg">
          <div className="p-7 md:p-10 flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl overflow-hidden border-4 border-white/30 bg-white/10 shadow-xl shrink-0">
              {profile.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.profile_photo_url} alt="Profile photo" className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-3xl">
                  {(profile.name || profile.username || 'T').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold break-words">{profile.name || profile.username}</h1>
              {profile.headline ? <p className="text-blue-100 text-lg mt-1">{profile.headline}</p> : null}
              {profile.short_bio ? <p className="text-white/90 mt-4 max-w-2xl whitespace-pre-wrap">{profile.short_bio}</p> : null}
              <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-2">
                {skills.slice(0, 12).map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-6 rounded-xl bg-white/10 border border-white/20 p-4 text-sm text-white/90">
                This is the public version of this profile. Additional experience and references are available upon request.
              </div>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setRequestOpen(true)}
                  className="px-5 py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100"
                >
                  Request Full Profile Access
                </button>
                <Link
                  href="/login/business?mode=signup&redirect=/dashboard/business"
                  className="px-5 py-3 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10 text-center"
                >
                  Recruiters: Create account
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-semibold">Portfolio Highlights</h2>
              <p className="text-slate-600 mt-1 text-sm">A curated public snapshot. Request access for the full profile.</p>
              <div className="mt-4 text-slate-700 text-sm">
                {Array.isArray(profile.portfolio_highlights) && profile.portfolio_highlights.length ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {profile.portfolio_highlights.slice(0, 6).map((h: any, idx: number) => (
                      <li key={idx}>{typeof h === 'string' ? h : h?.title || h?.name || 'Highlight'}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-slate-500">No public highlights added yet.</div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-semibold">Key Achievements</h2>
              <div className="mt-4 text-slate-700 text-sm">
                {Array.isArray(profile.key_achievements) && profile.key_achievements.length ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {profile.key_achievements.slice(0, 6).map((a: any, idx: number) => (
                      <li key={idx}>{typeof a === 'string' ? a : a?.text || a?.title || 'Achievement'}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-slate-500">No public achievements added yet.</div>
                )}
              </div>
            </div>

            {/* Viral growth section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Build your own professional talent profile.</h2>
              <p className="text-slate-600 mt-2 text-sm">
                Creerlio helps professionals showcase achievements, control who sees their experience, and be discovered by employers.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/login/talent?mode=signup&redirect=/dashboard/talent"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-center"
                >
                  Create Your Profile
                </Link>
                <Link
                  href="/search"
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-center"
                >
                  Explore Talent
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-6 text-sm text-slate-600 flex items-center justify-between flex-wrap gap-3">
          <div>
            Powered by Creerlio – Talent Profiles Built for Discovery
          </div>
          <Link href="/login/talent?mode=signup&redirect=/dashboard/talent" className="text-emerald-700 font-semibold hover:underline">
            /create-profile
          </Link>
        </div>
      </footer>

      <RequestAccessModal open={requestOpen} username={profile.username} onClose={() => setRequestOpen(false)} />
    </div>
  )
}

