'use client'

import React from 'react'
import type { Job, AppMode } from '../../../../modules/opportunity-intelligence/shared/types'

interface Props {
  jobs: Job[]
  selectedJobId: string | null
  mode: AppMode
  savedJobIds?: Set<string>
  onSelect: (job: Job) => void
}

function VerdictBadge({ verdict }: { verdict?: string }) {
  if (!verdict) return null
  const styles: Record<string, string> = {
    'Strong Move': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    'Consider':    'bg-amber-500/20 text-amber-400 border-amber-500/40',
    'Avoid':       'bg-red-500/20 text-red-400 border-red-500/40',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[verdict] ?? ''}`}>
      {verdict}
    </span>
  )
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative flex items-center justify-center w-12 h-12 flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle
          cx="22" cy="22" r="18" fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${(score / 100) * 113} 113`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-white">{Math.round(score)}</span>
    </div>
  )
}

export default function OpportunityFeed({ jobs, selectedJobId, mode, savedJobIds, onSelect }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-700/60">
        <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
          {mode === 'talent' ? 'Matched Opportunities' : 'Talent Pipeline'} · {jobs.length}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-700/40">
        {jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21 21l-4.35-4.35M11 19A8 8 0 113 11a8 8 0 018 8z" />
            </svg>
            <p className="text-sm">No opportunities yet</p>
            <p className="text-xs mt-1 opacity-60">Move the map or adjust filters</p>
          </div>
        )}

        {jobs.map((job) => {
          const score = job.score
          const isSelected = selectedJobId === job.id
          const isSaved = savedJobIds?.has(job.id) ?? false
          const salary = job.salary_max
            ? `$${(job.salary_max / 1000).toFixed(0)}k`
            : job.salary_min
            ? `$${(job.salary_min / 1000).toFixed(0)}k+`
            : null

          return (
            <button
              key={job.id}
              type="button"
              onClick={() => onSelect(job)}
              className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors hover:bg-slate-700/30
                ${isSelected ? 'bg-slate-700/50 border-l-2 border-[#20C997]' : ''}`}
            >
              {score ? (
                <ScoreRing score={score.total_score} />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-700/50 flex-shrink-0 flex items-center justify-center">
                  <span className="text-slate-400 text-[10px]">—</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white leading-tight truncate">{job.title}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isSaved && (
                      <svg className="w-3.5 h-3.5 text-[#20C997]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 3a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2H5z" />
                      </svg>
                    )}
                    {score && <VerdictBadge verdict={score.verdict} />}
                  </div>
                </div>
                {mode === 'talent' && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{job.business_name}</p>
                )}

                <div className="flex items-center gap-3 mt-1.5">
                  {salary && (
                    <span className="text-xs text-emerald-400 font-medium">{salary}</span>
                  )}
                  {score && (
                    <span className="text-xs text-slate-500">
                      {score.weekly_impact.weekly_commute_hours.toFixed(1)}h/wk commute
                    </span>
                  )}
                  {job.city && (
                    <span className="text-xs text-slate-500 truncate">{job.city}</span>
                  )}
                </div>

                {score?.breakdown && (
                  <div className="flex gap-1.5 mt-2">
                    {[
                      { label: 'Match', val: score.breakdown.match_score },
                      { label: 'Salary', val: score.breakdown.salary_score },
                      { label: 'Commute', val: score.breakdown.commute_score },
                      { label: 'Growth', val: score.breakdown.growth_score },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex-1">
                        <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#20C997]"
                            style={{ width: `${val}%`, opacity: 0.7 + val / 300 }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-0.5 text-center">{label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
