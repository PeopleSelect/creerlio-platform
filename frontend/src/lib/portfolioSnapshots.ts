/**
 * Portfolio Snapshot System
 * 
 * Implements Layer 3: Talent Template Snapshot (Render Layer)
 * Creates immutable snapshots of shared portfolio data for business viewing
 */

import { supabase } from './supabase'
import { TemplateId } from '@/components/portfolioTemplates'
import { ShareConfig } from '@/components/PortfolioShareConfig'

export interface SharedPortfolioPayload {
  template_id: TemplateId
  sections: {
    intro?: any
    social?: any
    skills?: string[]
    experience?: any[]
    education?: any[]
    referees?: any[]
    projects?: any[]
    attachments?: any[]
  }
  media: {
    avatar_path?: string | null
    banner_path?: string | null
    intro_video_id?: number | null
  }
  snapshot_timestamp: string
  version: number
}

export interface PortfolioSnapshot {
  id: string
  talent_profile_id: string
  user_id: string
  template_id: TemplateId
  shared_payload: SharedPortfolioPayload
  snapshot_timestamp: string
  version: number
  business_id?: string | null
  created_at: string
}

/**
 * Build shared portfolio payload from full portfolio data and share config
 */
export async function buildSharedPayload(
  fullPortfolio: any,
  shareConfig: ShareConfig,
  templateId: TemplateId
): Promise<SharedPortfolioPayload> {
  const sections: SharedPortfolioPayload['sections'] = {}
  const media: SharedPortfolioPayload['media'] = {}

  // Add sections based on share toggles
  if (shareConfig.share_intro && fullPortfolio.name) {
    sections.intro = {
      name: fullPortfolio.name,
      title: fullPortfolio.title,
      bio: fullPortfolio.bio,
    }
  }

  if (shareConfig.share_social && Array.isArray(fullPortfolio.socialLinks)) {
    sections.social = fullPortfolio.socialLinks.filter((link: any) => link?.url?.trim())
  }

  if (shareConfig.share_skills && Array.isArray(fullPortfolio.skills)) {
    sections.skills = fullPortfolio.skills
  }

  if (shareConfig.share_experience && Array.isArray(fullPortfolio.experience)) {
    sections.experience = fullPortfolio.experience
  }

  if (shareConfig.share_education && Array.isArray(fullPortfolio.education)) {
    sections.education = fullPortfolio.education
  }

  if (shareConfig.share_referees && Array.isArray(fullPortfolio.referees)) {
    sections.referees = fullPortfolio.referees
  }

  if (shareConfig.share_projects && Array.isArray(fullPortfolio.projects)) {
    sections.projects = fullPortfolio.projects
  }

  if (shareConfig.share_attachments && Array.isArray(fullPortfolio.attachments)) {
    sections.attachments = fullPortfolio.attachments
  }

  // Add media based on share toggles
  if (shareConfig.share_avatar && shareConfig.selected_avatar_path) {
    media.avatar_path = shareConfig.selected_avatar_path
  }

  if (shareConfig.share_banner && shareConfig.selected_banner_path) {
    media.banner_path = shareConfig.selected_banner_path
  }

  if (shareConfig.share_intro_video && shareConfig.selected_intro_video_id) {
    media.intro_video_id = shareConfig.selected_intro_video_id
  }

  return {
    template_id: templateId,
    sections,
    media,
    snapshot_timestamp: new Date().toISOString(),
    version: 1,
  }
}

/**
 * Create a portfolio snapshot
 */
export async function createPortfolioSnapshot(
  talentProfileId: string,
  userId: string,
  templateId: TemplateId,
  sharedPayload: SharedPortfolioPayload,
  businessId?: string | null
): Promise<PortfolioSnapshot> {
  const { data, error } = await supabase
    .from('talent_portfolio_snapshots')
    .insert({
      talent_profile_id: talentProfileId,
      user_id: userId,
      template_id: templateId,
      shared_payload: sharedPayload,
      business_id: businessId || null,
    })
    .select()
    .single()

  if (error) throw error

  return data as PortfolioSnapshot
}

/**
 * Get snapshot by ID
 */
export async function getSnapshotById(snapshotId: string): Promise<PortfolioSnapshot | null> {
  const { data, error } = await supabase
    .from('talent_portfolio_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .maybeSingle()

  if (error) throw error
  return data as PortfolioSnapshot | null
}

/**
 * Get latest snapshot for a talent
 */
export async function getLatestSnapshot(
  talentProfileId: string
): Promise<PortfolioSnapshot | null> {
  const { data, error } = await supabase
    .from('talent_portfolio_snapshots')
    .select('*')
    .eq('talent_profile_id', talentProfileId)
    .order('snapshot_timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as PortfolioSnapshot | null
}

/**
 * Get snapshot for a specific business connection
 */
export async function getSnapshotForBusiness(
  talentProfileId: string,
  businessId: string
): Promise<PortfolioSnapshot | null> {
  const { data, error } = await supabase
    .from('talent_portfolio_snapshots')
    .select('*')
    .eq('talent_profile_id', talentProfileId)
    .eq('business_id', businessId)
    .order('snapshot_timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as PortfolioSnapshot | null
}
