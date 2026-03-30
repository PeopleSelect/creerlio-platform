'use client'

import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Building2, Loader2, Send, MessageSquare,
  Bookmark, User, LogOut,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Message {
  id: string
  sender_type: 'customer' | 'business' | 'talent'
  body: string
  created_at: string
}

// A unified conversation entry — either from old customer_connections or from ros_connections
interface ConvEntry {
  id: string        // ros_connection.id or customer_connection.id
  source: 'ros' | 'legacy'
  businessId: string
  businessName: string
  industry: string | null
  logoUrl: string | null
  slug: string | null
  // For /api/messages calls (ROS)
  userId?: string   // the customer's own auth UUID (talent_id slot)
}

function MessagesInner() {
  const router  = useRouter()
  const params  = useSearchParams()
  const bizIdParam = params.get('business_id') // from ROS Message button

  const [token, setToken]     = useState<string | null>(null)
  const [userId, setUserId]   = useState<string | null>(null)
  const [convs, setConvs]     = useState<ConvEntry[]>([])
  const [active, setActive]   = useState<ConvEntry | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply]     = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.replace('/login/customer'); return }
      const meta = session.user.user_metadata || {}
      if (meta.registration_type && meta.registration_type !== 'customer') {
        router.replace('/login/' + meta.registration_type); return
      }
      const tok = session.access_token
      const uid = session.user.id
      setToken(tok)
      setUserId(uid)

      const entries: ConvEntry[] = []

      // 1. ROS connections (business-id keyed, use /api/messages)
      const rosRes = await fetch('/api/ros/connections?view=outgoing&status=active', {
        headers: { Authorization: 'Bearer ' + tok },
      })
      if (rosRes.ok) {
        const rosJson = await rosRes.json()
        for (const rc of (rosJson.connections || [])) {
          const biz = rc.business_profiles
          entries.push({
            id: rc.id,
            source: 'ros',
            businessId: rc.business_id,
            businessName: biz?.business_name || biz?.name || 'Business',
            industry: biz?.industry || null,
            logoUrl: null,
            slug: null,
            userId: uid,
          })
        }
      }

      // 2. Legacy customer_connections
      const legacyRes = await fetch('/api/customer/connections', {
        headers: { Authorization: 'Bearer ' + tok },
      })
      if (legacyRes.ok) {
        const legacyJson = await legacyRes.json()
        for (const conn of (legacyJson.connections || [])) {
          const biz  = conn.business_profiles
          const page = conn.business_profile_pages
          // Don't duplicate if business already added via ROS
          if (entries.some(e => e.businessId === biz?.id)) continue
          entries.push({
            id: conn.id,
            source: 'legacy',
            businessId: biz?.id || '',
            businessName: biz?.name || biz?.business_name || 'Business',
            industry: biz?.industry || null,
            logoUrl: page?.logo_url || null,
            slug: page?.slug || null,
          })
        }
      }

      setConvs(entries)

      // Auto-select by business_id param or first entry
      const target = bizIdParam
        ? entries.find(e => e.businessId === bizIdParam) ?? entries[0]
        : entries[0]
      if (target) setActive(target)

      setLoading(false)
    }).catch(() => router.replace('/login/customer'))
  }, [router, bizIdParam])

  useEffect(() => {
    if (!active || !token || !userId) return
    loadMessages(active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, token, userId])

  // Poll every 5s
  useEffect(() => {
    if (!active || !token || !userId) return
    const interval = setInterval(() => loadMessages(active, true), 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, token, userId])

  async function loadMessages(entry: ConvEntry, silent = false) {
    if (!token || !userId) return
    if (entry.source === 'ros') {
      const url = '/api/messages?talent_id=' + encodeURIComponent(userId) + '&business_id=' + encodeURIComponent(entry.businessId)
      const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
      if (res.ok) {
        const j = await res.json()
        setMessages(j.messages || [])
        if (!silent) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } else {
      const res = await fetch('/api/customer/messages?connection_id=' + entry.id, {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (res.ok) {
        const j = await res.json()
        setMessages(j.messages || [])
        if (!silent) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim() || !active || !token || !userId) return
    setSending(true)
    try {
      if (active.source === 'ros') {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({
            talent_id: userId,
            business_id: active.businessId,
            sender_type: 'customer',
            body: reply.trim(),
          }),
        })
        if (res.ok) {
          const j = await res.json()
          setMessages(prev => [...prev, j.message])
          setReply('')
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        }
      } else {
        const res = await fetch('/api/customer/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ connection_id: active.id, body: reply.trim() }),
        })
        if (res.ok) {
          const j = await res.json()
          setMessages(prev => [...prev, j.message])
          setReply('')
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        }
      }
    } finally {
      setSending(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login/customer')
  }

  const nav = [
    { href: '/dashboard/customer',          icon: <Building2 className="h-5 w-5" />,    label: 'Connections' },
    { href: '/dashboard/customer/messages', icon: <MessageSquare className="h-5 w-5" />, label: 'Messages' },
    { href: '/dashboard/customer/saved',    icon: <Bookmark className="h-5 w-5" />,      label: 'Saved' },
    { href: '/dashboard/customer/profile',  icon: <User className="h-5 w-5" />,          label: 'Profile' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 flex flex-col z-40">
        <div className="p-5 border-b border-gray-100">
          <Link href="/" className="text-lg font-bold text-gray-900">Creerlio</Link>
          <p className="text-xs text-gray-400 mt-0.5">Customer Portal</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                item.href === '/dashboard/customer/messages'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
              }`}>
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button type="button" onClick={signOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Messages panel */}
      <div className="ml-56 flex flex-1 h-screen">
        {/* Conversation list */}
        <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {convs.length === 0 && (
              <p className="p-4 text-sm text-gray-400 text-center">No conversations yet.</p>
            )}
            {convs.map(entry => (
              <button key={entry.id} type="button"
                onClick={() => setActive(entry)}
                className={'w-full text-left p-4 hover:bg-gray-50 transition-colors ' + (active?.id === entry.id ? 'bg-blue-50' : '')}>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    {entry.logoUrl
                      ? <img src={entry.logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
                      : <Building2 className="h-4 w-4 text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{entry.businessName}</p>
                    <p className="text-xs text-gray-400 truncate">{entry.industry || ''}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-white">
          {!active ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <MessageSquare className="mx-auto h-10 w-10 mb-2" />
                <p>Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{active.businessName}</p>
                  {active.industry && <p className="text-xs text-gray-400">{active.industry}</p>}
                </div>
                {active.slug && (
                  <Link href={'/businesses/' + active.slug} target="_blank"
                    className="ml-auto text-xs text-blue-600 hover:underline">
                    View page
                  </Link>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <p className="text-center text-gray-400 text-sm mt-8">No messages yet — say hello!</p>
                )}
                {messages.map(msg => {
                  const isMe = msg.sender_type === 'customer'
                  return (
                    <div key={msg.id} className={'flex ' + (isMe ? 'justify-end' : 'justify-start')}>
                      <div className={'max-w-[70%] rounded-2xl px-4 py-3 text-sm ' + (
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      )}>
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                        <p className={'text-xs mt-1 ' + (isMe ? 'text-blue-200' : 'text-gray-400')}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={sendReply} className="border-t border-gray-200 p-4 flex gap-3">
                <input value={reply} onChange={e => setReply(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" disabled={sending || !reply.trim()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CustomerMessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
      <MessagesInner />
    </Suspense>
  )
}
