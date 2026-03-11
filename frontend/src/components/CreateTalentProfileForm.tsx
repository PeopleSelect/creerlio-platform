'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface CreateTalentProfileFormProps {
  onSuccess?: (claimUrl: string, name: string, email: string) => void
}

export default function CreateTalentProfileForm({ onSuccess }: CreateTalentProfileFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [headline, setHeadline] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ claimUrl: string; name: string; email: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('You must be logged in to create a talent profile.')
        return
      }

      const res = await fetch('/api/talent/create-placeholder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          headline: headline.trim() || undefined,
          skills: skillsInput,
          linkedin_url: linkedinUrl.trim() || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to create profile.')
        return
      }

      const claimUrl = json.claim_url
      setResult({ claimUrl, name: json.name, email: json.email })
      onSuccess?.(claimUrl, json.name, json.email)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    if (!result?.claimUrl) return
    await navigator.clipboard.writeText(result.claimUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setName('')
    setEmail('')
    setHeadline('')
    setSkillsInput('')
    setLinkedinUrl('')
    setResult(null)
    setError(null)
  }

  // ── Success state ──
  if (result) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-white">Profile created for {result.name}</p>
            <p className="text-sm text-slate-400">{result.email}</p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-3">Share this claim link with the candidate:</p>

        <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-4 py-3 mb-5">
          <span className="text-sm text-slate-300 truncate flex-1 font-mono">{result.claimUrl}</span>
          <button
            onClick={copyLink}
            className="shrink-0 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors"
          >
            Create another
          </button>
          <a
            href={`mailto:${result.email}?subject=Your%20Creerlio%20talent%20profile&body=Hi%20${encodeURIComponent(result.name)}%2C%0A%0AA%20professional%20talent%20profile%20has%20been%20created%20for%20you%20on%20Creerlio.%0A%0AClaim%20it%20here%3A%20${encodeURIComponent(result.claimUrl)}%0A%0ATake%20control%20of%20your%20professional%20identity%20and%20customise%20what%20employers%20can%20see.%0A%0ACreerlio%20Team`}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm text-center transition-colors"
          >
            Email candidate
          </a>
        </div>
      </div>
    )
  }

  // ── Form ──
  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Full name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            required
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Email address <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            required
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Headline */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Headline <span className="text-slate-500 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Senior Full Stack Developer"
          className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Skills <span className="text-slate-500 text-xs">(comma-separated, optional)</span>
        </label>
        <input
          type="text"
          value={skillsInput}
          onChange={(e) => setSkillsInput(e.target.value)}
          placeholder="React, TypeScript, Node.js, AWS"
          className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* LinkedIn URL */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          LinkedIn URL <span className="text-slate-500 text-xs">(optional)</span>
        </label>
        <input
          type="url"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="https://linkedin.com/in/janesmith"
          className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Creating profile…
          </span>
        ) : (
          'Create Talent Profile'
        )}
      </button>
    </form>
  )
}
