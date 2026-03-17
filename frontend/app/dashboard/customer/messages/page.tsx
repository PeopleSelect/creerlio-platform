'use client'

import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Building2, Loader2, Send, MessageSquare,
  Bookmark, User, LogOut,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Message {
  id: string
  sender_type: 'customer' | 'business'
  body: string
  created_at: string
}

interface Connection {
  id: string
  status: string
  customer_profiles: { name: string } | null
  business_profiles: { name: string; industry: string | null } | null
  business_profile_pages: { slug: string; logo_url: string | null } | null
}

function MessagesInner() {
  const router     = useRouter()
  const params     = useSearchParams()
  const connId     = params.get('connection_id')

  const [token, setToken]           = useState<string | null>(null)
  const [connections, setConns]     = useState<Connection[]>([])
  const [active, setActive]         = useState<Connection | null>(null)
  const [messages, setMessages]     = useState<Message[]>([])
  const [reply, setReply]           = useState('')
  const [sending, setSending]       = useState(false)
  const [loading, setLoading]       = useState(true)
  const [isCustomer, setIsCustomer] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.replace('/login/customer'); return }
      const meta = session.user.user_metadata || {}
      if (meta.registration_type && meta.registration_type !== 'customer') {
        router.replace(`/login/${meta.registration_type}`)
        return
      }
      setToken(session.access_token)

      const res = await fetch('/api/customer/connections', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const j = await res.json()
        const conns: Connection[] = j.connections || []
        setConns(conns)
        const target = connId ? conns.find(c => c.id === connId) : conns[0]
        if (target) setActive(target)
      }
      setLoading(false)
    }).catch(() => router.replace('/login/customer'))
  }, [router, connId])

  useEffect(() => {
    if (!active || !token) return
    fetch(`/api/customer/messages?connection_id=${active.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(j => {
      setMessages(j.messages || [])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
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
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    setSending(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login/customer')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  const nav = [
    { href: '/dashboard/customer',          icon: <Building2 className="h-5 w-5" />,    label: 'Connections' },
    { href: '/dashboard/customer/messages', icon: <MessageSquare className="h-5 w-5" />, label: 'Messages' },
    { href: '/dashboard/customer/saved',    icon: <Bookmark className="h-5 w-5" />,      label: 'Saved' },
    { href: '/dashboard/customer/profile',  icon: <User className="h-5 w-5" />,          label: 'Profile' },
  ]

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
        {/* Connection list */}
        <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {connections.length === 0 && (
              <p className="p-4 text-sm text-gray-400 text-center">No conversations yet.</p>
            )}
            {connections.map(conn => {
              const biz  = conn.business_profiles
              const page = conn.business_profile_pages
              return (
                <button key={conn.id} type="button"
                  onClick={() => setActive(conn)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${active?.id === conn.id ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      {page?.logo_url
                        ? <img src={page.logo_url} alt="" className="h-9 w-9 rounded-xl object-cover" />
                        : <Building2 className="h-4 w-4 text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{biz?.name || 'Business'}</p>
                      <p className="text-xs text-gray-400 truncate">{biz?.industry || ''}</p>
                    </div>
                  </div>
                </button>
              )
            })}
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
              {/* Chat header */}
              <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{active.business_profiles?.name}</p>
                  <p className="text-xs text-gray-400">{active.business_profiles?.industry}</p>
                </div>
                {active.business_profile_pages?.slug && (
                  <Link href={`/businesses/${active.business_profile_pages.slug}`} target="_blank"
                    className="ml-auto text-xs text-blue-600 hover:underline">
                    View page
                  </Link>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                      msg.sender_type === 'customer'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                      <p className={`text-xs mt-1 ${msg.sender_type === 'customer' ? 'text-blue-200' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply form */}
              <form onSubmit={sendReply} className="border-t border-gray-200 p-4 flex gap-3">
                <input value={reply} onChange={e => setReply(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}><MessagesInner /></Suspense>
}
