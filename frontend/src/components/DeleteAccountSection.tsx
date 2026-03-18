'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const REASONS = [
  'Found what I was looking for',
  'Not finding relevant opportunities',
  'Too many emails or notifications',
  'Privacy concerns',
  'Technical issues with the platform',
  'Switching to a different platform',
  'Creating a new account',
  'Other',
]

export default function DeleteAccountSection() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canDelete = reason !== '' && confirm === 'DELETE'

  const handleDelete = async () => {
    if (!canDelete) return
    setBusy(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setError('Not signed in.'); return }

      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Delete failed. Please try again.')
        return
      }

      await supabase.auth.signOut()
      router.replace('/?deleted=1')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 mt-8">
      <h3 className="text-lg font-semibold text-red-700 mb-1">Delete Account</h3>
      <p className="text-sm text-red-600 mb-4">
        This permanently deletes your account and all associated data. This cannot be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          Delete my account
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-red-700 mb-2">
              Why are you deleting your account?
            </label>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delete-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-red-600"
                  />
                  <span className="text-sm text-gray-800">{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-red-700 mb-1">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={!canDelete || busy}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Deleting…' : 'Permanently delete account'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setReason(''); setConfirm(''); setError(null) }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
