'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Briefcase, MapPin, Loader2, Building2, ChevronLeft,
  AlertCircle, ExternalLink, ChevronRight, Lock,
} from 'lucide-react'

interface TalentRequest {
  id: string
  business_id: string
  role_title: string
  location: string | null
  experience_level: string | null
  notes: string | null
  created_at: string
  // Joined from business_profile_pages
  business_name?: string
  business_slug?: string
  business_logo?: string | null
  industry?: string | null
}

export default function TalentOpportunitiesPage() {
  const router = useRouter()
  const [requests, setRequests]   = useState<TalentRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setAuthError(true); setLoading(false); return }

      // Verify this user has a talent profile
      const { data: tp } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!tp) { setAuthError(true); setLoading(false); return }

      // Load all active talent requests (public — no auth header required)
      const res = await fetch('/api/businesses/talent-requests')
      if (!res.ok) { setLoading(false); return }
      const json = await res.json()
      const rawRequests: TalentRequest[] = json.requests || []

      // Enrich with business info from business_profile_pages
      if (rawRequests.length > 0) {
        const businessIds = [...new Set(rawRequests.map(r => r.business_id))]
        const { data: pages } = await supabase
          .from('business_profile_pages')
          .select('business_id, slug, name, logo_url')
          .in('business_id', businessIds)
          .eq('is_published', true)

        const { data: bizRows } = await supabase
          .from('businesses')
          .select('id, industry')
          .in('id', businessIds)

        const pageMap: Record<string, any> = {}
        for (const p of pages || []) pageMap[p.business_id] = p

        const bizMap: Record<string, any> = {}
        for (const b of bizRows || []) bizMap[b.id] = b

        const enriched = rawRequests.map(r => ({
          ...r,
          business_name: pageMap[r.business_id]?.name || 'Business',
          business_slug: pageMap[r.business_id]?.slug || null,
          business_logo: pageMap[r.business_id]?.logo_url || null,
          industry:      bizMap[r.business_id]?.industry || null,
        }))

        if (!cancelled) setRequests(enriched)
      } else {
        if (!cancelled) setRequests([])
      }

      if (!cancelled) setLoading(false)
    }
    load().catch(() => { setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  if (authError) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <Lock className="h-10 w-10 text-gray-300" />
      <p className="text-gray-600 text-sm">You need a talent profile to view opportunities.</p>
      <Link href="/dashboard/talent" className="text-sm text-blue-600 hover:underline">Go to talent dashboard</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard/talent" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-semibold text-gray-800">Business Opportunities</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Open Talent Requests</h2>
          <p className="text-gray-500 text-sm max-w-xl">
            Businesses on Creerlio are looking to connect with professionals like you.
            Your profile remains private — you choose when and if to respond.
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No open talent requests right now. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                {/* Business info */}
                <div className="flex items-center gap-3 mb-4">
                  {req.business_logo ? (
                    <img src={req.business_logo} alt="" className="h-10 w-10 rounded-xl object-cover border border-gray-100" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-blue-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{req.business_name}</p>
                    {req.industry && <p className="text-xs text-gray-400">{req.industry}</p>}
                  </div>
                  {req.business_slug && (
                    <Link
                      href={`/businesses/${req.business_slug}`}
                      className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      target="_blank"
                    >
                      View business <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {/* Request detail */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="font-medium text-gray-900 mb-1">{req.role_title}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                    {req.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.location}</span>}
                    {req.experience_level && <span>{req.experience_level}</span>}
                  </div>
                  {req.notes && <p className="text-sm text-gray-600">{req.notes}</p>}
                </div>

                {/* Privacy reminder + action */}
                <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    Your profile stays private. Only you can choose to respond.
                  </p>
                  <Link
                    href="/dashboard/talent/edit"
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    Make sure my profile is ready <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
