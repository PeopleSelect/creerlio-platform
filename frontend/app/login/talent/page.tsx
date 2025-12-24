'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TalentLoginPage() {
  const UI_VERSION = 'talent-login-2025-12-24a'
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = params.get('redirect') || '/dashboard/talent'
  const initialMode = params.get('mode')

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialMode === 'signup') setMode('signup')
    if (initialMode === 'signin') setMode('signin')
    try {
      localStorage.setItem('creerlio_active_role', 'talent')
      localStorage.setItem('user_type', 'talent')
    } catch {}

    // #region agent log (client-only; avoid SSR hydration mismatches)
    try {
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'L0',
          location: 'frontend/app/login/talent/page.tsx:useEffect(render-log)',
          message: 'talent login render (client)',
          data: { uiVersion: UI_VERSION, path: window.location.pathname + window.location.search },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
    } catch {}
    // #endregion

    supabase.auth.getSession().then(({ data }) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'L1',location:'frontend/app/login/talent/page.tsx:mount',message:'talent login mount',data:{uiVersion:UI_VERSION,mode:initialMode??null,redirectTo,hasSession:!!data.session?.user?.id},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (data.session?.user?.id) router.replace(redirectTo)
    }).catch(() => {})
  }, [router, redirectTo, initialMode])

  async function oauth(provider: 'google' | 'apple') {
    setBusy(true)
    setError(null)
    try {
      try {
        localStorage.setItem('creerlio_active_role', 'talent')
        localStorage.setItem('user_type', 'talent')
      } catch {}
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({sessionId:'debug-session',runId:'oauth',hypothesisId:'O1',location:'frontend/app/login/talent/page.tsx:oauth',message:'OAuth click',data:{uiVersion:UI_VERSION,provider,redirectTo},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      // Avoid auto-navigation so we can show errors in-app (and keep logs).
      const { data, error } = await (supabase.auth.signInWithOAuth as any)({
        provider,
        options: { redirectTo: origin ? `${origin}${redirectTo}` : undefined, skipBrowserRedirect: true },
      })
      if (error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({sessionId:'debug-session',runId:'oauth',hypothesisId:'O1',location:'frontend/app/login/talent/page.tsx:oauth',message:'OAuth error',data:{uiVersion:UI_VERSION,provider,message:String((error as any)?.message??''),name:String((error as any)?.name??''),status:(error as any)?.status??null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        const msg = String((error as any)?.message ?? '')
        if (/Unsupported provider/i.test(msg) || /provider is not enabled/i.test(msg)) {
          setError(
            'Google/Apple sign-in is not enabled in your Supabase project yet.\n\n' +
              'Fix (Supabase Dashboard): Authentication → Sign In / Providers → enable the provider, then save.\n\n' +
              'For now you can sign in with email + password.'
          )
        } else {
          setError(msg)
        }
        return
      }

      const url = (data as any)?.url ?? null
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({sessionId:'debug-session',runId:'oauth',hypothesisId:'O2',location:'frontend/app/login/talent/page.tsx:oauth',message:'OAuth url received',data:{uiVersion:UI_VERSION,provider,hasUrl:!!url},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (url) window.location.assign(String(url))
    } finally {
      setBusy(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (!email.trim() || !password) {
        setError('Email and password are required.')
        return
      }
      try {
        localStorage.setItem('creerlio_active_role', 'talent')
        localStorage.setItem('user_type', 'talent')
      } catch {}

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'L2',location:'frontend/app/login/talent/page.tsx:submit',message:'talent login submit',data:{mode,redirectTo},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (err) {
          setError(err.message)
          return
        }
        router.replace(redirectTo)
        return
      }

      const { error: err } = await supabase.auth.signUp({ email: email.trim(), password })
      if (err) {
        setError(err.message)
        return
      }
      router.replace(redirectTo)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6">
      <div className="w-full max-w-md dashboard-card rounded-xl p-8 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-white text-xl font-bold hover:text-blue-400 transition-colors">
            Creerlio
          </Link>
          <Link href="/login/business" className="text-slate-300 hover:text-green-400 transition-colors text-sm">
            I’m a Business →
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">{mode === 'signin' ? 'Talent sign in' : 'Create Talent account'}</h1>
        <p className="text-gray-400 text-sm mb-6">Talent can sign in with email/password or supported providers.</p>
        <p className="text-[11px] text-gray-500 mb-4">UI: {UI_VERSION}</p>

        {error && (
          <div className="mb-4 border border-red-500/30 bg-red-500/10 text-red-200 rounded-lg p-3 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => oauth('google')}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-sm font-semibold disabled:opacity-60"
          >
            Continue with Google
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => oauth('apple')}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-sm font-semibold disabled:opacity-60"
          >
            Continue with Apple
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              mode === 'signin' ? 'bg-blue-500 text-white border-blue-500' : 'bg-transparent text-slate-300 border-white/10 hover:bg-white/5'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              mode === 'signup' ? 'bg-blue-500 text-white border-blue-500' : 'bg-transparent text-slate-300 border-white/10 hover:bg-white/5'
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}


