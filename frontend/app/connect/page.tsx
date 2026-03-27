'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Building2, CheckCircle2, Loader2, MapPin, Users, Shield,
  Sparkles, MessageSquare, FileText, Search, Network,
  ChevronRight, Zap, Package, Wrench, ArrowRight, RefreshCw,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────

interface Offering {
  id: string
  name: string
  description: string | null
  category: string | null
  price_from: number | null
  price_to: number | null
  price_unit: string
  is_service: boolean
}

interface Action {
  type: string
  label: string
  description: string
  href?: string
}

interface Experience {
  status: 'new_connection' | 'returning'
  is_new: boolean
  headline: string
  subline: string
  business: {
    id: string
    name: string
    industry: string | null
    city: string | null
    description: string | null
    logo_url: string | null
    tagline: string | null
    slug: string | null
    connection_count: number
  }
  intelligence: {
    connection_id: string
    scan_count: number
    engagement_score: number
    intent_score: number
    relationship_status: string
  }
  offerings: Offering[]
  actions: Action[]
}

interface BusinessPreview {
  id: string
  name: string
  industry: string | null
  city: string | null
  state: string | null
  description: string | null
  logo_url: string | null
  tagline: string | null
  slug: string | null
  connection_count: number
}

type PageStatus = 'loading' | 'preview' | 'checking_auth' | 'connecting' | 'connected' | 'error'

// ── Icons for action types ─────────────────────────────────────────────────

const ACTION_ICONS: Record<string, React.ElementType> = {
  enquiry:  MessageSquare,
  quote:    FileText,
  browse:   Search,
  message:  MessageSquare,
  network:  Network,
}

const ACTION_COLORS: Record<string, string> = {
  enquiry:  'bg-blue-500 hover:bg-blue-400',
  quote:    'bg-violet-500 hover:bg-violet-400',
  browse:   'bg-emerald-500 hover:bg-emerald-400',
  message:  'bg-blue-500 hover:bg-blue-400',
  network:  'bg-white/10 hover:bg-white/20',
}

// ── Price formatter ────────────────────────────────────────────────────────

function formatPrice(o: Offering) {
  if (o.price_from == null) return null
  const from = `$${o.price_from.toLocaleString()}`
  const to   = o.price_to != null ? `–$${o.price_to.toLocaleString()}` : ''
  const unit = o.price_unit !== 'flat' ? `/${o.price_unit}` : ''
  return `${from}${to}${unit}`
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 to-indigo-900">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    }>
      <ConnectInner />
    </Suspense>
  )
}

