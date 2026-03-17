'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Building2, Loader2, MessageSquare, Send,
  User, Clock, CheckCircle2, AlertCircle, ChevronDown,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Connection {
  id: string
  status: 'open' | 'in_progress' | 'closed'
  created_at: string
  updated_at: string
  customer_profiles: {
    id: string
    name: string
    email: string
    phone: string | null
    company: string | null
    location: string | null
  }
  latest_message: { body: string; sender_type: string; created_at: string } | null
}

interface Message {
  id: string
  sender_type: 'customer' | 'business'
  body: string
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  open:        'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  closed:      'bg-gray-100 text-gray-500 border-gray-200',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open:        <AlertCircle className="h-3.5 w-3.5" />,
  in_progress: <Clock className="h-3.5 w-3.5" />,
  closed:      <CheckCircle2 className="h-3.5 w-3.5" />,
}

export default function BusinessCustomerEnquiriesPage() {
  const router = useRouter()
  const [token, setToken]           = useState<string | null>(null)
  const [connections, setConns]     = useState<Connection[]>([])
  const [active, setActive]         = useState<Connection | null>(null)
  const [messages, setMessages]     = useState<Message[]>([])
  const [reply, setReply]           = useState('')
  const [sending, setSending]       = useState(false)
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setFilter]   = useState<'all' | 'open' | 'in_progress' | 'closed'>('all')
  const [updatingStatus, setUpdSt]  = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.replace('/login/business'); return }
      setToken(session.access_token)

      const res = await fetch('/api/customer/connections', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const j = await res.json()
        setConns(j.connections || [])
        if (j.connections?.length > 0) setActive(j.connections[0])
      }
      setLoading(false)
    }).catch(() => router.replace('/login/business'))
  }, [router])

  useEffect(() => {
    if (!active || !token) return
    fetch(`/api/customer/messages?connection_id=${active.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(j => setMessages(j.messages || []))
  }, [active, token])

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim() || !active || !token) return
    setSending(true)
    const res = await fetch('/api/customer/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ connection_id: active.id, body: reply.trim() }),
    })
    if (res.ok) {
      const j = await res.json()
      setMessages(prev => [...prev, j.message])
      setReply('')
    }
    setSending(false)
  }

  async function updateStatus(status: string) {
    if (!active || !token) return
    setUpdSt(true)
    const res = await fetch('/api/customer/connections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ connection_id: active.id, status }),
    })
    if (res.ok) {
      const updated = { ...active, status: status as any }
      setActive(updated)
      setConns(prev => prev.map(c => c.id === active.id ? updated : c))
    }
    setUpdSt(false)
  }

  const filtered = statusFilter === 'all' ? connections : connections.filter(c => c.status === statusFilter)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-30">
        <Link href="/dashboard/business"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <span className="text-gray-300">|</span>
        <h1 className="font-semibold text-gray-900">Customer Enquiries</h1>
        <span className="ml-2 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          {connections.filter(c => c.status === 'open').length} open
        </span>
      </header>

      <div className="flex flex-1 h-[calc(100vh-57px)]">
        {/* Connection list */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col shrink-0">
          {/* Filter */}
          <div className="p-3 border-b border-gray-100 flex gap-1">
            {(['all', 'open', 'in_progress', 'closed'] as const).map(f => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                {f === 'all' ? 'All' : f.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 && (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No enquiries found.</p>
              </div>
            )}
            {filtered.map(conn => {
              const cp = conn.customer_profiles
              return (
                <button key={conn.id} type="button" onClick={() => setActive(conn)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${active?.id === conn.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{cp?.name}</p>
                        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${STATUS_STYLES[conn.status]}`}>
                          {STATUS_ICONS[conn.status]}
                        </span>
                      </div>
                      {cp?.company && <p className="text-xs text-gray-400">{cp.company}</p>}
                      {conn.latest_message && (
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {conn.latest_message.sender_type === 'business' ? 'You: ' : ''}
                          {conn.latest_message.body}
                        </p>
                      )}
                      <p className="text-xs text-gray-300 mt-1">
                        {new Date(conn.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chat + details */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare className="mx-auto h-10 w-10 mb-2" />
                <p>Select an enquiry to view the conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="border-b border-gray-200 px-6 py-4 flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-gray-900">{active.customer_profiles?.name}</h2>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[active.status]}`}>
                      {STATUS_ICONS[active.status]} {active.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                    <span>{active.customer_profiles?.email}</span>
                    {active.customer_profiles?.phone && <span>{active.customer_profiles.phone}</span>}
                    {active.customer_profiles?.company && <span>{active.customer_profiles.company}</span>}
                    {active.customer_profiles?.location && <span>{active.customer_profiles.location}</span>}
                  </div>
                </div>
                {/* Status selector */}
                <div className="relative shrink-0">
                  <select
                    value={active.status}
                    onChange={e => updateStatus(e.target.value)}
                    disabled={updatingStatus}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-60"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'business' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                      msg.sender_type === 'business'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                      <p className={`text-xs mt-1 ${msg.sender_type === 'business' ? 'text-blue-200' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              {active.status !== 'closed' && (
                <form onSubmit={sendReply} className="border-t border-gray-200 p-4 flex gap-3">
                  <input value={reply} onChange={e => setReply(e.target.value)}
                    placeholder={`Reply to ${active.customer_profiles?.name}...`}
                    className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="submit" disabled={sending || !reply.trim()}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              )}
              {active.status === 'closed' && (
                <div className="border-t border-gray-100 p-4 text-center text-xs text-gray-400">
                  This enquiry is closed.{' '}
                  <button type="button" onClick={() => updateStatus('open')} className="text-blue-600 hover:underline">Reopen</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
