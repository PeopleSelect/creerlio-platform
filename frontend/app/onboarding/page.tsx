'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type RoleType = 'customer' | 'talent' | 'business' | null
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

interface OppCard {
  id: string
  title: string
  subtitle: string
  tag: string
  tagColor: string
  icon: string
}

// ── Seeded opportunity cards per role ─────────────────────────────────────────

const SEEDED_OPPS: Record<string, OppCard[]> = {
  customer: [
    { id: '1', title: 'Exclusive Member Offer', subtitle: 'Get priority access to products before they go public', tag: 'New', tagColor: 'bg-emerald-500', icon: '🎁' },
    { id: '2', title: 'Book a Consultation', subtitle: 'Chat with the team at no cost — get advice personalised to you', tag: 'Free', tagColor: 'bg-blue-500', icon: '💬' },
    { id: '3', title: 'Refer & Earn', subtitle: 'Refer a friend and both of you receive a reward', tag: 'Reward', tagColor: 'bg-violet-500', icon: '⭐' },
  ],
  talent: [
    { id: '1', title: 'Immediate Openings', subtitle: 'Roles starting within 2 weeks — apply with one tap', tag: 'Urgent', tagColor: 'bg-red-500', icon: '⚡' },
    { id: '2', title: 'Flexible Work Opportunities', subtitle: 'Part-time and contract roles that fit your schedule', tag: 'Flexible', tagColor: 'bg-amber-500', icon: '🕐' },
    { id: '3', title: 'Career Growth Paths', subtitle: 'Senior positions with structured progression and mentorship', tag: 'Growth', tagColor: 'bg-emerald-500', icon: '📈' },
  ],
  business: [
    { id: '1', title: 'Talent Pool Access', subtitle: 'Browse pre-vetted candidates in your industry', tag: 'Exclusive', tagColor: 'bg-violet-500', icon: '👥' },
    { id: '2', title: 'Co-Marketing Opportunities', subtitle: 'Partner with complementary businesses in your area', tag: 'New', tagColor: 'bg-blue-500', icon: '🤝' },
    { id: '3', title: 'Customer Intelligence Report', subtitle: 'Understand who is connecting with your brand and why', tag: 'Insight', tagColor: 'bg-emerald-500', icon: '📊' },
  ],
}

const ROLE_META = {
  customer: {
    icon: '🛍️',
    label: 'Customer',
    description: 'Discover businesses, book services, and manage your connections',
    gradient: 'from-blue-500 to-cyan-400',
    dashboard: '/dashboard/customer',
    registrationType: 'customer',
  },
  talent: {
    icon: '💼',
    label: 'Talent',
    description: 'Find opportunities, connect with businesses, and grow your career',
    gradient: 'from-violet-500 to-purple-400',
    dashboard: '/dashboard/talent',
    registrationType: 'talent',
  },
  business: {
    icon: '🏢',
    label: 'Business',
    description: 'Find customers, hire talent, and build your professional network',
    gradient: 'from-emerald-500 to-teal-400',
    dashboard: '/dashboard/business',
    registrationType: 'business',
  },
}

const AI_MESSAGES = [
  'Mapping your local network…',
  'Analysing industry trends…',
  'Scanning opportunities near you…',
  'Building your personalised feed…',
  'Calibrating recommendations…',
  'Almost ready…',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressDots({ step, total = 8 }: { step: number; total?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full transition-all duration-300',
            i + 1 < step ? 'h-1.5 w-3 bg-white/60' :
            i + 1 === step ? 'h-1.5 w-5 bg-white' :
            'h-1.5 w-1.5 bg-white/20'
          )}
        />
      ))}
    </div>
  )
}

