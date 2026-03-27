'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Building2, MessageSquare, Bookmark, User, LogOut,
  ChevronRight, Loader2, MapPin, Briefcase, ArrowRight,
  Sparkles, Search, Send, Bell, Network, TrendingUp,
  Clock, Tag, Filter, MoreHorizontal, CheckCircle2,
  Eye, Zap,
} from 'lucide-react'
import OpportunityModal from './components/OpportunityModal'

export const dynamic = 'force-dynamic'

// ── Types ──────────────────────────────────────────────────────────────────

type RelStatus = 'prospect' | 'active' | 'in_progress' | 'dormant'

interface BizProfile {
  id: string
  name: string | null
  business_name: string | null
  industry: string | null
  city: string | null
  state: string | null
  country: string | null
}

interface Connection {
  id: string
  status: string
  relationship_status: RelStatus | null
  tags: string[] | null
  last_interaction_at: string | null
  updated_at: string
  business_profiles: BizProfile | null
  business_profile_pages: { slug: string; logo_url: string | null } | null
  latest_message: { body: string; sender_type: string; created_at: string } | null
}

interface Opportunity {
  id: string
  type: 'rfq' | 'job' | 'partnership' | 'enquiry'
  title: string
  status: string
  created_at: string
  opportunity_recipients: {
    id: string
    business_id: string
    status: string
    business_profiles: BizProfile | null
  }[]
}

// ── Constants ──────────────────────────────────────────────────────────────

