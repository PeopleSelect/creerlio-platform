'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Building2, Bookmark, CheckCircle2, Loader2, MessageSquare,
  User, LogOut, MapPin, Phone, Mail, Briefcase, Pencil, X,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function CustomerProfilePage() {
  const router = useRouter()
  const [token, setToken]       = useState<string | null>(null)
  const [loading, setLoad]      = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSavedOk]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [editing, setEditing]   = useState(false)
  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [company, setCompany]   = useState('')
  const [location, setLocation] = useState('')
  const [email, setEmail]       = useState('')

  // Draft state for the edit form
  const [draftName, setDraftName]         = useState('')
  const [draftPhone, setDraftPhone]       = useState('')
  const [draftCompany, setDraftCompany]   = useState('')
  const [draftLocation, setDraftLocation] = useState('')

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

  function openEdit() {
    setDraftName(name)
    setDraftPhone(phone)
    setDraftCompany(company)
    setDraftLocation(location)
    setError(null)
    setSavedOk(false)
    setEditing(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/customer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: draftName, phone: draftPhone, company: draftCompany, location: draftLocation }),
    })
    const j = await res.json()
    if (res.ok && j.profile) {
      setName(draftName)
      setPhone(draftPhone)
      setCompany(draftCompany)
      setLocation(draftLocation)
      setSavedOk(true)
      setTimeout(() => { setSavedOk(false); setEditing(false) }, 1200)
    } else {
      setError(j.error || 'Save failed — please try again')
    }
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

  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'

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
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            {!editing && (
              <button type="button" onClick={openEdit}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Pencil className="h-4 w-4" /> Edit Profile
              </button>
            )}
          </div>

          {!editing ? (
            /* ── Profile view card ── */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Avatar + name header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-8 flex items-center gap-5">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {initials}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{name || 'No name set'}</h2>
                  {company && <p className="text-blue-100 text-sm mt-0.5">{company}</p>}
                </div>
              </div>

              {/* Detail rows */}
              <div className="divide-y divide-gray-100">
                <div className="flex items-center gap-3 px-8 py-4">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Email</p>
                    <p className="text-sm text-gray-900">{email}</p>
                  </div>
                </div>
                {phone && (
                  <div className="flex items-center gap-3 px-8 py-4">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                      <p className="text-sm text-gray-900">{phone}</p>
                    </div>
                  </div>
                )}
                {company && (
                  <div className="flex items-center gap-3 px-8 py-4">
                    <Briefcase className="h-4 w-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Company</p>
                      <p className="text-sm text-gray-900">{company}</p>
                    </div>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-3 px-8 py-4">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Location</p>
                      <p className="text-sm text-gray-900">{location}</p>
                    </div>
                  </div>
                )}
                {!phone && !company && !location && (
                  <div className="px-8 py-6 text-sm text-gray-400 text-center">
                    Add your phone, company and location to complete your profile.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── Edit form ── */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-900">Edit Profile</h2>
                <button type="button" aria-label="Close edit form" onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label htmlFor="edit-name" className="block text-xs font-medium text-gray-600 mb-1">Full name *</label>
                  <input id="edit-name" required value={draftName} onChange={e => setDraftName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label htmlFor="edit-email" className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input id="edit-email" disabled value={email} title="Email address"
                    className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed" />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input type="tel" value={draftPhone} onChange={e => setDraftPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+61 400 000 000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                  <input value={draftCompany} onChange={e => setDraftCompany(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                  <input value={draftLocation} onChange={e => setDraftLocation(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City, Country" />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
                {saved && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Profile saved
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditing(false)}
                    className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