function OppCardView({ card, delay = 0 }: { card: OppCard; delay?: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className={cn(
      'bg-white/5 border border-white/10 rounded-2xl p-4 transition-all duration-500',
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    )}>
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{card.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-white leading-tight">{card.title}</p>
            <span className={cn('text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full flex-shrink-0', card.tagColor)}>
              {card.tag}
            </span>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">{card.subtitle}</p>
        </div>
      </div>
    </div>
  )
}

function SpinnerRing() {
  return (
    <div className="relative w-20 h-20 mx-auto">
      <div className="absolute inset-0 rounded-full border-2 border-white/10" />
      <div className="absolute inset-0 rounded-full border-2 border-t-white border-l-white/30 border-r-transparent border-b-transparent animate-spin" />
      <div className="absolute inset-3 rounded-full border border-white/20 animate-pulse" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <OnboardingFlow />
    </Suspense>
  )
}

function OnboardingFlow() {
  const router = useRouter()
  const params = useSearchParams()

  const bizId    = params.get('b')
  const campaign = params.get('c') || 'onboarding'
  const roleParam = params.get('role') as RoleType

  const [step, setStep] = useState<Step>(1)
  const [fading, setFading] = useState(false)

  // Identity
  const [role, setRole] = useState<RoleType>(roleParam || null)

  // Profile form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleField, setRoleField] = useState('') // context-specific field

  // Auth
  const [session, setSession] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const connectedRef = useRef(false)

  // Business context
  const [bizName, setBizName] = useState<string | null>(null)

  // AI loading
  const [aiMsgIdx, setAiMsgIdx] = useState(0)
  const [aiProgress, setAiProgress] = useState(0)

  // Opportunity feed
  const [opps, setOpps] = useState<OppCard[]>([])

  // UI
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Load business name if QR entry
    if (bizId) {
      fetch(`/api/connect?b=${bizId}`)
        .then(r => r.json())
        .then(j => { if (j.business?.name) setBizName(j.business.name) })
        .catch(() => {})
    }

    // Check existing auth
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session
      if (s) {
        setSession(s)
        setUserId(s.user.id)
        if (s.user.user_metadata?.full_name) setName(s.user.user_metadata.full_name)
        if (s.user.email) setEmail(s.user.email)
        // Skip to profile step if already authed
        if (roleParam) {
          setRole(roleParam)
          setStep(3)
        } else {
          setStep(2)
        }
      } else if (roleParam) {
        // Role pre-selected from connect page
        setRole(roleParam)
        setStep(2)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI loading cycle ─────────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 4) return
    const msgInterval = setInterval(() => setAiMsgIdx(i => (i + 1) % AI_MESSAGES.length), 650)
    const progInterval = setInterval(() => setAiProgress(p => Math.min(p + 2, 100)), 60)

    const advance = setTimeout(async () => {
      clearInterval(msgInterval)
      clearInterval(progInterval)
      setAiProgress(100)
      setOpps(SEEDED_OPPS[role || 'customer'] || SEEDED_OPPS.customer)
      await new Promise(r => setTimeout(r, 400))
      goTo(5)
    }, 3400)

    return () => { clearInterval(msgInterval); clearInterval(progInterval); clearTimeout(advance) }
  }, [step, role])

  // ── Auto-connect after auth ───────────────────────────────────────────────

  const doROSConnect = useCallback(async (token: string, uid: string) => {
    if (!bizId || connectedRef.current) return
    connectedRef.current = true
    try {
      await fetch('/api/ros/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          business_id: bizId,
          relationship_type: role || 'customer',
          entry_source: 'qr',
          campaign,
        }),
      })
    } catch {}
  }, [bizId, role, campaign])

  // ── Step navigation ───────────────────────────────────────────────────────

  function goTo(target: number) {
    setFading(true)
    setError(null)
    setTimeout(() => {
      setStep(target as Step)
      setFading(false)
    }, 200)
  }

  // ── Step handlers ─────────────────────────────────────────────────────────

  function handleRoleSelect(r: RoleType) {
    setRole(r)
    goTo(3)
  }

  async function handleProfileSubmit() {
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!email.trim()) { setError('Please enter your email'); return }
    if (session) {
      // Already authenticated — skip auth, go to loading
      goTo(4)
      return
    }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return }

    setBusy(true)
    setError(null)
    try {
      const meta = ROLE_META[role || 'customer']
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            registration_type: meta.registrationType,
            role_field: roleField,
            onboarding_complete: false,
          },
        },
      })
      if (signUpErr) { setError(signUpErr.message); return }
      if (data.session) {
        setSession(data.session)
        setUserId(data.session.user.id)
      }
      goTo(4)
    } finally {
      setBusy(false)
    }
  }

  async function handleFirstAction() {
    if (!session) { goTo(7); return }
    goTo(7)
  }

  async function handleConfirm() {
    if (session) {
      // Mark onboarding complete
      await supabase.auth.updateUser({
        data: { onboarding_complete: true, registration_type: ROLE_META[role || 'customer'].registrationType },
      })
      // Create ROS connection if from QR
      if (bizId) await doROSConnect(session.access_token, session.user.id)
    }
    goTo(8)
  }

  // Screen 8 — auto-redirect
  useEffect(() => {
    if (step !== 8) return
    const dest = session
      ? (ROLE_META[role || 'customer']?.dashboard || '/dashboard/talent')
      : '/login/talent'
    const t = setTimeout(() => router.replace(dest), 2200)
    return () => clearTimeout(t)
  }, [step, session, role, router])

  // ── Shared layout ─────────────────────────────────────────────────────────

  const roleM = ROLE_META[role || 'customer']

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={cn(
          'absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl transition-all duration-1000',
          role === 'customer' ? 'bg-blue-500' :
          role === 'talent' ? 'bg-violet-500' :
          role === 'business' ? 'bg-emerald-500' : 'bg-blue-600'
        )} />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full opacity-8 blur-3xl bg-indigo-800" />
      </div>

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-1 relative z-10">
        <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
          <span className="text-white font-black text-sm">C</span>
        </div>
        <span className="text-white/40 text-xs tracking-widest uppercase font-semibold">Creerlio</span>
      </div>

      {/* Screen container */}
      <div className={cn(
        'w-full max-w-md relative z-10 transition-all duration-200',
        fading ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
      )}>
        {/* Progress + step indicator */}
        <div className="flex items-center justify-between mb-8">
          <ProgressDots step={step} />
          <span className="text-white/30 text-xs">{step} of 8</span>
        </div>

        {/* ── SCREEN 1: ENTRY ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="text-center space-y-6">
            <div className="space-y-2">
              {bizName && (
                <p className="text-white/40 text-sm font-medium uppercase tracking-widest">
                  You scanned a code from
                </p>
              )}
              {bizName && (
                <p className="text-white font-bold text-lg">{bizName}</p>
              )}
              <h1 className="text-4xl font-black leading-tight tracking-tight text-white mt-4">
                Your professional<br />network starts here.
              </h1>
              <p className="text-white/40 text-base leading-relaxed mt-3">
                Creerlio connects you with the businesses and opportunities that matter — privately, persistently, and on your terms.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6">
              {(['customer', 'talent', 'business'] as RoleType[]).map(r => (
                <div key={r} className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
                  <div className="text-2xl mb-1">{ROLE_META[r!].icon}</div>
                  <p className="text-white/60 text-xs font-semibold capitalize">{r}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(2)}
              className="w-full py-4 rounded-2xl font-bold text-base text-white bg-white/10 border border-white/15 hover:bg-white/15 transition-all active:scale-[0.98]"
            >
              Begin →
            </button>

            <p className="text-white/20 text-xs">By continuing, you agree to our Terms and Privacy Policy</p>
          </div>
        )}

        {/* ── SCREEN 2: IDENTITY ──────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-3xl font-black leading-tight text-white">How would you like to continue?</h2>
              <p className="text-white/40 text-sm mt-2 leading-relaxed">
                Choose your primary role. You can expand later.
              </p>
            </div>

            <div className="space-y-3">
              {(['customer', 'talent', 'business'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleSelect(r)}
                  className={cn(
                    'w-full text-left p-5 rounded-2xl border transition-all duration-200 active:scale-[0.98] group',
                    role === r
                      ? 'border-white/40 bg-white/10'
                      : 'border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/6'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br',
                      ROLE_META[r].gradient
                    )}>
                      {ROLE_META[r].icon}
                    </div>
                    <div>
                      <p className="font-bold text-white text-base">{ROLE_META[r].label}</p>
                      <p className="text-white/40 text-sm leading-snug mt-0.5">{ROLE_META[r].description}</p>
                    </div>
                    <div className="ml-auto text-white/20 group-hover:text-white/60 transition-colors">→</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── SCREEN 3: PROFILE ───────────────────────────────────────────── */}
        {step === 3 && role && (
          <div className="space-y-5">
            <div>
              <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white mb-3 bg-gradient-to-r', roleM.gradient)}>
                <span>{roleM.icon}</span>
                <span>{roleM.label}</span>
              </div>
              <h2 className="text-3xl font-black text-white leading-tight">Tell us about yourself</h2>
              <p className="text-white/40 text-sm mt-1">This stays private. Only shared when you choose.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold block mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold block mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                />
              </div>

              {/* Role-specific field */}
              {role === 'customer' && (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold block mb-1.5">What are you looking for?</label>
                  <select
                    value={roleField}
                    onChange={e => setRoleField(e.target.value)}
                    title="What are you looking for?"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors text-sm appearance-none"
                  >
                    <option value="" className="bg-[#0a0a0f]">Select one…</option>
                    <option value="products" className="bg-[#0a0a0f]">Products &amp; Goods</option>
                    <option value="services" className="bg-[#0a0a0f]">Services &amp; Expertise</option>
                    <option value="experiences" className="bg-[#0a0a0f]">Experiences &amp; Events</option>
                    <option value="just_browsing" className="bg-[#0a0a0f]">Just exploring</option>
                  </select>
                </div>
              )}

              {role === 'talent' && (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold block mb-1.5">Your Role / Profession</label>
                  <input
                    type="text"
                    value={roleField}
                    onChange={e => setRoleField(e.target.value)}
                    placeholder="e.g. Senior Sales Agent, UX Designer…"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                  />
                </div>
              )}

              {role === 'business' && (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold block mb-1.5">Business Name</label>
                  <input
                    type="text"
                    value={roleField}
                    onChange={e => setRoleField(e.target.value)}
                    placeholder="Your business or trading name"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                  />
                </div>
              )}

              {/* Password — only shown for new signups */}
              {!session && (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold block mb-1.5">Create Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                  />
                </div>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="button"
              onClick={handleProfileSubmit}
              disabled={busy}
              className={cn(
                'w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] bg-gradient-to-r',
                roleM.gradient,
                busy && 'opacity-60 cursor-not-allowed'
              )}
            >
              {busy ? 'Creating your account…' : 'Continue →'}
            </button>

            <p className="text-center text-white/30 text-xs">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => router.push(`/login/${role || 'talent'}${bizId ? `?redirect=${encodeURIComponent(`/connect?b=${bizId}&c=${campaign}`)}` : ''}`)}
                className="text-white/60 hover:text-white underline transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        )}

        {/* ── SCREEN 4: AI LOADING ────────────────────────────────────────── */}
        {step === 4 && (
          <div className="text-center space-y-8">
            <SpinnerRing />

            <div>
              <h2 className="text-2xl font-black text-white">Building your network</h2>
              <p className="text-white/40 text-sm mt-2 h-5 transition-all duration-300">
                {AI_MESSAGES[aiMsgIdx]}
              </p>
            </div>

            {/* Progress bar — width must be inline (dynamic numeric value) */}
            <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
              {/* eslint-disable-next-line react/forbid-dom-props */}
              <div
                className={cn('h-full rounded-full transition-all duration-100 bg-gradient-to-r', roleM.gradient)}
                style={{ width: `${aiProgress}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['Local Businesses', 'Live Opportunities', 'Your Matches'].map((label, i) => (
                <div key={label} className={cn(
                  'bg-white/5 border border-white/8 rounded-xl p-3 text-center transition-all duration-500',
                  aiProgress > (i + 1) * 30 ? 'opacity-100' : 'opacity-30'
                )}>
                  <div className="text-lg mb-1">
                    {i === 0 ? '🏢' : i === 1 ? '⚡' : '✨'}
                  </div>
                  <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SCREEN 5: OPPORTUNITY FEED ──────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-1">Personalised for you</p>
              <h2 className="text-3xl font-black text-white leading-tight">
                {role === 'customer' && "Here's what's available"}
                {role === 'talent' && 'Opportunities waiting for you'}
                {role === 'business' && 'Your network potential'}
              </h2>
              {bizName && (
                <p className="text-white/40 text-sm mt-1">Based on your connection with {bizName}</p>
              )}
            </div>

            <div className="space-y-3">
              {opps.map((card, i) => (
                <OppCardView key={card.id} card={card} delay={i * 150} />
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(6)}
              className={cn(
                'w-full py-4 rounded-2xl font-bold text-base text-white mt-2 transition-all active:scale-[0.98] bg-gradient-to-r',
                roleM.gradient
              )}
            >
              Explore all opportunities →
            </button>

            <button
              type="button"
              onClick={() => goTo(6)}
              className="w-full py-2 text-white/30 text-sm hover:text-white/60 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── SCREEN 6: FIRST ACTION ───────────────────────────────────────── */}
        {step === 6 && role && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-black text-white leading-tight">What would you like to do first?</h2>
              <p className="text-white/40 text-sm mt-2">You can always come back and do more.</p>
            </div>

            <div className="space-y-3">
              {role === 'customer' && [
                { label: bizName ? `Message ${bizName}` : 'Message a business', icon: '💬', action: () => handleFirstAction() },
                { label: 'Browse services', icon: '🔍', action: () => handleFirstAction() },
                { label: 'Complete my profile', icon: '✏️', action: () => handleFirstAction() },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="w-full text-left bg-white/5 border border-white/10 hover:border-white/25 hover:bg-white/8 rounded-2xl p-4 transition-all active:scale-[0.99] flex items-center gap-4"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-white font-semibold">{item.label}</span>
                  <span className="ml-auto text-white/30">→</span>
                </button>
              ))}

              {role === 'talent' && [
                { label: 'Explore job opportunities', icon: '⚡', action: () => handleFirstAction() },
                { label: bizName ? `Connect with ${bizName}` : 'Find businesses hiring', icon: '🤝', action: () => handleFirstAction() },
                { label: 'Complete my profile', icon: '✏️', action: () => handleFirstAction() },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="w-full text-left bg-white/5 border border-white/10 hover:border-white/25 hover:bg-white/8 rounded-2xl p-4 transition-all active:scale-[0.99] flex items-center gap-4"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-white font-semibold">{item.label}</span>
                  <span className="ml-auto text-white/30">→</span>
                </button>
              ))}

              {role === 'business' && [
                { label: 'Set up my business profile', icon: '🏢', action: () => handleFirstAction() },
                { label: 'Browse talent pool', icon: '👥', action: () => handleFirstAction() },
                { label: 'Generate my QR code', icon: '📲', action: () => handleFirstAction() },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="w-full text-left bg-white/5 border border-white/10 hover:border-white/25 hover:bg-white/8 rounded-2xl p-4 transition-all active:scale-[0.99] flex items-center gap-4"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-white font-semibold">{item.label}</span>
                  <span className="ml-auto text-white/30">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── SCREEN 7: CONFIRMATION ───────────────────────────────────────── */}
        {step === 7 && (
          <div className="text-center space-y-6">
            <div className={cn(
              'w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl bg-gradient-to-br',
              roleM.gradient
            )}>
              ✓
            </div>

            <div>
              <h2 className="text-3xl font-black text-white">You&apos;re all set.</h2>
              {bizName && (
                <p className="text-white/60 text-base mt-2">
                  Connected with <span className="text-white font-semibold">{bizName}</span>
                </p>
              )}
              <p className="text-white/40 text-sm mt-1 leading-relaxed">
                Your relationship is private, persistent, and fully in your control.
                You can disconnect at any time.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-3">
              <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">Your account</p>
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br', roleM.gradient)}>
                  {roleM.icon}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{name || 'Your Name'}</p>
                  <p className="text-white/40 text-xs">{roleM.label} · {email}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className={cn(
                'w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] bg-gradient-to-r',
                roleM.gradient
              )}
            >
              Go to my dashboard →
            </button>
          </div>
        )}

        {/* ── SCREEN 8: REDIRECT ──────────────────────────────────────────── */}
        {step === 8 && (
          <div className="text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <circle
                  cx="40" cy="40" r="36" fill="none"
                  stroke="white" strokeWidth="4"
                  strokeDasharray="226"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  className="animate-[dash_2s_ease-in-out_forwards]"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                {roleM.icon}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">Taking you to your dashboard…</h2>
              <p className="text-white/40 text-sm mt-1">Everything is ready for you.</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom skip (steps 1-3) */}
      {step <= 3 && step > 1 && (
        <button
          type="button"
          onClick={() => goTo(step > 1 ? step - 1 as Step : 1)}
          className="mt-8 text-white/20 hover:text-white/50 text-xs transition-colors relative z-10"
        >
          ← Back
        </button>
      )}
    </div>
  )
}
