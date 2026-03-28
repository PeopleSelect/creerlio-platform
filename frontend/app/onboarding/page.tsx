'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
type RoleIntent = 'find_businesses' | 'find_work' | 'find_talent' | 'find_customers' | 'both'

interface Opportunity {
  id: string
  name: string
  industry: string | null
  city: string | null
  tagline: string | null
  slug: string | null
}

const LOADING_MESSAGES = [
  'Analysing your preferences…',
  'Scanning local opportunities…',
  'Matching you with businesses…',
  'Building your personalised feed…',
  'Almost ready…',
]

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OnboardingFlow />
    </Suspense>
  )
}

function OnboardingFlow() {
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [animating, setAnimating] = useState(false)

  // Form state
  const [roleIntent, setRoleIntent] = useState<RoleIntent>('both')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatIDo, setWhatIDo] = useState('')

  // Auth
  const [session, setSession] = useState<any>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  // Opportunities
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Opportunity | null>(null)

  // Loading cycle
  const [msgIdx, setMsgIdx] = useState(0)

  // UI
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // ── Auth check on mount ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session
      setSession(s)
      setSessionLoaded(true)

      if (s) {
        const meta = s.user.user_metadata || {}
        if (meta.onboarding_complete === true) {
          const dest = meta.registration_type === 'business' ? '/dashboard/business' : '/dashboard/talent'
          router.replace(dest)
          return
        }
        // Pre-fill from existing metadata
        if (meta.full_name || meta.first_name) {
          setName(meta.full_name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim())
        }
        if (s.user.email) setEmail(s.user.email)
        setStep(2) // skip entry for already-authenticated users
      }
    }).catch(() => setSessionLoaded(true))

    // Listen for magic link confirmation in another tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s && !session) {
        setSession(s)
        const meta = s.user.user_metadata || {}
        if (meta.full_name || meta.first_name) {
          setName(meta.full_name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim())
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [router]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading message cycle ────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 4) return
    const iv = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MESSAGES.length), 700)
    return () => clearInterval(iv)
  }, [step])

  // ── Auto-advance from loading → feed ────────────────────────────────────
  useEffect(() => {
    if (step !== 4) return
    const t = setTimeout(async () => {
      await fetchOpportunities()
      goTo(5)
    }, 3200)
    return () => clearTimeout(t)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──────────────────────────────────────────────────────────────
  function goTo(target: number) {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setStep(target as Step)
      setError(null)
      setAnimating(false)
    }, 180)
  }

  async function fetchOpportunities() {
    try {
      const res = await fetch('/api/onboarding/opportunities')
      if (res.ok) {
        const json = await res.json()
        setOpportunities(json.opportunities || [])
      }
    } catch {}
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleProfileSubmit() {
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!session && !email.trim()) { setError('Please enter your email'); return }
    setBusy(true)
    setError(null)
    try {
      if (!session) {
        // Send magic link for new users
        const { error: err } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            data: {
              full_name: name.trim(),
              first_name: name.trim().split(' ')[0],
              last_name: name.trim().split(' ').slice(1).join(' ') || null,
              role_intent: roleIntent,
              what_i_do: whatIDo.trim() || null,
              registration_type: roleIntent === 'find_businesses' ? 'business' : 'talent',
            },
            emailRedirectTo: window.location.origin + '/onboarding',
          },
        })
        if (err) { setError(err.message); return }
      } else {
        // Already authenticated — update profile data
        await supabase.auth.updateUser({
          data: { role_intent: roleIntent, what_i_do: whatIDo.trim() || null },
        })
        const meta = session.user.user_metadata || {}
        if (meta.registration_type !== 'business') {
          await supabase.from('talent_profiles').upsert(
            { user_id: session.user.id, name: name.trim(), title: whatIDo.trim() || null },
            { onConflict: 'user_id' }
          )
        }
      }
      goTo(4)
    } finally {
      setBusy(false)
    }
  }

  async function handleConnect(biz: Opportunity) {
    setSelectedBusiness(biz)
    if (session) {
      // Fire-and-forget — don't block UX on API response
      fetch('/api/onboarding/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ business_profile_id: biz.id }),
      }).catch(() => {})
    }
    goTo(7)
  }

  async function handleComplete() {
    if (session) {
      await supabase.auth.updateUser({ data: { onboarding_complete: true } }).catch(() => {})
      fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {})
      const meta = session.user.user_metadata || {}
      const dest = meta.registration_type === 'business' ? '/dashboard/business' : '/dashboard/talent'
      router.replace(dest)
    } else {
      router.replace('/login')
    }
  }

  // ── Loading gate ─────────────────────────────────────────────────────────
  if (!sessionLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const firstName = name.split(' ')[0] || ''

  return (
    <div
      className="min-h-screen bg-slate-950 text-white overflow-x-hidden"
      style={{ transition: 'opacity 180ms', opacity: animating ? 0 : 1 }}
    >
      {/* Progress indicator */}
      {step > 1 && step < 8 && (
        <div className="fixed top-5 left-0 right-0 flex justify-center gap-1.5 z-50 pointer-events-none">
          {[2, 3, 4, 5, 6, 7].map(s => (
            <div
              key={s}
              className="h-1 rounded-full transition-all duration-400"
              style={{
                width: s === step ? 24 : 6,
                background: s <= step ? 'rgb(59 130 246)' : 'rgba(255,255,255,0.1)',
                opacity: s < step ? 0.5 : 1,
              }}
            />
          ))}
        </div>
      )}

      {/* ── STEP 1: ENTRY ── */}
      {step === 1 && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-lg w-full">
            <div className="text-xs font-semibold tracking-[0.2em] text-blue-400 uppercase mb-10">
              Creerlio
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold leading-[1.1] mb-6">
              Turn real-world interactions into{' '}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                opportunities
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-12 max-w-sm mx-auto">
              Connect with businesses and professionals through private, meaningful relationships.
            </p>
            <button
              onClick={() => goTo(2)}
              className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-lg font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started
            </button>
            <p className="mt-6 text-sm text-slate-500">
              Already have an account?{' '}
              <a href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                Sign in
              </a>
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 2: IDENTITY ── */}
      {step === 2 && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-16 pb-10">
          <div className="max-w-lg w-full">
            <h2 className="text-4xl font-bold mb-2">How do you want to use Creerlio?</h2>
            <p className="text-slate-400 mb-10">This shapes everything we surface for you.</p>

            <div className="space-y-3">
              {(session?.user?.user_metadata?.registration_type === 'business' ? [
                {
                  value: 'find_talent' as RoleIntent,
                  label: 'Find Talent',
                  sub: 'Discover and connect with professionals anonymously',
                  icon: '🔍',
                },
                {
                  value: 'find_customers' as RoleIntent,
                  label: 'Find Customers',
                  sub: 'Connect with businesses and individuals looking for your services',
                  icon: '🤝',
                },
                {
                  value: 'both' as RoleIntent,
                  label: 'Both',
                  sub: 'I want to explore all opportunities',
                  icon: '✦',
                  recommended: true,
                },
              ] : [
                {
                  value: 'find_businesses' as RoleIntent,
                  label: 'Find businesses',
                  sub: 'Discover companies to work with or offer services to',
                  icon: '🏢',
                },
                {
                  value: 'find_work' as RoleIntent,
                  label: 'Find work',
                  sub: 'Connect with businesses looking for professionals like you',
                  icon: '💼',
                },
                {
                  value: 'both' as RoleIntent,
                  label: 'Both',
                  sub: 'I want to explore all opportunities',
                  icon: '✦',
                  recommended: true,
                },
              ]).map(opt => {
                const selected = roleIntent === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setRoleIntent(opt.value)
                      setTimeout(() => goTo(3), 250)
                    }}
                    className={`w-full text-left rounded-2xl border p-5 transition-all duration-200 ${
                      selected
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{opt.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{opt.label}</span>
                          {opt.recommended && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium uppercase tracking-wide">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400 mt-0.5">{opt.sub}</div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                          selected ? 'border-blue-500 bg-blue-500' : 'border-white/20'
                        }`}
                      >
                        {selected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: QUICK PROFILE ── */}
      {step === 3 && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-16 pb-10">
          <div className="max-w-lg w-full">
            <h2 className="text-4xl font-bold mb-2">Tell us about yourself</h2>
            <p className="text-slate-400 mb-10">
              Just enough to get started. You can always add more later.
            </p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Alex Chen"
                  disabled={!!session}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>

              {!session && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Your email
                    <span className="ml-2 text-xs text-blue-400 font-normal">— we'll send you a link</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  What do you do?
                  <span className="ml-2 text-xs text-slate-500 font-normal">optional</span>
                </label>
                <input
                  type="text"
                  value={whatIDo}
                  onChange={e => setWhatIDo(e.target.value)}
                  placeholder="e.g. Senior Engineer, Event Manager, Marketing Consultant"
                  onKeyDown={e => e.key === 'Enter' && !busy && handleProfileSubmit()}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}

            <button
              type="button"
              onClick={handleProfileSubmit}
              disabled={busy}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up…
                </span>
              ) : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: AI LOADING ── */}
      {step === 4 && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            {/* Pulsing rings */}
            <div className="relative w-24 h-24 mx-auto mb-12">
              <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-3 rounded-full border border-blue-500/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
              <div className="absolute inset-6 rounded-full bg-blue-500/10 border border-blue-500/50 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-4">Setting up your opportunities</h2>
            <p
              className="text-blue-400 text-sm font-medium"
              style={{ minHeight: 20, transition: 'opacity 400ms', opacity: animating ? 0 : 1 }}
            >
              {LOADING_MESSAGES[msgIdx]}
            </p>

            {!session && email && (
              <p className="mt-10 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                We've also sent a confirmation link to{' '}
                <span className="text-slate-300">{email}</span>.
                You'll need it to start connecting.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 5: OPPORTUNITY FEED ── */}
      {step === 5 && (
        <div className="min-h-screen flex flex-col px-6 pt-20 pb-16">
          <div className="max-w-2xl mx-auto w-full">
            <div className="mb-8">
              <h2 className="text-4xl font-bold mb-3">
                {firstName ? `Here's what's waiting, ${firstName}` : "Here's what's waiting"}
              </h2>
              <p className="text-slate-400 leading-relaxed">
                Businesses matched to your profile. Your identity stays private until you connect.
              </p>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex -space-x-2">
                {['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'].map((c, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-slate-950`} />
                ))}
              </div>
              <span className="text-sm text-slate-400">127 professionals connected this week</span>
            </div>

            <div className="space-y-3 mb-10">
              {opportunities.length > 0
                ? opportunities.map(opp => (
                    <OpportunityCard key={opp.id} opp={opp} onConnect={() => handleConnect(opp)} />
                  ))
                : Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-white/10 rounded w-2/5" />
                          <div className="h-3 bg-white/5 rounded w-1/3" />
                        </div>
                        <div className="h-8 w-20 bg-white/10 rounded-lg" />
                      </div>
                    </div>
                  ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(6)}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg transition-all duration-200"
            >
              Make my first connection →
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="w-full mt-3 py-3 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Skip — explore on my own
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 6: FIRST ACTION ── */}
      {step === 6 && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-16 pb-10">
          <div className="max-w-lg w-full">
            <h2 className="text-4xl font-bold mb-3 text-center">Make your first connection</h2>
            <p className="text-slate-400 text-center mb-10">
              They won't see your full profile until you both agree to connect.
            </p>

            <div className="space-y-3 mb-8">
              {(opportunities.length > 0 ? opportunities.slice(0, 4) : []).map(opp => (
                <button
                  key={opp.id}
                  type="button"
                  onClick={() => handleConnect(opp)}
                  className="w-full flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] hover:border-blue-500/50 hover:bg-blue-500/5 p-4 transition-all duration-200 text-left group"
                >
                  <BusinessAvatar name={opp.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">{opp.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {[opp.industry, opp.city].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleComplete}
              className="w-full py-3 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Skip — explore on my own
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 7: CONFIRMATION ── */}
      {step === 7 && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-md w-full">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-4xl font-bold mb-3">
              {session ? "You're connected" : 'Request sent'}
            </h2>

            {selectedBusiness && (
              <p className="text-slate-300 text-lg mb-8">
                {session
                  ? `Your connection with ${selectedBusiness.name} is live.`
                  : `Your interest in ${selectedBusiness.name} has been noted.`}
              </p>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-left space-y-4 mb-8">
              {[
                session
                  ? `${selectedBusiness?.name || 'This business'} can now see your shared profile and reach out`
                  : 'Confirm your email to activate your first connection',
                'You can continue building your profile any time — it gets stronger with each interaction',
                'Every connection you make builds your private opportunity pipeline',
              ].map((msg, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                  <p className="text-sm text-slate-300 leading-relaxed">{msg}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(8)}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg transition-all duration-200"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 8: VALUE LOCK-IN ── */}
      {step === 8 && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-md w-full">
            <div className="text-xs font-semibold tracking-[0.2em] text-blue-400 uppercase mb-8">
              You're in
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.1] mb-6">
              The more you interact,{' '}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                the more you unlock
              </span>
            </h2>

            <p className="text-slate-400 text-lg leading-relaxed mb-12">
              Creerlio works in the background. Every connection, every interaction becomes a future opportunity.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-12">
              {[
                { label: 'Connection', value: selectedBusiness ? '1' : '0', icon: '🤝' },
                { label: 'Opportunities', value: 'Growing', icon: '📈' },
                { label: 'Visibility', value: 'Active', icon: '✨' },
              ].map(stat => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleComplete}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OpportunityCard({ opp, onConnect }: { opp: Opportunity; onConnect: () => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] hover:border-white/20 transition-all duration-200 p-5">
      <div className="flex items-center gap-4">
        <BusinessAvatar name={opp.name} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white">{opp.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {opp.industry && <span className="text-xs text-slate-400">{opp.industry}</span>}
            {opp.industry && opp.city && <span className="text-slate-600 text-xs">·</span>}
            {opp.city && <span className="text-xs text-slate-400">{opp.city}</span>}
          </div>
          {opp.tagline && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{opp.tagline}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onConnect}
          className="shrink-0 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors"
        >
          Connect
        </button>
      </div>
    </div>
  )
}

function BusinessAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const palettes = [
    'from-blue-500 to-blue-700',
    'from-violet-500 to-violet-700',
    'from-emerald-500 to-emerald-700',
    'from-amber-500 to-amber-700',
    'from-rose-500 to-rose-700',
    'from-cyan-500 to-cyan-700',
  ]
  const palette = palettes[name.charCodeAt(0) % palettes.length]
  return (
    <div
      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${palette} flex items-center justify-center text-white font-bold text-sm shrink-0`}
    >
      {initials}
    </div>
  )
}
