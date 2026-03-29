export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'
import type {
  OpportunityScoreInput,
  OpportunityScoreResult,
  ScoreBreakdown,
  WeeklyImpact,
  Recommendation,
} from '../../../../../modules/opportunity-intelligence/shared/types'

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function computeSalaryScore(current: number, offered: number): number {
  if (current <= 0) return 50
  const delta = (offered - current) / current
  if (delta >= 0.20) return 100
  if (delta >= 0.10) return 85
  if (delta >= 0.05) return 70
  if (delta >= 0)    return 55
  if (delta >= -0.05) return 35
  return 10
}

function computeCommuteScore(minutes: number, mode: string): number {
  const adj = mode === 'remote' ? 0 : mode === 'hybrid' ? minutes * 0.5 : minutes
  if (adj === 0)   return 100
  if (adj <= 15)   return 95
  if (adj <= 30)   return 80
  if (adj <= 45)   return 60
  if (adj <= 60)   return 40
  if (adj <= 90)   return 20
  return 5
}

function computeGrowthScore(industryGrowthPct: number, seniorityDelta: number): number {
  const industryPart = Math.min(100, Math.max(0, 50 + industryGrowthPct * 3))
  const seniorityPart = Math.min(100, Math.max(0, 50 + seniorityDelta * 20))
  return Math.round(industryPart * 0.6 + seniorityPart * 0.4)
}

function computeWeeklyImpact(
  salaryOffered: number,
  commuteMinutes: number,
  mode: string,
  salaryCurrent: number,
): WeeklyImpact {
  const hourlyRate = salaryOffered / 52 / 40
  const effectiveCommute = mode === 'remote' ? 0 : mode === 'hybrid' ? commuteMinutes * 0.5 : commuteMinutes
  const weekly_commute_hours = parseFloat(((effectiveCommute * 2 * 5) / 60).toFixed(2))
  const time_value_weekly = parseFloat((weekly_commute_hours * hourlyRate).toFixed(2))
  const salaryDeltaWeekly = (salaryOffered - salaryCurrent) / 52
  const net_weekly_value = parseFloat((salaryDeltaWeekly - time_value_weekly).toFixed(2))
  return { weekly_commute_hours, hourly_rate: parseFloat(hourlyRate.toFixed(2)), time_value_weekly, net_weekly_value }
}

function generateRecommendation(
  breakdown: ScoreBreakdown,
  total: number,
  weekly: WeeklyImpact,
): Recommendation {
  const verdict = total >= 70 ? 'Strong Move' : total >= 45 ? 'Consider' : 'Avoid'

  const reasons: string[] = []

  if (breakdown.match_score >= 70)
    reasons.push(`Strong role alignment — your skills match ${Math.round(breakdown.match_score)}% of requirements.`)
  else if (breakdown.match_score < 50)
    reasons.push(`Skill gap detected — only ${Math.round(breakdown.match_score)}% match. Upskilling may be needed.`)
  else
    reasons.push(`Reasonable fit at ${Math.round(breakdown.match_score)}% skill alignment.`)

  if (breakdown.salary_score >= 70)
    reasons.push(`Salary uplift of ${weekly.net_weekly_value >= 0 ? '+' : ''}$${Math.round(weekly.net_weekly_value)}/wk net after commute costs.`)
  else if (breakdown.salary_score < 40)
    reasons.push(`Salary is below your current level — net weekly impact is $${Math.round(weekly.net_weekly_value)}.`)
  else
    reasons.push(`Salary is comparable to current. Commute costs offset gains by $${Math.round(weekly.time_value_weekly)}/wk.`)

  if (breakdown.growth_score >= 70)
    reasons.push(`High-growth industry and upward seniority trajectory.`)
  else if (breakdown.growth_score < 45)
    reasons.push(`Limited growth signals — consider the long-term ceiling.`)
  else
    reasons.push(`Moderate growth potential. Market is stable but competitive.`)

  const weakest = Object.entries(breakdown).sort((a, b) => a[1] - b[1])[0][0]
  const improvementMap: Record<string, string> = {
    match_score: 'Complete 1–2 certifications to close the skill gap before applying.',
    salary_score: 'Negotiate a sign-on bonus or earlier review cycle to offset the salary gap.',
    commute_score: 'Request 2 WFH days per week to reduce commute cost by ~40%.',
    growth_score: 'Ask about internal promotion timelines and training budget in the interview.',
  }

  return { verdict, reasons, improvement: improvementMap[weakest] || 'Request flexibility terms to improve overall value.' }
}

// ─── POST /api/opportunity/score ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: OpportunityScoreInput = await req.json()
    const { user_id, job_id, match_score, salary_current, salary_offered, commute_minutes, work_mode, industry_growth_pct, role_seniority_delta } = body

    if (!user_id || !job_id) return NextResponse.json({ error: 'user_id and job_id required' }, { status: 400 })

    // Compute sub-scores
    const m = Math.min(100, Math.max(0, match_score))
    const s = computeSalaryScore(salary_current, salary_offered)
    const c = computeCommuteScore(commute_minutes, work_mode)
    const g = computeGrowthScore(industry_growth_pct ?? 5, role_seniority_delta ?? 0)

    const breakdown: ScoreBreakdown = { match_score: m, salary_score: s, commute_score: c, growth_score: g }

    const total_score = parseFloat(
      (m * 0.35 + s * 0.25 + c * 0.20 + g * 0.20).toFixed(1)
    )
    const verdict: OpportunityScoreResult['verdict'] =
      total_score >= 70 ? 'Strong Move' : total_score >= 45 ? 'Consider' : 'Avoid'

    const weekly_impact = computeWeeklyImpact(salary_offered, commute_minutes, work_mode, salary_current)
    const recommendation = generateRecommendation(breakdown, total_score, weekly_impact)

    const svc = supabaseServiceServer()

    const { data, error } = await svc
      .from('opportunity_scores')
      .upsert({
        user_id,
        job_id,
        match_score: m,
        salary_score: s,
        commute_score: c,
        growth_score: g,
        total_score,
        verdict,
        weekly_commute_hours: weekly_impact.weekly_commute_hours,
        weekly_time_cost: weekly_impact.time_value_weekly,
        weekly_net_value: weekly_impact.net_weekly_value,
        breakdown,
        recommendation,
      }, { onConflict: 'user_id,job_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const result: OpportunityScoreResult = {
      id: data.id,
      job_id,
      user_id,
      total_score,
      verdict,
      breakdown,
      weekly_impact,
      recommendation,
      created_at: data.created_at,
    }

    return NextResponse.json({ success: true, score: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Score computation failed' }, { status: 500 })
  }
}
