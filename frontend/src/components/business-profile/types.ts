export interface ImpactStat {
  label: string
  value: string
  footnote_optional?: string | null
}

export interface ProgramTile {
  title: string
  description: string
  icon?: string | null
}

export interface BenefitCard {
  title: string
  description: string
}

export interface BusinessArea {
  title: string
  area_slug: string
  description?: string | null
}

export interface SocialProofItem {
  quote: string
  author?: string | null
  context?: string | null
}

export type MediaKind = 'image' | 'video' | 'document'

export interface MediaAsset {
  kind: MediaKind
  url: string
  title?: string | null
  mime?: string | null
  size_bytes?: number | null
  created_at?: string | null
  path?: string | null
}

export interface BusinessProfilePageData {
  business_id: string
  slug: string
  is_published: boolean

  name: string
  logo_url?: string | null
  hero_image_url?: string | null
  tagline?: string | null
  mission?: string | null

  value_prop_headline?: string | null
  value_prop_body?: string | null

  impact_stats: ImpactStat[]
  culture_values: string[]
  business_areas: BusinessArea[]
  benefits: BenefitCard[]
  programs: ProgramTile[]
  live_roles_count: number
  talent_community_enabled: boolean
  portfolio_intake_enabled: boolean
  social_proof: SocialProofItem[]

  media_assets?: MediaAsset[]

  acknowledgement_of_country?: string | null

  // Public discovery fields
  hiring_interests?: string[]
  industries_served?: string[]
  contact_email?: string | null
  website_url?: string | null
  enquiry_enabled?: boolean
  badges?: string[]

  // AI-generated intelligence (from business_bank_items)
  ai_sections?:  AIDynamicSection[] | null
  ai_benefits?:  AIStructuredBenefits | null
  ai_talent?:    AITalentProfile | null
}

// ── AI-generated types ─────────────────────────────────────────────────────

export interface AIDynamicSection {
  key: string
  title: string
  content: string | Record<string, any>
  priority: number
  confidence: number
}

export interface AIStructuredBenefits {
  parental_leave?: string[]
  health?:         string[]
  flexibility?:    string[]
  development?:    string[]
  perks?:          string[]
  financial?:      string[]
  wellbeing?:      string[]
  summary?:        string
}

export interface AITalentProfile {
  company_overview?:   string
  what_they_do?:       string
  working_here?:       string
  opportunities?:      string
  ideal_candidates?: {
    mindset?:        string
    experience_level?: string
    working_style?:  string
    background_fit?: string
  }
  services_talent_view?: Array<{
    name: string
    what_you_do_here: string
    skills_you_build: string
    career_value: string
  }>
  company_snapshot?: {
    industry?: string
    business_model_summary?: string
    locations?: string[]
    company_size?: string
    what_sets_them_apart?: string
  }
}


