/**
 * Creates a portfolio snapshot for Alex Hartley (demo.realestate@creerlio.com)
 * Reads the live portfolio + share config and writes an immutable snapshot to
 * talent_portfolio_snapshots — exactly as the app does when sharing with a business.
 *
 * Run from /frontend:  node scripts/make-alex-snapshot.js
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://empehaulljtwfyzjmvmn.supabase.co'
const SERVICE_ROLE_KEY =
  '' + process.env.SUPABASE_SERVICE_ROLE_KEY + ''
const DEMO_EMAIL = 'demo.realestate@creerlio.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('📸  Creating portfolio snapshot for Alex Hartley...\n')

  // ── 1. Get user ────────────────────────────────────────────────────────────
  const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 500 })
  const user = userList?.users?.find(u => u.email === DEMO_EMAIL)
  if (!user) { console.error('❌  User not found. Run seed-demo-realestate.js first.'); process.exit(1) }
  const userId = user.id
  console.log(`✅  User: ${userId}`)

  // ── 2. Get talent_profile id ───────────────────────────────────────────────
  const { data: profile, error: profileErr } = await supabase
    .from('talent_profiles')
    .select('id, avatar_url, banner_url')
    .eq('user_id', userId)
    .single()
  if (profileErr || !profile) { console.error('❌  Profile not found:', profileErr?.message); process.exit(1) }
  const talentProfileId = profile.id
  console.log(`✅  Profile id: ${talentProfileId}`)

  // ── 3. Load portfolio bank item (item_type = 'portfolio') ──────────────────
  const { data: portfolioItem, error: portErr } = await supabase
    .from('talent_bank_items')
    .select('id, metadata')
    .eq('user_id', userId)
    .eq('item_type', 'portfolio')
    .order('id', { ascending: false })
    .limit(1)
    .single()
  if (portErr || !portfolioItem) { console.error('❌  Portfolio item not found:', portErr?.message); process.exit(1) }
  const portfolio = portfolioItem.metadata
  console.log(`✅  Portfolio item loaded (id: ${portfolioItem.id})`)

  // ── 4. Load share config ───────────────────────────────────────────────────
  const { data: shareConfig } = await supabase
    .from('talent_portfolio_share_config')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  // Default: share everything if no config row exists
  const cfg = shareConfig ?? {
    share_intro: true,
    share_social: true,
    share_skills: true,
    share_experience: true,
    share_education: true,
    share_referees: true,
    share_projects: true,
    share_attachments: true,
    share_avatar: true,
    share_banner: true,
    share_intro_video: true,
    selected_avatar_path: null,
    selected_banner_path: null,
    selected_intro_video_id: null,
  }
  console.log('✅  Share config loaded')

  // ── 5. Get intro video bank item id ───────────────────────────────────────
  const introVideoId = typeof portfolio.introVideoId === 'number' ? portfolio.introVideoId : null
  console.log(`✅  Intro video id: ${introVideoId ?? 'none'}`)

  // ── 6. Build shared_payload (mirrors buildSharedPayload in portfolioSnapshots.ts) ──
  const sections = {}
  const media = {}

  if (cfg.share_intro && portfolio.name) {
    sections.intro = {
      name: portfolio.name,
      title: portfolio.title,
      bio: portfolio.bio,
    }
  }
  if (cfg.share_social && Array.isArray(portfolio.socialLinks)) {
    sections.social = portfolio.socialLinks.filter(l => l?.url?.trim())
  }
  if (cfg.share_skills && Array.isArray(portfolio.skills)) {
    sections.skills = portfolio.skills
  }
  if (cfg.share_experience && Array.isArray(portfolio.experience)) {
    sections.experience = portfolio.experience
  }
  if (cfg.share_education && Array.isArray(portfolio.education)) {
    sections.education = portfolio.education
  }
  if (cfg.share_referees && Array.isArray(portfolio.referees)) {
    sections.referees = portfolio.referees
  }
  if (cfg.share_projects && Array.isArray(portfolio.projects)) {
    sections.projects = portfolio.projects
  }
  if (cfg.share_attachments && Array.isArray(portfolio.attachments)) {
    sections.attachments = portfolio.attachments
  }

  // Media — use selected paths if set, otherwise fall back to profile images
  if (cfg.share_avatar) {
    media.avatar_path = cfg.selected_avatar_path || portfolio.avatar_path || profile.avatar_url || null
  }
  if (cfg.share_banner) {
    media.banner_path = cfg.selected_banner_path || portfolio.banner_path || profile.banner_url || null
  }
  if (cfg.share_intro_video && introVideoId) {
    media.intro_video_id = cfg.selected_intro_video_id || introVideoId
  }

  const sharedPayload = {
    template_id: portfolio.selected_template_id || 'sales-professional',
    sections,
    media,
    snapshot_timestamp: new Date().toISOString(),
    version: 1,
  }

  // ── 7. Log what will be snapshotted ───────────────────────────────────────
  console.log('\n  Snapshot contents:')
  console.log(`    Sections: ${Object.keys(sections).join(', ')}`)
  console.log(`    Skills:   ${(sections.skills ?? []).length} items`)
  console.log(`    Exp:      ${(sections.experience ?? []).length} entries`)
  console.log(`    Edu:      ${(sections.education ?? []).length} entries`)
  console.log(`    Referees: ${(sections.referees ?? []).length} entries`)
  console.log(`    Projects: ${(sections.projects ?? []).length} entries`)
  console.log(`    Attach:   ${(sections.attachments ?? []).length} items`)
  console.log(`    Avatar:   ${media.avatar_path ? '✅' : '—'}`)
  console.log(`    Banner:   ${media.banner_path ? '✅' : '—'}`)
  console.log(`    Video:    ${media.intro_video_id ? `id ${media.intro_video_id}` : '—'}`)
  console.log()

  // ── 8. Insert snapshot ─────────────────────────────────────────────────────
  const { data: snapshot, error: snapErr } = await supabase
    .from('talent_portfolio_snapshots')
    .insert({
      talent_profile_id: talentProfileId,
      user_id: userId,
      template_id: sharedPayload.template_id,
      shared_payload: sharedPayload,
      business_id: null,   // General snapshot — not linked to a specific business
    })
    .select()
    .single()

  if (snapErr) { console.error('❌  Snapshot insert failed:', snapErr.message); process.exit(1) }

  console.log(`✅  Snapshot created!`)
  console.log(`   id:        ${snapshot.id}`)
  console.log(`   timestamp: ${snapshot.snapshot_timestamp ?? sharedPayload.snapshot_timestamp}`)
  console.log(`   template:  ${sharedPayload.template_id}`)
  console.log(`\n🎉  Done! Snapshot id: ${snapshot.id}`)
  console.log(`\n   This snapshot is viewable via the portfolio share / business view system.`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
