'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { SnapshotResult } from './AnonymousCandidateCard'

interface RequestAccessModalProps {
  snapshot: SnapshotResult
  onClose: () => void
}

export default function RequestAccessModal({ snapshot, onClose }: RequestAccessModalProps) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Pre-fill from Supabase session if logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch('/api/snapshots/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          snapshot_id: snapshot.id,
          requester_name: name.trim(),
          requester_company: company.trim() || null,
          requester_email: email.trim(),
          reason: reason.trim() || null,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to send request.')
        return
      }

      setDone(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <p className="font-semibold text-white">Request Full Profile</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{snapshot.anon_id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>

        {done ? (
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-white mb-2">Request sent</h3>
            <p className="text-sm text-slate-400 mb-6">
              The candidate has been notified and will review your request. You'll hear back if they approve.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <p className="text-xs text-slate-400">
              The candidate will see your name and company. Their identity remains anonymous until they approve.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Your name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Johnson"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email <span className="text-red-400">*</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Why are you reaching out?</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="We have a senior role that matches your background…"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending…
                </span>
              ) : (
                'Send Request'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
