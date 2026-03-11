'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ClaimSuccessContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') || 'there'
  const firstName = name.split(' ')[0]

  const steps = [
    { icon: '📸', label: 'Add a profile photo', href: '/dashboard/talent/edit' },
    { icon: '🏆', label: 'Add your achievements', href: '/dashboard/talent/edit' },
    { icon: '🗂️', label: 'Upload portfolio projects', href: '/dashboard/talent/bank' },
    { icon: '🔒', label: 'Control your privacy settings', href: '/dashboard/talent/share' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full">

        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">Creerlio</span>
          </Link>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          {/* Success hero */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-8 py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome to Creerlio, {firstName}!</h1>
            <p className="text-emerald-100 mt-2 text-sm">Your profile is now yours. Let's make it shine.</p>
          </div>

          <div className="px-8 py-6">
            {/* Profile link teaser */}
            <div className="bg-slate-800 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
              <span className="text-emerald-400">🔗</span>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Your profile link</p>
                <p className="text-sm text-white font-mono">
                  creerlio.com/{name.toLowerCase().replace(/\s+/g, '-')}
                </p>
              </div>
            </div>

            {/* Completion prompts */}
            <p className="text-sm font-semibold text-slate-300 mb-3">Complete your profile to stand out:</p>
            <ul className="space-y-2 mb-6">
              {steps.map((step) => (
                <li key={step.label}>
                  <Link
                    href={step.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors group"
                  >
                    <span className="text-lg">{step.icon}</span>
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{step.label}</span>
                    <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 ml-auto transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Viral share prompt */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-emerald-300 mb-1">Spread your profile</p>
              <p className="text-xs text-slate-400">
                Add your Creerlio link to your LinkedIn, email signature, and CV to be discovered by top employers.
              </p>
            </div>

            {/* Go to dashboard */}
            <Link
              href="/dashboard/talent/edit"
              className="block w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-center transition-colors"
            >
              Go to My Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ClaimSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ClaimSuccessContent />
    </Suspense>
  )
}