function ConnectInner() {
  const router   = useRouter()
  const params   = useSearchParams()
  const bizId    = params.get('b')
  const campaign = params.get('c') || 'qr'

  const [status,     setStatus]     = useState<PageStatus>('loading')
  const [preview,    setPreview]    = useState<BusinessPreview | null>(null)
  const [previewOffs,setPreviewOffs]= useState<Offering[]>([])
  const [experience, setExperience] = useState<Experience | null>(null)
  const [errMsg,     setErrMsg]     = useState('')

  // Step 1 — load public preview (no auth required)
  useEffect(() => {
    if (!bizId) { setStatus('error'); setErrMsg('No business specified.'); return }
    fetch(`/api/connect?b=${bizId}`)
      .then(r => r.json())
      .then(j => {
        if (j.business) {
          setPreview(j.business)
          setPreviewOffs(j.offerings || [])
          setStatus('checking_auth')
        } else {
          setStatus('error')
          setErrMsg(j.error || 'Business not found.')
        }
      })
      .catch(() => { setStatus('error'); setErrMsg('Unable to load business.') })
  }, [bizId])

  // Step 2 — check auth and auto-connect if already signed in
  const doConnect = useCallback(async (token: string) => {
    setStatus('connecting')
    try {
      const res = await fetch('/api/connect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ business_id: bizId, qr_source: campaign }),
      })
      const j = await res.json()
      if (!res.ok) { setStatus('error'); setErrMsg(j.error || 'Connection failed.'); return }
      setExperience(j.experience)
      setStatus('connected')
    } catch {
      setStatus('error')
      setErrMsg('Connection failed. Please try again.')
    }
  }, [bizId, campaign])

  useEffect(() => {
    if (status !== 'checking_auth') return
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        doConnect(data.session.access_token)
      } else {
        setStatus('preview')
      }
    })
  }, [status, doConnect])

  function handleJoin() {
    const returnUrl = encodeURIComponent(`/connect?b=${bizId}&c=${campaign}`)
    router.push(`/login/customer?mode=signup&redirect=${returnUrl}`)
  }

  function handleSignIn() {
    const returnUrl = encodeURIComponent(`/connect?b=${bizId}&c=${campaign}`)
    router.push(`/login/customer?mode=signin&redirect=${returnUrl}`)
  }

  // ── Shared business card header ───────────────────────────────────────────

  const biz = experience?.business ?? preview

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-900 to-violet-900 flex flex-col items-center justify-center px-4 py-10">

      {/* Wordmark */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">Creerlio</span>
        <span className="text-blue-300 text-xs font-semibold uppercase tracking-widest ml-1">Network</span>
      </Link>

      {/* Loading skeleton */}
      {(status === 'loading' || status === 'checking_auth') && (
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-3" />
          <p className="text-white/50 text-sm">Identifying business…</p>
        </div>
      )}

      {/* Connecting */}
      {status === 'connecting' && (
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Creating your connection…</p>
          <p className="text-white/50 text-sm mt-1">Building your relationship with {biz?.name}</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-10 text-center">
          <Building2 className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-2">Something went wrong</p>
          <p className="text-white/50 text-sm mb-4">{errMsg}</p>
          <Link href="/" className="text-blue-400 hover:underline text-sm">Back to Creerlio</Link>
        </div>
      )}

      {/* Preview state — not yet logged in */}
      {status === 'preview' && preview && (
        <div className="w-full max-w-md">
          <BusinessCard biz={preview} />

          {/* Preview offerings */}
          {previewOffs.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 text-center">What they offer</p>
              <div className="grid grid-cols-2 gap-2">
                {previewOffs.slice(0, 4).map(o => (
                  <OfferingCard key={o.id} offering={o} dim />
                ))}
              </div>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-blue-300" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Connect Instantly</h2>
            <p className="text-white/50 text-sm mb-5">
              Join Creerlio to connect with {preview.name}, send enquiries, and manage your business relationships.
            </p>
            <div className="space-y-3">
              <button type="button" onClick={handleJoin}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white hover:bg-blue-400 transition-colors">
                <Sparkles className="h-4 w-4" /> Join Creerlio &amp; Connect
              </button>
              <button type="button" onClick={handleSignIn}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 transition-colors">
                Already have an account? Sign in
              </button>
            </div>
            <p className="text-white/20 text-xs mt-4 flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" /> Secure · No spam · Cancel anytime
            </p>
          </div>
        </div>
      )}

      {/* Connected — the money state */}
      {status === 'connected' && experience && (
        <div className="w-full max-w-lg">

          {/* Business header */}
          <BusinessCard biz={experience.business} />

          {/* Connection confirmation */}
          <div className={`bg-white/5 border rounded-2xl p-5 mb-4 ${
            experience.is_new ? 'border-emerald-400/30' : 'border-blue-400/20'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                experience.is_new
                  ? 'bg-emerald-500/20 border border-emerald-400/30'
                  : 'bg-blue-500/20 border border-blue-400/30'
              }`}>
                {experience.is_new
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  : <RefreshCw    className="h-5 w-5 text-blue-400" />}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-base">{experience.headline}</p>
                <p className="text-white/50 text-sm mt-0.5">{experience.subline}</p>
              </div>
            </div>

            {/* Intelligence strip */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <p className="text-lg font-bold text-white">{experience.intelligence.scan_count}</p>
                <p className="text-[11px] text-white/40">Scan{experience.intelligence.scan_count !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{experience.intelligence.engagement_score}</p>
                <p className="text-[11px] text-white/40">Engagement</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{experience.intelligence.intent_score}</p>
                <p className="text-[11px] text-white/40">Intent</p>
              </div>
              <div className="ml-auto">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                  experience.intelligence.relationship_status === 'active'      ? 'bg-emerald-500/20 text-emerald-300' :
                  experience.intelligence.relationship_status === 'in_progress' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}>
                  {experience.intelligence.relationship_status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* What would you like to do? */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 text-center">What would you like to do?</p>
            <div className={`grid gap-2 ${experience.actions.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {experience.actions.map((action, i) => {
                const Icon  = ACTION_ICONS[action.type]  || ChevronRight
                const color = ACTION_COLORS[action.type] || 'bg-white/10 hover:bg-white/20'
                const isPrimary = i < 2
                return (
                  <Link key={action.type} href={action.href || '/dashboard/customer'}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all ${color} ${isPrimary ? 'border border-white/10' : 'border border-white/5'}`}>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isPrimary ? 'bg-white/20' : 'bg-white/10'}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white leading-tight">{action.label}</p>
                      <p className="text-xs text-white/50 mt-0.5 leading-tight truncate">{action.description}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-white/30 shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Offerings */}
          {experience.offerings.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 text-center">
                {experience.offerings[0].is_service ? 'Services' : 'Products & Services'} from {experience.business.name}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {experience.offerings.map(o => <OfferingCard key={o.id} offering={o} />)}
              </div>
              {experience.business.slug && (
                <Link href={`/businesses/${experience.business.slug}`}
                  className="flex items-center justify-center gap-1.5 mt-2 text-xs text-blue-300 hover:text-blue-200 transition-colors">
                  View all offerings <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}

          {/* Social proof */}
          {experience.business.connection_count > 1 && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-white/30 mb-2">
              <Users className="h-3 w-3" />
              {experience.business.connection_count} businesses &amp; customers in Creerlio Network
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function BusinessCard({ biz }: { biz: BusinessPreview | Experience['business'] }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 mb-4 flex items-center gap-4">
      <div className="h-14 w-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden">
        {biz.logo_url
          ? <img src={biz.logo_url} alt={biz.name} className="h-14 w-14 object-cover" />
          : <Building2 className="h-6 w-6 text-white/40" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-base leading-tight">{biz.name}</p>
        {biz.tagline && <p className="text-blue-200 text-xs mt-0.5">{biz.tagline}</p>}
        <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
          {biz.industry && <span>{biz.industry}</span>}
          {biz.city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />{biz.city}
            </span>
          )}
          {biz.connection_count > 0 && (
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-400" />
              {biz.connection_count} connections
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function OfferingCard({ offering: o, dim }: { offering: Offering; dim?: boolean }) {
  const price = formatPrice(o)
  return (
    <div className={`rounded-xl border p-3.5 transition-colors ${
      dim ? 'bg-white/3 border-white/8' : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/15'
    }`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${o.is_service ? 'bg-violet-500/20' : 'bg-blue-500/20'}`}>
          {o.is_service
            ? <Wrench  className="h-3 w-3 text-violet-300" />
            : <Package className="h-3 w-3 text-blue-300" />}
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${o.is_service ? 'text-violet-300/60' : 'text-blue-300/60'}`}>
          {o.is_service ? 'Service' : 'Product'}
        </span>
      </div>
      <p className="text-sm font-semibold text-white leading-tight">{o.name}</p>
      {o.category && <p className="text-[11px] text-white/40 mt-0.5">{o.category}</p>}
      {price && <p className="text-xs text-emerald-300 font-medium mt-1.5">{price}</p>}
    </div>
  )
}
