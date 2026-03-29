'use client'

import React from 'react'
import type { Job, AppMode } from '../../../../modules/opportunity-intelligence/shared/types'

interface RouteInfo {
  drivingMins: number
  drivingKm: number
  cyclingMins: number
  cyclingKm: number
}

interface Props {
  job: Job | null
  mode: AppMode
  routeInfo?: RouteInfo | null
  onApply: (job: Job) => void
  onSave: (job: Job) => void
  onCompare: (job: Job) => void
}

function StatBar({ label, value, color = '#20C997' }: { label: string; value: number; color?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-semibold">{Math.round(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}

function WeeklyImpactRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-700/40 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${positive === true ? 'text-emerald-400' : positive === false ? 'text-red-400' : 'text-slate-300'}`}>
        {value}
      </span>
    </div>
  )
}

export default function DecisionPanel({ job, mode, routeInfo, onApply, onSave, onCompare }: Props) {
  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 px-6 text-center">
        <svg className="w-12 h-12 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm font-medium">Select an opportunity</p>
        <p className="text-xs mt-1 opacity-60">Click any job on the map or in the feed to see your full decision analysis</p>
      </div>
    )
  }

  const score = job.score
  const verdict = score?.verdict
  const verdictColor = verdict === 'Strong Move' ? '#10b981' : verdict === 'Consider' ? '#f59e0b' : verdict === 'Avoid' ? '#ef4444' : '#64748b'
  const totalScore = score?.total_score ?? null

  const salary = job.salary_max
    ? `$${(job.salary_max / 1000).toFixed(0)}k`
    : job.salary_min
    ? `$${(job.salary_min / 1000).toFixed(0)}k+`
    : 'Undisclosed'

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/60">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Decision Analysis</p>
        <p className="text-sm font-bold text-white leading-tight">{job.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{job.business_name}</p>
      </div>

      <div className="flex-1 px-5 py-4 space-y-5">
        {/* Big Score */}
        {totalScore !== null ? (
          <div className="text-center py-3">
            <div
              className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 mx-auto"
              style={{ borderColor: verdictColor, boxShadow: `0 0 30px ${verdictColor}40` }}
            >
              <span className="text-3xl font-black text-white">{Math.round(totalScore)}</span>
            </div>
            <div
              className="mt-2 text-sm font-bold tracking-wide"
              style={{ color: verdictColor }}
            >
              {verdict}
            </div>
            {score?.recommendation?.reasons?.[0] && (
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed px-2">
                {score.recommendation.reasons[0]}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-slate-600 mx-auto">
              <span className="text-slate-500 text-lg">?</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Score not yet computed</p>
          </div>
        )}

        {/* Score Breakdown */}
        {score?.breakdown && (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Score Breakdown</p>
            <StatBar label="Role Match" value={score.breakdown.match_score} color="#20C997" />
            <StatBar label="Salary" value={score.breakdown.salary_score} color="#3b82f6" />
            <StatBar label="Commute" value={score.breakdown.commute_score} color="#f59e0b" />
            <StatBar label="Growth Potential" value={score.breakdown.growth_score} color="#8b5cf6" />
          </div>
        )}

        {/* Salary & Location */}
        <div className="bg-slate-800/60 rounded-xl p-3.5 space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Role Details</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-slate-500">Salary</p>
              <p className="text-emerald-400 font-semibold mt-0.5">{salary}</p>
            </div>
            <div>
              <p className="text-slate-500">Work Mode</p>
              <p className="text-slate-200 font-semibold mt-0.5 capitalize">{job.work_mode || 'On-site'}</p>
            </div>
            {job.city && (
              <div>
                <p className="text-slate-500">Location</p>
                <p className="text-slate-200 font-semibold mt-0.5">{job.city}</p>
              </div>
            )}
            {job.industry && (
              <div>
                <p className="text-slate-500">Industry</p>
                <p className="text-slate-200 font-semibold mt-0.5">{job.industry}</p>
              </div>
            )}
          </div>
        </div>

        {/* Route Intelligence */}
        {routeInfo ? (
          <div className="bg-slate-800/60 rounded-xl p-3.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Route Intelligence</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-700/50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-400 mb-1 flex items-center justify-center gap-1">
                  <span>🚗</span> Car
                </p>
                <p className="text-white font-bold text-sm">{routeInfo.drivingKm} km</p>
                <p className="text-slate-400 text-xs">{routeInfo.drivingMins} min</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-400 mb-1 flex items-center justify-center gap-1">
                  <span>🚲</span> Bike
                </p>
                <p className="text-white font-bold text-sm">{routeInfo.cyclingKm} km</p>
                <p className="text-slate-400 text-xs">{routeInfo.cyclingMins} min</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-2 text-center">One-way · via Mapbox Directions</p>
          </div>
        ) : job && (
          <div className="bg-slate-800/40 rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-500">Set your home location to see real commute times</p>
          </div>
        )}

        {/* Weekly Impact */}
        {score?.weekly_impact && (
          <div className="bg-slate-800/60 rounded-xl p-3.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Weekly Impact</p>
            <WeeklyImpactRow
              label="Commute hours/week"
              value={`${score.weekly_impact.weekly_commute_hours.toFixed(1)}h`}
              positive={score.weekly_impact.weekly_commute_hours < 5 ? true : score.weekly_impact.weekly_commute_hours > 10 ? false : undefined}
            />
            <WeeklyImpactRow
              label="Time cost (lost earnings)"
              value={`-$${score.weekly_impact.time_value_weekly.toFixed(0)}/wk`}
              positive={false}
            />
            <WeeklyImpactRow
              label="Net weekly value"
              value={`${score.weekly_impact.net_weekly_value >= 0 ? '+' : ''}$${score.weekly_impact.net_weekly_value.toFixed(0)}/wk`}
              positive={score.weekly_impact.net_weekly_value >= 0}
            />
          </div>
        )}

        {/* Recommendations */}
        {score?.recommendation && (
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Insights</p>
            {score.recommendation.reasons?.slice(1).map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-[#20C997] mt-0.5">•</span>
                <span>{r}</span>
              </div>
            ))}
            {score.recommendation.improvement && (
              <div className="mt-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider mb-1">Tip</p>
                <p className="text-xs text-blue-300">{score.recommendation.improvement}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-5 py-4 border-t border-slate-700/60 space-y-2">
        {mode === 'talent' && (
          <button
            onClick={() => onApply(job)}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-black transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #20C997, #3b82f6)' }}
          >
            Apply Now
          </button>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => onSave(job)}
            className="flex-1 py-2 rounded-xl text-sm font-medium border border-slate-600 text-slate-300 hover:bg-slate-700/40 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => onCompare(job)}
            className="flex-1 py-2 rounded-xl text-sm font-medium border border-slate-600 text-slate-300 hover:bg-slate-700/40 transition-colors"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  )
}
