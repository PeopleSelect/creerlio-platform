'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { SharedPortfolioRenderer } from '@/components/profile-sharing/SharedPortfolioRenderer'

export const dynamic = 'force-dynamic'

export default function ShareTokenPage() {
  const params = useParams()
  const token = String((params as any)?.token || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const sessionId =
          typeof window !== 'undefined' ? sessionStorage.getItem('creerlio_session_id') : null
        const res = await fetch(`/api/talent/private/${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: {
            ...(sessionId ? { 'x-creerlio-session-id': sessionId } : {}),
          },
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(json?.error || 'This share link is not available.')
          return
        }
        if (!cancelled) setData(json)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (token) run()
    return () => {
      cancelled = true
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data?.snapshot) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-2xl font-bold">Profile Not Available</div>
          <div className="text-slate-300 mt-2">{error || 'This share link is not available.'}</div>
          <div className="mt-6">
            <Link href="/" className="px-4 py-2 rounded-lg bg-white text-slate-900 font-semibold">
              Go to Creerlio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SharedPortfolioRenderer payload={data.snapshot} mediaUrls={data.media_urls || {}} />
  )
}

