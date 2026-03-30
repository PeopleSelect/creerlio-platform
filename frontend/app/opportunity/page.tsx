'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import OpportunityFeed from '@/components/opportunity/OpportunityFeed'
import DecisionPanel from '@/components/opportunity/DecisionPanel'
import ScenarioSimulator from '@/components/opportunity/ScenarioSimulator'
import type {
  Job,
  GeoInsight,
  AppMode,
  InsightsResponse,
  ScenarioParams,
  OpportunityScoreResult,
} from '../../../modules/opportunity-intelligence/shared/types'

// Mapbox imports must be client-only
const OpportunityMap = dynamic(
  () => import('@/components/opportunity/OpportunityMap'),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-800 rounded-xl animate-pulse" /> }
)

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

export default function OpportunityPage() {
  const [mode, setMode] = useState<AppMode>('talent')
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [geoInsights, setGeoInsights] = useState<GeoInsight[]>([])
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [rescoring, setRescoring] = useState(false)

  // User profile for accurate scoring
  const [currentSalary, setCurrentSalary] = useState(80000)
  const [homeQuery, setHomeQuery] = useState('')
  const [homeLabel, setHomeLabel] = useState('')
  const [homeLat, setHomeLat] = useState<number | null>(null)
  const [homeLng, setHomeLng] = useState<number | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [routeInfo, setRouteInfo] = useState<{ drivingMins: number; drivingKm: number; cyclingMins: number; cyclingKm: number } | null>(null)

  const tokenRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(null)
  const selectedJobRef = useRef<Job | null>(null)

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      tokenRef.current = data.session?.access_token || null
      userIdRef.current = data.session?.user?.id || null
    })
  }, [])

  // Load insights (geo + recommendations)
  const loadInsights = useCallback(async () => {
    if (!tokenRef.current) return
    const res = await fetch(
      `/api/opportunity/insights?mode=${mode}${userIdRef.current ? `&user_id=${userIdRef.current}` : ''}`,
      { headers: { Authorization: `Bearer ${tokenRef.current}` } }
    )
    if (res.ok) {
      const json: InsightsResponse & { success: boolean } = await res.json()
      setGeoInsights(json.geo_insights || [])
      setRecommendations(json.recommendations || [])
    }
  }, [mode])

  // Load jobs (talent mode)
  const loadJobs = useCallback(async () => {
    setLoadingJobs(true)
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, business_id, business_profile_id, salary_min, salary_max, city, latitude, longitude, remote_allowed, employment_type, description')
      .not('latitude', 'is', null)
      .limit(50)

    if (error) console.error('[OpportunityPage] jobs query error:', error)

    if (data && data.length > 0) {
      const bpIds = [...new Set(data.map((j: any) => j.business_profile_id).filter(Boolean))]
      let bpMap: Record<number, string> = {}
      if (bpIds.length) {
        const { data: bps } = await supabase
          .from('business_profiles')
          .select('id, business_name, name')
          .in('id', bpIds)
        if (bps) bps.forEach((bp: any) => { bpMap[bp.id] = bp.business_name || bp.name || 'Business' })
      }

      const ids = data.map((j: any) => String(j.id))
      let scoreMap: Record<string, OpportunityScoreResult> = {}
      if (userIdRef.current && ids.length) {
        const { data: scores } = await supabase
          .from('opportunity_scores').select('*')
          .eq('user_id', userIdRef.current).in('job_id', ids)
        if (scores) {
          scores.forEach((s: any) => {
            scoreMap[s.job_id] = {
              id: s.id, job_id: s.job_id, user_id: s.user_id,
              total_score: s.total_score, verdict: s.verdict, breakdown: s.breakdown,
              weekly_impact: { weekly_commute_hours: s.weekly_commute_hours, hourly_rate: 0, time_value_weekly: s.weekly_time_cost, net_weekly_value: s.weekly_net_value },
              recommendation: s.recommendation, created_at: s.created_at,
            }
          })
        }
      }
      setJobs(data.map((j: any) => ({
        id: String(j.id),
        title: j.title,
        business_id: j.business_id || String(j.business_profile_id),
        business_name: bpMap[j.business_profile_id] || 'Business',
        salary_min: j.salary_min, salary_max: j.salary_max,
        city: j.city, lat: j.latitude, lng: j.longitude,
        work_mode: j.remote_allowed ? 'remote' : 'onsite',
        employment_type: j.employment_type, description: j.description,
        score: scoreMap[String(j.id)] || undefined,
      })))
    } else {
      setJobs([])
    }
    setLoadingJobs(false)
  }, [])

  // Load talent profiles (business mode)
  const loadTalents = useCallback(async () => {
    setLoadingJobs(true)
    // Deliberately exclude 'name' — never expose identity to business view
    const { data, error } = await supabase
      .from('talent_profiles')
      .select('id, title, city, latitude, longitude, skills, experience_years, search_visible, search_summary')
      .not('latitude', 'is', null)
      .eq('is_active', true)
      .limit(50)

    if (error) console.error('[OpportunityPage] talent_profiles query error:', error)

    if (data && data.length > 0) {
      const ids = data.map((t: any) => t.id)

      // Fetch active snapshot IDs for portfolio linking
      const { data: snapshots } = await supabase
        .from('talent_snapshots')
        .select('id, talent_id')
        .in('talent_id', ids)
        .eq('is_active', true)
      const snapshotMap: Record<string, string> = {}
      if (snapshots) {
        snapshots.forEach((s: any) => {
          if (!snapshotMap[s.talent_id]) snapshotMap[s.talent_id] = s.id
        })
      }

      setJobs(data.map((t: any) => {
        // business_name encodes discovery state:
        //   'snapshot:{id}'  → published anonymous snapshot
        //   'visible'        → opted-in via search_visible (uses search_summary as profile)
        //   ''               → not discoverable
        let discoveryFlag = ''
        if (snapshotMap[t.id]) discoveryFlag = `snapshot:${snapshotMap[t.id]}`
        else if (t.search_visible) discoveryFlag = 'visible'

        // description holds the best available summary text
        const summaryText = t.search_summary || (t.experience_years ? `${t.experience_years} years experience` : undefined)

        return {
          id: String(t.id),
          title: t.title || 'Anonymous Talent',
          business_id: t.id,
          business_name: discoveryFlag,
          city: t.city,
          lat: t.latitude,
          lng: t.longitude,
          industry: Array.isArray(t.skills) ? t.skills.slice(0, 3).join(', ') : undefined,
          description: summaryText,
        }
      }))
    } else {
      setJobs([])
    }
    setLoadingJobs(false)
  }, [])

  useEffect(() => {
    // Wait briefly for auth
    const t = setTimeout(() => {
      if (mode === 'talent') loadJobs()
      else loadTalents()
      loadInsights()
    }, 300)
    return () => clearTimeout(t)
  }, [loadJobs, loadTalents, loadInsights])

  useEffect(() => {
    setSelectedJob(null)
    if (mode === 'talent') loadJobs()
    else loadTalents()
    loadInsights()
  }, [mode, loadJobs, loadTalents, loadInsights])

  // Track event
  const trackEvent = useCallback(async (
    event_type: string,
    entity_type: string,
    entity_id?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!tokenRef.current || !userIdRef.current) return
    fetch('/api/opportunity/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRef.current}`,
      },
      body: JSON.stringify({
        user_id: userIdRef.current,
        event_type,
        entity_type,
        entity_id,
        metadata,
      }),
    }).catch(() => {})
  }, [])

  // Geocode home location
  const handleSetHome = useCallback(async () => {
    if (!homeQuery.trim()) return
    setGeocoding(true)
    try {
      const res = await fetch(`/api/map/geocode?q=${encodeURIComponent(homeQuery)}&limit=1`)
      if (res.ok) {
        const json = await res.json()
        const feature = json.features?.[0]
        if (feature) {
          setHomeLng(feature.center[0])
          setHomeLat(feature.center[1])
          setHomeLabel(feature.place_name)
          setSetupOpen(false)
        }
      }
    } finally {
      setGeocoding(false)
    }
  }, [homeQuery])

  // Get real driving commute minutes via Mapbox Directions
  const getRealCommute = useCallback(async (job: Job): Promise<number> => {
    if (!homeLat || !homeLng || !job.lat || !job.lng) return 30
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${homeLng},${homeLat};${job.lng},${job.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        const durationSecs = json.routes?.[0]?.duration
        if (durationSecs) return Math.round(durationSecs / 60)
      }
    } catch {}
    return 30
  }, [homeLat, homeLng])

  const autoScore = useCallback(async (job: Job) => {
    if (!tokenRef.current || !userIdRef.current) return
    const baseSalary = job.salary_max || job.salary_min || 80000
    const commute_minutes = await getRealCommute(job)
    const res = await fetch('/api/opportunity/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRef.current}`,
      },
      body: JSON.stringify({
        user_id: userIdRef.current,
        job_id: job.id,
        match_score: 65,
        salary_current: currentSalary,
        salary_offered: baseSalary,
        commute_minutes,
        work_mode: job.work_mode === 'remote' ? 'remote' : job.work_mode === 'hybrid' ? 'hybrid' : 'on_site',
        industry_growth_pct: 5,
        role_seniority_delta: 0,
      }),
    })
    if (res.ok) {
      const json = await res.json()
      if (json.score) {
        const scored = { ...job, score: json.score }
        setSelectedJob(scored)
        setJobs((prev) => prev.map((j) => j.id === job.id ? scored : j))
      }
    }
  }, [currentSalary, getRealCommute])

  const handleHomeDrag = useCallback((lat: number, lng: number, label: string) => {
    setHomeLat(lat)
    setHomeLng(lng)
    setHomeLabel(label)
    setHomeQuery(label.split(',')[0])
  }, [])

  const handleRouteCalc = useCallback(async (drivingMins: number, drivingKm: number, cyclingMins: number, cyclingKm: number) => {
    setRouteInfo({ drivingMins, drivingKm, cyclingMins, cyclingKm })

    // Re-score with real commute minutes
    const job = selectedJobRef.current
    if (!job || !tokenRef.current || !userIdRef.current) return
    const baseSalary = job.salary_max || job.salary_min || 80000
    const res = await fetch('/api/opportunity/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({
        user_id: userIdRef.current,
        job_id: job.id,
        match_score: job.score?.breakdown?.match_score ?? 65,
        salary_current: currentSalary,
        salary_offered: baseSalary,
        commute_minutes: drivingMins,
        work_mode: job.work_mode === 'remote' ? 'remote' : job.work_mode === 'hybrid' ? 'hybrid' : 'on_site',
        industry_growth_pct: 5,
        role_seniority_delta: 0,
      }),
    })
    if (res.ok) {
      const json = await res.json()
      if (json.score) {
        const scored = { ...job, score: json.score }
        setSelectedJob(scored)
        selectedJobRef.current = scored
        setJobs((prev) => prev.map((j) => j.id === scored.id ? scored : j))
      }
    }
  }, [currentSalary])

  const handleJobSelect = useCallback((job: Job) => {
    setSelectedJob(job)
    selectedJobRef.current = job
    setRouteInfo(null)
    trackEvent('VIEW_JOB', 'job', job.id)
    if (mode === 'talent' && !job.score) autoScore(job)
  }, [trackEvent, autoScore, mode])

  const handleMapMove = useCallback((center: { lat: number; lng: number }) => {
    trackEvent('MAP_MOVE', 'map', undefined, center as any)
  }, [trackEvent])

  const handleApply = useCallback((job: Job) => {
    trackEvent('APPLY_JOB', 'job', job.id)
    if (mode === 'business') {
      // Redirect to business dashboard to initiate a connection request with this talent
      window.location.href = `/dashboard/business?connect=${job.id}`
    } else {
      window.open(`/jobs/${job.id}`, '_blank')
    }
  }, [trackEvent, mode])

  const handleSave = useCallback((job: Job) => {
    trackEvent('SAVE_JOB', 'job', job.id)
  }, [trackEvent])

  const handleCompare = useCallback((job: Job) => {
    // For now just track; future: multi-select compare mode
    trackEvent('SCORE_JOB', 'job', job.id)
  }, [trackEvent])

  // Re-score with scenario params
  const handleRescore = useCallback(async (params: ScenarioParams) => {
    if (!selectedJob || !tokenRef.current || !userIdRef.current) return
    setRescoring(true)
    trackEvent('SIMULATE_SCENARIO', 'job', selectedJob.id, params as any)

    try {
      const baseSalary = selectedJob.salary_max || selectedJob.salary_min || 80000
      const res = await fetch('/api/opportunity/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({
          user_id: userIdRef.current,
          job_id: selectedJob.id,
          match_score: params.match_score_override ?? selectedJob.score?.breakdown?.match_score ?? 60,
          salary_current: 80000,
          salary_offered: params.salary_offered ?? baseSalary,
          commute_minutes: params.commute_minutes ?? 30,
          work_mode: params.work_mode === 'onsite' ? 'on_site' : (params.work_mode ?? 'on_site'),
          industry_growth_pct: 5,
          role_seniority_delta: 0,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.score) {
          const updatedJob = { ...selectedJob, score: json.score }
          setSelectedJob(updatedJob)
          setJobs((prev) => prev.map((j) => j.id === updatedJob.id ? updatedJob : j))
        }
      }
    } finally {
      setRescoring(false)
    }
  }, [selectedJob, trackEvent])

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #20C997, #3b82f6)' }}>
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="font-bold text-white text-sm">Opportunity Intelligence</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
            {(['talent', 'business'] as AppMode[]).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all
                  ${mode === m ? 'bg-[#20C997] text-black' : 'text-slate-400 hover:text-white'}`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Heatmap toggle */}
          <button
            type="button"
            onClick={() => setShowHeatmap((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
              ${showHeatmap
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
            Heatmap
          </button>

          {/* Your Details setup button — talent mode only */}
          {mode === 'talent' && (
            <button
              type="button"
              onClick={() => setSetupOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                ${homeLat
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {homeLat ? homeLabel.split(',')[0] : 'Set your details'}
            </button>
          )}

          <a href="/dashboard/talent" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Dashboard
          </a>
        </div>
      </header>

      {/* Setup panel — talent mode only */}
      {mode === 'talent' && setupOpen && (
        <div className="bg-slate-900 border-b border-slate-700 px-6 py-4 flex flex-wrap items-end gap-6">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Current Salary (AUD/yr)</label>
            <input
              type="number"
              value={currentSalary}
              onChange={(e) => setCurrentSalary(Number(e.target.value))}
              step={5000}
              title="Your current annual salary in AUD"
              placeholder="80000"
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white w-36 focus:outline-none focus:border-[#20C997]"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-48">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Home Suburb / Postcode</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={homeQuery}
                onChange={(e) => setHomeQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSetHome()}
                placeholder="e.g. Parramatta NSW"
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#20C997]"
              />
              <button
                type="button"
                onClick={handleSetHome}
                disabled={geocoding}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold text-black disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #20C997, #3b82f6)' }}
              >
                {geocoding ? '…' : 'Set'}
              </button>
            </div>
            {homeLabel && <p className="text-[10px] text-emerald-400 mt-0.5">{homeLabel}</p>}
          </div>
          <p className="text-xs text-slate-500 self-center">Real commute times will be calculated via Mapbox Directions when you select a job.</p>
        </div>
      )}

      {/* Recommendations bar */}
      {recommendations.length > 0 && (
        <div className="flex items-center gap-4 px-6 py-2 bg-slate-900/50 border-b border-slate-800 overflow-x-auto">
          <svg className="w-3.5 h-3.5 text-[#20C997] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {recommendations.map((r, i) => (
            <span key={i} className="text-xs text-slate-400 flex-shrink-0">
              {r}
              {i < recommendations.length - 1 && <span className="ml-4 text-slate-700">·</span>}
            </span>
          ))}
        </div>
      )}

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 100px)' }}>
        {/* Left: Feed */}
        <div className="w-80 flex-shrink-0 border-r border-slate-800 bg-slate-900/40 overflow-hidden">
          {loadingJobs ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : (
            <OpportunityFeed
              jobs={jobs}
              selectedJobId={selectedJob?.id || null}
              mode={mode}
              onSelect={handleJobSelect}
            />
          )}
        </div>

        {/* Center: Map */}
        <div className="flex-1 relative">
          <OpportunityMap
            jobs={jobs}
            geoInsights={geoInsights}
            selectedJobId={selectedJob?.id || null}
            mode={mode}
            showHeatmap={showHeatmap}
            homeLat={mode === 'talent' ? homeLat : null}
            homeLng={mode === 'talent' ? homeLng : null}
            onJobSelect={handleJobSelect}
            onMapMove={handleMapMove}
            onRouteCalc={handleRouteCalc}
            onHomeDrag={handleHomeDrag}
          />
        </div>

        {/* Right: Decision Panel */}
        <div className="w-80 flex-shrink-0 border-l border-slate-800 bg-slate-900/40 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <DecisionPanel
              job={selectedJob}
              mode={mode}
              routeInfo={routeInfo}
              onApply={handleApply}
              onSave={handleSave}
              onCompare={handleCompare}
            />
          </div>

          {/* Scenario Simulator — talent mode only */}
          {mode === 'talent' && selectedJob && (
            <div className="border-t border-slate-800 p-4">
              <ScenarioSimulator
                job={selectedJob}
                onRescore={handleRescore}
                isLoading={rescoring}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
