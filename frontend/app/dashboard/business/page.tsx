'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type BusinessProfileRow = Record<string, any>

function pickBusinessName(row: BusinessProfileRow | null): string | null {
  if (!row) return null
  return (
    (typeof row?.name === 'string' && row.name) ||
    (typeof row?.business_name === 'string' && row.business_name) ||
    (typeof row?.company_name === 'string' && row.company_name) ||
    (typeof row?.legal_name === 'string' && row.legal_name) ||
    (typeof row?.display_name === 'string' && row.display_name) ||
    null
  )
}

export default function BusinessDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [businessLabel, setBusinessLabel] = useState<string>('Business Dashboard')
  const [businessProfile, setBusinessProfile] = useState<BusinessProfileRow | null>(null)
  const [talentRows, setTalentRows] = useState<Array<{ id: string; name: string | null; location: string | null; career_stage: string | null }>>([])
  const [reqs, setReqs] = useState<any[]>([])
  const [reqErr, setReqErr] = useState<string | null>(null)
  const [reqBusyId, setReqBusyId] = useState<string | null>(null)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [sessionUid, setSessionUid] = useState<string | null>(null)

  useEffect(() => {
    // Set active role context for mixed-profile accounts
    try {
      localStorage.setItem('creerlio_active_role', 'business')
      // Some pages still rely on this legacy key; force Business context when entering Business Dashboard
      localStorage.setItem('user_type', 'business')
    } catch {}
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession()
        const uid = sessionRes.session?.user?.id ?? null
        const email = sessionRes.session?.user?.email ?? null
        setSessionUid(uid)
        setSessionEmail(email)
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/business/page.tsx:load:session',message:'Business dashboard session check',data:{hasUid:!!uid,hasSessionErr:!!sessionErr},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'BD1'})}).catch(()=>{});
        // #endregion
        if (!uid) {
          router.replace('/login?redirect=/dashboard/business')
          return
        }

        // Load business profile for header/display (schema varies across envs)
        const filterCols = ['user_id', 'owner_id', 'business_user_id', 'business_id', 'id']
        let bp: BusinessProfileRow | null = null
        let bpLastErr: any = null
        for (const col of filterCols) {
          // Avoid deep generic inference from Supabase types (varies across environments)
          const res: any = await (supabase as any).from('business_profiles').select('*').eq(col, uid).maybeSingle()
          if (!res.error && res.data) {
            bp = res.data as any
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/business/page.tsx:load:profile_found',message:'Business profile found for dashboard',data:{filterCol:col,hasName:!!pickBusinessName(bp)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'BDP'})}).catch(()=>{});
            // #endregion
            break
          }
          bpLastErr = res.error
        }
        if (!bp && bpLastErr) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/business/page.tsx:load:profile_missing',message:'Business profile lookup failed (dashboard)',data:{errCode:bpLastErr?.code,errMsg:bpLastErr?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'BDP'})}).catch(()=>{});
          // #endregion
        }
        if (!cancelled) {
          setBusinessProfile(bp)
          const name = pickBusinessName(bp)
          setBusinessLabel(name ? `${name} — Business Dashboard` : 'Business Dashboard')
        }

        // Load incoming connection requests (pending)
        if (bp?.id) {
          const r = await supabase
            .from('talent_connection_requests')
            .select('id, talent_id, status, selected_sections, created_at')
            .eq('business_id', String(bp.id))
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
          if (!r.error) {
            if (!cancelled) setReqs((r.data || []) as any)
          } else {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/business/page.tsx:reqs:error',message:'Incoming connection requests query failed',data:{code:(r.error as any)?.code ?? null,message:r.error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'CONNECT_ERR'})}).catch(()=>{});
            // #endregion
            if (!cancelled) {
              if (/Could not find the table/i.test(r.error.message)) {
                setReqErr(
                  "Connection Requests are not configured yet (missing table). Run Supabase migration `2025122203_talent_connection_requests.sql` and refresh the schema cache, then reload."
                )
              } else {
                setReqErr(r.error.message)
              }
            }
          }
        }

        // Load connected talent via talent_access_grants (defensive; schema may vary)
        const grants = await supabase
          .from('talent_access_grants')
          .select('talent_id, expires_at, revoked_at')
          .eq('business_id', uid)
          .is('revoked_at', null)
          .gt('expires_at', new Date().toISOString())

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/business/page.tsx:load:grants',message:'Business dashboard grants query',data:{ok:!grants.error,count:(grants.data||[]).length,errCode:grants.error?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'BD2'})}).catch(()=>{});
        // #endregion

        if (grants.error) {
          setTalentRows([])
          setError('Could not load Talent Bank connections (missing table or permissions).')
          return
        }

        const talentIds = Array.from(new Set((grants.data || []).map((g: any) => g.talent_id).filter(Boolean)))
        if (talentIds.length === 0) {
          setTalentRows([])
          return
        }

        // Try common selectors for talent profiles
        const selectors = ['id, name, location, career_stage', 'id, full_name, location, career_stage', 'id, display_name, location, career_stage']
        let people: any[] | null = null
        let lastErr: any = null
        for (const sel of selectors) {
          const res = await supabase.from('talent_profiles').select(sel).in('id', talentIds)
          if (!res.error) {
            people = res.data as any
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/business/page.tsx:load:talent_selector',message:'Talent profile selector succeeded',data:{selector:sel,count:(people||[]).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'BD3'})}).catch(()=>{});
            // #endregion
            break
          }
          lastErr = res.error
        }

        if (!people) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/business/page.tsx:load:talent_selector_fail',message:'Talent profile selectors all failed',data:{errCode:lastErr?.code,errMsg:lastErr?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'BD3'})}).catch(()=>{});
          // #endregion
          setTalentRows([])
          setError('Could not load talent profiles (schema mismatch or RLS).')
          return
        }

        const mapped = (people || []).map((p: any) => ({
          id: String(p.id),
          name:
            (typeof p.name === 'string' && p.name) ||
            (typeof p.full_name === 'string' && p.full_name) ||
            (typeof p.display_name === 'string' && p.display_name) ||
            null,
          location: typeof p.location === 'string' ? p.location : null,
          career_stage: typeof p.career_stage === 'string' ? p.career_stage : null,
        }))

        if (!cancelled) setTalentRows(mapped)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      const uid = sess?.user?.id ?? null
      const email = sess?.user?.email ?? null
      setSessionUid(uid)
      setSessionEmail(email)
      if (!uid) router.replace('/login?redirect=/dashboard/business')
    })
    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe()
    }
  }, [router])

  async function actOnRequest(id: string, action: 'accept' | 'reject') {
    setReqBusyId(id)
    setReqErr(null)
    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const uid = sessionRes.session?.user?.id ?? null
      if (!uid) {
        setReqErr('Please sign in.')
        return
      }
      // Load business profile id
      const filterCols = ['user_id', 'owner_id', 'business_user_id', 'business_id', 'id']
      let bp: any = null
      for (const col of filterCols) {
        const res: any = await (supabase as any).from('business_profiles').select('*').eq(col, uid).maybeSingle()
        if (!res.error && res.data) {
          bp = res.data
          break
        }
      }
      if (!bp?.id) {
        setReqErr('Business profile not found for this user.')
        return
      }

      if (action === 'reject') {
        const up = await supabase
          .from('talent_connection_requests')
          .update({ status: 'rejected', responded_at: new Date().toISOString() })
          .eq('id', id)
        if (up.error) {
          setReqErr(up.error.message)
          return
        }
        setReqs((p) => p.filter((x) => x.id !== id))
        return
      }

      // accept: mark accepted and create a talent_access_grant (30 days)
      const reqRow = reqs.find((r) => r.id === id)
      if (!reqRow?.talent_id) {
        setReqErr('Missing talent for request.')
        return
      }

      const up = await supabase
        .from('talent_connection_requests')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', id)
      if (up.error) {
        setReqErr(up.error.message)
        return
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const grant = await supabase
        .from('talent_access_grants')
        .insert({ talent_id: reqRow.talent_id, business_id: String(bp.id), expires_at: expiresAt, revoked_at: null })
      if (grant.error) {
        setReqErr(grant.error.message)
        return
      }
      setReqs((p) => p.filter((x) => x.id !== id))
    } finally {
      setReqBusyId(null)
    }
  }

  const headerRight = useMemo(() => {
    return (
      <div className="flex items-center gap-3">
        {sessionEmail ? (
          <span className="hidden md:inline text-gray-300 text-sm">
            Welcome, {sessionEmail.split('@')[0]}
          </span>
        ) : null}
        <Link
          href="/"
          className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Home
        </Link>
        <Link
          href="/dashboard/business/bank"
          className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Business Bank
        </Link>
        <Link href="/dashboard/business/edit" className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors">
          Edit Profile
        </Link>
        {sessionUid ? (
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              router.replace('/')
            }}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Logout
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/login?role=business&redirect=/dashboard/business')}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Sign in
          </button>
        )}
      </div>
    )
  }, [router, sessionUid, sessionEmail])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <header className="container mx-auto px-6 py-4 flex items-center justify-between border-b border-gray-800">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <span className="text-white text-2xl font-bold">Creerlio</span>
        </Link>
        {headerRight}
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{businessLabel}</h1>
          <p className="text-gray-400">Talent Bank and messaging (permission-gated)</p>
        </div>

        {error && (
          <div className="mb-6 border border-red-500/30 bg-red-500/10 text-red-200 rounded-lg p-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 dashboard-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Talent Bank</h2>
                <p className="text-sm text-gray-500">{talentRows.length} connected</p>
              </div>

              {talentRows.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-300 font-medium mb-2">No talent in your Talent Bank yet.</p>
                  <p className="text-gray-500 text-sm">Connections appear here once access is active.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {talentRows.map((t) => (
                    <div key={t.id} className="border border-gray-800 rounded-lg p-4 flex items-start justify-between gap-4 hover:bg-gray-800/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{t.name || 'Talent'}</p>
                        <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>{t.career_stage || 'Career stage: —'}</span>
                          <span>{t.location || 'Location: —'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/business/talent/${encodeURIComponent(t.id)}`)}
                          className="px-4 py-2 bg-white/5 border border-white/10 text-gray-200 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/business/messages?talentId=${encodeURIComponent(t.id)}`)}
                          className="px-4 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-200 rounded-lg hover:bg-blue-500/30 transition-colors"
                        >
                          Message
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dashboard-card rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Overview</h2>
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-gray-800 bg-gray-900/30">
                  <p className="text-gray-400 text-sm">Business profile</p>
                  <p className="text-sm text-gray-300">
                    {pickBusinessName(businessProfile) ? 'Saved' : 'Not set yet'}
                  </p>
                  {!pickBusinessName(businessProfile) && (
                    <p className="text-xs text-gray-500 mt-1">
                      Go to “Edit Profile” to create your business profile.
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-lg border border-gray-800 bg-gray-900/30">
                  <p className="text-gray-400 text-sm">Talent connected</p>
                  <p className="text-2xl font-bold text-white">{talentRows.length}</p>
                </div>
                <div className="p-4 rounded-lg border border-gray-800 bg-gray-900/30">
                  <p className="text-gray-400 text-sm">Messaging</p>
                  <p className="text-sm text-gray-300">Only available for active connections.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 dashboard-card rounded-xl p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Connection Requests</h2>
                  <p className="text-gray-400 text-sm">Review and accept/reject new talent connection requests.</p>
                </div>
                <button
                  onClick={() => router.refresh()}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Refresh
                </button>
              </div>

              {reqErr ? (
                <div className="mb-4 border border-red-500/30 bg-red-500/10 text-red-200 rounded-lg p-4">
                  {reqErr}
                </div>
              ) : null}

              {reqs.length === 0 ? (
                <p className="text-gray-400">No connection requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {reqs.map((r) => (
                    <div key={r.id} className="border border-gray-800 rounded-lg p-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-white font-semibold">New request</p>
                        <p className="text-gray-500 text-sm mt-1">
                          Sent {new Date(r.created_at).toLocaleString()}
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          Selected sections: {Array.isArray(r.selected_sections) ? r.selected_sections.join(', ') : '—'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={reqBusyId === r.id}
                          onClick={() => actOnRequest(r.id, 'reject')}
                          className="px-4 py-2 rounded-lg border border-red-500/40 text-red-200 hover:bg-red-500/10 disabled:opacity-60"
                        >
                          Reject
                        </button>
                        <button
                          disabled={reqBusyId === r.id}
                          onClick={() => actOnRequest(r.id, 'accept')}
                          className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
