'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import SearchMap from '@/components/SearchMap'
import { supabase } from '@/lib/supabase'

type BusinessRow = Record<string, any>

function pickBusinessName(row: BusinessRow): string | null {
  return (
    (typeof row?.name === 'string' && row.name) ||
    (typeof row?.business_name === 'string' && row.business_name) ||
    (typeof row?.company_name === 'string' && row.company_name) ||
    (typeof row?.display_name === 'string' && row.display_name) ||
    (typeof row?.legal_name === 'string' && row.legal_name) ||
    null
  )
}

export default function TalentMapPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markers, setMarkers] = useState<Array<{ id: number; lat: number; lng: number; title: string; description?: string; type: 'business' }>>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession()
        const hasSession = !!sessionRes?.session?.user?.id
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'talent-map/page.tsx:load:session',message:'Talent map session check',data:{hasSession,hasSessionErr:!!sessionErr},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'TM1'})}).catch(()=>{});
        // #endregion
        if (!hasSession) {
          setError('Please sign in to view the Talent Map.')
          return
        }

        // Try to load business pins (best-effort; do not crash if schema differs)
        const selectorCandidates = [
          'id, name, latitude, longitude, location, industry',
          'id, business_name, latitude, longitude, location, industry',
          'id, company_name, latitude, longitude, location, industry',
          'id, display_name, latitude, longitude, location, industry',
        ]

        let rows: BusinessRow[] | null = null
        let lastErr: any = null
        for (const sel of selectorCandidates) {
          const res = await supabase.from('business_profiles').select(sel).limit(100)
          if (!res.error) {
            rows = (res.data || []) as any
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'talent-map/page.tsx:load:biz_selector',message:'Talent map business selector succeeded',data:{selector:sel,count:rows.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'TM2'})}).catch(()=>{});
            // #endregion
            break
          }
          lastErr = res.error
        }

        if (!rows) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'talent-map/page.tsx:load:biz_selector_fail',message:'Talent map business selectors all failed',data:{errCode:lastErr?.code,errMsg:lastErr?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'TM2'})}).catch(()=>{});
          // #endregion
          setMarkers([])
          return
        }

        const mapped = rows
          .map((r: any, idx: number) => {
            const lat = typeof r.latitude === 'number' ? r.latitude : null
            const lng = typeof r.longitude === 'number' ? r.longitude : null
            if (lat === null || lng === null) return null
            const title = pickBusinessName(r) || 'Business'
            return {
              id: Number(r.id ?? idx),
              lat,
              lng,
              title,
              description: typeof r.industry === 'string' ? r.industry : undefined,
              type: 'business' as const,
            }
          })
          .filter(Boolean) as any

        if (!cancelled) setMarkers(mapped)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load Talent Map.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const headerRight = useMemo(() => {
    return (
      <div className="flex items-center gap-4">
        <Link href="/dashboard/talent" className="text-slate-300 hover:text-blue-400 transition-colors">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <header className="sticky top-0 z-50 backdrop-blur bg-slate-950/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-white hover:text-blue-400 transition-colors">
            Creerlio
          </Link>
          {headerRight}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Talent Map</h1>
          <p className="text-gray-400">
            Explore businesses on the platform. This view is defensive and will not crash if data is missing.
          </p>
        </div>

        {error && (
          <div className="border border-red-500/30 bg-red-500/10 text-red-200 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <div className="dashboard-card rounded-xl p-4 h-[70vh]">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <SearchMap markers={markers as any} />
          )}
        </div>

        {!loading && !error && markers.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-300 font-medium mb-2">No map pins yet</p>
            <p className="text-gray-500 text-sm">Businesses will appear here once they have location coordinates saved.</p>
          </div>
        )}
      </main>
    </div>
  )
}


