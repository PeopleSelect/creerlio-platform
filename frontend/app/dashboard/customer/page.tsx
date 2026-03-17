'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Building2, MessageSquare, Bookmark, ClipboardList, User,
  Bell, LogOut, ChevronRight, Loader2, MapPin,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Connection {
  id: string
  status: string
  updated_at: string
  business_profiles: { name: string; industry: string | null; city: string | null }
  business_profile_pages: { slug: string; logo_url: string | null; tagline: string | null } | null
  latest_message: { body: string; sender_type: string; created_at: string } | null
}

export default function CustomerDashboardPage() {
  const router = useRouter()
  const [name, setName]               = useState('')
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading]         = useState(true)
  const [token, setToken]             = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.replace('/login/customer'); return }
      const meta = session.user.user_metadata || {}
      if (meta.registration_type && meta.registration_type !== 'customer') {
        router.replace(`/login/${meta.registration_type}`)
        return
      }
      setName(meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Customer')
      setToken(session.access_token)

      const res = await fetch('/api/customer/connections', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const j = await res.json()
        setConnections(j.connections || [])
      }
      setLoading(false)
    }).catch(() => router.replace('/login/customer'))
  }, [router])

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
    { href: '/dashboard/customer',          icon: <Building2 className="h-5 w-5" />,     label: 'Connections' },
    { href: '/dashboard/customer/messages', icon: <MessageSquare className="h-5 w-5" />,  label: 'Messages' },
    { href: '/dashboard/customer/saved',    icon: <Bookmark className="h-5 w-5" />,       label: 'Saved' },
    { href: '/dashboard/customer/profile',  icon: <User className="h-5 w-5" />,           label: 'Profile' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 flex flex-col z-40">
        <div className="p-5 border-b border-gray-100">
          <Link href="/" className="text-lg font-bold text-gray-900">Creerlio</Link>
          <p className="text-xs text-gray-400 mt-0.5">Customer Portal</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-1">
          <Link href="/businesses"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Building2 className="h-4 w-4" /> Find Businesses
          </Link>
          <button type="button" onClick={signOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="ml-56 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {name}</h1>
            <p className="text-gray-500 mt-1">Manage your business connections and enquiries.</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{connections.length}</p>
              <p className="text-sm text-gray-500 mt-1">Active connections</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-2xl font-bold text-gray-900">
                {connections.filter(c => c.status === 'open').length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Open enquiries</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-2xl font-bold text-gray-900">
                {connections.filter(c => c.status === 'in_progress').length}
              </p>
              <p className="text-sm text-gray-500 mt-1">In progress</p>
            </div>
          </div>

          {/* Recent connections */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Business Connections</h2>
              <Link href="/businesses" className="text-sm text-blue-600 hover:underline">Find more businesses</Link>
            </div>
            {connections.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No connections yet</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">Start by browsing businesses and sending an enquiry.</p>
                <Link href="/businesses"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                  Browse Businesses
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {connections.map(conn => {
                  const biz  = conn.business_profiles
                  const page = conn.business_profile_pages
                  const slug = page?.slug
                  return (
                    <div key={conn.id} className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        {page?.logo_url
                          ? <img src={page.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                          : <Building2 className="h-5 w-5 text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{biz?.name || 'Business'}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          {biz?.industry && <span>{biz.industry}</span>}
                          {biz?.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{biz.city}</span>}
                        </div>
                        {conn.latest_message && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {conn.latest_message.sender_type === 'business' ? 'They replied: ' : 'You: '}
                            {conn.latest_message.body}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                          conn.status === 'open'        ? 'bg-blue-50 text-blue-600' :
                          conn.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>{conn.status.replace('_', ' ')}</span>
                        <Link href={`/dashboard/customer/messages?connection_id=${conn.id}`}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          View <ChevronRight className="h-3 w-3" />
                        </Link>
                        {slug && (
                          <Link href={`/businesses/${slug}`} target="_blank"
                            className="text-xs text-gray-400 hover:text-gray-600">
                            Page
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
