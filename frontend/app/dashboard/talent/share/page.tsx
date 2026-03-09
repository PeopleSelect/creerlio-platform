'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { normalizeUsername, validateUsername } from '@/lib/username'

type PublicTalentProfileRow = Record<string, any>
type TalentProfileRow = Record<string, any>

export const dynamic = 'force-dynamic'

export default function TalentShareProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [talentProfile, setTalentProfile] = useState<TalentProfileRow | null>(null)
  const [publicProfile, setPublicProfile] = useState<PublicTalentProfileRow | null>(null)

  const [username, setUsername] = useState('')
  const [headline, setHeadline] = useState('')
  const [shortBio, setShortBio] = useState('')
  const [skills, setSkills] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const [shareBusy, setShareBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [selectedViewId, setSelectedViewId] = useState<string>('') // optional

  const [requests, setRequests] = useState<any[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [viewLogs, setViewLogs] = useState<any[]>([])
  const [referrals, setReferrals] = useState<any[]>([])

  const [profileViews, setProfileViews] = useState<any[]>([])
  const [newViewName, setNewViewName] = useState('')
  const [viewCfg, setViewCfg] = useState<any>({
    sections: { intro: true, skills: true, experience: true, education: true, projects: true, social: true, referees: false, attachments: false },
    media: { avatar: true, intro_video: true, banner: false },
    contact: { phone: false, email: false },
  })

  const publicUrl = useMemo(() => {
    const u = normalizeUsername(username)
    if (!u) return null
    if (typeof window === 'undefined') return `https://creerlio.com/${u}`
    return `${window.location.origin}/${u}`
  }, [username])

  const publicPath = useMemo(() => {
    const u = normalizeUsername(username)
    return u ? `/${u}` : null
  }, [username])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const session = sessionRes.session
        if (!session?.user?.id) {
          router.replace('/login?redirect=/dashboard/talent/share')
          return
        }
        const uid = session.user.id

        const tpRes = await supabase.from('talent_profiles').select('*').eq('user_id', uid).maybeSingle()
        if (tpRes.error) {
          setError(tpRes.error.message)
          return
        }
        if (!tpRes.data) {
          router.replace('/dashboard/talent/edit')
          return
        }
        if (!cancelled) setTalentProfile(tpRes.data)

        const pubRes = await supabase.from('public_talent_profiles').select('*').eq('user_id', uid).maybeSingle()
        if (!cancelled && pubRes.data) setPublicProfile(pubRes.data)

        const suggested = normalizeUsername(String(tpRes.data?.name || session.user.user_metadata?.full_name || ''))
        const initialUsername = String(pubRes.data?.username || tpRes.data?.username || suggested || '').trim()
        if (!cancelled) {
          setUsername(initialUsername)
          setHeadline(String(pubRes.data?.headline || tpRes.data?.headline || tpRes.data?.title || '').trim())
          setShortBio(String(pubRes.data?.short_bio || tpRes.data?.bio || '').trim())
          const sk = Array.isArray(pubRes.data?.selected_skills)
            ? pubRes.data.selected_skills
            : Array.isArray(tpRes.data?.skills)
              ? tpRes.data.skills
              : []
          setSkills(sk.join(', '))
          setIsPublic(typeof pubRes.data?.is_public === 'boolean' ? pubRes.data.is_public : true)
        }

        // Load access requests
        setRequestsLoading(true)
        const reqRes = await supabase
          .from('profile_access_requests')
          .select('*')
          .eq('talent_profile_id', String(tpRes.data?.id))
          .order('created_at', { ascending: false })
          .limit(50)
        if (!cancelled) setRequests(Array.isArray(reqRes.data) ? reqRes.data : [])

        // Load analytics (best-effort)
        const viewsRes = await supabase
          .from('profile_views_log')
          .select('*')
          .eq('talent_profile_id', String(tpRes.data?.id))
          .order('created_at', { ascending: false })
          .limit(250)
        if (!cancelled) setViewLogs(Array.isArray(viewsRes.data) ? viewsRes.data : [])

        const refRes = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_talent_id', String(tpRes.data?.id))
          .order('created_at', { ascending: false })
          .limit(250)
        if (!cancelled) setReferrals(Array.isArray(refRes.data) ? refRes.data : [])

        const views = await supabase
          .from('profile_views')
          .select('*')
          .eq('talent_profile_id', String(tpRes.data?.id))
          .order('created_at', { ascending: false })
          .limit(50)
        if (!cancelled) setProfileViews(Array.isArray(views.data) ? views.data : [])
      } finally {
        if (!cancelled) {
          setRequestsLoading(false)
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [router])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const session = sessionRes.session
      const uid = session?.user?.id
      if (!uid) {
        router.replace('/login?redirect=/dashboard/talent/share')
        return
      }
      if (!talentProfile?.id) {
        setError('Missing talent profile.')
        return
      }

      const v = validateUsername(username)
      if (!v.ok) {
        setError(v.error || 'Invalid username.')
        return
      }

      const selected_skills = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 30)

      // Save to talent_profiles (owner-only)
      const updTp = await supabase
        .from('talent_profiles')
        .update({ username: v.value, slug: v.value })
        .eq('id', talentProfile.id)
      if (updTp.error) {
        setError(updTp.error.message)
        return
      }

      // Upsert safe public profile (public-readable only if is_public)
      const payload = {
        talent_profile_id: talentProfile.id,
        user_id: uid,
        username: v.value,
        slug: v.value,
        is_public: isPublic,
        name: String(talentProfile?.name || '').trim() || null,
        headline: headline.trim() || null,
        profile_photo_url: String((talentProfile as any)?.avatar_url || publicProfile?.profile_photo_url || '').trim() || null,
        short_bio: shortBio.trim() || null,
        selected_skills,
        updated_at: new Date().toISOString(),
      }

      const up = await supabase.from('public_talent_profiles').upsert(payload, { onConflict: 'user_id' }).select('*').single()
      if (up.error) {
        // Friendly message for unique violation (username taken)
        const msg = up.error.message || 'Failed to save.'
        if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
          setError('That username is already taken. Please try another.')
        } else {
          setError(msg)
        }
        return
      }

      setPublicProfile(up.data)
      setUsername(v.value)
    } finally {
      setSaving(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {}
  }

  const analytics = useMemo(() => {
    const totalPublic = viewLogs.filter((v) => v.view_type === 'public').length
    const totalPrivate = viewLogs.filter((v) => v.view_type === 'private_link').length
    const companies = [...new Set(viewLogs.map((v) => String(v.company || '').trim()).filter(Boolean))].slice(0, 10)
    const totalReferrals = referrals.length
    const converted = referrals.filter((r) => !!r.signup_user_id).length
    return { totalPublic, totalPrivate, companies, totalReferrals, converted }
  }, [viewLogs, referrals])

  const generateShareLink = async (opts?: { restricted_email?: string | null; permissions_json?: any }) => {
    setShareBusy(true)
    setShareUrl(null)
    setError(null)
    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const session = sessionRes.session
      const accessToken = session?.access_token
      if (!accessToken) {
        setError('Please sign in again.')
        return
      }

      const res = await fetch('/api/talent/share-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mode: opts?.permissions_json ? 'custom' : 'full',
          permissions_json: opts?.permissions_json || undefined,
          restricted_email: opts?.restricted_email || null,
          max_views: null,
          expiry_date: null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || 'Failed to generate link.')
        return null
      }
      const url = String(json?.share_url || '')
      setShareUrl(url)
      return { share_url: url, token: String(json?.token || '') || null }
    } finally {
      setShareBusy(false)
    }
  }

  const createProfileView = async () => {
    setError(null)
    try {
      const name = newViewName.trim()
      if (!name) {
        setError('Version name is required.')
        return
      }
      const { data: sessionRes } = await supabase.auth.getSession()
      const accessToken = sessionRes.session?.access_token
      if (!accessToken) {
        setError('Please sign in again.')
        return
      }
      const res = await fetch('/api/talent/profile-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name, visible_sections_json: viewCfg }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || 'Failed to create version.')
        return
      }
      setProfileViews((prev) => [json.view, ...prev])
      setNewViewName('')
    } catch (e: any) {
      setError(e?.message || 'Failed to create version.')
    }
  }

  const decideRequest = async (reqRow: any, decision: 'approved' | 'declined') => {
    setError(null)
    try {
      let shareToken: string | null = null
      if (decision === 'approved') {
        const created = await generateShareLink({
          restricted_email: String(reqRow.requester_email || '').trim().toLowerCase() || null,
        })
        shareToken = created?.token || null
      }

      const upd = await supabase
        .from('profile_access_requests')
        .update({
          status: decision,
          decided_at: new Date().toISOString(),
          approved_share_token: shareToken,
        })
        .eq('id', reqRow.id)

      if (upd.error) {
        setError(upd.error.message)
        return
      }

      // Refresh list
      setRequests((prev) =>
        prev.map((r) =>
          r.id === reqRow.id
            ? { ...r, status: decision, decided_at: new Date().toISOString(), approved_share_token: shareToken }
            : r
        )
      )
    } catch (e: any) {
      setError(e?.message || 'Failed to update request.')
    }
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
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard/talent" className="font-bold text-xl">
            ← Talent Dashboard
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Share Profile</h1>
          <p className="text-slate-300 mt-1">
            Use this link as your professional career website. Add it to LinkedIn, resumes, email signatures and job applications.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-100 text-sm">{error}</div>
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Public link</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-200 mb-1">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="simon-rorke"
                className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
              <div className="text-xs text-slate-400 mt-1">Public URL: {publicUrl || '—'}</div>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => publicUrl && copy(publicUrl)}
                disabled={!publicUrl}
                className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-60"
              >
                Copy link
              </button>
              {publicPath ? (
                <Link href={publicPath} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10">
                  Preview public profile
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-200 mb-1">Public headline</label>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-200 mb-1">Selected skills (comma separated)</label>
              <input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-200 mb-1">Short bio</label>
            <textarea
              value={shortBio}
              onChange={(e) => setShortBio(e.target.value)}
              rows={4}
              className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Public profile is visible and indexable
          </label>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Generate private share link</h2>
          <p className="text-slate-300 text-sm">
            Private links can be restricted by email and can expire / limit views (coming next).
          </p>
          {profileViews.length ? (
            <div>
              <label className="block text-sm text-slate-200 mb-1">Profile version (optional)</label>
              <select
                value={selectedViewId}
                onChange={(e) => setSelectedViewId(e.target.value)}
                className="w-full sm:max-w-md rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white"
              >
                <option value="">Full profile (default)</option>
                {profileViews.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-400 mt-1">
                Versions control which sections/media are included in a private link.
              </div>
            </div>
          ) : null}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                const picked = selectedViewId ? profileViews.find((v) => v.id === selectedViewId) : null
                return generateShareLink({ permissions_json: picked?.visible_sections_json || undefined })
              }}
              disabled={shareBusy}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold disabled:opacity-60"
            >
              {shareBusy ? 'Generating…' : 'Generate private share link'}
            </button>
            {shareUrl ? (
              <button
                type="button"
                onClick={() => copy(shareUrl)}
                className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10"
              >
                Copy private link
              </button>
            ) : null}
          </div>
          {shareUrl ? (
            <div className="text-sm text-slate-200 break-all rounded-lg bg-slate-900 border border-white/10 p-3">
              {shareUrl}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Profile Versions</h2>
          <p className="text-slate-300 text-sm">
            Create different profile views (Recruiter Version, Startup Version, Consulting Version) and generate share links per version.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="block text-sm text-slate-200">New version name</label>
              <input
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="Recruiter Version"
                className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white outline-none"
              />

              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-3">
                <div className="text-sm font-semibold">Visible sections</div>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-200">
                  {Object.keys(viewCfg.sections || {}).map((k) => (
                    <label key={k} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!viewCfg.sections?.[k]}
                        onChange={(e) =>
                          setViewCfg((prev: any) => ({
                            ...prev,
                            sections: { ...(prev.sections || {}), [k]: e.target.checked },
                          }))
                        }
                      />
                      {k}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={createProfileView}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-semibold"
              >
                Create profile version
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold">Your versions</div>
              {!profileViews.length ? (
                <div className="text-sm text-slate-300">No versions yet.</div>
              ) : (
                <div className="space-y-2">
                  {profileViews.map((v) => (
                    <div key={v.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
                      <div className="font-semibold">{v.name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Sections: {Object.entries(v.visible_sections_json?.sections || {})
                          .filter(([, on]) => !!on)
                          .map(([k]) => k)
                          .join(', ') || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Access Requests</h2>
          {requestsLoading ? <div className="text-slate-300 text-sm">Loading…</div> : null}
          {!requestsLoading && !requests.length ? (
            <div className="text-slate-300 text-sm">No requests yet.</div>
          ) : null}
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold break-words">
                      {r.requester_name}{' '}
                      <span className="text-slate-300 font-normal">
                        {r.requester_company ? `(${r.requester_company})` : ''}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 break-all">{r.requester_email}</div>
                    {r.reason ? <div className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{r.reason}</div> : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-white/5 text-slate-200">
                      {r.status}
                    </span>
                    {r.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => decideRequest(r, 'approved')}
                          className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decideRequest(r, 'declined')}
                          className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm font-semibold"
                        >
                          Decline
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Profile Analytics</h2>
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
              <div className="text-xs text-slate-300">Public views</div>
              <div className="text-2xl font-bold mt-1">{analytics.totalPublic}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
              <div className="text-xs text-slate-300">Private link views</div>
              <div className="text-2xl font-bold mt-1">{analytics.totalPrivate}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
              <div className="text-xs text-slate-300">Access requests</div>
              <div className="text-2xl font-bold mt-1">{requests.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
              <div className="text-xs text-slate-300">Referrals</div>
              <div className="text-2xl font-bold mt-1">{analytics.totalReferrals}</div>
              <div className="text-xs text-slate-400 mt-1">Converted: {analytics.converted}</div>
            </div>
          </div>

          {analytics.companies.length ? (
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
              <div className="text-sm font-semibold">Companies viewing your profile</div>
              <div className="text-sm text-slate-300 mt-2">{analytics.companies.join(' • ')}</div>
            </div>
          ) : (
            <div className="text-sm text-slate-300">No company data yet (will appear when provided by viewers or recruiters).</div>
          )}
        </section>
      </main>
    </div>
  )
}

