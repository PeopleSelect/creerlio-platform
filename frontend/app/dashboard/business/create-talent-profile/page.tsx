'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import CreateTalentProfileForm from '@/components/CreateTalentProfileForm'

interface CreatedProfile {
  claimUrl: string
  name: string
  email: string
}

export default function CreateTalentProfilePage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [createdProfiles, setCreatedProfiles] = useState<CreatedProfile[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setCheckingAuth(false)
      }
    })
  }, [router])

  const handleSuccess = (claimUrl: string, name: string, email: string) => {
    setCreatedProfiles((prev) => [{ claimUrl, name, email }, ...prev])
  }

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/dashboard/business"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="font-bold text-white">Create Talent Profile</h1>
            <p className="text-xs text-slate-500">Invite talent by creating a profile for them</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Form */}
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white mb-1">New talent profile</h2>
              <p className="text-sm text-slate-400">
                Fill in the details and send the candidate a claim link. Takes less than 30 seconds.
              </p>
            </div>

            <CreateTalentProfileForm onSuccess={handleSuccess} />

            {/* How it works */}
            <div className="mt-6 rounded-xl bg-slate-900 border border-slate-800 p-5">
              <p className="text-sm font-semibold text-slate-300 mb-3">How it works</p>
              <ol className="space-y-3">
                {[
                  { step: '1', text: 'Enter the candidate\'s name, email, and skills.' },
                  { step: '2', text: 'A unique claim link is generated for them.' },
                  { step: '3', text: 'Send the link — they\'ll see their profile is ready.' },
                  { step: '4', text: 'They set a password and take control.' },
                ].map(({ step, text }) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step}
                    </span>
                    <p className="text-sm text-slate-400">{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right: Created profiles history */}
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white mb-1">Profiles created this session</h2>
              <p className="text-sm text-slate-400">Claim links expire after 30 days.</p>
            </div>

            {createdProfiles.length === 0 ? (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm">No profiles created yet.</p>
                <p className="text-slate-600 text-xs mt-1">Profiles you create will appear here.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {createdProfiles.map((p) => (
                  <li
                    key={p.claimUrl}
                    className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-white text-sm">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.email}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30">
                        Pending
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-400 truncate flex-1 font-mono">{p.claimUrl}</span>
                      <button
                        onClick={() => copyLink(p.claimUrl)}
                        className="shrink-0 px-2 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-colors"
                      >
                        {copied === p.claimUrl ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="mt-2">
                      <a
                        href={`mailto:${p.email}?subject=Your%20Creerlio%20talent%20profile&body=Hi%20${encodeURIComponent(p.name)}%2C%0A%0AA%20professional%20talent%20profile%20has%20been%20created%20for%20you%20on%20Creerlio.%0A%0AClaim%20it%20here%3A%20${encodeURIComponent(p.claimUrl)}%0A%0ATake%20control%20of%20your%20professional%20identity%20and%20customise%20what%20employers%20can%20see.`}
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Send via email →
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Psychology note */}
            <div className="mt-5 rounded-xl bg-slate-900 border border-slate-800 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Why this works</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                When professionals receive a message saying a profile already exists for them, they're far more likely to engage. The psychological trigger — "I should take control of what's out there about me" — dramatically increases sign-up conversion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
