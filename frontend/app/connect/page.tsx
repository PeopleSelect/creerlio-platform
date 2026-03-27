'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Building2, CheckCircle2, Loader2, ArrowRight, Zap, MapPin,
  Users, Shield, Sparkles,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

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

interface BizInfo {
  id: string
  display_name: string
  industry: string | null
  city: string | null
  state: string | null
  description: string | null
  connection_count: number
  page: { slug: string; logo_url: string | null; tagline: string | null } | null
}

type Status = 'loading' | 'ready' | 'checking_auth' | 'connecting' | 'connected' | 'already_connected' | 'error'

function ConnectInner() {
  const router   = useRouter()
  const params   = useSearchParams()
  const bizId    = params.get('b')
  const campaign = params.get('c') || 'qr'

  const [biz, setBiz]       = useState<BizInfo | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [errMsg, setErrMsg] = useState('')

  // 1 — fetch business info
  useEffect(() => {
    if (!bizId) { setStatus('error'); setErrMsg('No business specified.'); return }
    fetch(`/api/connect?b=${bizId}`)
      .then(r => r.json())
      .then(j => {
        if (j.business) { setBiz(j.business); setStatus('ready') }
        else { setStatus('error'); setErrMsg(j.error || 'Business not found.') }
      })
      .catch(() => { setStatus('error'); setErrMsg('Unable to load business.') })
  }, [bizId])

  // 2 — once biz loaded, auto-connect if already signed in
  useEffect(() => {
    if (status !== 'ready') return
    setStatus('checking_auth')
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        doConnect(data.session.access_token)
      } else {
        setStatus('ready')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biz])

  async function doConnect(token: string) {
    setStatus('connecting')
    try {
      const res = await fetch('/api/connect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ business_id: bizId, qr_source: campaign }),
      })
      const j = await res.json()
      if (!res.ok) { setStatus('error'); setErrMsg(j.error || 'Connection failed.'); return }
      setStatus(j.already_connected ? 'already_connected' : 'connected')
    } catch {
      setStatus('error')
      setErrMsg('Connection failed. Please try again.')
    }
  }

  function handleJoin() {
    const returnUrl = encodeURIComponent(`/connect?b=${bizId}&c=${campaign}`)
    router.push(`/login/customer?mode=signup&redirect=${returnUrl}`)
  }

  function handleSignIn() {
    const returnUrl = encodeURIComponent(`/connect?b=${bizId}&c=${campaign}`)
    router.push(`/login/customer?mode=signin&redirect=${returnUrl}`)
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const logo = biz?.page?.logo_url
  const tagline = biz?.page?.tagline

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-900 to-violet-900 flex flex-col items-center justify-center px-4 py-12">

      {/* Creerlio wordmark */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">Creerlio</span>
        <span className="text-blue-300 text-xs font-semibold uppercase tracking-widest ml-1">Network</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

        {/* Business header */}
        {biz && (
          <div className="px-8 pt-8 pb-6 text-center border-b border-white/10">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4 overflow-hidden">
              {logo
                ? <img src={logo} alt={biz.display_name} className="h-20 w-20 object-cover" />
                : <Building2 className="h-9 w-9 text-white/60" />}
            </div>
            <h1 className="text-xl font-bold text-white">{biz.display_name}</h1>
            {tagline && <p className="text-blue-200 text-sm mt-1">{tagline}</p>}
            <div className="flex items-center justify-center gap-3 mt-2 text-xs text-white/50">
              {biz.industry && <span>{biz.industry}</span>}
              {biz.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{biz.city}{biz.state ? `, ${biz.state}` : ''}
                </span>
              )}
            </div>
            {biz.connection_count > 0 && (
              <div className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-300 bg-blue-500/10 border border-blue-400/20 rounded-full px-3 py-1">
                <Users className="h-3 w-3" />
                {biz.connection_count} connection{biz.connection_count !== 1 ? 's' : ''} in Creerlio
              </div>
            )}
          </div>
        )}

        {/* Status area */}
        <div className="px-8 py-8">

          {(status === 'loading' || status === 'checking_auth' || status === 'connecting') && (
            <div className="text-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-3" />
              <p className="text-white/70 text-sm">
                {status === 'connecting' ? 'Creating your connection…' : 'Loading…'}
              </p>
            </div>
          )}

          {status === 'connected' && (
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">You're connected!</h2>
              <p className="text-white/60 text-sm mb-6">
                Your connection with <span className="text-white font-medium">{biz?.display_name}</span> is live. You can now message, enquire, and send opportunities directly.
              </p>
              <Link href="/dashboard/customer"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-900 hover:bg-blue-50 transition-colors w-full justify-center">
                View your Network <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {status === 'already_connected' && (
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Already connected</h2>
              <p className="text-white/60 text-sm mb-6">
                You're already in your network with <span className="text-white font-medium">{biz?.display_name}</span>.
              </p>
              <Link href="/dashboard/customer"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-900 hover:bg-blue-50 transition-colors w-full justify-center">
                View your Network <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {status === 'ready' && (
            <div className="text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mb-5">
                <Sparkles className="h-7 w-7 text-blue-300" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Instant Connection</h2>
              <p className="text-white/60 text-sm mb-6">
                Connect with <span className="text-white font-medium">{biz?.display_name}</span> to send enquiries, request quotes, and build your business network.
              </p>
              <div className="space-y-3">
                <button type="button" onClick={handleJoin}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white hover:bg-blue-400 transition-colors">
                  <Sparkles className="h-4 w-4" /> Join Creerlio &amp; Connect
                </button>
                <button type="button" onClick={handleSignIn}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 transition-colors">
                  Sign in to connect
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-red-500/20 border border-red-400/30 flex items-center justify-center mb-4">
                <Building2 className="h-7 w-7 text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
              <p className="text-white/50 text-sm mb-4">{errMsg}</p>
              <Link href="/"
                className="text-blue-400 hover:underline text-sm">Back to Creerlio</Link>
            </div>
          )}
        </div>

        {/* Trust footer */}
        {(status === 'ready' || status === 'connected' || status === 'already_connected') && (
          <div className="px-8 pb-6 flex items-center justify-center gap-1.5 text-xs text-white/30">
            <Shield className="h-3 w-3" />
            Secure connection · No spam · Cancel anytime
          </div>
        )}
      </div>
    </div>
  )
}
