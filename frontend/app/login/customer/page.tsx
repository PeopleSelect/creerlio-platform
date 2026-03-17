'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Building2, Eye, EyeOff, Loader2, Mail, Lock, User, Phone, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={null}>
      <CustomerLoginPageInner />
    </Suspense>
  )
}

function CustomerLoginPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo  = params.get('redirect') || '/dashboard/customer'
  const initialMode = params.get('mode')
  const actionParam = params.get('action')   // enquiry | consultation etc.
  const typeParam   = params.get('type') || 'general'

  const [mode, setMode]             = useState<'signin' | 'signup'>(initialMode === 'signup' ? 'signup' : 'signin')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [name, setName]             = useState('')
  const [phone, setPhone]           = useState('')
  const [location, setLocation]     = useState('')
  const [company, setCompany]       = useState('')
  const [busy, setBusy]             = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [resetMode, setResetMode]   = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent]   = useState(false)

  useEffect(() => {
    if (initialMode === 'signup') setMode('signup')
    else if (initialMode === 'signin') setMode('signin')
    try {
      localStorage.setItem('creerlio_active_role', 'customer')
      localStorage.setItem('user_type', 'customer')
    } catch {}

    supabase.auth.getSession().then(({ data }: any) => {
      if (data.session?.user?.id) {
        const meta = data.session.user.user_metadata || {}
        if (meta.registration_type === 'customer') {
          router.replace(redirectTo)
        }
      }
    }).catch(() => {})
  }, [router, redirectTo, initialMode])

  // ── Sign In ────────────────────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInErr) throw signInErr

      const meta = data.user?.user_metadata || {}
      if (meta.registration_type && meta.registration_type !== 'customer') {
        await supabase.auth.signOut()
        throw new Error(`This email is registered as a ${meta.registration_type} account. Please use the correct login.`)
      }

      // Update metadata to ensure customer role is set
      await supabase.auth.updateUser({ data: { registration_type: 'customer', registered_as: 'customer' } })

      // Ensure customer_profiles row exists
      await fetch('/api/customer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: meta.full_name || meta.name || email.split('@')[0], email: email.trim() }),
      })

      router.replace(buildRedirect())
    } catch (err: any) {
      setError(err.message || 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  // ── Sign Up ────────────────────────────────────────────────────────────────
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    if (password !== confirmPw) { setError('Passwords do not match'); setBusy(false); return }
    if (password.length < 8)    { setError('Password must be at least 8 characters'); setBusy(false); return }
    if (!name.trim())           { setError('Please enter your name'); setBusy(false); return }

    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            registration_type: 'customer',
            registered_as:     'customer',
            full_name:         name.trim(),
            name:              name.trim(),
            phone:             phone.trim() || null,
          },
        },
      })
      if (signUpErr) throw signUpErr
      if (!data.user) throw new Error('Account creation failed. Please try again.')

      // Create customer_profiles row
      await fetch('/api/customer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:     name.trim(),
          email:    email.trim(),
          phone:    phone.trim() || null,
          company:  company.trim() || null,
          location: location.trim() || null,
        }),
      })

      router.replace(buildRedirect())
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  // ── Password Reset ─────────────────────────────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim())
      if (resetErr) throw resetErr
      setResetSent(true)
    } catch (err: any) {
      setError(err.message || 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  function buildRedirect() {
    const base = redirectTo
    if (actionParam) return `${base}?action=${actionParam}&type=${typeParam}`
    return base
  }

  // ── Forgot Password ────────────────────────────────────────────────────────
  if (resetMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-gray-900">Reset your password</h1>
            <p className="text-sm text-gray-500 mt-1">Enter your email and we'll send a reset link.</p>
          </div>
          {resetSent ? (
            <div className="text-center py-4">
              <p className="text-emerald-600 font-medium">Reset email sent. Check your inbox.</p>
              <button type="button" onClick={() => { setResetMode(false); setResetSent(false) }} className="mt-4 text-sm text-blue-600 hover:underline">Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <input required type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="Email address" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send reset link
              </button>
              <button type="button" onClick={() => setResetMode(false)} className="w-full text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // ── Main Auth UI ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900">Creerlio</Link>
          <nav className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/businesses" className="hover:text-blue-600 transition-colors">Find Businesses</Link>
            <Link href="/login/business" className="hover:text-blue-600 transition-colors">Business Login</Link>
            <Link href="/login/talent" className="hover:text-blue-600 transition-colors">Talent Login</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Icon + title */}
          <div className="text-center mb-8">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
              <Building2 className="h-7 w-7 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'signup' ? 'Create a Customer Account' : 'Customer Sign In'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'signup'
                ? 'Connect with businesses and track your enquiries.'
                : 'Sign in to manage your business connections.'}
            </p>
          </div>

          {/* Tab toggle */}
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 mb-6">
            <button type="button" onClick={() => { setMode('signin'); setError(null) }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              Sign In
            </button>
            <button type="button" onClick={() => { setMode('signup'); setError(null) }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              Register
            </button>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            {mode === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input required type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={busy}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sign In
                </button>
                <button type="button" onClick={() => setResetMode(true)}
                  className="w-full text-xs text-gray-400 hover:text-blue-600 transition-colors text-center">
                  Forgot your password?
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input required type="text" value={name} onChange={e => setName(e.target.value)}
                      className="w-full pl-9 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Jane Smith" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input required type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Min. 8 characters" />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirm password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input required type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                      className="w-full pl-9 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••" />
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400 mb-3">Optional details</p>
                  <div className="space-y-3">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                        className="w-full pl-9 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Phone number" />
                    </div>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                        className="w-full pl-9 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Company (if representing a business)" />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                        className="w-full pl-9 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Location" />
                    </div>
                  </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={busy}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Account
                </button>
              </form>
            )}
          </div>

          {/* Footer links */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Looking for a business?{' '}
            <Link href="/businesses" className="text-blue-600 hover:underline">Browse businesses</Link>
            {' · '}
            <Link href="/login/talent" className="hover:underline">Talent login</Link>
            {' · '}
            <Link href="/login/business" className="hover:underline">Business login</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
