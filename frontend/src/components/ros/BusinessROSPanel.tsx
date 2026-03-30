'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'


interface ROSIncoming {
  id: string
  relationship_type: 'customer' | 'talent' | 'business'
  entry_source: string
  status: string
  connected_at: string
  last_interaction_at: string | null
  campaign: string | null
  initiator_id: string
  profile: { name: string; title?: string; talent_profile_id?: string } | null
}

const TYPE_META = {
  customer: { label: 'Customer',  color: 'bg-blue-50 text-blue-700 border-blue-200',   icon: '🛍️' },
  talent:   { label: 'Talent',    color: 'bg-violet-50 text-violet-700 border-violet-200', icon: '💼' },
  business: { label: 'Business',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '🏢' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

interface Props {
  businessId: string
}

export default function BusinessROSPanel({ businessId }: Props) {
  const [connections, setConnections] = useState<ROSIncoming[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'customer' | 'talent' | 'business'>('all')
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
      const typeParam = filter !== 'all' ? '&type=' + filter : ''
      const url = '/api/ros/connections?view=incoming&business_id=' + businessId + '&status=active' + typeParam
      const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
      if (res.ok) {
        const json = await res.json()
        setConnections(json.connections || [])
      }
    } finally {
      setLoading(false)
    }
  }, [businessId, token, filter])

  useEffect(() => { load() }, [load])

  async function disconnect(id: string, personName: string) {
    if (!token) return
    if (!confirm(`Remove ${personName}'s connection? You can't undo this, but they can reconnect.`)) return
    setDisconnecting(id)
    try {
      await fetch('/api/ros/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ connection_id: id, reason: 'business_removed' }),
      })
      setConnections(prev => prev.filter(c => c.id !== id))
    } finally {
      setDisconnecting(null)
    }
  }

  const counts = {
    all:      connections.length,
    customer: connections.filter(c => c.relationship_type === 'customer').length,
    talent:   connections.filter(c => c.relationship_type === 'talent').length,
    business: connections.filter(c => c.relationship_type === 'business').length,
  }

  const displayed = filter === 'all' ? connections : connections.filter(c => c.relationship_type === filter)

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'customer', 'talent', 'business'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors border
              ${filter === f
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            {f === 'all' ? 'All' : TYPE_META[f].label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
              ${filter === f ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 px-6">
          <div className="text-3xl mb-3">
            {filter === 'customer' ? '🛍️' : filter === 'talent' ? '💼' : filter === 'business' ? '🏢' : '🔗'}
          </div>
          <h3 className="font-bold text-gray-900 mb-1">
            No {filter === 'all' ? '' : filter} connections yet
          </h3>
          <p className="text-gray-500 text-sm">
            {filter === 'customer' ? 'Customers will appear here when they scan your QR code.' :
             filter === 'talent' ? 'Talent will appear here when they connect with your business.' :
             filter === 'business' ? 'Business connections will appear here when partners connect.' :
             'Connections from QR scans, direct links, and onboarding appear here.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {displayed.map(conn => {
            const name = conn.profile?.name || conn.relationship_type.charAt(0).toUpperCase() + conn.relationship_type.slice(1) + ' User'
            const typeMeta = TYPE_META[conn.relationship_type]

            return (
              <div key={conn.id} className="py-3 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                    {conn.profile ? initials(conn.profile.name) : typeMeta.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${typeMeta.color} flex-shrink-0`}>
                        {typeMeta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {conn.profile?.title && (
                        <p className="text-xs text-gray-400 truncate">{conn.profile.title}</p>
                      )}
                      <p className="text-xs text-gray-300">{timeAgo(conn.connected_at)}</p>
                      {conn.entry_source === 'qr' && (
                        <span className="text-[10px] text-gray-300">📲 QR</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions — always visible */}
                <div className="flex items-center gap-1.5 pl-[52px]">
                  <a
                    href={'/dashboard/business/messages?talent_id=' + conn.initiator_id}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    Message
                  </a>
                  {conn.profile?.talent_profile_id ? (
                    <a
                      href={'/dashboard/business/talent/' + conn.profile.talent_profile_id}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      View Profile
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => disconnect(conn.id, name)}
                    disabled={disconnecting === conn.id}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 ml-auto"
                  >
                    {disconnecting === conn.id ? '…' : 'Remove'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
