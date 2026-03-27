'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  ChevronLeft, Loader2, Users, Zap, QrCode, TrendingUp,
  MessageSquare, Clock, Building2, MapPin, AlertTriangle,
  Flame, RefreshCw, Filter, ArrowUpRight, Send, Star,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type RelStatus = 'prospect' | 'active' | 'in_progress' | 'dormant'

interface PipelineConnection {
  id: string
  status: string
  relationship_status: RelStatus | null
  engagement_score: number | null
  qr_source: string | null
  last_interaction_at: string | null
  updated_at: string
  total_opportunities: number
  open_opportunities: number
  signals: string[]
  latest_message: { body: string; sender_type: string; created_at: string } | null
  customer_profiles: {
    id: string
    name: string | null
    email: string | null
    company: string | null
    location: string | null
  } | null
}

interface Metrics {
  total: number
  active: number
  in_progress: number
  prospect: number
  dormant: number
  qr_sourced: number
  open_opps: number
  high_intent: number
}

const SIGNAL_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  high_intent:      { label: 'High Intent',      color: 'bg-red-50 text-red-700 border-red-200',       icon: Flame },
  engaged:          { label: 'Engaged',           color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Zap },
  qr_connected:     { label: 'QR Connected',      color: 'bg-blue-50 text-blue-700 border-blue-200',    icon: QrCode },
  recently_active:  { label: 'Recently Active',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: RefreshCw },
  open_opportunity: { label: 'Open Opportunity',  color: 'bg-violet-50 text-violet-700 border-violet-200', icon: Send },
  re_engaging:      { label: 'Re-engaging',       color: 'bg-sky-50 text-sky-700 border-sky-200',       icon: RefreshCw },
}

const RS_META: Record<RelStatus, { label: string; color: string }> = {
  prospect:    { label: 'Prospect',    color: 'bg-sky-50 text-sky-700' },
  active:      { label: 'Active',      color: 'bg-emerald-50 text-emerald-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-50 text-amber-700' },
  dormant:     { label: 'Dormant',     color: 'bg-gray-100 text-gray-500' },
}

