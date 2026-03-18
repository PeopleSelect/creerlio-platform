'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Building2, Bookmark, CheckCircle2, Loader2, MessageSquare, User, LogOut } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function CustomerProfilePage() {
  const router = useRouter()
  const [token, setToken]       = useState<string | null>(null)
  const [loading, setLoad]      = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSavedOk]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [company, setCompany]   = useState('')
  const [location, setLocation] = useState('')
  const [email, setEmail]       = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.replace('/login/customer'); return }
      const meta = session.user.user_metadata || {}
      if (meta.registration_type && meta.registration_type !== 'customer') {
        router.replace(`/login/${meta.registration_type}`); return
      }
      setToken(session.access_token)
      setEmail(session.user.email || '')

      const res = await fetch('/api/customer/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const j = await res.json()
        const p = j.profile
        if (p) {
          setName(p.name || '')
          setPhone(p.phone || '')
          setCompany(p.company || '')
          setLocation(p.location || '')
        }
      }
      setLoad(false)
    }).catch(() => router.replace('/login/customer'))
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError(null)
    setSavedOk(false)
    const res = await fetch('/api/customer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, phone, company, location }),
    })
    const j = await res.json()
    if (res.ok && j.profile) { setSavedOk(true); setTimeout(() => setSavedOk(false), 3000) }
    else { setError(j.error || 'Save failed — please try again') }
    setSaving(false)
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
                item.href === '/dashboard/customer/profile'
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

      <div className="ml-56 p-8">
        <div className="max-w-xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full name *</label>
                <input required value={name} onChange={e => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input disabled value={email}
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+61 400 000 000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                <input value={company} onChange={e => setCompany(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City, Country" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {saved && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Profile saved
                </div>
              )}

              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
