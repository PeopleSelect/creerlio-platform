'use client'

import React, { useState, useCallback } from 'react'
import type { Job, ScenarioParams } from '../../../../modules/opportunity-intelligence/shared/types'

interface Props {
  job: Job
  onRescore: (params: ScenarioParams) => Promise<void>
  isLoading?: boolean
}

export default function ScenarioSimulator({ job, onRescore, isLoading }: Props) {
  const [open, setOpen] = useState(false)

  const [workMode, setWorkMode] = useState<ScenarioParams['work_mode']>(
    (job.work_mode as ScenarioParams['work_mode']) || 'onsite'
  )
  const [commuteMinutes, setCommuteMinutes] = useState(30)
  const [salaryDelta, setSalaryDelta] = useState(0)  // % change
  const [locationBoost, setLocationBoost] = useState(0) // extra match %

  const handleSimulate = useCallback(async () => {
    const baseSalary = job.salary_max || job.salary_min || 80000
    await onRescore({
      work_mode: workMode,
      commute_minutes: commuteMinutes,
      salary_offered: Math.round(baseSalary * (1 + salaryDelta / 100)),
      match_score_override: Math.min(100, (job.score?.breakdown?.match_score ?? 60) + locationBoost),
    })
  }, [job, workMode, commuteMinutes, salaryDelta, locationBoost, onRescore])

  return (
    <div className="border border-slate-700/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700/20 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#20C997]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
          Scenario Simulator
        </span>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/40">
          <p className="text-xs text-slate-500 pt-3">
            Adjust these parameters and re-simulate to see how the score changes.
          </p>

          {/* Work Mode */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">Work Mode</label>
            <div className="flex gap-2">
              {(['onsite', 'hybrid', 'remote'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setWorkMode(m)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors
                    ${workMode === m
                      ? 'bg-[#20C997] text-black'
                      : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700/70'
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Commute */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">
              Commute: <span className="text-slate-300 normal-case">{commuteMinutes} min each way</span>
            </label>
            <input
              type="range" min={0} max={120} step={5}
              value={commuteMinutes}
              onChange={(e) => setCommuteMinutes(Number(e.target.value))}
              className="w-full accent-[#20C997]"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
              <span>0 min</span><span>60 min</span><span>120 min</span>
            </div>
          </div>

          {/* Salary Delta */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">
              Salary adjustment: <span className={`normal-case ${salaryDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {salaryDelta >= 0 ? '+' : ''}{salaryDelta}%
              </span>
            </label>
            <input
              type="range" min={-20} max={40} step={5}
              value={salaryDelta}
              onChange={(e) => setSalaryDelta(Number(e.target.value))}
              className="w-full accent-[#20C997]"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
              <span>-20%</span><span>0%</span><span>+40%</span>
            </div>
          </div>

          {/* Location / Match boost */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">
              Skills improvement: <span className="text-slate-300 normal-case">+{locationBoost} pts</span>
            </label>
            <input
              type="range" min={0} max={30} step={5}
              value={locationBoost}
              onChange={(e) => setLocationBoost(Number(e.target.value))}
              className="w-full accent-[#20C997]"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
              <span>Current</span><span>+15</span><span>+30</span>
            </div>
          </div>

          <button
            onClick={handleSimulate}
            disabled={isLoading}
            className="w-full py-2 rounded-xl text-sm font-semibold text-black transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #20C997, #3b82f6)' }}
          >
            {isLoading ? 'Simulating…' : 'Run Simulation'}
          </button>
        </div>
      )}
    </div>
  )
}
