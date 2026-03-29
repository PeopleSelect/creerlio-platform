// Opportunity Intelligence Engine — Shared Types

export interface OpportunityScoreInput {
  user_id: string
  job_id: string
  // Match factors
  match_score: number          // 0–100: skill/role alignment
  salary_current: number       // Current or expected salary (annual)
  salary_offered: number       // Job's offered salary (annual)
  commute_minutes: number      // One-way commute in minutes
  work_mode: 'on_site' | 'hybrid' | 'remote'
  // Growth factors
  industry_growth_pct: number  // Industry YoY growth %
  role_seniority_delta: number // -2 to +2: step down/up in seniority
}

export interface ScoreBreakdown {
  match_score: number
  salary_score: number
  commute_score: number
  growth_score: number
}

export interface WeeklyImpact {
  weekly_commute_hours: number
  hourly_rate: number
  time_value_weekly: number    // hours * hourly_rate = $ cost of commute
  net_weekly_value: number     // salary_delta/52 - time_value_weekly
}

export interface OpportunityScoreResult {
  id: string
  job_id: string
  user_id: string
  total_score: number          // 0–100
  verdict: 'Strong Move' | 'Consider' | 'Avoid'
  breakdown: ScoreBreakdown
  weekly_impact: WeeklyImpact
  recommendation: Recommendation
  created_at: string
}

export interface Recommendation {
  verdict: string
  reasons: string[]            // 3 bullet points
  improvement: string          // 1 suggestion
}

export interface OpportunityEvent {
  user_id: string
  event_type: EventType
  entity_type: 'job' | 'business' | 'map' | 'insight'
  entity_id?: string
  metadata?: Record<string, unknown>
}

export type EventType =
  | 'VIEW_JOB'
  | 'APPLY_JOB'
  | 'SAVE_JOB'
  | 'MAP_MOVE'
  | 'SCORE_JOB'
  | 'SIMULATE_SCENARIO'

export interface GeoInsight {
  id: string
  location: string
  lat: number
  lng: number
  talent_density: number       // 0–100
  job_density: number          // 0–100
  avg_salary: number
  competition_score: number    // 0–100
  updated_at: string
}

export interface InsightsResponse {
  geo_insights: GeoInsight[]
  top_opportunities: OpportunityScoreResult[]
  recommendations: string[]
}

export interface ScenarioParams {
  location?: string
  work_mode?: 'onsite' | 'hybrid' | 'remote'
  salary_offered?: number
  commute_minutes?: number
  match_score_override?: number
  salary_expectation?: number
  commute_tolerance_minutes?: number
}

export interface Job {
  id: string
  title: string
  business_name: string
  business_id: string
  salary_min?: number
  salary_max?: number
  location?: string
  city?: string
  lat?: number
  lng?: number
  employment_type?: string
  work_mode?: string
  remote?: boolean
  industry?: string
  description?: string
  score?: OpportunityScoreResult
}

export type AppMode = 'talent' | 'business'
