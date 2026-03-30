/**
 * Updates Meridian Property Group with:
 *  - DALL-E logo image → business_profile_pages.logo_url + bank item (logo)
 *  - All 8 property/team images → business_bank_items (image)
 *  - Intro video → business_bank_items (business_introduction)
 *  - 4 document images (licences/awards) → business_bank_items (document)
 *  - 3 link items → business_bank_items (link)
 *  - All product service sub-tables: teams, skills, roles, growth, impact, signals
 *
 * Run from /frontend:  node scripts/update-meridian-complete.js
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const fs = require('fs')
const path = require('path')
const os = require('os')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://empehaulljtwfyzjmvmn.supabase.co'
const SERVICE_ROLE_KEY = '' + process.env.SUPABASE_SERVICE_ROLE_KEY + ''
const OPENAI_API_KEY   = '' + process.env.OPENAI_API_KEY + ''
const USER_ID = '63e4d2c8-b9dd-4884-bb6b-eba49bfdccce'
const BIZ_ID  = USER_ID

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

const SRC_BUCKET = 'talent-bank'    // Where we stored seed images
const DST_BUCKET = 'business-bank'  // Where business bank items live

// ── Source image storage paths (from seed run) ────────────────────────────────
// We'll list them from talent-bank and match by filename suffix
const IMAGE_DEFS = [
  { key: 'hero',      filename: 'meridian-hero.jpg',               title: 'Meridian Hero — Double Bay Waterfront Property',         bankType: 'image' },
  { key: 'office',   filename: 'meridian-office.jpg',              title: 'Meridian Office — Double Bay HQ Interior',               bankType: 'image' },
  { key: 'team',     filename: 'meridian-team.jpg',                title: 'Meridian Team — Our Specialist Agents',                  bankType: 'image' },
  { key: 'awards',   filename: 'meridian-awards.jpg',              title: 'Meridian Awards — RateMyAgent #1 Eastern Suburbs',        bankType: 'image' },
  { key: 'property1',filename: 'meridian-property-mosman.jpg',     title: 'Featured Listing — Luxury Mosman Home',                  bankType: 'image' },
  { key: 'property2',filename: 'meridian-property-doublebay.jpg',  title: 'Featured Listing — Double Bay Penthouse',                bankType: 'image' },
  { key: 'culture',  filename: 'meridian-culture.jpg',             title: 'Our Culture — Team Collaboration',                       bankType: 'image' },
  { key: 'community',filename: 'meridian-community.jpg',           title: 'Community — Meridian Gives Back',                        bankType: 'image' },
]

// New DALL-E images to generate specifically for the bank
const NEW_IMAGES = [
  {
    key: 'logo',
    filename: 'meridian-logo.jpg',
    prompt: 'Minimal professional real estate agency logo on clean white background, elegant serif "M" lettermark with thin gold horizontal lines and the text "Meridian" beneath in dark charcoal, luxury brand identity, high-end corporate, vector-style, perfectly centered',
    bankType: 'logo',
    title: 'Meridian Property Group — Brand Logo',
  },
  {
    key: 'licence',
    filename: 'meridian-realestate-licence.jpg',
    prompt: 'Professional NSW Real Estate Licence certificate document, white parchment background, NSW Government seal, reads "Real Estate Agency Licence — Meridian Property Group", licence number MPG-2024-001, signed and dated 2024, gold embossed border, official typography, flat lay photography',
    bankType: 'document',
    title: 'NSW Real Estate Agency Licence — Meridian Property Group',
  },
  {
    key: 'award_cert',
    filename: 'meridian-ratemyagent-award.jpg',
    prompt: 'Professional industry award certificate, elegant white and gold design, reads "RateMyAgent Agency of the Year — Eastern Suburbs 2024" presented to "Meridian Property Group", gold trophy icon, official seal, celebration photography with agents holding the framed award plaque',
    bankType: 'document',
    title: 'RateMyAgent — Agency of the Year Eastern Suburbs 2024',
  },
  {
    key: 'employer_cert',
    filename: 'meridian-employer-award.jpg',
    prompt: 'REINSW Employer of Choice 2023 award plaque and certificate, professional photography, Real Estate Institute of NSW official branding, elegant presentation box with "Meridian Property Group" engraved, warm studio lighting, flat lay on marble surface',
    bankType: 'document',
    title: 'REINSW Employer of Choice Award 2023',
  },
  {
    key: 'pi_insurance',
    filename: 'meridian-insurance-cert.jpg',
    prompt: 'Professional indemnity insurance certificate document, white background, insurance company letterhead, reads "Certificate of Currency — Professional Indemnity Insurance — Meridian Property Group", policy number, coverage dates 2024-2025, official corporate document style, flat lay photography',
    bankType: 'document',
    title: 'Professional Indemnity Insurance Certificate of Currency 2024–2025',
  },
]

// ── Product sub-table data ────────────────────────────────────────────────────

// Products: id 2 = Prestige Residential Sales, 3 = Property Mgmt, 4 = Commercial Leasing
const PRODUCT_DATA = {
  2: { // Prestige Residential Sales
    teams: [
      { team_name: 'Eastern Suburbs Sales Team', team_size: 18, team_description: 'Our flagship sales team — 18 specialist agents covering Double Bay, Bellevue Hill, Mosman, Vaucluse, and Bondi Beach.' },
      { team_name: 'Auction & Negotiation Unit', team_size: 6, team_description: 'Dedicated team of licensed auctioneers and senior negotiators who manage all competitive sale campaigns.' },
      { team_name: 'Listing & Marketing Team', team_size: 8, team_description: 'In-house marketing specialists handling photography, copywriting, digital campaigns, and print collateral for every listing.' },
    ],
    skills: [
      { skill_name: 'Property Appraisal & Pricing Strategy' },
      { skill_name: 'Auction Calling & Bidding Strategy' },
      { skill_name: 'Vendor & Buyer Communication' },
      { skill_name: 'Contract Negotiation & Execution' },
      { skill_name: 'Digital Marketing & Social Media' },
      { skill_name: 'Database Management (Rex CRM)' },
      { skill_name: 'Prestige Property Market Analysis' },
      { skill_name: 'Staging & Property Presentation' },
    ],
    roles: [
      { role_name: 'Senior Sales Agent', role_description: 'Manages their own listing portfolio, conducts appraisals, and leads sale campaigns end-to-end.' },
      { role_name: 'Licensed Auctioneer', role_description: 'Conducts on-site and online auctions, manages bidding strategy on auction day.' },
      { role_name: 'Sales Associate', role_description: 'Supports senior agents with prospecting, open homes, and client follow-up.' },
      { role_name: 'Listing Coordinator', role_description: 'Manages campaign timelines, vendor communication, and portal listings.' },
    ],
    growth_areas: [
      { growth_area: 'AI-powered property valuation and market intelligence tools', priority: 'high' },
      { growth_area: 'Off-market and pre-market property network expansion', priority: 'high' },
      { growth_area: 'Buyer advocacy and dual-agency service offering', priority: 'medium' },
      { growth_area: 'Luxury auction live-streaming and virtual bidding platforms', priority: 'medium' },
    ],
    impact: {
      who_it_helps: 'Homeowners, investors, deceased estates, and relocating families seeking to achieve the best possible sale outcome in Sydney\'s premium property market.',
      what_it_improves: 'Sale price outcomes through strategic campaign design, broad buyer reach, and expert negotiation — consistently achieving above-reserve results.',
      real_world_outcomes: '81% clearance rate at auction (2024 vs 68% Sydney average). Average days on market: 22 days. Average sale price: $2.1M. Highest recorded result: $12.4M — Vaucluse waterfront, 2023.',
    },
    signals: [{ is_hiring: true, hiring_note: 'We are actively hiring Senior Sales Agents and Auctioneers for Q1 2025.' }],
  },
  3: { // Residential Property Management
    teams: [
      { team_name: 'Inner West Property Management', team_size: 12, team_description: 'Specialist PM team managing 800+ residential properties across Balmain, Rozelle, Annandale, Leichhardt, and Glebe.' },
      { team_name: 'PM Administration & Compliance', team_size: 5, team_description: 'Back-office team handling arrears, bond processing, maintenance coordination, and NCAT proceedings.' },
      { team_name: 'Leasing & New Business', team_size: 4, team_description: 'Dedicated leasing team focused on tenant acquisition, rental appraisals, and portfolio growth.' },
    ],
    skills: [
      { skill_name: 'NSW Residential Tenancy Legislation (RTA 2010)' },
      { skill_name: 'PropertyMe Portfolio Management Software' },
      { skill_name: 'Tenant Screening & Reference Checking' },
      { skill_name: 'Routine Inspection & Condition Reporting' },
      { skill_name: 'Rent Review & Market Analysis' },
      { skill_name: 'Arrears Management & NCAT Proceedings' },
      { skill_name: 'Maintenance Coordination & Trade Liaison' },
      { skill_name: 'Investor Reporting & Communication' },
    ],
    roles: [
      { role_name: 'Senior Property Manager', role_description: 'Manages a portfolio of 120–150 properties with full lifecycle responsibility including inspections, renewals, and arrears.' },
      { role_name: 'Property Management Assistant', role_description: 'Supports senior PMs with administration, inspections, maintenance, and tenant correspondence.' },
      { role_name: 'Leasing Agent', role_description: 'Conducts rental appraisals, markets vacancies, screens tenants, and prepares lease documentation.' },
    ],
    growth_areas: [
      { growth_area: 'PropTech integration — automated inspection scheduling and AI maintenance triage', priority: 'high' },
      { growth_area: 'Short-term and holiday rental management (Airbnb/Stayz co-hosting)', priority: 'medium' },
      { growth_area: 'NDIS and disability accommodation property management', priority: 'medium' },
      { growth_area: 'Investment portfolio advisory and growth planning service', priority: 'low' },
    ],
    impact: {
      who_it_helps: 'Residential property investors who want stress-free, high-performance management of their investment portfolio without the headaches of self-management.',
      what_it_improves: 'Rental yield, vacancy rates, tenant quality, and asset condition through proactive management, rigorous tenant screening, and planned maintenance.',
      real_world_outcomes: 'Average vacancy rate: 1.2% (vs Sydney average 2.8%). Average tenancy length: 27 months. Rental arrears below 0.5% of portfolio. 98% landlord retention rate year-on-year.',
    },
    signals: [{ is_hiring: true, hiring_note: 'Actively hiring Property Managers at all levels for our expanding Inner West portfolio.' }],
  },
  4: { // Commercial Leasing & Advisory
    teams: [
      { team_name: 'CBD & Fringe Leasing Team', team_size: 8, team_description: 'Commercial leasing specialists covering Sydney CBD, Surry Hills, Pyrmont, North Sydney, and Macquarie Park.' },
      { team_name: 'Retail Leasing Division', team_size: 5, team_description: 'Dedicated retail specialists handling high-street, neighbourhood centre, and specialty retail leasing.' },
      { team_name: 'Commercial Advisory', team_size: 3, team_description: 'Senior advisors providing strategic asset positioning, market analysis, and lease audit services to landlords.' },
    ],
    skills: [
      { skill_name: 'Commercial Lease Negotiation & Heads of Agreement' },
      { skill_name: 'Market Rent Review & Rental Analysis' },
      { skill_name: 'Information Memorandum (IM) Preparation' },
      { skill_name: 'Incentive Structuring & Fitout Contributions' },
      { skill_name: 'REINSW Commercial Accreditation' },
      { skill_name: 'Tenant Representation & Site Selection' },
      { skill_name: 'Outgoings & Gross/Net Lease Structuring' },
      { skill_name: 'Commercial Property Due Diligence' },
    ],
    roles: [
      { role_name: 'Commercial Leasing Executive', role_description: 'Lists and leases office, retail, and industrial spaces; manages landlord and tenant relationships through full lease cycle.' },
      { role_name: 'Tenant Representative', role_description: 'Acts exclusively for tenants in site selection, negotiation, and lease execution.' },
      { role_name: 'Commercial Analyst', role_description: 'Supports the team with market data, comparable transactions, IM preparation, and reporting.' },
    ],
    growth_areas: [
      { growth_area: 'Flexible and co-working space leasing advisory (post-COVID market shift)', priority: 'high' },
      { growth_area: 'Industrial and logistics leasing — Western Sydney growth corridor', priority: 'high' },
      { growth_area: 'Sustainability-focused green lease structuring and NABERS advisory', priority: 'medium' },
      { growth_area: 'Digital tenant enquiry platforms and AI-driven vacancy matching', priority: 'medium' },
    ],
    impact: {
      who_it_helps: 'Commercial property landlords seeking to maximise occupancy and rental income, and corporate tenants searching for the right premises to support business growth.',
      what_it_improves: 'Vacancy periods, lease terms, tenant quality, and long-term asset performance through market expertise and active landlord-tenant relationship management.',
      real_world_outcomes: 'Average CBD lease transaction time: 48 days. Average achieved rent vs asking: 98.2%. $340M+ in commercial leasing transactions executed since 2018. 82% landlord retention across managed portfolios.',
    },
    signals: [{ is_hiring: true, hiring_note: 'Expanding commercial division — seeking Commercial Leasing Executives with CBD and retail experience.' }],
  },
}

// ── Link items for bank ───────────────────────────────────────────────────────

const LINKS = [
  { title: 'RateMyAgent — Meridian Property Group', description: 'Our RateMyAgent profile featuring 400+ verified client reviews and Eastern Suburbs Agency of the Year Award 2024.', metadata: { url: 'https://www.ratemyagent.com.au', link_type: 'review_platform' } },
  { title: 'REINSW — Real Estate Institute of NSW Member', description: 'Meridian Property Group is a fully accredited member of the Real Estate Institute of NSW.', metadata: { url: 'https://www.reinsw.com.au', link_type: 'industry_body' } },
  { title: 'LinkedIn — Meridian Property Group', description: 'Follow us on LinkedIn for market updates, career opportunities, and company news.', metadata: { url: 'https://linkedin.com/company/meridian-property-group', link_type: 'social' } },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

async function generateAndUpload(imgDef, localPath) {
  console.log(`  🎨  Generating: ${imgDef.title}`)
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: imgDef.prompt,
    n: 1,
    size: imgDef.key === 'logo' ? '1024x1024' : '1792x1024',
    quality: 'hd',
    style: 'natural',
  })
  const imageUrl = response.data[0].url
  const imgRes = await fetch(imageUrl)
  const buf = Buffer.from(await imgRes.arrayBuffer())
  fs.writeFileSync(localPath, buf)
  return buf
}

async function uploadToBank(buf, filename, contentType = 'image/jpeg') {
  const storagePath = `${USER_ID}/bank/${filename}`
  await supabase.storage.from(DST_BUCKET).remove([storagePath])
  const { error } = await supabase.storage.from(DST_BUCKET).upload(storagePath, buf, { contentType, upsert: true })
  if (error) throw new Error(`Upload failed ${filename}: ${error.message}`)
  return storagePath
}

function publicUrl(bucket, storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`
}

async function downloadFromTalentBank(storagePath) {
  const url = publicUrl(SRC_BUCKET, storagePath)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed ${storagePath}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏢  Updating Meridian Property Group — full completion run...\n')

  const tmpDir = path.join(os.tmpdir(), `meridian-update-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  // Clear existing bank items for this user
  await supabase.from('business_bank_items').delete().eq('user_id', USER_ID)
  console.log('🗑️   Cleared old business_bank_items\n')

  const bankItems = []

  // ── 1. Generate new DALL-E images (logo + documents) ─────────────────────
  console.log('🎨  Generating new images (logo + certificates)...')
  let logoStoragePath = null
  let logoPublicUrl = null

  for (const imgDef of NEW_IMAGES) {
    const localPath = path.join(tmpDir, imgDef.filename)
    const buf = await generateAndUpload(imgDef, localPath)
    const storagePath = await uploadToBank(buf, imgDef.filename)
    const url = publicUrl(DST_BUCKET, storagePath)

    if (imgDef.key === 'logo') {
      logoStoragePath = storagePath
      logoPublicUrl = url
    }

    bankItems.push({
      user_id: USER_ID,
      item_type: imgDef.bankType,
      title: imgDef.title,
      description: imgDef.key === 'logo' ? 'Official Meridian Property Group brand logo for use across all marketing and profile materials.' : null,
      file_path: storagePath,
      file_type: 'image/jpeg',
      file_size: buf.length,
      file_url: url,
      metadata: { source: 'seed', key: imgDef.key },
    })
    console.log(`  ✅  ${imgDef.title}`)
  }

  // ── 2. Copy existing property/team images from talent-bank → business-bank ─
  console.log('\n📦  Copying property & team images to business bank...')

  // List files in talent-bank for this user
  const { data: storageList } = await supabase.storage.from(SRC_BUCKET).list(`${USER_ID}/business`)
  const fileMap = {}
  for (const f of (storageList || [])) {
    for (const imgDef of IMAGE_DEFS) {
      if (f.name.includes(imgDef.filename.replace('.jpg', ''))) {
        fileMap[imgDef.key] = `${USER_ID}/business/${f.name}`
      }
    }
  }

  for (const imgDef of IMAGE_DEFS) {
    const srcPath = fileMap[imgDef.key]
    if (!srcPath) { console.warn(`  ⚠️  Not found: ${imgDef.key}`); continue }
    const buf = await downloadFromTalentBank(srcPath)
    const storagePath = await uploadToBank(buf, imgDef.filename)
    const url = publicUrl(DST_BUCKET, storagePath)
    bankItems.push({
      user_id: USER_ID,
      item_type: imgDef.bankType,
      title: imgDef.title,
      file_path: storagePath,
      file_type: 'image/jpeg',
      file_size: buf.length,
      file_url: url,
      metadata: { source: 'seed', key: imgDef.key },
    })
    console.log(`  ✅  ${imgDef.title}`)
  }

  // ── 3. Copy intro video to business bank as 'business_introduction' ────────
  console.log('\n🎬  Copying intro video to business bank...')
  const videoSrcPath = `${USER_ID}/business/meridian-intro-video.mp4`
  const videoBuf = await downloadFromTalentBank(videoSrcPath)
  const videoBankPath = await uploadToBank(videoBuf, 'meridian-intro-video.mp4', 'video/mp4')
  const videoUrl = publicUrl(DST_BUCKET, videoBankPath)
  bankItems.push({
    user_id: USER_ID,
    item_type: 'business_introduction',
    title: 'Meridian Property Group — Business Introduction Video',
    description: 'A professional overview of Meridian Property Group — our story, our team, our services, and why top agents build their careers with us.',
    file_path: videoBankPath,
    file_type: 'video/mp4',
    file_size: videoBuf.length,
    file_url: videoUrl,
    metadata: { duration_seconds: 34, voice: 'shimmer', resolution: '1920x1080' },
  })
  console.log(`  ✅  Intro video (${(videoBuf.length / 1024 / 1024).toFixed(1)} MB)`)

  // ── 4. Add link items ──────────────────────────────────────────────────────
  for (const link of LINKS) {
    bankItems.push({
      user_id: USER_ID,
      item_type: 'link',
      title: link.title,
      description: link.description,
      file_path: null,
      file_url: link.metadata.url,
      metadata: link.metadata,
    })
  }
  console.log(`\n🔗  Added ${LINKS.length} link items`)

  // ── 5. Insert all bank items ───────────────────────────────────────────────
  console.log(`\n💾  Inserting ${bankItems.length} bank items...`)
  for (const item of bankItems) {
    const { error } = await supabase.from('business_bank_items').insert(item)
    if (error) console.warn(`  ⚠️  ${item.title}: ${error.message}`)
    else console.log(`  ✅  ${item.item_type}: ${item.title}`)
  }

  // ── 6. Update logo on business_profile_pages ───────────────────────────────
  console.log('\n🖼️   Updating logo & hero on business_profile_pages...')
  if (logoPublicUrl) {
    const heroSrcPath = fileMap['hero']
    const heroBuf = heroSrcPath ? await downloadFromTalentBank(heroSrcPath) : null
    const heroBankPath = heroBuf ? await uploadToBank(heroBuf, 'meridian-hero-page.jpg') : null
    const heroUrl = heroBankPath ? publicUrl(DST_BUCKET, heroBankPath) : null

    const { error } = await supabase
      .from('business_profile_pages')
      .update({
        logo_url: logoPublicUrl,
        hero_image_url: heroUrl || logoPublicUrl,
      })
      .eq('business_id', BIZ_ID)
    if (error) console.warn(`  ⚠️  Logo update: ${error.message}`)
    else console.log(`  ✅  logo_url and hero_image_url updated`)
  }

  // ── 7. Populate product service sub-tables ─────────────────────────────────
  console.log('\n🛠️   Populating product service sub-tables...')

  for (const [productId, data] of Object.entries(PRODUCT_DATA)) {
    const pid = Number(productId)

    // Clear existing
    await supabase.from('business_product_teams').delete().eq('product_id', pid)
    await supabase.from('business_product_skills').delete().eq('product_id', pid)
    await supabase.from('business_product_roles').delete().eq('product_id', pid)
    await supabase.from('business_product_growth_areas').delete().eq('product_id', pid)
    await supabase.from('business_product_impact').delete().eq('product_id', pid)
    await supabase.from('business_product_signals').delete().eq('product_id', pid)

    // Teams
    for (const t of data.teams) {
      const { error } = await supabase.from('business_product_teams').insert({ product_id: pid, business_id: BIZ_ID, user_id: USER_ID, ...t })
      if (error) console.warn(`  ⚠️  Team (${pid}): ${error.message}`)
    }

    // Skills
    for (const s of data.skills) {
      const { error } = await supabase.from('business_product_skills').insert({ product_id: pid, business_id: BIZ_ID, user_id: USER_ID, ...s })
      if (error) console.warn(`  ⚠️  Skill (${pid}): ${error.message}`)
    }

    // Roles
    for (const r of data.roles) {
      const { error } = await supabase.from('business_product_roles').insert({ product_id: pid, business_id: BIZ_ID, user_id: USER_ID, ...r })
      if (error) console.warn(`  ⚠️  Role (${pid}): ${error.message}`)
    }

    // Growth areas
    for (const g of data.growth_areas) {
      const { error } = await supabase.from('business_product_growth_areas').insert({ product_id: pid, business_id: BIZ_ID, user_id: USER_ID, ...g })
      if (error) console.warn(`  ⚠️  Growth (${pid}): ${error.message}`)
    }

    // Impact
    const { error: impErr } = await supabase.from('business_product_impact').insert({ product_id: pid, business_id: BIZ_ID, user_id: USER_ID, ...data.impact })
    if (impErr) console.warn(`  ⚠️  Impact (${pid}): ${impErr.message}`)

    // Signals
    const { error: sigErr } = await supabase.from('business_product_signals').insert({ product_id: pid, business_id: BIZ_ID, user_id: USER_ID, ...data.signals[0] })
    if (sigErr) console.warn(`  ⚠️  Signal (${pid}): ${sigErr.message}`)

    console.log(`  ✅  Product ${pid}: teams(${data.teams.length}), skills(${data.skills.length}), roles(${data.roles.length}), growth(${data.growth_areas.length}), impact, signals`)
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}

  console.log('\n🎉  Meridian Property Group — fully populated!\n')
  console.log('  Business Bank:')
  console.log(`    ${NEW_IMAGES.filter(i=>i.bankType==='image').length + IMAGE_DEFS.length} images · 1 logo · ${NEW_IMAGES.filter(i=>i.bankType==='document').length} documents · 1 intro video · ${LINKS.length} links`)
  console.log('  Products & Services:')
  console.log('    All 3 services: teams + skills + roles + growth areas + impact + signals')
  console.log(`\n  Public page:  /business/meridian-property-group/about`)
  console.log(`  Dashboard:    /dashboard/business`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
