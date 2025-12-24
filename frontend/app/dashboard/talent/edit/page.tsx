'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type TalentProfileRow = Record<string, any>

function pickTalentName(row: TalentProfileRow | null): string {
  if (!row) return ''
  return (
    (typeof row?.name === 'string' && row.name) ||
    (typeof row?.talent_name === 'string' && row.talent_name) ||
    (typeof row?.full_name === 'string' && row.full_name) ||
    (typeof row?.display_name === 'string' && row.display_name) ||
    ''
  )
}

export default function EditTalentProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<TalentProfileRow | null>(null)
  const [talentId, setTalentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    headline: '',
    bio: '',
    skills: '',
    location: '',
    city: '',
    state: '',
    country: '',
    phone: '',
  })

  useEffect(() => {
    // Force Talent mode when entering Talent profile editor (supports mixed-profile users)
    try {
      localStorage.setItem('creerlio_active_role', 'talent')
      localStorage.setItem('user_type', 'talent')
    } catch {}

    let cancelled = false
    async function load() {
      setIsLoading(true)
      setErrors({})
      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const uid = sessionRes.session?.user?.id ?? null
        const email = sessionRes.session?.user?.email ?? null
        if (!uid) {
          router.push('/login?redirect=/dashboard/talent/edit')
          return
        }

        // Load by user_id (canonical for Supabase auth)
        const existing = await supabase.from('talent_profiles').select('*').eq('user_id', uid).maybeSingle()
        if (existing.error) {
          setErrors({ submit: existing.error.message })
          return
        }

        if (!existing.data) {
          // Empty state: no profile yet; user can create one.
          if (!cancelled) {
            setProfile(null)
            setTalentId(null)
            setFormData((p) => ({ ...p, name: '', headline: '', bio: '', skills: '' }))
          }
          return
        }

        const row: any = existing.data
        if (!cancelled) {
          setProfile(row)
          setTalentId(String(row.id))
          setFormData({
            name: pickTalentName(row),
            title: (typeof row.title === 'string' && row.title) || '',
            headline: (typeof row.headline === 'string' && row.headline) || '',
            bio: (typeof row.bio === 'string' && row.bio) || '',
            skills:
              Array.isArray(row.skills) ? row.skills.join(', ') : typeof row.skills === 'string' ? row.skills : '',
            location: (typeof row.location === 'string' && row.location) || '',
            city: (typeof row.city === 'string' && row.city) || '',
            state: (typeof row.state === 'string' && row.state) || '',
            country: (typeof row.country === 'string' && row.country) || '',
            phone: (typeof row.phone === 'string' && row.phone) || '',
          })
        }

        // Keep legacy localStorage email for older pages that still reference it
        if (email) {
          try {
            localStorage.setItem('user_email', email)
          } catch {}
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  async function createProfile() {
    setIsSaving(true)
    setErrors({})
    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const uid = sessionRes.session?.user?.id ?? null
      const email = sessionRes.session?.user?.email ?? null
      if (!uid) {
        router.push('/login?redirect=/dashboard/talent/edit')
        return
      }

      const isMissingColumnErr = (err: any) => {
        return err?.code === 'PGRST204' || /Could not find the .* column/i.test(err?.message ?? '')
      }

      const base: Record<string, any> = { user_id: uid }
      if (email) base.email = email

      // 1) Create with the "name" field (schema varies across environments)
      const nameKeyCandidates = ['name', 'talent_name', 'full_name', 'display_name']
      let createdId: string | null = null
      let lastErr: any = null

      for (const key of nameKeyCandidates) {
        const payload: Record<string, any> = { ...base }
        if (formData.name.trim()) payload[key] = formData.name.trim()
        const ins = await supabase.from('talent_profiles').insert(payload).select('id').maybeSingle()
        if (!ins.error && ins.data?.id) {
          createdId = String(ins.data.id)
          break
        }
        lastErr = ins.error
        if (!isMissingColumnErr(ins.error)) break
      }

      if (!createdId) {
        setErrors({
          submit:
            lastErr?.message ||
            'Could not create Talent profile. (Check Supabase RLS policies for talent_profiles inserts.)',
        })
        return
      }

      // 2) Best-effort optional fields (skip missing columns)
      const skills = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const optionalUpdates: Array<{ k: string; v: any }> = [
        { k: 'headline', v: formData.headline.trim() || null },
        { k: 'title', v: formData.title.trim() || null },
        { k: 'bio', v: formData.bio.trim() || null },
        { k: 'skills', v: skills.length ? skills : null },
        { k: 'location', v: formData.location.trim() || null },
        { k: 'city', v: formData.city.trim() || null },
        { k: 'state', v: formData.state.trim() || null },
        { k: 'country', v: formData.country.trim() || null },
        { k: 'phone', v: formData.phone.trim() || null },
      ]

      for (const f of optionalUpdates) {
        if (f.v === null) continue
        const upd = await supabase.from('talent_profiles').update({ [f.k]: f.v }).eq('id', createdId)
        if (upd.error && !isMissingColumnErr(upd.error)) break
      }

      setTalentId(createdId)
      router.push('/dashboard/talent')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrors({})

    if (!formData.name.trim()) {
      setErrors({ name: 'Name is required' })
      setIsSaving(false)
      return
    }

    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const uid = sessionRes.session?.user?.id ?? null
      if (!uid) {
        router.push('/login?redirect=/dashboard/talent/edit')
        return
      }

      const skills = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      const isMissingColumnErr = (err: any) => {
        return err?.code === 'PGRST204' || /Could not find the .* column/i.test(err?.message ?? '')
      }

      // Ensure we have an existing row; if not, create first.
      if (!talentId) {
        await createProfile()
        return
      }

      // Name column varies: try candidates first
      const nameKeyCandidates = ['name', 'talent_name', 'full_name', 'display_name']
      let nameOk = false
      let lastNameErr: any = null
      for (const key of nameKeyCandidates) {
        const res = await supabase.from('talent_profiles').update({ [key]: formData.name.trim() }).eq('id', talentId)
        if (!res.error) {
          nameOk = true
          break
        }
        lastNameErr = res.error
        if (!isMissingColumnErr(res.error)) break
      }
      if (!nameOk && lastNameErr) {
        setErrors({ submit: lastNameErr.message })
        return
      }

      // Best-effort per-field updates (skip missing columns)
      const optionalUpdates: Array<{ k: string; v: any }> = [
        { k: 'headline', v: formData.headline.trim() || null },
        { k: 'title', v: formData.title.trim() || null },
        { k: 'bio', v: formData.bio.trim() || null },
        { k: 'skills', v: skills.length > 0 ? skills : null },
        { k: 'location', v: formData.location.trim() || null },
        { k: 'city', v: formData.city.trim() || null },
        { k: 'state', v: formData.state.trim() || null },
        { k: 'country', v: formData.country.trim() || null },
        { k: 'phone', v: formData.phone.trim() || null },
      ]

      for (const f of optionalUpdates) {
        if (f.v === null) continue
        const res = await supabase.from('talent_profiles').update({ [f.k]: f.v }).eq('id', talentId)
        if (res.error && !isMissingColumnErr(res.error)) {
          setErrors({ submit: res.error.message })
          return
        }
      }

      router.push('/dashboard/talent')
    } catch (error: any) {
      setErrors({
        submit: error?.message || 'Failed to update profile. Please try again.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <header className="container mx-auto px-6 py-4 flex items-center justify-between border-b border-gray-800">
        <Link href="/dashboard/talent" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <span className="text-white text-2xl font-bold">Creerlio</span>
        </Link>
        <Link
          href="/dashboard/talent"
          className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800"
        >
          Back to Dashboard
        </Link>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-8">Edit Profile</h1>

        <form onSubmit={handleSubmit} className="dashboard-card rounded-xl p-8 space-y-6">
          {!profile && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-100">
              <div className="font-semibold text-white">No Talent profile found yet</div>
              <div className="text-sm text-blue-100/90 mt-1">
                Fill in your details below, then click <span className="font-semibold">Create Profile</span>.
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={createProfile}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold disabled:opacity-60"
                >
                  Create Profile
                </button>
              </div>
            </div>
          )}
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={`w-full px-4 py-3 bg-white border rounded-lg text-black placeholder-gray-400 focus:outline-none transition-colors ${
                errors.name ? 'border-red-500' : 'border-blue-500/20 focus:border-blue-500'
              }`}
              placeholder="Your full name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Professional Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white border border-blue-500/20 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="e.g., Senior Software Engineer"
            />
          </div>

          {/* Headline */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Headline</label>
            <input
              type="text"
              name="headline"
              value={formData.headline}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white border border-blue-500/20 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="e.g., Hospitality • Customer service • Ready to start"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-white border border-blue-500/20 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Skills (comma-separated)</label>
            <input
              type="text"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white border border-blue-500/20 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="JavaScript, React, Node.js, Python"
            />
          </div>

          {/* Location */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-blue-500/20 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-blue-500/20 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="State"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-blue-500/20 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="Country"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white border border-blue-500/20 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
            <Link
              href="/dashboard/talent"
              className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
