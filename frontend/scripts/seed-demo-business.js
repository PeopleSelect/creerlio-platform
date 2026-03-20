/**
 * Seed script: creates a complete demo Real Estate Agency business profile
 * Agency: Meridian Property Group — premium Sydney real estate
 *
 * Creates:
 *  - Auth user (demo.business@creerlio.com)
 *  - business_profiles row
 *  - business_profile_pages row (full public page content + DALL-E images)
 *  - business_products_services rows (3 service lines)
 *  - jobs rows (3 published vacancies)
 *  - Intro video (OpenAI TTS + ffmpeg slideshow)
 *
 * Run from /frontend:
 *   node scripts/seed-demo-business.js
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const { execSync } = require('child_process')
const ffmpegBin = require('ffmpeg-static')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { v4: uuidv4 } = require('uuid')

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://empehaulljtwfyzjmvmn.supabase.co'
const SERVICE_ROLE_KEY = '' + process.env.SUPABASE_SERVICE_ROLE_KEY + ''
const OPENAI_API_KEY   = '' + process.env.OPENAI_API_KEY + ''

const DEMO_EMAIL    = 'demo.business@creerlio.com'
const DEMO_PASSWORD = 'DemoBusiness2025!'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// ── Business data ─────────────────────────────────────────────────────────────

const AGENCY = {
  business_name: 'Meridian Property Group',
  slug: 'meridian-property-group',
  tagline: 'Where Exceptional Properties Meet Exceptional People',
  mission: 'To redefine the real estate experience through unmatched expertise, genuine relationships, and a relentless commitment to achieving outstanding results for every client.',
  value_prop_headline: 'Sydney\'s Premier Property Partner',
  value_prop_body: 'Meridian Property Group has been at the heart of Sydney\'s prestige property market for over 25 years. From iconic harbour-view penthouses in Double Bay to blue-chip investment portfolios in the Inner West, our team of 45 specialist agents delivers results that consistently exceed expectations. We combine deep local knowledge with cutting-edge technology and a culture built on integrity — because exceptional service is not a promise; it\'s our standard.',
  industry: 'Real Estate',
  city: 'Double Bay',
  state: 'NSW',
  country: 'Australia',
  location: 'Double Bay, NSW, Australia',
  website: 'https://meridianproperty.com.au',
  email: 'hello@meridianproperty.com.au',
  latitude: -33.8766,
  longitude: 151.2414,
  acknowledgement: 'Meridian Property Group acknowledges the Gadigal people of the Eora Nation as the Traditional Custodians of the land on which we work and live. We pay our respects to Elders past, present, and emerging.',
  impact_stats: [
    { value: '25+', label: 'Years in Sydney Property', footnote_optional: 'Founded 1999' },
    { value: '$8.2B+', label: 'Settled Sales Volume', footnote_optional: 'Since founding' },
    { value: '1,400+', label: 'Properties Sold', footnote_optional: 'Last 5 years' },
    { value: '98%', label: 'Client Satisfaction', footnote_optional: 'Based on post-sale surveys' },
    { value: '45', label: 'Specialist Agents', footnote_optional: 'Across 3 Sydney offices' },
    { value: '#1', label: 'Eastern Suburbs Agency', footnote_optional: 'RateMyAgent 2023–2024' },
  ],
  culture_values: [
    'Excellence Without Exception',
    'Integrity in Every Interaction',
    'Innovation & Continuous Learning',
    'Community First',
    'Collaboration Over Competition',
    'Results That Matter',
  ],
  benefits: [
    { title: 'Uncapped Commission Structure', description: 'Industry-leading split with uncapped earning potential. Top performers regularly achieve $350K+ OTE.' },
    { title: 'Dedicated Mentorship Program', description: 'Every new agent is paired with a senior partner for 12 months. We invest in your success from day one.' },
    { title: 'State-of-the-Art Technology', description: 'Full CRM suite, AI-powered appraisal tools, 3D virtual tours, and a dedicated digital marketing team for every listing.' },
    { title: 'Professional Development Allowance', description: '$3,000 per year for industry courses, conferences, and certifications. We pay for your licence upgrades.' },
    { title: 'Flexible Working Arrangements', description: 'Hybrid office model — work from our prestige Double Bay HQ or from the field. Results matter, not location.' },
    { title: 'Team Events & Recognition', description: 'Quarterly awards nights, annual company retreat, charity golf days, and a culture that genuinely celebrates wins.' },
  ],
  hiring_interests: ['Sales Agents', 'Property Managers', 'Commercial Leasing', 'Operations & Admin', 'Marketing', 'Business Development'],
  social_proof: [
    { author: 'Sarah & James Thornton', role: 'Vendors — Mosman', quote: 'Our agent at Meridian achieved $480K above our reserve. The marketing campaign was extraordinary — we had 42 registered bidders at auction. Absolutely incredible result.' },
    { author: 'Michael Chen', role: 'Investor — Inner West Portfolio', quote: 'I\'ve been with Meridian Property Management for six years across 8 properties. Zero vacancies in 18 months, rent always on time. They simply don\'t miss a beat.' },
    { author: 'Priya Kapoor', role: 'Buyer — Double Bay', quote: 'In a market this competitive, having Meridian\'s buyer\'s advocacy team in our corner was the difference. We secured our dream home before it even hit the market.' },
    { author: 'Tom Barrett', role: 'Senior Sales Agent (3 years)', quote: 'The culture here is unlike any agency I\'ve worked at. Leadership genuinely invests in you, the tools are best-in-class, and the earning potential is real. Best career decision I\'ve made.' },
  ],
  programs: [
    { name: 'Meridian Launch Program', description: 'A 90-day onboarding program for new agents — covering systems, scripts, prospecting strategies, and 1:1 coaching with a senior partner.', for_who: 'New agents (0–2 years experience)' },
    { name: 'Meridian Elevate', description: 'Advanced leadership and business development training for mid-career agents looking to move from $2M to $10M+ in personal commissions.', for_who: 'Established agents (3+ years experience)' },
    { name: 'Meridian PM Academy', description: 'Structured career pathway from property management assistant through to senior portfolio manager and department head.', for_who: 'Property management team' },
  ],
  industries_served: ['Residential Real Estate', 'Commercial Real Estate', 'Property Investment', 'Property Management', 'Buyers Advocacy', 'Auction Services'],
  badges: ['RateMyAgent #1 Eastern Suburbs 2024', 'REINSW Employer of Choice 2023', 'Carbon Neutral Certified'],
}

// ── DALL-E images ─────────────────────────────────────────────────────────────

const IMAGES = [
  {
    key: 'hero',
    filename: 'meridian-hero.jpg',
    prompt: 'Aerial photography of a stunning luxury waterfront property in Double Bay Sydney at golden hour, harbour views, lush gardens, infinity pool, modern architecture, prestige real estate, cinematic lighting, photorealistic',
  },
  {
    key: 'office',
    filename: 'meridian-office.jpg',
    prompt: 'Interior of a premium modern real estate agency office in Sydney, polished concrete floors, floor-to-ceiling windows with harbour views, elegant workstations, property listing displays on large screens, professional and aspirational, photorealistic',
  },
  {
    key: 'team',
    filename: 'meridian-team.jpg',
    prompt: 'Professional team photo of a diverse group of 8 real estate agents in smart business attire, standing confidently in front of a modern prestige office in Sydney, smiling, welcoming, photorealistic',
  },
  {
    key: 'awards',
    filename: 'meridian-awards.jpg',
    prompt: 'Real estate award ceremony, professional agents receiving trophies on stage at an elegant gala dinner, applause, celebration, formal evening wear, Sydney ballroom setting, photorealistic',
  },
  {
    key: 'property1',
    filename: 'meridian-property-mosman.jpg',
    prompt: 'Stunning luxury family home in Mosman Sydney, architect-designed with harbour glimpses, lush landscaped garden, white facade, open entertaining terrace, blue sky, prestige real estate listing photography, photorealistic',
  },
  {
    key: 'property2',
    filename: 'meridian-property-doublebay.jpg',
    prompt: 'Luxurious open-plan penthouse apartment interior in Double Bay Sydney, floor-to-ceiling harbour views, designer furniture, marble kitchen island, late afternoon golden light, prestige real estate photography, photorealistic',
  },
  {
    key: 'culture',
    filename: 'meridian-culture.jpg',
    prompt: 'Real estate team in a collaborative meeting around a large table, modern Sydney office, engaged discussion, laptops and property brochures, diverse professionals, positive and energetic atmosphere, photorealistic',
  },
  {
    key: 'community',
    filename: 'meridian-community.jpg',
    prompt: 'Real estate team volunteering at a community event in Sydney, team wearing branded polo shirts, helping at a charity fundraiser, smiling and engaged with community members, sunny day, warm and genuine, photorealistic',
  },
]

// ── Business intro video script ───────────────────────────────────────────────

const VIDEO_SCRIPT = `
Welcome to Meridian Property Group — Sydney's premier residential and commercial real estate agency.

For over 25 years, we have been at the heart of the Eastern Suburbs and Inner Sydney property market, delivering exceptional results through a team of 45 specialist agents who genuinely love what they do.

Our story is built on three things: deep local market knowledge, innovative marketing that puts every property in its best light, and an unwavering commitment to our clients — whether they're selling a family home, growing an investment portfolio, or leasing a commercial space.

With more than 1.4 thousand properties sold in the last five years and over 8.2 billion dollars in settled transactions, the numbers speak to what we do. But what truly defines Meridian is our culture.

We believe the best results come from the best teams. That's why we invest heavily in our people — through structured mentorship programs, state-of-the-art technology, and a commission structure that rewards performance with no ceiling.

If you're a sales agent, property manager, or real estate professional looking for a place where you can build a genuinely great career — in a business that champions your growth, equips you with the tools to succeed, and celebrates every win alongside you — we'd love to talk.

Explore our current opportunities, or reach out directly. At Meridian, the next chapter of your career starts here.
`.trim()

// ── Slide definitions ─────────────────────────────────────────────────────────

const SLIDES = [
  { key: 'hero',       duration: 5, label: 'Meridian Property Group\nSydney\'s Premier Real Estate Agency' },
  { key: 'team',       duration: 4, label: '45 Specialist Agents\nDouble Bay · Mosman · Inner West' },
  { key: 'property1',  duration: 4, label: 'Prestige Residential Sales\n$8.2B+ in Settled Transactions' },
  { key: 'property2',  duration: 4, label: 'Exceptional Properties\nExceptional Results' },
  { key: 'awards',     duration: 4, label: 'RateMyAgent #1 Eastern Suburbs\nREINSW Employer of Choice 2023' },
  { key: 'culture',    duration: 4, label: 'A Culture Built on Excellence\nMentorship · Technology · Growth' },
  { key: 'community',  duration: 4, label: 'Community First\nProud Partners of Local Sydney' },
  { key: 'office',     duration: 5, label: 'Build Your Career with Meridian\nUnlimited Earning Potential' },
]

// ── Jobs ──────────────────────────────────────────────────────────────────────

const JOBS = [
  {
    title: 'Senior Residential Sales Agent — Eastern Suburbs',
    description: `Meridian Property Group is seeking an exceptional Senior Residential Sales Agent to join our award-winning Eastern Suburbs team.

This is a rare opportunity to leverage Meridian's premium brand, unparalleled marketing resources, and deep Eastern Suburbs market penetration to build one of Sydney's most lucrative real estate careers.

**The Role**
You will manage your own high-value residential sales pipeline across Double Bay, Mosman, Bellevue Hill, and Vaucluse — supported by a dedicated marketing team, CRM, AI-powered appraisal tools, and a senior partner mentor.

**Key Responsibilities**
- Generate listings through prospecting, database management, and referral networks
- Conduct property appraisals and develop compelling listing proposals
- Execute and manage comprehensive sales campaigns (digital, print, auction)
- Negotiate sale terms and guide clients through the conveyancing process
- Build and maintain long-term relationships with buyers and investors
- Attend weekly team meetings and contribute to the agency's market intelligence

**What We Offer**
- Uncapped commission with industry-leading splits (OTE $180K–$350K+)
- Full marketing and admin support — no listing costs out of pocket
- Dedicated prospecting territory in blue-chip Eastern Suburbs postcodes
- 12-month mentorship with a $10M+ biller
- $3,000 annual professional development allowance`,
    requirements: `- Current NSW Real Estate Licence (Certificate of Registration minimum)
- 3+ years residential sales experience, preferably in prestige markets
- Proven track record of listing and selling property
- Exceptional interpersonal and negotiation skills
- Strong local knowledge of the Eastern Suburbs or Inner Sydney
- Own vehicle and current Australian driver\'s licence
- CRM experience (Rex, VaultRE, or similar)`,
    employment_type: 'Full-time',
    location: 'Double Bay, NSW, Australia',
    city: 'Double Bay',
    state: 'NSW',
    country: 'Australia',
    remote_allowed: false,
    salary_min: 60000,
    salary_max: 350000,
    salary_currency: 'AUD',
    required_skills: ['Residential Sales', 'Property Appraisal', 'Auction', 'Client Relationship Management', 'Negotiation', 'NSW Real Estate Licence'],
    preferred_skills: ['Prestige Market Experience', 'Buyer Advocacy', 'Database Marketing', 'Rex CRM'],
    experience_level: 'Senior',
    status: 'published',
    is_active: true,
    tags: ['real-estate', 'sales', 'prestige', 'eastern-suburbs', 'commission'],
  },
  {
    title: 'Property Manager — Inner West Residential Portfolio',
    description: `We are looking for an experienced and proactive Property Manager to join Meridian's growing Inner West property management division.

This is a fantastic opportunity for a motivated PM to take ownership of a stable, high-quality portfolio of approximately 120 residential properties across Balmain, Rozelle, Annandale, and Leichhardt.

**The Role**
You will be responsible for the full property management lifecycle — from tenant screening and lease preparation through to maintenance coordination, rent reviews, inspections, and renewal negotiations — while building genuine relationships with our investor clients.

**Key Responsibilities**
- Manage a portfolio of ~120 residential properties with full PM support
- Conduct routine inspections, entry/exit condition reports, and arrange maintenance
- Process rental applications and conduct thorough tenant screenings
- Negotiate lease renewals and coordinate rent reviews in line with market conditions
- Manage arrears, bond lodgements, and NCAT proceedings as required
- Maintain accurate records in PropertyMe and report to landlords proactively
- Grow the portfolio through referrals and cross-sell of additional Meridian services

**What We Offer**
- Base salary $85,000–$95,000 + super + performance bonuses
- Portfolio growth bonus structure
- Supportive team environment with PM assistant support
- Ongoing training through Meridian PM Academy
- Hybrid working — 3 days in office, 2 days in the field`,
    requirements: `- Current NSW Certificate of Registration (or full Real Estate Licence)
- Minimum 2 years residential property management experience
- Proficiency with PropertyMe or similar PM software
- Strong written and verbal communication skills
- Exceptional organisational skills and ability to manage competing priorities
- Knowledge of NSW residential tenancy legislation (RTA 2010)
- Own vehicle and current driver\'s licence`,
    employment_type: 'Full-time',
    location: 'Balmain, NSW, Australia',
    city: 'Balmain',
    state: 'NSW',
    country: 'Australia',
    remote_allowed: true,
    salary_min: 85000,
    salary_max: 95000,
    salary_currency: 'AUD',
    required_skills: ['Property Management', 'NSW Tenancy Legislation', 'Lease Administration', 'Inspections', 'Arrears Management', 'PropertyMe'],
    preferred_skills: ['NCAT Experience', 'Portfolio Growth', 'Investor Relations', 'Commercial Property'],
    experience_level: 'Mid-level',
    status: 'published',
    is_active: true,
    tags: ['property-management', 'inner-west', 'residential', 'tenancy', 'hybrid'],
  },
  {
    title: 'Commercial Leasing Executive — Sydney CBD & Surrounds',
    description: `Meridian Property Group is expanding its commercial division and is seeking a driven Commercial Leasing Executive to manage and grow our CBD and Fringe leasing portfolio.

This is an exceptional opportunity for an ambitious real estate professional to transition into or grow within the commercial sector, backed by Meridian's premium brand and established commercial landlord network.

**The Role**
You will work alongside our Head of Commercial to lease office, retail, and mixed-use properties across Sydney's CBD core, Surry Hills, Pyrmont, and North Sydney. You'll be building long-term relationships with commercial landlords, tenants, and corporate occupiers.

**Key Responsibilities**
- List and lease commercial office, retail, and industrial properties across greater Sydney
- Conduct thorough market analysis, rental appraisals, and leasing proposals
- Manage tenant enquiries, conduct inspections, and negotiate heads of agreement
- Prepare and execute commercial lease documentation (in conjunction with legal)
- Maintain and grow a database of active corporate tenants and landlords
- Attend industry networking events and REINSW commercial forums
- Work towards becoming the point person for a dedicated commercial precinct

**What We Offer**
- OTE $150,000–$250,000+ with uncapped commercial commission
- Structured mentorship with our Head of Commercial (30 years experience)
- Access to Meridian's established landlord database and referral network
- Marketing support, IM preparation, and professional photography for all listings
- REINSW commercial accreditation cost covered by Meridian`,
    requirements: `- Current NSW Real Estate Licence (Class 1 preferred, Certificate of Registration considered)
- 2+ years real estate experience (residential sales considered if demonstrating commercial interest)
- Strong negotiation skills and commercial acumen
- Exceptional presentation, written proposals, and client management ability
- Understanding of commercial lease structures (gross, net, turnover)
- Ambition, self-motivation, and a genuine interest in building a commercial career`,
    employment_type: 'Full-time',
    location: 'Sydney CBD, NSW, Australia',
    city: 'Sydney',
    state: 'NSW',
    country: 'Australia',
    remote_allowed: false,
    salary_min: 80000,
    salary_max: 250000,
    salary_currency: 'AUD',
    required_skills: ['Commercial Leasing', 'Negotiation', 'Lease Documentation', 'Market Appraisal', 'NSW Real Estate Licence'],
    preferred_skills: ['CBD Office Leasing', 'Retail Leasing', 'Industrial Leasing', 'IM Preparation', 'REINSW Commercial Accreditation'],
    experience_level: 'Mid-level',
    status: 'published',
    is_active: true,
    tags: ['commercial', 'leasing', 'sydney-cbd', 'office', 'retail', 'uncapped-commission'],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function run(cmd, label) {
  console.log(`  ▶  ${label}`)
  try {
    execSync(cmd, { stdio: 'pipe' })
    console.log(`  ✅  ${label} done`)
  } catch (err) {
    console.error(`  ❌  ${label} failed:`, err.stderr?.toString() || err.message)
    throw err
  }
}

async function generateAndUploadImage(imgDef, userId) {
  const storagePath = `${userId}/business/${uuidv4()}-${imgDef.filename}`

  // Check if already exists
  const { data: existing } = await supabase
    .from('business_profile_images')
    .select('id, storage_path')
    .eq('user_id', userId)
    .ilike('storage_path', `%${imgDef.filename.replace('.jpg', '')}%`)
    .maybeSingle()

  if (existing?.storage_path) {
    console.log(`  ♻️  Reusing: ${imgDef.key}`)
    return existing.storage_path
  }

  console.log(`  🎨  Generating: ${imgDef.key}`)
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: imgDef.prompt,
    n: 1,
    size: '1792x1024',
    quality: 'hd',
    style: 'natural',
  })

  const imageUrl = response.data[0].url
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`)
  const imageBuffer = Buffer.from(await imgRes.arrayBuffer())

  const { error: uploadErr } = await supabase.storage
    .from('talent-bank')
    .upload(storagePath, imageBuffer, { contentType: 'image/jpeg', upsert: true })

  if (uploadErr) throw new Error(`Upload failed for ${imgDef.key}: ${uploadErr.message}`)
  console.log(`  ✅  Uploaded: ${imgDef.key} → ${storagePath}`)
  return storagePath
}

function getPublicUrl(storagePath) {
  if (!storagePath) return null
  return `${SUPABASE_URL}/storage/v1/object/public/talent-bank/${storagePath}`
}

async function downloadStorageFile(storagePath, localPath) {
  const publicUrl = getPublicUrl(storagePath)
  const res = await fetch(publicUrl)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  fs.writeFileSync(localPath, Buffer.from(await res.arrayBuffer()))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏢  Seeding Meridian Property Group demo business profile...\n')

  // ── Step 1: Auth user ─────────────────────────────────────────────────────
  console.log('👤  Setting up auth user...')
  const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 500 })
  let userId
  const existing = userList?.users?.find(u => u.email === DEMO_EMAIL)

  if (existing) {
    userId = existing.id
    console.log(`  ♻️  Auth user exists: ${userId}`)
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { user_type: 'business', name: 'Meridian Property Group' },
    })
    if (createErr) { console.error('❌  Create user failed:', createErr.message); process.exit(1) }
    userId = created.user.id
    console.log(`  ✅  Created auth user: ${userId}`)
  }

  // ── Step 2: Generate DALL-E images ────────────────────────────────────────
  console.log('\n🎨  Generating DALL-E images...')
  const storagePaths = {}

  for (const imgDef of IMAGES) {
    storagePaths[imgDef.key] = await generateAndUploadImage(imgDef, userId)
  }
  console.log('  ✅  All images ready\n')

  const heroUrl      = getPublicUrl(storagePaths.hero)
  const logoUrl      = getPublicUrl(storagePaths.office) // Office exterior as logo placeholder
  const officeUrl    = getPublicUrl(storagePaths.office)
  const teamUrl      = getPublicUrl(storagePaths.team)
  const awardsUrl    = getPublicUrl(storagePaths.awards)
  const property1Url = getPublicUrl(storagePaths.property1)
  const property2Url = getPublicUrl(storagePaths.property2)
  const cultureUrl   = getPublicUrl(storagePaths.culture)
  const communityUrl = getPublicUrl(storagePaths.community)

  // ── Step 3: Upsert business_profiles ─────────────────────────────────────
  console.log('💼  Upserting business_profiles...')
  const { error: bpErr } = await supabase
    .from('business_profiles')
    .upsert({
      id: userId,
      user_id: userId,
      business_name: AGENCY.business_name,
      name: AGENCY.business_name,
      slug: AGENCY.slug,
      description: AGENCY.value_prop_body,
      industry: AGENCY.industry,
      website: AGENCY.website,
      email: AGENCY.email,
      city: AGENCY.city,
      state: AGENCY.state,
      country: AGENCY.country,
      location: AGENCY.location,
      latitude: AGENCY.latitude,
      longitude: AGENCY.longitude,
      talent_community_enabled: true,
      public_profile_enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (bpErr) { console.error('❌  business_profiles upsert failed:', bpErr.message); process.exit(1) }
  console.log('  ✅  business_profiles upserted')

  // Fetch back the business profile ID (may differ from userId if schema uses separate PK)
  const { data: bpRow } = await supabase
    .from('business_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  const businessId = bpRow?.id || userId
  console.log(`  ℹ️   business_profiles.id = ${businessId}`)

  // ── Step 4: Upsert business_profile_pages ────────────────────────────────
  console.log('\n📄  Upserting business_profile_pages...')

  await supabase.from('business_profile_pages').delete().eq('business_id', businessId)

  const { error: pageErr } = await supabase
    .from('business_profile_pages')
    .insert({
      business_id: businessId,
      slug: AGENCY.slug,
      is_published: true,
      name: AGENCY.business_name,
      tagline: AGENCY.tagline,
      mission: AGENCY.mission,
      logo_url: teamUrl,
      hero_image_url: heroUrl,
      value_prop_headline: AGENCY.value_prop_headline,
      value_prop_body: AGENCY.value_prop_body,
      website_url: AGENCY.website,
      contact_email: AGENCY.email,
      enquiry_enabled: true,
      impact_stats: AGENCY.impact_stats,
      culture_values: AGENCY.culture_values,
      benefits: AGENCY.benefits,
      programs: AGENCY.programs,
      social_proof: AGENCY.social_proof,
      hiring_interests: AGENCY.hiring_interests,
      industries_served: AGENCY.industries_served,
      badges: AGENCY.badges,
      acknowledgement_of_country: AGENCY.acknowledgement,
      live_roles_count: 3,
      talent_community_enabled: true,
      portfolio_intake_enabled: true,
      updated_at: new Date().toISOString(),
    })

  if (pageErr) { console.error('❌  business_profile_pages insert failed:', pageErr.message); process.exit(1) }
  console.log('  ✅  business_profile_pages inserted')

  // ── Step 5: Products / Services ───────────────────────────────────────────
  console.log('\n🛠️   Inserting products & services...')

  await supabase.from('business_products_services').delete().eq('business_id', businessId)

  const SERVICES = [
    {
      business_id: businessId,
      user_id: userId,
      name: 'Prestige Residential Sales',
      category: 'Service',
      short_description: 'End-to-end sales campaigns for premium residential properties across the Eastern Suburbs, North Shore, and Inner Sydney.',
      who_it_is_for: 'Homeowners, investors, and executors seeking premium sale outcomes for residential property.',
      problem_it_solves: 'Maximising sale price through expert marketing, professional photography, strategic pricing, and best-in-class auction management.',
      logo_or_icon: property1Url,
    },
    {
      business_id: businessId,
      user_id: userId,
      name: 'Residential Property Management',
      category: 'Service',
      short_description: 'Comprehensive property management for residential investors — from tenant selection through to annual rent reviews and compliance.',
      who_it_is_for: 'Residential property investors who want consistent returns, proactive management, and complete peace of mind.',
      problem_it_solves: 'Protecting asset value, eliminating vacancy risk, and managing the complexity of being a landlord so investors don\'t have to.',
      logo_or_icon: property2Url,
    },
    {
      business_id: businessId,
      user_id: userId,
      name: 'Commercial Leasing & Advisory',
      category: 'Offering',
      short_description: 'Strategic commercial leasing for office, retail, and industrial properties across Greater Sydney, with full tenant advisory and landlord representation.',
      who_it_is_for: 'Commercial landlords seeking strong tenants and optimal lease structures, and corporate tenants searching for their next premises.',
      problem_it_solves: 'Reducing vacancy periods, securing quality tenants at optimal rent, and navigating complex commercial lease negotiations with expert guidance.',
      logo_or_icon: officeUrl,
    },
  ]

  for (const svc of SERVICES) {
    const { error } = await supabase.from('business_products_services').insert(svc)
    if (error) console.warn(`  ⚠️  Service insert warning: ${error.message}`)
    else console.log(`  ✅  Service: ${svc.name}`)
  }

  // ── Step 6: Job vacancies ─────────────────────────────────────────────────
  console.log('\n💼  Inserting job vacancies...')

  // Delete existing jobs for this business
  await supabase.from('jobs').delete().eq('business_profile_id', businessId)

  for (const job of JOBS) {
    const { tags: _tags, ...jobData } = job  // remove tags (column doesn't exist)
    const { error } = await supabase.from('jobs').insert({
      ...jobData,
      business_profile_id: businessId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    if (error) console.warn(`  ⚠️  Job insert warning (${job.title}): ${error.message}`)
    else console.log(`  ✅  Job: ${job.title}`)
  }

  // ── Step 7: Generate intro video ──────────────────────────────────────────
  console.log('\n🎬  Generating business intro video...')
  const ff = ffmpegBin.replace(/\\/g, '/')
  const tmpDir = path.join(os.tmpdir(), `meridian-video-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  console.log(`  📁  Temp dir: ${tmpDir}`)

  // Download slides
  console.log('  📥  Downloading slide images...')
  const localSlides = []
  for (let i = 0; i < SLIDES.length; i++) {
    const slide = SLIDES[i]
    const sp = storagePaths[slide.key]
    if (!sp) { console.warn(`  ⚠️  No image for slide key "${slide.key}"`); continue }
    const localPath = path.join(tmpDir, `slide-${String(i).padStart(2, '0')}-raw.jpg`)
    await downloadStorageFile(sp, localPath)
    localSlides.push({ ...slide, rawPath: localPath, index: i })
    console.log(`  ✅  Downloaded: ${slide.key}`)
  }

  // Process slides with text overlays
  console.log('  🖼️   Processing slides...')
  const processedSlides = []
  for (const slide of localSlides) {
    const outPath = path.join(tmpDir, `slide-${String(slide.index).padStart(2, '0')}.mp4`)
    const lines = slide.label.split('\n')
    const line1 = lines[0].replace(/'/g, "\\'").replace(/:/g, '\\:')
    const line2 = (lines[1] || '').replace(/'/g, "\\'").replace(/:/g, '\\:')
    const drawLine1 = line1 ? `drawtext=text='${line1}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=h-200:box=1:boxcolor=black@0.55:boxborderw=16` : ''
    const drawLine2 = line2 ? `drawtext=text='${line2}':fontsize=34:fontcolor=white@0.9:x=(w-text_w)/2:y=h-130:box=1:boxcolor=black@0.45:boxborderw=12` : ''
    const filters = [
      'scale=1920:1080:force_original_aspect_ratio=decrease',
      'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black',
      `zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${slide.duration * 25}:s=1920x1080:fps=25`,
      drawLine1, drawLine2,
    ].filter(Boolean).join(',')
    const cmd = `"${ff}" -y -loop 1 -i "${slide.rawPath.replace(/\\/g, '/')}" -vf "${filters}" -t ${slide.duration} -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 "${outPath.replace(/\\/g, '/')}"`
    run(cmd, `Slide ${slide.index + 1}: ${lines[0]}`)
    processedSlides.push({ ...slide, outPath })
  }

  // TTS narration
  console.log('  🎤  Generating TTS narration (shimmer — warm professional female)...')
  const audioPath = path.join(tmpDir, 'narration.mp3')
  const ttsResponse = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'shimmer',
    input: VIDEO_SCRIPT,
    speed: 0.95,
  })
  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
  fs.writeFileSync(audioPath, audioBuffer)
  console.log(`  ✅  TTS: ${(audioBuffer.length / 1024).toFixed(0)} KB`)

  // Concat slides
  const concatList = path.join(tmpDir, 'concat.txt')
  fs.writeFileSync(concatList, processedSlides.map(s => `file '${s.outPath.replace(/\\/g, '/')}'`).join('\n'))
  const silentPath = path.join(tmpDir, 'silent.mp4')
  run(`"${ff}" -y -f concat -safe 0 -i "${concatList.replace(/\\/g, '/')}" -c copy "${silentPath.replace(/\\/g, '/')}"`, 'Concatenating slides')

  // Mix audio
  const finalPath = path.join(tmpDir, 'meridian-intro.mp4')
  const totalDuration = processedSlides.reduce((s, sl) => s + sl.duration, 0)
  const audioFilter = `afade=t=in:ss=0:d=0.8,afade=t=out:st=${Math.max(totalDuration - 1.5, totalDuration * 0.9)}:d=1.5`
  run(`"${ff}" -y -i "${silentPath.replace(/\\/g, '/')}" -i "${audioPath.replace(/\\/g, '/')}" -filter_complex "[1:a]${audioFilter}[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "${finalPath.replace(/\\/g, '/')}"`, 'Mixing audio + video')

  // Upload video
  console.log('  ☁️   Uploading video...')
  const videoBuffer = fs.readFileSync(finalPath)
  const videoStoragePath = `${userId}/business/meridian-intro-video.mp4`
  await supabase.storage.from('talent-bank').remove([videoStoragePath])
  const { error: vidUploadErr } = await supabase.storage.from('talent-bank').upload(videoStoragePath, videoBuffer, { contentType: 'video/mp4', upsert: true })
  if (vidUploadErr) { console.error('❌  Video upload failed:', vidUploadErr.message); process.exit(1) }
  const videoPublicUrl = getPublicUrl(videoStoragePath)
  console.log(`  ✅  Uploaded (${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB)`)

  // Update business_profile_pages with video URL stored in media_assets
  await supabase
    .from('business_profile_pages')
    .update({ media_assets: { intro_video_url: videoPublicUrl } })
    .eq('business_id', businessId)
  console.log(`  ✅  media_assets.intro_video_url set on business_profile_pages`)

  // Cleanup
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n🎉  Meridian Property Group seeded!\n')
  console.log(`  Email:    ${DEMO_EMAIL}`)
  console.log(`  Password: ${DEMO_PASSWORD}`)
  console.log(`  Slug:     ${AGENCY.slug}`)
  console.log(`  Business ID: ${businessId}`)
  console.log(`\n  Public page: /business/${AGENCY.slug}/about`)
  console.log(`  Dashboard:   /dashboard/business (sign in at /login/business)`)
  console.log(`\n  Jobs:   ${JOBS.length} vacancies published`)
  console.log(`  Video:  ${totalDuration}s • ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
