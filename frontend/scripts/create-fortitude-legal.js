/**
 * Creates Fortitude Legal — a full demo business profile for a Perth, WA law firm.
 *
 * Creates:
 *  - New Supabase auth user:  demo.legal@creerlio.com / DemoLegal2025!
 *  - businesses + business_profiles + business_profile_pages records
 *  - location (Perth CBD), user_business_roles, user_location_roles, user_preferences
 *  - DALL-E logo + 8 images + 3 certificate documents
 *  - Intro video (copied from Meridian as placeholder)
 *  - 3 link bank items
 *  - Full profile metadata bank item (bio, skills, culture, attachments)
 *  - 3 published jobs/vacancies
 *
 * Run from /frontend:  node scripts/create-fortitude-legal.js
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const fs   = require('fs')
const path = require('path')
const os   = require('os')
const { randomUUID } = require('crypto')

const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY     = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('Missing env vars. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })

const DST_BUCKET = 'business-bank'
const SRC_BUCKET = 'business-bank'  // copy Meridian video from here
const MERIDIAN_USER_ID = '63e4d2c8-b9dd-4884-bb6b-eba49bfdccce'
const SLUG = 'fortitude-legal'

// ── DALL-E images to generate ─────────────────────────────────────────────────

const NEW_IMAGES = [
  {
    key: 'logo',
    filename: 'fortitude-logo.jpg',
    bankType: 'logo',
    title: 'Fortitude Legal — Official Brand Logo',
    description: 'Official Fortitude Legal brand logo for use across all marketing and profile materials.',
    prompt: 'Minimal professional law firm logo on clean white background, elegant sans-serif wordmark "FORTITUDE LEGAL" with a subtle abstract scales of justice icon above, deep navy blue (#1a2744) and brushed gold color palette, premium corporate brand identity, perfectly centered, clean and modern, vector-style illustration',
    size: '1024x1024',
  },
  {
    key: 'hero',
    filename: 'fortitude-hero.jpg',
    bankType: 'image',
    title: 'Fortitude Legal — Perth CBD Office Exterior',
    prompt: 'Prestigious boutique law firm building exterior in Perth CBD Western Australia, modern glass and steel architecture, golden afternoon light, Swan River glimpse in background, professional corporate photography, clear blue sky, polished nameplate reads "Fortitude Legal", premium street-level view',
    size: '1792x1024',
  },
  {
    key: 'office',
    filename: 'fortitude-office.jpg',
    bankType: 'image',
    title: 'Fortitude Legal — Perth CBD Office Interior',
    prompt: 'Modern boutique law firm office interior in Perth CBD, floor-to-ceiling windows overlooking Swan River, dark timber joinery and built-in law book shelves, Chesterfield leather chairs, polished conference table, soft warm lighting, premium corporate aesthetic, no people',
    size: '1792x1024',
  },
  {
    key: 'team',
    filename: 'fortitude-team.jpg',
    bankType: 'image',
    title: 'Fortitude Legal — Partner & Associate Team',
    prompt: 'Professional group photograph of 12 law firm partners and associates in a bright Perth office lobby, diverse multicultural team in formal business attire, smiling and confident, Australian law firm aesthetic, natural light, polished corporate atmosphere',
    size: '1792x1024',
  },
  {
    key: 'awards',
    filename: 'fortitude-awards.jpg',
    bankType: 'image',
    title: "Fortitude Legal — Doyle's Guide Award Night",
    prompt: "Law firm team at prestigious Australian legal awards ceremony, partners and senior associates holding 'Doyle's Guide Leading Boutique Law Firm WA 2024' plaque, formal black tie event, Perth Convention Centre setting, professional event photography, warm stage lighting",
    size: '1792x1024',
  },
  {
    key: 'culture',
    filename: 'fortitude-culture.jpg',
    bankType: 'image',
    title: 'Fortitude Legal — Collaboration & Culture',
    prompt: 'Law firm team collaboration session in a modern Perth office, associates and a senior partner reviewing documents around a glass conference table, relaxed yet professional atmosphere, laptops and folders open, city skyline visible through windows, candid style photography',
    size: '1792x1024',
  },
  {
    key: 'community',
    filename: 'fortitude-community.jpg',
    bankType: 'image',
    title: 'Fortitude Legal — Pro Bono & Community Work',
    prompt: 'Law firm solicitors running a free legal advice clinic at a Perth community centre, diverse lawyers in professional attire helping members of the public, welcoming and approachable atmosphere, Fortitude Legal branded banners visible, warm community event photography',
    size: '1792x1024',
  },
  {
    key: 'perth',
    filename: 'fortitude-perth.jpg',
    bankType: 'image',
    title: 'Fortitude Legal — Perth Skyline & Elizabeth Quay',
    prompt: 'Stunning panoramic view of Perth CBD skyline at golden hour from Elizabeth Quay, Swan River reflections, modern glass towers, professional lifestyle photography, Western Australia iconic cityscape, warm amber and blue tones',
    size: '1792x1024',
  },
  {
    key: 'licence',
    filename: 'fortitude-licence.jpg',
    bankType: 'document',
    title: 'Law Society WA — Practising Certificate 2024',
    prompt: 'Official Law Society of Western Australia Practising Certificate document, white parchment background, LSWA official seal and letterhead, states "Certificate of Entity Authorisation — Fortitude Legal Pty Ltd — Authorised to Practise Law in Western Australia", signed and dated 2024, reference number FL-WA-2024-0892, gold embossed border, formal legal document flat lay photography',
    size: '1792x1024',
  },
  {
    key: 'award_cert',
    filename: 'fortitude-award-cert.jpg',
    bankType: 'document',
    title: "Doyle's Guide — Leading Boutique Law Firm WA 2024",
    prompt: "Prestigious Doyle's Guide legal industry award certificate framed in gold on marble desk, reads 'Leading Boutique Law Firm — Western Australia 2024 — Fortitude Legal', elegant typography, official seal, professional photography, warm studio lighting",
    size: '1792x1024',
  },
  {
    key: 'pi_cert',
    filename: 'fortitude-pi-insurance.jpg',
    bankType: 'document',
    title: 'Professional Indemnity Insurance — Certificate of Currency 2024–2025',
    prompt: 'Professional Indemnity Insurance Certificate of Currency document, white background with insurer letterhead, reads "Certificate of Currency — Professional Indemnity — Fortitude Legal Pty Ltd — Policy Period: 1 July 2024 – 30 June 2025 — Cover: $20,000,000 per claim", official corporate document style, flat lay photography on timber desk',
    size: '1792x1024',
  },
]

// ── Link bank items ────────────────────────────────────────────────────────────

const LINKS = [
  {
    title: "Doyle's Guide — Fortitude Legal Profile",
    description: "Fortitude Legal is listed in Doyle's Guide as a Leading Boutique Law Firm in Western Australia for Corporate & Commercial, Property, and Employment Law.",
    url: 'https://www.doyleguide.com.au',
    link_type: 'review_platform',
  },
  {
    title: 'Law Society of Western Australia — Member Profile',
    description: 'Fortitude Legal is a full member of the Law Society of Western Australia, upholding the highest standards of legal practice and professional conduct.',
    url: 'https://www.lawsocietywa.asn.au',
    link_type: 'industry_body',
  },
  {
    title: 'LinkedIn — Fortitude Legal Perth',
    description: 'Follow Fortitude Legal on LinkedIn for legal insights, career opportunities, pro bono updates, and firm news.',
    url: 'https://www.linkedin.com/company/fortitude-legal-perth',
    link_type: 'social',
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function publicUrl(bucket, storagePath) {
  const enc = storagePath.split('/').map(encodeURIComponent).join('/')
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${enc}`
}

async function generateAndUpload(imgDef, userId, tmpDir) {
  console.log(`  🎨  Generating: ${imgDef.title}`)
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: imgDef.prompt,
    n: 1,
    size: imgDef.size || '1792x1024',
    quality: 'hd',
    style: 'natural',
  })
  const imageUrl = response.data[0].url
  const imgRes = await fetch(imageUrl)
  const buf = Buffer.from(await imgRes.arrayBuffer())
  const localPath = path.join(tmpDir, imgDef.filename)
  fs.writeFileSync(localPath, buf)

  const storagePath = `${userId}/bank/${imgDef.filename}`
  await supabase.storage.from(DST_BUCKET).remove([storagePath])
  const { error } = await supabase.storage.from(DST_BUCKET).upload(storagePath, buf, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`Upload failed ${imgDef.filename}: ${error.message}`)

  return { storagePath, url: publicUrl(DST_BUCKET, storagePath), buf }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('⚖️  Creating Fortitude Legal — Perth Boutique Law Firm\n')

  const tmpDir = path.join(os.tmpdir(), `fortitude-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  // ── 1. Create or find auth user ────────────────────────────────────────────
  console.log('👤  Setting up demo user...')
  let userId

  // Try to find existing user
  const { data: users } = await supabase.auth.admin.listUsers()
  const existing = (users?.users || []).find(u => u.email === 'demo.legal@creerlio.com')
  if (existing) {
    userId = existing.id
    console.log(`  ✅  Found existing user: ${userId}`)
  } else {
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: 'demo.legal@creerlio.com',
      password: 'DemoLegal2025!',
      email_confirm: true,
      user_metadata: { full_name: 'Fortitude Legal Demo', role: 'business' },
    })
    if (createErr) throw new Error(`Failed to create user: ${createErr.message}`)
    userId = newUser.user.id
    console.log(`  ✅  Created new user: ${userId}`)
  }

  const BIZ_ID      = userId
  const LOCATION_ID = randomUUID()

  // ── 2. Set up businesses table ─────────────────────────────────────────────
  console.log('\n🏢  Setting up businesses table...')
  const { error: bizErr } = await supabase.from('businesses').upsert({
    id: BIZ_ID,
    name: 'Fortitude Legal',
    industry: 'Legal Services',
    created_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (bizErr) console.warn(`  ⚠️  businesses: ${bizErr.message}`)
  else console.log('  ✅  businesses record')

  // ── 3. Set up business_profiles table ──────────────────────────────────────
  console.log('\n📋  Setting up business_profiles...')
  const { error: bpErr } = await supabase.from('business_profiles').upsert({
    id: BIZ_ID,
    user_id: userId,
    business_id: BIZ_ID,
    business_name: 'Fortitude Legal',
    industry: 'Legal Services',
    description: "Fortitude Legal has served Perth's business and personal legal needs since 2008. Our team of 32 legal professionals combines the depth of a large firm with the agility and personal attention of a boutique practice. Whether you're closing a major commercial transaction, navigating a property settlement, or resolving a workplace dispute, Fortitude Legal is your strategic partner from first instruction to final resolution.",
    slug: SLUG,
    city: 'Perth',
    state: 'WA',
    country: 'Australia',
    location: 'Perth CBD, WA, Australia',
    latitude: -31.9505,
    longitude: 115.8605,
    website: 'https://fortitudelegal.com.au',
    email: 'enquiries@fortitudelegal.com.au',
    is_active: true,
    public_profile_enabled: true,
    talent_community_enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (bpErr) console.warn(`  ⚠️  business_profiles: ${bpErr.message}`)
  else console.log('  ✅  business_profiles record')

  // ── 4. Set up locations ────────────────────────────────────────────────────
  console.log('\n📍  Setting up location...')
  const { error: locErr } = await supabase.from('locations').insert({
    id: LOCATION_ID,
    owner_id: userId,
    owner_type: 'user',
    business_id: BIZ_ID,
    name: 'Fortitude Legal — Perth CBD',
    city: 'Perth',
    state: 'WA',
    country: 'Australia',
    lat: -31.9505,
    lng: 115.8605,
  })
  if (locErr && !locErr.message.includes('duplicate')) console.warn(`  ⚠️  locations: ${locErr.message}`)
  else console.log(`  ✅  location: ${LOCATION_ID}`)

  // ── 5. Roles & preferences ─────────────────────────────────────────────────
  console.log('\n🔐  Setting up roles & preferences...')

  await supabase.from('user_business_roles').delete().eq('user_id', userId)
  const { error: ubrErr } = await supabase.from('user_business_roles').insert({
    user_id: userId, business_id: BIZ_ID, role: 'business_admin',
  })
  if (ubrErr) console.warn(`  ⚠️  user_business_roles: ${ubrErr.message}`)
  else console.log('  ✅  user_business_roles (business_admin)')

  await supabase.from('user_location_roles').delete().eq('user_id', userId)
  const { error: ulrErr } = await supabase.from('user_location_roles').insert({
    user_id: userId, location_id: LOCATION_ID, role: 'location_admin',
  })
  if (ulrErr) console.warn(`  ⚠️  user_location_roles: ${ulrErr.message}`)
  else console.log('  ✅  user_location_roles (location_admin)')

  await supabase.from('user_preferences').upsert({
    user_id: userId,
    active_business_id: BIZ_ID,
    active_location_id: LOCATION_ID,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  console.log('  ✅  user_preferences')

  // ── 6. Generate DALL-E images ──────────────────────────────────────────────
  console.log('\n🎨  Generating DALL-E images (logo + 7 images + 3 cert docs)...')

  const bankItems = []
  let logoUrl = null
  let heroUrl = null
  const imageMap = {}

  for (const imgDef of NEW_IMAGES) {
    try {
      const { storagePath, url, buf } = await generateAndUpload(imgDef, userId, tmpDir)
      imageMap[imgDef.key] = { storagePath, url }
      if (imgDef.key === 'logo') logoUrl = url
      if (imgDef.key === 'hero') heroUrl = url

      bankItems.push({
        user_id: userId,
        item_type: imgDef.bankType,
        title: imgDef.title,
        description: imgDef.description || null,
        file_path: storagePath,
        file_type: 'image/jpeg',
        file_size: buf.length,
        file_url: url,
        metadata: { source: 'seed', key: imgDef.key },
      })
      console.log(`  ✅  ${imgDef.title}`)
    } catch (err) {
      console.warn(`  ⚠️  ${imgDef.title}: ${err.message}`)
    }
  }

  // ── 7. Copy Meridian intro video as placeholder ────────────────────────────
  console.log('\n🎬  Copying intro video (placeholder)...')
  try {
    const videoSrcPath = `${MERIDIAN_USER_ID}/bank/meridian-intro-video.mp4`
    const videoSrcUrl = publicUrl(SRC_BUCKET, videoSrcPath)
    const res = await fetch(videoSrcUrl)
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      const videoDstPath = `${userId}/bank/fortitude-intro-video.mp4`
      await supabase.storage.from(DST_BUCKET).remove([videoDstPath])
      const { error: vUpErr } = await supabase.storage.from(DST_BUCKET).upload(videoDstPath, buf, { contentType: 'video/mp4', upsert: true })
      if (vUpErr) throw new Error(vUpErr.message)
      const videoUrl = publicUrl(DST_BUCKET, videoDstPath)
      bankItems.push({
        user_id: userId,
        item_type: 'business_introduction',
        title: 'Fortitude Legal — Business Introduction',
        description: "A professional overview of Fortitude Legal — our history, our people, our practice areas, and why the best legal minds build their careers with us.",
        file_path: videoDstPath,
        file_type: 'video/mp4',
        file_size: buf.length,
        file_url: videoUrl,
        metadata: { duration_seconds: 34, source: 'placeholder' },
      })
      console.log('  ✅  Intro video copied')
    } else {
      console.warn('  ⚠️  Meridian video not accessible, skipping intro video')
    }
  } catch (err) {
    console.warn(`  ⚠️  Intro video: ${err.message}`)
  }

  // ── 8. Add link items ──────────────────────────────────────────────────────
  for (const link of LINKS) {
    bankItems.push({
      user_id: userId,
      item_type: 'link',
      title: link.title,
      description: link.description,
      file_path: null,
      file_url: link.url,
      metadata: { url: link.url, link_type: link.link_type },
    })
  }
  console.log(`\n🔗  Added ${LINKS.length} link items`)

  // ── 9. Insert all bank items ───────────────────────────────────────────────
  console.log(`\n💾  Inserting ${bankItems.length} bank items...`)
  await supabase.from('business_bank_items').delete().eq('user_id', userId).neq('item_type', 'profile')
  const insertedItems = []
  for (const item of bankItems) {
    const { data, error } = await supabase.from('business_bank_items').insert(item).select().single()
    if (error) console.warn(`  ⚠️  ${item.title}: ${error.message}`)
    else { insertedItems.push(data); console.log(`  ✅  [${data.id}] ${item.item_type}: ${item.title}`) }
  }

  // ── 10. Build attachments list (non-link, non-logo items for profile) ───────
  const attachments = insertedItems
    .filter(i => i.item_type !== 'link')
    .map(i => ({
      id: i.id,
      url: i.file_url,
      title: i.title,
      file_path: null,
      file_type: i.file_type,
      item_type: i.item_type,
    }))

  const introVideoItem = insertedItems.find(i => i.item_type === 'business_introduction')

  // ── 11. Build full profile metadata ───────────────────────────────────────
  console.log('\n📝  Building profile metadata...')

  const profileMeta = {
    name: 'Fortitude Legal',
    title: 'Legal Services',
    bio: "Fortitude Legal has served Perth's business and personal legal needs since 2008. Our team of 32 legal professionals combines the depth of a large firm with the agility and personal attention of a boutique practice. We believe that exceptional legal advice should be principled, strategic, and deeply personal — which is why every client at Fortitude Legal is served by a senior lawyer who knows their matter inside out.\n\nFrom our purpose-built offices in the heart of Perth CBD, we advise ASX-listed corporations, fast-growth SMEs, property developers, families, and individuals across three core practice groups: Corporate & Commercial, Property & Conveyancing, and Employment & Workplace Law.\n\nFortitude Legal is listed in Doyle's Guide as a Leading Boutique Law Firm in Western Australia and holds the Law Society of Western Australia's highest accreditation standards. Our commitment to pro bono and community access to justice is central to who we are — every year our team contributes over 600 hours to the WA community.",
    skills: [
      'Corporate & Commercial Law',
      'Property & Conveyancing',
      'Employment & Workplace Law',
      'Mergers & Acquisitions',
      'Commercial Contracts & Agreements',
      'Dispute Resolution & Litigation',
      'Intellectual Property',
      'Wills & Estate Planning',
    ],
    experience: [],
    education: [],
    projects: [],
    referees: [],
    socialLinks: [
      { platform: 'linkedin', url: 'https://www.linkedin.com/company/fortitude-legal-perth', label: 'LinkedIn' },
      { platform: 'website', url: 'https://fortitudelegal.com.au', label: 'Website' },
    ],
    introVideoId: introVideoItem ? introVideoItem.id : null,
    attachments,
    avatar_path: null,
    banner_path: null,
    cultureSuccess: "We measure success when our clients achieve their desired outcome and trust us enough to return and refer. It's also when our team grows professionally — every matter is an opportunity to develop sharper judgement and stronger relationships. Success at Fortitude Legal is both client-outcome-driven and people-centred.",
    cultureConflict: "We navigate internal disagreement through structured discussion — every viewpoint is heard before decisions are made. Externally, we approach disputes with strategic pragmatism, preferring negotiated resolution before litigation whenever it serves the client's interests. We bring perspective before we bring aggression.",
    cultureFeedback: "Feedback at Fortitude Legal is continuous and constructive. Partners conduct quarterly reviews with all associates, and 360-degree peer feedback is embedded into our annual competency assessments. We believe candid, respectful feedback accelerates professional growth — and we celebrate learning from challenges, not just successes.",
    cultureDecisions: "Partner-level decisions are made collaboratively through our Practice Group Leadership Committee. For client matters, the supervising partner has authority, supported by team input. We prize well-reasoned, principle-based decisions over fast ones — good judgement is our most valuable asset.",
    profileSelections: [],
    sectionOrder: ['intro', 'social', 'skills', 'experience', 'projects', 'attachments'],
    sectionVisibility: {
      basic: true,
      skills: true,
      social: true,
      projects: true,
      referees: true,
      education: true,
      experience: true,
      attachments: true,
    },
    itemVisibility: {
      social: {},
      projects: {},
      referees: {},
      education: {},
      experience: {},
    },
  }

  // Upsert profile bank item
  await supabase.from('business_bank_items').delete().eq('user_id', userId).eq('item_type', 'profile')
  const { error: profErr } = await supabase.from('business_bank_items').insert({
    user_id: userId,
    item_type: 'profile',
    title: 'Fortitude Legal — Business Profile',
    description: 'Full business profile metadata for Fortitude Legal boutique law firm, Perth WA.',
    metadata: profileMeta,
  })
  if (profErr) console.warn(`  ⚠️  Profile metadata: ${profErr.message}`)
  else console.log('  ✅  Profile metadata bank item')

  // ── 12. Set up business_profile_pages ────────────────────────────────────
  console.log('\n🌐  Setting up business_profile_pages...')
  const { error: ppErr } = await supabase.from('business_profile_pages').upsert({
    business_id: BIZ_ID,
    slug: SLUG,
    is_published: true,
    name: 'Fortitude Legal',
    logo_url: logoUrl,
    hero_image_url: heroUrl || logoUrl,
    tagline: "Perth's Boutique Full-Service Law Firm",
    mission: "To deliver principled, strategic legal advice that empowers individuals and businesses to navigate complexity, protect their interests, and achieve their goals with confidence.",
    value_prop_headline: "Perth's Most Trusted Boutique Legal Practice",
    value_prop_body: "Fortitude Legal has served Perth's business and personal legal needs since 2008. Our team of 32 legal professionals combines the depth of a large firm with the agility and personal attention of a boutique practice. Whether you're closing a major commercial transaction, navigating a property settlement, or resolving a workplace dispute, Fortitude Legal is your strategic partner from first instruction to final resolution.",
    impact_stats: [
      { label: 'Years in Perth Legal Practice', value: '16+', footnote_optional: 'Founded 2008' },
      { label: 'Matters Successfully Resolved', value: '4,800+', footnote_optional: 'Since founding' },
      { label: 'Transactions Advised', value: '$2.4B+', footnote_optional: 'Corporate & property matters' },
      { label: 'Client Satisfaction', value: '97%', footnote_optional: 'Based on post-matter surveys' },
      { label: 'Legal Professionals', value: '32', footnote_optional: 'Partners, associates, paralegals' },
      { label: 'Core Practice Areas', value: '3', footnote_optional: 'Corporate, Property, Employment' },
    ],
    culture_values: [
      'Principled Counsel in Every Matter',
      'Client-Centred at All Times',
      'Relentless Pursuit of the Best Outcome',
      'Integrity Without Compromise',
      'Collaboration Across Practice Groups',
      'Community Commitment & Pro Bono Leadership',
    ],
    business_areas: [
      { area: 'Corporate & Commercial Law', description: 'M&A, shareholder agreements, commercial contracts, corporate advisory, and regulatory compliance for ASX-listed companies and fast-growth SMEs.' },
      { area: 'Property & Conveyancing', description: 'Residential and commercial conveyancing, development agreements, property financing, leasing, and strata law across Western Australia.' },
      { area: 'Employment & Workplace Law', description: 'Unfair dismissal, enterprise agreements, workplace policies, executive contracts, and Fair Work Commission proceedings for employers and employees.' },
    ],
    benefits: [
      { title: 'Competitive Salary + Annual Review', description: 'Market-leading remuneration benchmarked annually against the WA legal market. Performance bonuses for exceptional matter outcomes and client development.' },
      { title: 'Senior Mentorship Program', description: 'Every associate is paired with a senior partner from day one. Structured mentorship, case review, and career planning as part of the Fortitude pathway.' },
      { title: 'Flexible Work Arrangements', description: 'Hybrid work model with two WFH days per week for all permanent staff. Core hours flexibility and additional leave during low-demand periods.' },
      { title: 'Paid CPD & Conference Attendance', description: 'Full CPD allowance of $3,500 per year including conference registration, travel, and study materials. Internal masterclass series with Perth industry leaders.' },
      { title: 'Pro Bono & Community Programs', description: "600+ pro bono hours contributed annually to the WA community. Firm-subsidised participation in Law Access WA and the Community Legal Centres network." },
      { title: 'Health & Wellbeing Allowance', description: '$1,200 annual wellbeing allowance for gym, mental health, sporting clubs, or health programs. EAP program with confidential counselling support.' },
    ],
    programs: [
      {
        name: 'Fortitude Graduate Program',
        for_who: 'Law graduates & articled clerks (0–2 years PQE)',
        description: 'An intensive 12-month graduate rotation across all three practice groups, paired with a dedicated supervising partner. Includes fortnightly masterclasses, client contact from week one, and a structured pathway to permanent admission.',
      },
      {
        name: 'Associate Accelerator',
        for_who: 'Solicitors with 2–5 years PQE',
        description: 'Designed for ambitious associates ready to step up. Includes advanced matter responsibility, business development coaching, and fast-track assessment for Senior Associate promotion within 18 months.',
      },
      {
        name: 'Partner Pathway Program',
        for_who: 'Senior associates considering partnership (5+ years PQE)',
        description: 'A structured 2-year program combining equity partner exposure, client portfolio development, leadership coaching, and formal mentorship by two equity partners. Includes a transparent and published partnership admission criteria framework.',
      },
    ],
    social_proof: [
      {
        author: 'James Harrington, CEO — ASX-listed Fintech',
        role: 'Corporate & Commercial Client',
        quote: "Fortitude Legal guided our $180M acquisition through every stage — from due diligence to ASIC compliance. Their corporate team's commercial acumen is exceptional. They genuinely cared about our outcome, not just the transaction.",
      },
      {
        author: 'Sarah & David Chen',
        role: 'Property Clients — Cottesloe Purchase',
        quote: "Our conveyancing went through completely stress-free. The team identified a defect in the vendor's title that would have cost us $47,000. Extraordinary attention to detail. We've now referred four friends.",
      },
      {
        author: 'Michelle Okello, Director — Perth Construction SME',
        role: 'Employment Law Client',
        quote: "When we faced a complex unfair dismissal claim, Fortitude's employment team had it resolved at the Fair Work Commission within three weeks. Professional, calm, and outcome-focused throughout. Highly recommend.",
      },
    ],
    acknowledgement_of_country: "Fortitude Legal acknowledges the Whadjuk Noongar people as the Traditional Custodians of the land on which our Perth office stands. We pay our respects to Elders past, present, and emerging.",
    live_roles_count: 3,
    talent_community_enabled: true,
    hiring_interests: [
      'Corporate Solicitors',
      'Property Lawyers',
      'Employment Lawyers',
      'Paralegals & Law Clerks',
      'Legal Secretaries',
      'Graduate Clerks',
    ],
    enquiry_enabled: true,
    contact_email: 'enquiries@fortitudelegal.com.au',
    website_url: 'https://fortitudelegal.com.au',
    media_assets: {
      intro_video_url: introVideoItem?.file_url || null,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id' })
  if (ppErr) console.warn(`  ⚠️  business_profile_pages: ${ppErr.message}`)
  else console.log('  ✅  business_profile_pages record')

  // ── 13. Create jobs/vacancies ─────────────────────────────────────────────
  console.log('\n💼  Creating jobs/vacancies...')

  const JOBS = [
    {
      title: 'Senior Corporate Solicitor — Perth CBD',
      description: "Fortitude Legal is seeking a Senior Corporate Solicitor to join our Corporate & Commercial Practice Group in Perth CBD.\n\nYou will manage a diverse portfolio of clients across M&A advisory, shareholder agreements, commercial contracts, due diligence, and corporate governance. You will work closely with partners on complex, multi-party transactions and lead junior solicitors on matters from file open to settlement.\n\n**About You:**\n- 7+ years PQE in corporate & commercial law (private practice)\n- Experience in M&A and complex commercial transactions\n- Strong drafting skills and commercial acumen\n- Admitted to practise in Western Australia\n- Client relationship management experience\n\n**Package:** $180,000–$220,000 total package (base + bonus) + CPD allowance + wellbeing benefit.",
      employment_type: 'full_time',
      salary_min: 180000,
      salary_max: 220000,
      salary_currency: 'AUD',
      salary_period: 'annual',
      experience_level: 'senior',
      tags: ['corporate law', 'M&A', 'commercial contracts', 'solicitor', 'Perth'],
    },
    {
      title: 'Property Law Associate — Residential & Commercial',
      description: "An exciting opportunity for a Property Law Associate to join Fortitude Legal's growing Property & Conveyancing Practice Group.\n\nYou will handle a mix of residential conveyancing, commercial property transactions, leasing, development agreements, and strata matters across Western Australia. You will manage your own files with partner supervision and develop client relationships in the Perth property market.\n\n**About You:**\n- 3–6 years PQE in property law (private practice preferred)\n- Solid conveyancing experience — residential and/or commercial\n- PEXA accredited (or willing to obtain)\n- Strong organisation and client communication skills\n- Admitted to practise in Western Australia\n\n**Package:** $120,000–$150,000 total package + CPD allowance + hybrid flexibility.",
      employment_type: 'full_time',
      salary_min: 120000,
      salary_max: 150000,
      salary_currency: 'AUD',
      salary_period: 'annual',
      experience_level: 'mid',
      tags: ['property law', 'conveyancing', 'leasing', 'associate', 'Perth'],
    },
    {
      title: 'Employment Law Paralegal — Perth CBD',
      description: "Fortitude Legal is seeking an Employment Law Paralegal to support our Employment & Workplace Law Practice Group.\n\nYou will assist solicitors with research, document drafting, case management, Fair Work Commission filings, and client correspondence across a wide range of employment matters including unfair dismissal, general protections, enterprise agreements, and workplace investigations.\n\n**About You:**\n- 1–3 years experience in a legal environment (employment law experience a plus)\n- Law degree (completing or completed)\n- Excellent research and drafting skills\n- High attention to detail and strong work ethic\n- Proficiency in LEAP or similar practice management software\n\n**Package:** $65,000–$80,000 total package + CPD + pathway to solicitor admission support.",
      employment_type: 'full_time',
      salary_min: 65000,
      salary_max: 80000,
      salary_currency: 'AUD',
      salary_period: 'annual',
      experience_level: 'entry',
      tags: ['employment law', 'paralegal', 'Fair Work', 'law clerk', 'Perth'],
    },
  ]

  // Delete existing jobs for this business
  await supabase.from('jobs').delete().eq('business_profile_id', BIZ_ID)

  for (const job of JOBS) {
    const { data: jd, error: jErr } = await supabase.from('jobs').insert({
      title: job.title,
      description: job.description,
      status: 'published',
      is_active: true,
      business_profile_id: BIZ_ID,
      business_id: BIZ_ID,
      location_id: LOCATION_ID,
      employment_type: job.employment_type,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      salary_currency: job.salary_currency,
      salary_period: job.salary_period,
      experience_level: job.experience_level,
      tags: job.tags,
      city: 'Perth',
      state: 'WA',
      country: 'Australia',
    }).select('id, title').single()
    if (jErr) console.warn(`  ⚠️  Job: ${job.title}: ${jErr.message}`)
    else console.log(`  ✅  Job [${jd.id}]: ${jd.title}`)
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}

  console.log('\n⚖️  ════════════════════════════════════════════════════════')
  console.log('   FORTITUDE LEGAL — FULLY CREATED!')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`\n  Login:        demo.legal@creerlio.com  /  DemoLegal2025!`)
  console.log(`  User ID:      ${userId}`)
  console.log(`  Business ID:  ${BIZ_ID}`)
  console.log(`  Location ID:  ${LOCATION_ID}`)
  console.log(`\n  Bank Items:   ${insertedItems.length} (images + video + links + certs)`)
  console.log(`  Practice Areas: Corporate, Property, Employment`)
  console.log(`  Jobs:         3 published vacancies`)
  console.log(`\n  Public Page:  /business/fortitude-legal/about`)
  console.log(`  Dashboard:    /dashboard/business  (login as demo.legal@creerlio.com)`)
  console.log('\n════════════════════════════════════════════════════════════\n')
}

main().catch(err => { console.error('\n❌  Fatal:', err.message); process.exit(1) })
