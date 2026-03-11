'use client'

interface SnapshotStat {
  id: string
  snapshot_title: string
  headline: string
  is_active: boolean
  view_count: number
  search_appearance_count: number
  pending_requests: number
  approved_requests: number
  declined_requests: number
  created_at: string
}

interface SnapshotAnalyticsPanelProps {
  snapshots: SnapshotStat[]
  className?: string
}

function StatBadge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function SnapshotAnalyticsPanel({ snapshots, className = '' }: SnapshotAnalyticsPanelProps) {
  const totalViews = snapshots.reduce((s, sn) => s + sn.view_count, 0)
  const totalSearches = snapshots.reduce((s, sn) => s + sn.search_appearance_count, 0)
  const totalPending = snapshots.reduce((s, sn) => s + sn.pending_requests, 0)
  const totalApproved = snapshots.reduce((s, sn) => s + sn.approved_requests, 0)
  const totalDeclined = snapshots.reduce((s, sn) => s + sn.declined_requests, 0)
  const totalRequests = totalPending + totalApproved + totalDeclined
  const approvalRate = totalRequests > 0 ? Math.round((totalApproved / totalRequests) * 100) : null

  if (snapshots.length === 0) {
    return (
      <div className={`rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center ${className}`}>
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-slate-500 text-sm">No snapshot analytics yet.</p>
        <p className="text-slate-600 text-xs mt-1">Create and activate a snapshot to start tracking.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary row */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <p className="text-sm font-semibold text-slate-300 mb-4">All snapshots — overview</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatBadge value={totalViews}    label="Total views"       color="text-white" />
          <StatBadge value={totalSearches} label="Search appearances" color="text-white" />
          <StatBadge value={totalPending}  label="Pending requests"  color="text-amber-400" />
          <StatBadge value={totalApproved} label="Approved"          color="text-emerald-400" />
          <div className="text-center">
            <p className="text-xl font-bold text-white">
              {approvalRate !== null ? `${approvalRate}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Approval rate</p>
          </div>
        </div>
      </div>

      {/* Per-snapshot breakdown */}
      <div className="space-y-3">
        {snapshots.map((sn) => {
          const requests = sn.pending_requests + sn.approved_requests + sn.declined_requests
          const rate = requests > 0 ? Math.round((sn.approved_requests / requests) * 100) : null

          return (
            <div key={sn.id} className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-white text-sm truncate">{sn.snapshot_title}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      sn.is_active
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}>
                      {sn.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{sn.headline}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="text-center bg-slate-800 rounded-lg py-2">
                  <p className="text-sm font-bold text-white">{sn.view_count}</p>
                  <p className="text-xs text-slate-500">Views</p>
                </div>
                <div className="text-center bg-slate-800 rounded-lg py-2">
                  <p className="text-sm font-bold text-white">{sn.search_appearance_count}</p>
                  <p className="text-xs text-slate-500">Searches</p>
                </div>
                <div className="text-center bg-slate-800 rounded-lg py-2">
                  <p className="text-sm font-bold text-amber-400">{sn.pending_requests}</p>
                  <p className="text-xs text-slate-500">Requests</p>
                </div>
                <div className="text-center bg-slate-800 rounded-lg py-2">
                  <p className="text-sm font-bold text-white">{rate !== null ? `${rate}%` : '—'}</p>
                  <p className="text-xs text-slate-500">Approval</p>
                </div>
              </div>

              {sn.pending_requests > 0 && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-300">
                    {sn.pending_requests} pending request{sn.pending_requests !== 1 ? 's' : ''} — review in your inbox
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