function EngagementBar({ score }: { score: number | null }) {
  const s = score ?? 0
  const color = s >= 70 ? 'bg-red-500' : s >= 40 ? 'bg-amber-400' : s >= 15 ? 'bg-blue-400' : 'bg-gray-200'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(s, 100)}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right">{s}</span>
    </div>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)   return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function BusinessPipelinePage() {
  const router = useRouter()

  const [loading, setLoading]       = useState(true)
  const [connections, setConns]     = useState<PipelineConnection[]>([])
  const [metrics, setMetrics]       = useState<Metrics | null>(null)
  const [filter, setFilter]         = useState<RelStatus | 'all'>('all')
  const [signalFilter, setSignal]   = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.replace('/login/business'); return }
      const meta = session.user.user_metadata || {}
      if (meta.registration_type !== 'business') {
        router.replace(`/login/${meta.registration_type || 'business'}`); return
      }

      const res = await fetch('/api/business/pipeline', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const j = await res.json()
        setConns(j.connections || [])
        setMetrics(j.metrics || null)
      }
      setLoading(false)
    }).catch(() => router.replace('/login/business'))
  }, [router])

  const filtered = connections.filter(c => {
    const rsMatch = filter === 'all' || (c.relationship_status || 'prospect') === filter
    const sigMatch = !signalFilter || c.signals.includes(signalFilter)
    return rsMatch && sigMatch
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">

        <Link href="/dashboard/business"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Customer Pipeline</h1>
          <p className="text-gray-500 text-sm mt-0.5">Commercial intelligence view — every relationship ranked by engagement, intent, and opportunity.</p>
        </div>

        {/* Metrics strip */}
        {metrics && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Connections', value: metrics.total,      icon: Users,       bg: 'bg-blue-50',    color: 'text-blue-600' },
              { label: 'High Intent',       value: metrics.high_intent, icon: Flame,       bg: 'bg-red-50',     color: 'text-red-600' },
              { label: 'Open Opportunities',value: metrics.open_opps,  icon: Send,        bg: 'bg-violet-50',  color: 'text-violet-600' },
              { label: 'Via QR',            value: metrics.qr_sourced, icon: QrCode,      bg: 'bg-amber-50',   color: 'text-amber-600' },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className={`h-9 w-9 rounded-lg ${m.bg} flex items-center justify-center mb-3`}>
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{m.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Filter className="h-3.5 w-3.5" /> Status:
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium bg-white shadow-sm">
            {(['all','prospect','active','in_progress','dormant'] as const).map(f => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`px-3 py-1.5 transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-2">
            <Zap className="h-3.5 w-3.5" /> Signal:
          </div>
          {['high_intent','qr_connected','open_opportunity','recently_active'].map(sig => {
            const m = SIGNAL_META[sig]
            const active = signalFilter === sig
            return (
              <button key={sig} type="button"
                onClick={() => setSignal(active ? null : sig)}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${active ? m.color + ' ring-1 ring-current' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                <m.icon className="h-3 w-3" /> {m.label}
              </button>
            )
          })}
        </div>

        {/* Pipeline list */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No connections match this filter</p>
              <p className="text-sm text-gray-400 mt-1">Share your QR code to start building your pipeline.</p>
              <Link href="/dashboard/business/qr"
                className="inline-flex items-center gap-2 mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                <QrCode className="h-4 w-4" /> Get your QR code
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(conn => {
                const cp = conn.customer_profiles
                const rs = (conn.relationship_status || 'prospect') as RelStatus
                const rsMeta = RS_META[rs]
                const lastActivity = conn.last_interaction_at || conn.updated_at
                const displayName = cp?.name || cp?.email?.split('@')[0] || 'Unknown'

                return (
                  <div key={conn.id} className="px-6 py-5 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 text-sm font-bold text-white">
                        {displayName.charAt(0).toUpperCase()}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-gray-900 text-sm">{displayName}</p>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${rsMeta.color}`}>
                            {rsMeta.label}
                          </span>
                          {conn.signals.slice(0, 3).map(sig => {
                            const sm = SIGNAL_META[sig]
                            if (!sm) return null
                            const Icon = sm.icon
                            return (
                              <span key={sig} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${sm.color}`}>
                                <Icon className="h-2.5 w-2.5" /> {sm.label}
                              </span>
                            )
                          })}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                          {cp?.company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{cp.company}</span>}
                          {cp?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{cp.location}</span>}
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(lastActivity)}</span>
                          {conn.open_opportunities > 0 && (
                            <span className="flex items-center gap-1 text-violet-600 font-medium">
                              <Send className="h-3 w-3" />{conn.open_opportunities} open opp{conn.open_opportunities !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Engagement bar */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-20 shrink-0">Engagement</span>
                          <div className="flex-1 max-w-xs">
                            <EngagementBar score={conn.engagement_score} />
                          </div>
                        </div>

                        {/* Latest message */}
                        {conn.latest_message && (
                          <p className="text-xs text-gray-400 mt-1.5 truncate">
                            <span className="font-medium">{conn.latest_message.sender_type === 'customer' ? displayName : 'You'}:</span>{' '}
                            {conn.latest_message.body}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/dashboard/business?tab=connections`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                          <MessageSquare className="h-3.5 w-3.5" /> Message
                        </Link>
                        <Link href={`/dashboard/business?connection=${conn.id}`}
                          className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {filtered.length} connection{filtered.length !== 1 ? 's' : ''} · sorted by engagement
              </p>
              <Link href="/dashboard/business/qr"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                <QrCode className="h-3 w-3" /> Get QR code to grow pipeline
              </Link>
            </div>
          )}
        </div>

        {/* Intelligence callout */}
        <div className="mt-6 bg-gradient-to-r from-blue-950 to-indigo-900 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Intelligence Layer — Coming in Phase 2</p>
              </div>
              <p className="font-semibold text-white">Predictive intent scoring &amp; competitive signals</p>
              <p className="text-sm text-blue-200 mt-1">AI-powered purchase likelihood, competitor activity alerts, and high-value opportunity detection — automatically surfaced from your engagement data.</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
          </div>
        </div>

      </div>
    </div>
  )
}
