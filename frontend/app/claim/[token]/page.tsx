'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface PlaceholderProfile {
  name: string
  email: string
  headline: string | null
  skills: string[]
  linkedin_url: string | null
}

export const dynamic = 'force-dynamic'

export default function ClaimProfilePage() {
  const params = useParams()
  const router = useRouter()
  const token = String((params as any)?.token || '')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<PlaceholderProfile | null>(null)
  const [step, setStep] = useState<'preview' | 'claim'>('preview')

  // Claim form state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/talent/claim/${encodeURIComponent(token)}`, {
          cache: 'no-store',
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || 'This claim link is not available.')
          return
        }
        setProfile(json.profile)
      } catch {
        setError('Unable to load this profile. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [token])

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    setClaimError(null)

    if (password.length < 8) {
      setClaimError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setClaimError('Passwords do not match.')
      return
    }

    setClaiming(true)
    try {
      const res = await fetch('/api/talent/claim-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const json = await res.json()

      if (!res.ok) {
        if (json.code === 'email_exists') {
          setClaimError('An account with this email already exists. Please log in.')
        } else {
          setClaimError(json.error || 'Failed to claim profile. Please try again.')
        }
        return
      }

      // If we got a session back, set it in the Supabase client
      if (json.session?.access_token) {
        await supabase.auth.setSession({
          access_token: json.session.access_token,
          refresh_token: json.session.refresh_token,
        })
      }

      // Navigate to success page
      router.push(`/claim/success?name=${encodeURIComponent(json.name || '')}`)
    } catch {
      setClaimError('Something went wrong. Please try again.')
    } finally {
      setClaiming(false)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Error / Not Found ──
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Link Not Available</h1>
          <p className="text-slate-400 mb-8">{error || 'This claim link is not available.'}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors"
          >
            Go to Creerlio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full">

        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">Creerlio</span>
          </Link>
        </div>

        {step === 'preview' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            {/* Hero banner */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-8 py-10 text-center">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-white">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
              {profile.headline && (
                <p className="text-emerald-100 mt-1">{profile.headline}</p>
              )}
            </div>

            <div className="px-8 py-6">
              <div className="text-center mb-6">
                <p className="text-slate-300 text-sm leading-relaxed">
                  A Creerlio talent profile has been created for you. Claim it to take control of your professional identity.
                </p>
              </div>

              {/* Skills preview */}
              {profile.skills.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.slice(0, 8).map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-emerald-500/15 text-emerald-300 text-sm rounded-full border border-emerald-500/30"
                      >
                        {skill}
                      </span>
                    ))}
                    {profile.skills.length > 8 && (
                      <span className="px-3 py-1 bg-slate-800 text-slate-400 text-sm rounded-full">
                        +{profile.skills.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Claim message */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 text-center">
                <p className="text-emerald-300 text-sm font-medium">
                  "My professional profile already exists — I should take control of it."
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => setStep('claim')}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
                >
                  Claim My Profile
                </button>
                <Link
                  href={`/${profile.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="block w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-center transition-colors"
                >
                  Preview Profile
                </Link>
              </div>
            </div>
          </div>
        )}

        {step === 'claim' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-8 py-6 text-center">
              <h1 className="text-xl font-bold text-white">Claim Your Profile</h1>
              <p className="text-emerald-100 text-sm mt-1">{profile.name}</p>
            </div>

            <form onSubmit={handleClaim} className="px-8 py-6 space-y-5">
              {/* Email (read-only, pre-filled) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email address</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-sm cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">This is the email the profile was created for.</p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Create password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {claimError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm">
                  {claimError}
                </div>
              )}

              <button
                type="submit"
                disabled={claiming}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {claiming ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Claiming your profile…
                  </span>
                ) : (
                  'Claim Profile & Create Account'
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('preview')}
                className="w-full py-2 text-slate-400 hover:text-slate-300 text-sm transition-colors"
              >
                Back to preview
              </button>

              <p className="text-xs text-slate-500 text-center">
                By claiming this profile you agree to Creerlio's{' '}
                <Link href="/terms" className="text-emerald-400 hover:underline">Terms of Service</Link>.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
