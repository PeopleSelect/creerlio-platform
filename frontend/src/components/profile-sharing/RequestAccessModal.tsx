'use client'

import { useMemo, useState } from 'react'

export function RequestAccessModal({
  open,
  username,
  onClose,
}: {
  open: boolean
  username: string
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', email: '', reason: '' })

  const disabled = useMemo(() => busy || !form.name.trim() || !form.email.trim(), [busy, form.name, form.email])

  if (!open) return null

  const submit = async () => {
    setBusy(true)
    setError(null)
    setSuccess(false)
    try {
      const sessionId =
        typeof window !== 'undefined' ? sessionStorage.getItem('creerlio_session_id') : null

      const res = await fetch('/api/talent/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'x-creerlio-session-id': sessionId } : {}),
        },
        body: JSON.stringify({
          username,
          name: form.name,
          company: form.company,
          email: form.email,
          reason: form.reason,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to send request.')
        return
      }
      setSuccess(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 text-white shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="font-semibold text-lg">Request Full Profile Access</div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {success ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
              Request sent. The talent will review your request and may share a private link.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-100 text-sm">
              {error}
            </div>
          ) : null}

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-200 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-200 mb-1">Company</label>
              <input
                value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-200 mb-1">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-200 mb-1">Reason (optional)</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              rows={3}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={disabled}
            className="w-full px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-60"
          >
            {busy ? 'Sending…' : 'Request Full Talent Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}

