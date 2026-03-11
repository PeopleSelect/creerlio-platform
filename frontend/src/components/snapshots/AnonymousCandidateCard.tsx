'use client'

import { useState } from 'react'

export interface SnapshotResult {
  id: string
  anon_id: string
  headline: string
  experience_years: number | null
  location: string | null
  skills: string[]
  industry_tags: string[]
  summary: string | null
  view_count: number
  created_at: string
}

interface AnonymousCandidateCardProps {
  snapshot: SnapshotResult
  onRequestAccess?: (snapshot: SnapshotResult) => void
  onViewDetails?: (snapshot: SnapshotResult) => void
  className?: string
}

export default function AnonymousCandidateCard({
  snapshot,
  onRequestAccess,
  onViewDetails,
  className = '',
}: AnonymousCandidateCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Generate a consistent accent color from the anon_id
  const colors = ['emerald', 'teal', 'cyan', 'violet', 'indigo', 'blue']
  const colorIndex = snapshot.anon_id.charCodeAt(4) % colors.length
  const color = colors[colorIndex]

  const colorMap: Record<string, { bg: string; text: string; border: string; avatar: string }> = {
    emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/40', avatar: 'from-emerald-600 to-teal-600' },
    teal:    { bg: 'bg-teal-500/15',    text: 'text-teal-300',    border: 'border-teal-500/40',    avatar: 'from-teal-600 to-cyan-600' },
    cyan:    { bg: 'bg-cyan-500/15',    text: 'text-cyan-300',    border: 'border-cyan-500/40',    avatar: 'from-cyan-600 to-blue-600' },
    violet:  { bg: 'bg-violet-500/15',  text: 'text-violet-300',  border: 'border-violet-500/40',  avatar: 'from-violet-600 to-purple-600' },
    indigo:  { bg: 'bg-indigo-500/15',  text: 'text-indigo-300',  border: 'border-indigo-500/40',  avatar: 'from-indigo-600 to-violet-600' },
    blue:    { bg: 'bg-blue-500/15',    text: 'text-blue-300',    border: 'border-blue-500/40',    avatar: 'from-blue-600 to-indigo-600' },
  }
  const c = colorMap[color]

  const displaySkills = snapshot.skills.slice(0, 6)
  const extraSkills = snapshot.skills.length - 6

  return (
    <div className={`rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all ${className}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Anonymous avatar */}
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.avatar} flex items-center justify-center shrink-0`}>
            <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            {/* Anon ID badge */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono ${c.bg} ${c.text} border ${c.border}`}>
                {snapshot.anon_id}
              </span>
              <span className="px-2 py-0.5 rounded-md text-xs bg-slate-800 text-slate-400 border border-slate-700">
                Anonymous
              </span>
            </div>
            <p className="font-semibold text-white text-sm leading-tight">{snapshot.headline}</p>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-4">
          {snapshot.experience_years != null && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {snapshot.experience_years} yr{snapshot.experience_years !== 1 ? 's' : ''} exp.
            </span>
          )}
          {snapshot.location && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {snapshot.location}
            </span>
          )}
        </div>

        {/* Skills */}
        {displaySkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {displaySkills.map((skill) => (
              <span key={skill} className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700">
                {skill}
              </span>
            ))}
            {extraSkills > 0 && (
              <span className="px-2.5 py-1 bg-slate-800 text-slate-500 text-xs rounded-lg border border-slate-700">
                +{extraSkills} more
              </span>
            )}
          </div>
        )}

        {/* Industry tags */}
        {snapshot.industry_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {snapshot.industry_tags.map((tag) => (
              <span key={tag} className={`px-2 py-0.5 text-xs rounded-full ${c.bg} ${c.text} border ${c.border}`}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Summary preview */}
        {snapshot.summary && (
          <div className="mb-4">
            <p className={`text-xs text-slate-400 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
              {snapshot.summary}
            </p>
            {snapshot.summary.length > 120 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-slate-500 hover:text-slate-300 mt-1 transition-colors"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={() => onRequestAccess?.(snapshot)}
            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-colors"
          >
            Request Full Profile
          </button>
          <button
            onClick={() => onViewDetails?.(snapshot)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}
