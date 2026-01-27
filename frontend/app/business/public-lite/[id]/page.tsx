'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PublicLiteBusinessProfilePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const profileId = String(params?.id || '')
  const isPreview = searchParams?.get('preview') === '1'
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const userId = sessionRes.session?.user?.id || null

        let query = supabase
          .from('public_lite_business_profiles')
          .select('*')
          .eq('id', profileId)

        if (!isPreview) {
          query = query.eq('is_public', true)
        }

        const res = await query.maybeSingle()
        if (res.error || !res.data) {
          setError('Profile not found or not public.')
          return
        }

        if (isPreview && userId && res.data.user_id !== userId) {
          setError('Preview is only available to the profile owner.')
          return
        }

        if (!cancelled) setProfile(res.data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (profileId) load()
    return () => {
      cancelled = true
    }
  }, [profileId, isPreview])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-300">{error || 'Profile not available.'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="overflow-hidden border-b border-white/10">
        {profile.banner_url ? (
          <div className="h-56 md:h-72 bg-slate-900 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
          </div>
        ) : null}
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            {profile.logo_url ? (
              <div className={profile.banner_url ? '-mt-16 md:-mt-20' : ''}>
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-xl flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
                </div>
              </div>
            ) : null}
            <div className="min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold">{profile.name}</h1>
              {profile.short_tagline && (
                <p className="text-slate-300 mt-1">{profile.short_tagline}</p>
              )}
              {profile.summary && <p className="text-slate-300 mt-2 max-w-2xl">{profile.summary}</p>}
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300 mt-3">
                {Array.isArray(profile.industries) && profile.industries.length > 0 && (
                  <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10">
                    {profile.industries.join(', ')}
                  </span>
                )}
                {profile.company_size && (
                  <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10">{profile.company_size}</span>
                )}
                {Array.isArray(profile.locations) && profile.locations.length > 0 && (
                  <span>📍 {profile.locations.join(' • ')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {profile.what_company_does && (
          <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
            <h2 className="text-xl font-semibold mb-2">What we do</h2>
            <p className="text-slate-300 whitespace-pre-wrap">{profile.what_company_does}</p>
          </section>
        )}
        {profile.culture_values && (
          <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
            <h2 className="text-xl font-semibold mb-2">Culture & values</h2>
            <p className="text-slate-300 whitespace-pre-wrap">{profile.culture_values}</p>
          </section>
        )}
        {profile.work_environment && (
          <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
            <h2 className="text-xl font-semibold mb-2">What it’s like to work here</h2>
            <p className="text-slate-300 whitespace-pre-wrap">{profile.work_environment}</p>
          </section>
        )}
        {profile.typical_roles && (
          <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
            <h2 className="text-xl font-semibold mb-2">Typical roles we hire</h2>
            <p className="text-slate-300 whitespace-pre-wrap">{profile.typical_roles}</p>
          </section>
        )}
        {profile.website && (
          <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
            <h2 className="text-xl font-semibold mb-2">Website</h2>
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer"
              className="text-blue-300 hover:text-blue-200"
            >
              {profile.website}
            </a>
          </section>
        )}
      </div>
    </div>
  )
}
