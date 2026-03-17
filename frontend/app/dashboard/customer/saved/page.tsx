'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Building2, Bookmark, BookmarkX, Loader2, MapPin, MessageSquare, User, LogOut } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Saved {
  id: string
  business_id: string
  created_at: string
  business_profiles: { id: string; name: string; industry: string | null; city: string | null; state: string | null }
}

export default function CustomerSavedPage() {
  const router = useRouter()
  const [saved, setSaved]   = useState<Saved[]>([])
  const [loading, setLoad]  = useState(true)
  const [token, setToken]   = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.replace('/login/customer'); return }
      const meta = session.user.user_metadata || {}
      if (meta.registration_type && meta.registration_type !== 'customer') {
        router.replace(`/login/${meta.registration_type}`); return
      }
      setToken(session.access_token)
      const res = await fetch('/api/customer/saved', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) { const j = await res.json(); setSaved(j.saved || []) }
      setLoad(false)
    }).catch(() => router.replace('/login/customer'))
  }, [router])

  async function unsave(businessId: string) {
    if (!token) return
    await fetch(`/api/customer/saved?business_id=${businessId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setSaved(prev => prev.filter(s => s.business_id !== businessId))
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
    <div className="min-h-screen bg-gray-50">
      <div className="fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 flex flex-col z-40">
        <div className="p-5 border-b border-gray-100">
          <Link href="/" className="text-lg font-bold text-gray-900">Creerlio</Link>
          <p className="text-xs text-gray-400 mt-0.5">Customer Portal</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                item.href === '/dashboard/customer/saved'
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

      <div className="ml-56 p-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Saved Businesses</h1>

        {saved.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <Bookmark className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No saved businesses</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Bookmark businesses you're interested in to find them easily.</p>
            <Link href="/businesses"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              Browse Businesses
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {saved.map(item => {
              const biz = item.business_profiles
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{biz?.name}</p>
                      {biz?.industry && <p className="text-xs text-gray-500">{biz.industry}</p>}
                      {(biz?.city || biz?.state) && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />{[biz.city, biz.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <Link href={`/businesses/${biz?.id}`}
                      className="flex-1 text-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      View Page
                    </Link>
                    <button type="button" onClick={() => unsave(item.business_id)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors">
                      <BookmarkX className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