const REL_STATUS_META: Record<RelStatus, { label: string; color: string }> = {
  prospect:    { label: 'Prospect',    color: 'bg-sky-50 text-sky-700 border-sky-200' },
  active:      { label: 'Active',      color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  in_progress: { label: 'In Progress', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  dormant:     { label: 'Dormant',     color: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const OPP_TYPE_META = {
  rfq:         { label: 'RFQ',         color: 'bg-blue-50 text-blue-700' },
  job:         { label: 'Job',         color: 'bg-violet-50 text-violet-700' },
  partnership: { label: 'Partnership', color: 'bg-emerald-50 text-emerald-700' },
  enquiry:     { label: 'Enquiry',     color: 'bg-amber-50 text-amber-700' },
}

const OPP_STATUS_META: Record<string, string> = {
  sent:      'bg-blue-50 text-blue-600',
  viewed:    'bg-purple-50 text-purple-600',
  responded: 'bg-emerald-50 text-emerald-700',
  closed:    'bg-gray-100 text-gray-500',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)   return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)    return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

// ── Component ──────────────────────────────────────────────────────────────

export default function NetworkDashboard() {
  const router = useRouter()

  const [name, setName]                   = useState('')
  const [token, setToken]                 = useState<string | null>(null)
  const [loading, setLoading]             = useState(true)
  const [alsoTalent, setAlsoTalent]       = useState(false)
  const [connections, setConnections]     = useState<Connection[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [filter, setFilter]               = useState<RelStatus | 'all'>('all')
  const [showModal, setShowModal]         = useState(false)
  const [sentBanner, setSentBanner]       = useState(false)

  const loadData = useCallback(async (tok: string) => {
    const [connRes, oppRes] = await Promise.all([
      fetch('/api/customer/connections',  { headers: { Authorization: `Bearer ${tok}` } }),
      fetch('/api/customer/opportunities', { headers: { Authorization: `Bearer ${tok}` } }),
    ])
    if (connRes.ok) {
      const j = await connRes.json()
      setConnections(j.connections || [])
    }
    if (oppRes.ok) {
      const j = await oppRes.json()
      setOpportunities(j.opportunities || [])
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.replace('/login/customer'); return }
      const meta = session.user.user_metadata || {}
      if (meta.registration_type && meta.registration_type !== 'customer') {
        router.replace(`/login/${meta.registration_type}`); return
      }
      setName(meta.full_name || meta.name || session.user.email?.split('@')[0] || 'there')
      setToken(session.access_token)
      setAlsoTalent(!!meta.also_talent)
      await loadData(session.access_token)
      setLoading(false)
    }).catch(() => router.replace('/login/customer'))
  }, [router, loadData])

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login/customer')
  }

  function handleSent() {
    setShowModal(false)
    setSentBanner(true)
    if (token) loadData(token)
    setTimeout(() => setSentBanner(false), 4000)
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = filter === 'all'
    ? connections
    : connections.filter(c => (c.relationship_status || 'prospect') === filter)

  const openOpps    = opportunities.filter(o => o.status === 'sent' || o.status === 'viewed')
  const activeConns = connections.filter(c => (c.relationship_status || 'prospect') === 'active').length
  const inProgress  = connections.filter(c => (c.relationship_status || 'prospect') === 'in_progress').length

  const nav = [
    { href: '/dashboard/customer',          icon: Network,       label: 'Network' },
    { href: '/dashboard/customer/messages', icon: MessageSquare, label: 'Messages' },
    { href: '/dashboard/customer/saved',    icon: Bookmark,      label: 'Saved' },
    { href: '/dashboard/customer/profile',  icon: User,          label: 'Profile' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-200 flex flex-col z-40">
        <div className="p-5 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Creerlio</p>
              <p className="text-xs text-blue-600 font-semibold leading-tight">Network</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-0.5">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-0.5">
          <Link href="/businesses"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Search className="h-4 w-4" /> Discover Businesses
          </Link>
          {alsoTalent && (
            <Link href="/dashboard/talent"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors">
              <Briefcase className="h-4 w-4" /> Talent Dashboard
            </Link>
          )}
          <button type="button" onClick={signOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="ml-60 flex-1 p-8 min-w-0">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Creerlio Network</p>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage your business relationships, connections, and opportunities.</p>
            </div>
            <div className="flex items-center gap-3">
              {alsoTalent && (
                <Link href="/dashboard/talent"
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors">
                  <Briefcase className="h-4 w-4" /> Talent Mode
                </Link>
              )}
              <button type="button" className="h-9 w-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors relative">
                <Bell className="h-4 w-4" />
                {openOpps.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {openOpps.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Sent banner */}
          {sentBanner && (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium text-emerald-800">Opportunity sent successfully.</p>
            </div>
          )}

          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Connections',       value: connections.length, icon: Network,     color: 'text-blue-600',   bg: 'bg-blue-50' },
              { label: 'Active',            value: activeConns,        icon: Zap,         color: 'text-emerald-600',bg: 'bg-emerald-50' },
              { label: 'Open Opportunities',value: openOpps.length,   icon: Send,        color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'In Progress',       value: inProgress,         icon: TrendingUp,  color: 'text-amber-600',  bg: 'bg-amber-50' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className={`h-9 w-9 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-4">
            <Link href="/businesses"
              className="group bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                <Search className="h-5 w-5 text-blue-600" />
              </div>
              <p className="font-semibold text-gray-900 text-sm">Discover Businesses</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">Browse and connect with businesses in your industry</p>
            </Link>

            <button type="button" onClick={() => setShowModal(true)}
              className="group bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-violet-300 hover:shadow-md transition-all text-left">
              <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center mb-3 group-hover:bg-violet-100 transition-colors">
                <Send className="h-5 w-5 text-violet-600" />
              </div>
              <p className="font-semibold text-gray-900 text-sm">Send Opportunity</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">RFQ, job, partnership, or general enquiry</p>
            </button>

            <Link href="/dashboard/customer/saved"
              className="group bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-amber-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
                <Bookmark className="h-5 w-5 text-amber-500" />
              </div>
              <p className="font-semibold text-gray-900 text-sm">Saved Businesses</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">Businesses you've bookmarked for later</p>
            </Link>
          </div>

          {/* Connections — Relationship Intelligence */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">Your Network</h2>
                <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{connections.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-gray-400" />
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                  {(['all', 'prospect', 'active', 'in_progress', 'dormant'] as const).map(f => (
                    <button key={f} type="button" onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                      {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">
                  {filter === 'all' ? 'No connections yet' : `No ${filter.replace('_', ' ')} connections`}
                </p>
                <p className="text-sm text-gray-400 mt-1 mb-5">
                  {filter === 'all' ? 'Start by discovering businesses and sending an enquiry.' : 'Try a different filter.'}
                </p>
                {filter === 'all' && (
                  <Link href="/businesses"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                    Discover Businesses
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map(conn => {
                  const biz  = conn.business_profiles
                  const page = conn.business_profile_pages
                  const rs   = (conn.relationship_status || 'prospect') as RelStatus
                  const rsMeta = REL_STATUS_META[rs]
                  const bizName = biz?.name || biz?.business_name || 'Business'
                  const lastActivity = conn.last_interaction_at || conn.updated_at

                  return (
                    <div key={conn.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-sm font-bold text-blue-600">
                        {page?.logo_url
                          ? <img src={page.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                          : bizName.charAt(0).toUpperCase()}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm truncate">{bizName}</p>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${rsMeta.color}`}>
                            {rsMeta.label}
                          </span>
                          {conn.tags && conn.tags.length > 0 && conn.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              <Tag className="h-2.5 w-2.5" /> {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          {biz?.industry && <span>{biz.industry}</span>}
                          {biz?.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{biz.city}</span>}
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(lastActivity)}</span>
                        </div>
                        {conn.latest_message && (
                          <p className="text-xs text-gray-400 mt-1.5 truncate">
                            <span className="font-medium">{conn.latest_message.sender_type === 'business' ? bizName : 'You'}:</span>{' '}
                            {conn.latest_message.body}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/dashboard/customer/messages?connection_id=${conn.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                          <MessageSquare className="h-3.5 w-3.5" /> Message
                        </Link>
                        <button type="button" onClick={() => setShowModal(true)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                          <Send className="h-3.5 w-3.5" /> Opportunity
                        </button>
                        {page?.slug && (
                          <Link href={`/businesses/${page.slug}`}
                            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {connections.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">Showing {filtered.length} of {connections.length} connections</p>
                <Link href="/businesses" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Discover more <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Sent Opportunities */}
          {opportunities.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">Sent Opportunities</h2>
                  <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{opportunities.length}</span>
                </div>
                <button type="button" onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
                  <Send className="h-3 w-3" /> New
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {opportunities.slice(0, 5).map(opp => {
                  const tm = OPP_TYPE_META[opp.type]
                  const sm = OPP_STATUS_META[opp.status] || OPP_STATUS_META.sent
                  const recipientNames = opp.opportunity_recipients
                    .map(r => r.business_profiles?.name || r.business_profiles?.business_name)
                    .filter(Boolean)
                    .join(', ')
                  return (
                    <div key={opp.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tm.color}`}>
                            {tm.label}
                          </span>
                          <p className="text-sm font-medium text-gray-900 truncate">{opp.title}</p>
                        </div>
                        {recipientNames && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">To: {recipientNames}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${sm}`}>
                          {opp.status.charAt(0).toUpperCase() + opp.status.slice(1)}
                        </span>
                        <span className="text-xs text-gray-400">{timeAgo(opp.created_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Talent crossover */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  {alsoTalent ? (
                    <>
                      <p className="font-semibold text-gray-900">You also have a Talent Profile</p>
                      <p className="text-sm text-gray-500 mt-0.5">Switch to Talent Mode to manage your career, showcase your skills, and explore job matches.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-900">Unlock Career Opportunities</p>
                      <p className="text-sm text-gray-500 mt-0.5">Activate a Talent profile to explore jobs and showcase your skills alongside your trade account.</p>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {alsoTalent ? (
                  <Link href="/dashboard/talent"
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors whitespace-nowrap">
                    Talent Dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <TalentUpgradeButton token={token} onActivated={() => setAlsoTalent(true)} />
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Opportunity Modal */}
      {showModal && token && (
        <OpportunityModal
          connections={connections}
          token={token}
          onClose={() => setShowModal(false)}
          onSent={handleSent}
        />
      )}
    </div>
  )
}

// ── Inline sub-component ──────────────────────────────────────────────────

function TalentUpgradeButton({ token, onActivated }: { token: string | null; onActivated: () => void }) {
  const [busy, setBusy] = useState(false)

  async function activate() {
    if (!token || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/customer/become-talent', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        await supabase.auth.refreshSession()
        onActivated()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" onClick={activate} disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors whitespace-nowrap">
      {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Activating…</> : <><Sparkles className="h-4 w-4" /> Become a Talent</>}
    </button>
  )
}
