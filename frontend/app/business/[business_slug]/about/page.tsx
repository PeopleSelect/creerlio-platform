import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { BusinessPublicProfileView } from '@/components/business-profile/BusinessPublicProfileView'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Row = Record<string, any>

function asString(v: any): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function safeArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

export default async function BusinessAboutPage({ params }: { params: { business_slug: string } }) {
  const slug = params?.business_slug
  if (!slug) return notFound()

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return notFound()

  const supabase = createClient(url, anon)

  // 1. Find business profile by slug
  let bp: Row | null = null
  for (const col of ['slug', 'business_slug', 'handle']) {
    const res = await supabase.from('business_profiles').select('*').eq(col as any, slug).maybeSingle()
    if (!res.error && res.data) { bp = res.data as Row; break }
  }
  if (!bp) return notFound()

  const businessId: string = String(bp.id ?? '')
  const userId: string     = asString(bp.user_id) ?? ''
  // For seeded profiles user_id is null, so bank items are stored with user_id = businessId
  const lookupId: string   = userId || businessId

  // 2. Profile bank item (editor form state — bio, socialLinks, culture fields, etc.)
  let profileMeta: Row = {}
  if (lookupId) {
    const res = await supabase
      .from('business_bank_items')
      .select('metadata')
      .eq('user_id', lookupId)
      .eq('item_type', 'profile')
      .maybeSingle()
    if (!res.error && res.data?.metadata) profileMeta = res.data.metadata as Row
  }

  // 3. AI bank items
  let aiSections: any[] = []
  let aiBenefits: any   = null
  if (lookupId) {
    const { data: aiItems } = await supabase
      .from('business_bank_items')
      .select('item_type, metadata')
      .eq('user_id', lookupId)
      .in('item_type', ['dynamic_sections', 'structured_benefits'])
      .eq('is_active', true)
    if (Array.isArray(aiItems)) {
      for (const item of aiItems) {
        if (item.item_type === 'dynamic_sections' && item.metadata?.sections) aiSections = item.metadata.sections
        if (item.item_type === 'structured_benefits') aiBenefits = item.metadata
      }
    }
  }

  // 4. Products
  let productCards: any[] = []
  if (businessId) {
    const { data: cards } = await supabase
      .from('business_products_services')
      .select('id, name, category, short_description, who_it_is_for, external_link, lifecycle_stage, signals')
      .eq('business_id', businessId)
    if (Array.isArray(cards)) productCards = cards
  }

  // 5. Jobs — try business_id (uuid column for seeded), then business_profile_id (bigint)
  let jobs: any[] = []
  if (businessId) {
    const { data: j1 } = await supabase
      .from('jobs')
      .select('id, title, employment_type, location, description')
      .eq('business_id', businessId)
      .eq('status', 'published')
    if (Array.isArray(j1) && j1.length > 0) {
      jobs = j1
    } else {
      // fallback: try business_profile_id (seeded profiles store both as the user UUID)
      const { data: j2 } = await supabase
        .from('jobs')
        .select('id, title, employment_type, location, description')
        .eq('business_profile_id', businessId)
        .eq('status', 'published')
      if (Array.isArray(j2) && j2.length > 0) {
        jobs = j2
      } else {
        // final fallback: numeric id for legacy businesses
        const numericId = bp.numeric_id ?? bp.legacy_id ?? null
        if (numericId) {
          const { data: j3 } = await supabase
            .from('jobs')
            .select('id, title, employment_type, location, description')
            .eq('business_profile_id', numericId)
            .eq('status', 'published')
          if (Array.isArray(j3)) jobs = j3
        }
      }
    }
  }

  // 6. Attachments from bank items (non-profile types with a file)
  let attachments: any[] = []
  if (lookupId) {
    const { data: bankItems } = await supabase
      .from('business_bank_items')
      .select('id, title, item_type, file_type, file_url, file_path')
      .eq('user_id', lookupId)
      .not('item_type', 'in', '("profile","dynamic_sections","structured_benefits","talent_profile")')
      .not('file_path', 'is', null)
    if (Array.isArray(bankItems)) attachments = bankItems
  }

  // Derive display fields — profile bank item takes priority, then business_profiles columns
  const name     = asString(profileMeta.name) || asString(profileMeta.businessName) || asString(bp.name) || asString(bp.business_name) || asString(bp.company_name) || 'Business'
  const industry = asString(profileMeta.industry) || asString(bp.industry) || null
  const tagline  = asString(profileMeta.tagline) || asString(bp.tagline) || null
  const location = asString(profileMeta.location) || asString(bp.location) || null
  const bio      = asString(profileMeta.bio) || asString(bp.bio) || asString(bp.about) || null
  const email    = asString(profileMeta.email) || asString(bp.contact_email) || null
  const logo_url = asString(profileMeta.logo_url) || asString(bp.logo_url) || null

  const socialLinks = safeArray<{ platform: string; url: string }>(profileMeta.socialLinks)
    .filter(s => s && typeof s.platform === 'string' && typeof s.url === 'string' && s.url)

  const cultureDecisions = asString(profileMeta.cultureDecisions) || null
  const cultureFeedback  = asString(profileMeta.cultureFeedback)  || null
  const cultureConflict  = asString(profileMeta.cultureConflict)  || null
  const cultureSuccess   = asString(profileMeta.cultureSuccess)   || null

  // Intro video URL from bank items
  let introVideoUrl: string | null = null
  if (lookupId) {
    const { data: videoItem } = await supabase
      .from('business_bank_items')
      .select('file_url, metadata')
      .eq('user_id', lookupId)
      .eq('item_type', 'video')
      .maybeSingle()
    if (videoItem) {
      introVideoUrl = asString(videoItem.file_url) || asString(videoItem.metadata?.url) || null
    }
    // Also check intro_video type or metadata.introVideoUrl in profile
    if (!introVideoUrl && profileMeta.introVideoUrl) {
      introVideoUrl = asString(profileMeta.introVideoUrl)
    }
  }

  return (
    <BusinessPublicProfileView
      name={name}
      logo_url={logo_url}
      industry={industry}
      tagline={tagline}
      location={location}
      bio={bio}
      email={email}
      socialLinks={socialLinks}
      cultureDecisions={cultureDecisions}
      cultureFeedback={cultureFeedback}
      cultureConflict={cultureConflict}
      cultureSuccess={cultureSuccess}
      introVideoUrl={introVideoUrl}
      productCards={productCards}
      jobs={jobs}
      attachments={attachments}
      aiSections={aiSections}
      aiBenefits={aiBenefits}
    />
  )
}
