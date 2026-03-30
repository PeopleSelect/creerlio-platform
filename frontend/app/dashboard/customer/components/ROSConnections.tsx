'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface ROSConnection {
  id: string
  relationship_type: string
  entry_source: string
  status: string
  connected_at: string
  last_interaction_at: string | null
  disconnected_at: string | null
  business_profiles: {
    id: string
    business_name: string | null
    name: string | null
    industry: string | null
    city: string | null
    state: string | null
    logo_url: string | null
  } | null
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function SourceBadge({ source }: { source: string }) {
  const meta: Record<string, { label: string; color: string }> = {
    qr:          { label: 'QR Scan',   color: 'bg-violet-100 text-violet-700' },
    direct:      { label: 'Direct',    color: 'bg-blue-100 text-blue-700' },
    onboarding:  { label: 'Onboarded', color: 'bg-emerald-100 text-emerald-700' },
    search:      { label: 'Search',    color: 'bg-amber-100 text-amber-700' },
    invite:      { label: 'Invited',   color: 'bg-rose-100 text-rose-700' },
    opportunity: { label: 'Opportunity', color: 'bg-sky-100 text-sky-700' },
  }
  const m = meta[source] || { label: source, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.color}`}>
      {m.label}
    </span>
  )
}

export default function ROSConnections() {
  const [connections, setConnections] = useState<ROSConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token || null)
    })
  }, [])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/ros/connections?view=outgoing&status=active', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setConnections(json.connections || [])
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { if (token) load() }, [token, load])

  async function disconnect(id: string, bizName: string) {
    if (!token) return
    if (!confirm(`Remove your connection with ${bizName}? You can reconnect any time.`)) return
    setDisconnecting(id)
    try {
      await fetch('/api/ros/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ connection_id: id }),
      })
      setConnections(prev => prev.filter(c => c.id !== id))
    } finally {
      setDisconnecting(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (connections.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="text-4xl mb-4">🔗</div>
        <h3 className="font-bold text-gray-900 mb-1">No connections yet</h3>
        <p className="text-gray-500 text-sm">Scan a business QR code or browse businesses to start connecting.</p>
        <Link href="/search" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline">
          Find businesses →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {connections.map(conn => {
        const biz = conn.business_profiles
        const bizName = biz?.business_name || biz?.name || 'Business'
        const initials = bizName.slice(0, 2).toUpperCase()

        return (
          <div
            key={conn.id}
            className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {initials}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-tight truncate">{bizName}</p>
                    {biz?.industry && (
                      <p className="text-gray-400 text-xs mt-0.5">{biz.industry}{biz.city ? ` · ${biz.city}` : ''}</p>
                    )}
                  </div>
                  <SourceBadge source={conn.entry_source} />
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">
                    Connected {timeAgo(conn.connected_at)}
                  </span>
                  {conn.last_interaction_at && conn.last_interaction_at !== conn.connected_at && (
                    <span className="text-xs text-gray-400">
                      · Active {timeAgo(conn.last_interaction_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
              <Link
                href={`/dashboard/customer/messages?business_id=${biz?.id}`}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-center text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                Message
              </Link>
              <button
                type="button"
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-center text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                Request Quote
              </button>
              <button
                type="button"
                onClick={() => disconnect(conn.id, bizName)}
                disabled={disconnecting === conn.id}
                className="py-1.5 px-3 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                {disconnecting === conn.id ? '…' : 'Remove'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
