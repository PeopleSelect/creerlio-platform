/**
 * Fix script for Cadigal — patches the parts that failed due to schema differences.
 * Run after create-cadigal.js has already run.
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const DEMO_EMAIL = 'demo.cadigal@creerlio.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const BUCKET = 'business-bank'

function publicUrl(storagePath) {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encoded}`
}

async function run() {
  // Get the user
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.find(u => u.email === DEMO_EMAIL)
  if (!user) { console.error('User not found'); process.exit(1) }
  const userId = user.id
  console.log('User ID:', userId)

  // Get location
  const { data: loc } = await supabase.from('locations').select('id').eq('owner_id', userId).maybeSingle()
  const locationId = loc?.id
  if (!locationId) { console.error('Location not found'); process.exit(1) }
  console.log('Location ID:', locationId)

  // Get logo and hero URLs from bank items
  const { data: bankItems } = await supabase.from('business_bank_items')
    .select('id, item_type, title, file_url, file_path')
    .eq('user_id', userId)

  const logoItem = bankItems?.find(b => b.item_type === 'logo')
  const heroItem = bankItems?.find(b => b.item_type === 'image' && b.title?.includes('hero') || b.title?.includes('9 Castlereagh'))
  const videoItem = bankItems?.find(b => b.item_type === 'business_introduction')

  const logoUrl = logoItem?.file_url || null
  const heroUrl = heroItem?.file_url || null
  const videoUrl = videoItem?.file_url || null

  console.log('Logo URL:', logoUrl ? '✓' : '✗')
  console.log('Hero URL:', heroUrl ? '✓' : '✗')
  console.log('Video URL:', videoUrl ? '✓' : '✗')

  // ── Fix business_profiles ─────────────────────────────────────────────────
  console.log('\n[Fix 1] business_profiles...')
  const { error: bpErr } = await supabase.from('business_profiles').upsert({
    id:            userId,
    user_id:       userId,
    business_id:   userId,
    name:          'Cadigal Office Leasing',
    business_name: 'Cadigal Office Leasing',
    description:   'Sydney\'s leading pure office leasing specialist. Founded 2011. Trusted by Dexus, Lendlease, GPT, Stockland, Brookfield, and every major institutional landlord in Sydney. Dexus Office Agency of the Year 2025.',
    slug:          'cadigal',
    industry:      'Commercial Real Estate',
    size:          '11-50',
    location:      'Sydney CBD, NSW, Australia',
    city:          'Sydney',
    state:         'NSW',
    country:       'Australia',
    latitude:      -33.8714,
    longitude:     151.2073,
    website:       'https://www.cadigal.com.au/',
    email:         'info@cadigal.com.au',
    is_active:     true,
    location_id:   locationId,
    talent_community_enabled: true,
  }, { onConflict: 'id' })
  if (bpErr) console.warn('  business_profiles:', bpErr.message)
  else console.log('  ✓ business_profiles')

  // ── Fix business_profile_pages ────────────────────────────────────────────
  console.log('\n[Fix 2] business_profile_pages...')
  const { error: bppErr } = await supabase.from('business_profile_pages').upsert({
    business_id:    userId,
    slug:           'cadigal',
    is_published:   true,
    name:           'Cadigal Office Leasing',
    logo_url:       logoUrl,
    hero_image_url: heroUrl,
    tagline:        'Pure Office Leasing Sydney.',
    mission:        'To be Sydney\'s most trusted office leasing specialist — delivering exceptional results for building owners and tenants through deep market expertise, genuine independence, and a relentless commitment to our clients\' success.',
    value_prop_headline: 'Sydney\'s Most Trusted Pure Office Leasing Specialist — 15 Years, 2 Offices, Every Major Building',
    value_prop_body: 'Cadigal\'s sole focus is Sydney office leasing — CBD, Barangaroo, Pyrmont, North Sydney, and St Leonards. Founded in 2011, we have been appointed by virtually every major institutional landlord in Sydney and have facilitated some of the city\'s landmark leasing transactions. We are not a generalist agency. We are the firm you call when you want the best possible outcome for your Sydney office asset or space requirement — and we have 15 years of results to prove it. Winner: Dexus Office Agency of the Year 2025.',
    impact_stats: [
      { label: 'Years of Pure Office Leasing',       value: '15+' },
      { label: 'Offices (CBD & North Sydney)',        value: '2' },
      { label: 'Specialist Team Members',             value: '~25' },
      { label: 'Major Institutional Clients',         value: '20+' },
      { label: 'Mastercard Deal — Largest N Shore',   value: '7,227sqm' },
      { label: 'Cole Classic — Charity Swims',        value: '3 Years' },
    ],
    culture_values: [
      { title: 'Passion',      description: 'Our team is handpicked for their genuine passion for Sydney office property. We don\'t do this as a job — we do it because we love it.' },
      { title: 'Intelligence', description: 'Rigorous research and data-driven market intelligence underpin every leasing campaign and tenant mandate. Our dedicated Research Director publishes bi-annual Sydney CBD and North Shore Market Pulse reports.' },
      { title: 'Integrity',    description: 'We always put our clients\' best interests first — even when that means telling them something they might not want to hear. Our long-term client relationships are built on trust.' },
      { title: 'Excellence',   description: 'Cadigal was built for the top end of the market. Our team, our marketing, and our results are all held to the highest standards — consistently.' },
    ],
    business_areas: [
      { name: 'Landlord Leasing Campaigns',   description: 'End-to-end leasing campaign management for Sydney office building owners — from strategy and marketing through to lease execution. Trusted by Dexus, Lendlease, GPT, Stockland, Brookfield, Mirvac, Centuria, and more.' },
      { name: 'Tenant Representation',        description: 'Independent, specialist advisory for businesses seeking office space in Sydney — including off-market opportunity identification, competitive lease negotiation, sub-leasing strategy, and market intelligence at no cost to the tenant.' },
      { name: 'Market Research & Intelligence', description: 'Bi-annual Sydney CBD and North Shore Market Pulse reports, bespoke tenant market reports, vacancy and absorption analytics, and rental benchmarking. Led by Research Director Lok So (24+ years experience).' },
      { name: 'Development Consultancy',      description: 'Strategic advisory for new and repositioned Sydney office projects — floor plate optimisation, competitive rental benchmarking, tenant market depth analysis, and pre-commitment leasing strategy.' },
      { name: 'Flexible & Coworking Workspace', description: 'National flexible workspace advisory through Cadigal\'s joint venture with Rubberdesk — helping businesses find and compare serviced offices, coworking spaces, and flexible lease solutions across Australia.' },
      { name: 'Expert Witness & General Consultancy', description: 'Specialist leasing evidence for court proceedings, building acquisition and divestiture advice, and customised property research for complex advisory mandates.' },
    ],
    benefits: [
      { title: 'Elite Mandate Access',           description: 'Work directly on Sydney\'s most significant office leasing campaigns — Australia Square, One Farrer Place, Barangaroo, and more. No other boutique agency has our mandate depth.' },
      { title: 'Founders in the Business',       description: 'Mark Tindale, Grant Jennings, and Peter Ferguson are still active directors — available, accessible, and invested in your success. This is not a corporate HR model.' },
      { title: 'Best-in-Class Research Support', description: 'Our dedicated Research Director Lok So (24+ years experience) gives our whole team a genuine market intelligence edge that no competitor can match at our size.' },
      { title: 'Strong Team Retention',          description: 'The average tenure of our team members speaks for itself. Multiple people have been with Cadigal for 10+ years. We build careers, not just jobs.' },
      { title: 'High-Performance Culture',       description: 'We are small enough to be agile and collegiate, large enough to handle Sydney\'s biggest leasing mandates. Driven, collaborative, and genuinely meritocratic.' },
      { title: 'Community & Wellbeing',          description: 'Cole Classic Ocean Swim partnership (3 years), Coast Shelter charity support, IWD programs, and team events that reflect our values and build genuine camaraderie.' },
    ],
    programs: [
      { name: 'Leasing Executive Development Program', description: 'Structured pathway for emerging leasing professionals — direct mentorship from Executive Directors, exposure to major building campaigns, and clear progression to Director level.', url: 'https://www.cadigal.com.au/' },
      { name: 'Cadigal Rubberdesk — Flexible Workspace', description: 'Our national joint venture with Rubberdesk for the coworking and flexible office market — offering team members expanded service capability and client relationships beyond traditional leasing.', url: 'https://www.rubberdesk.com.au/' },
    ],
    social_proof: [
      { quote: 'Cadigal are the best office leasing team in Sydney. Their market knowledge is unmatched — they knew about our upcoming vacancy before we had even made a formal decision.', source: 'Institutional Landlord — Sydney CBD Premium Tower' },
      { quote: 'Grant and the Cadigal team achieved an exceptional outcome on Australia Square. They brought the right tenants, negotiated brilliantly, and delivered results ahead of programme.', source: 'Dexus — Australia Square, 264 George Street' },
      { quote: 'Marcus and the North Sydney team\'s knowledge of the St Leonards market was instrumental in securing Mastercard\'s commitment. This was a landmark deal for the precinct.', source: 'UOL Group — 72 Christie Street, St Leonards' },
      { quote: 'The research capability at Cadigal is extraordinary for a firm of their size. Lok\'s market analysis gives us a genuine edge in how we position our buildings.', source: 'Major Institutional Building Owner — North Sydney' },
    ],
    live_roles_count:           4,
    talent_community_enabled:   true,
    portfolio_intake_enabled:   true,
    hiring_interests: [
      'Experienced Office Leasing Agents — Sydney CBD',
      'Leasing Executives — North Sydney',
      'Associate Directors — Office Leasing',
      'Leasing & Research Analysts',
      'Marketing & Communications',
      'Operations & Business Support',
    ],
    industries_served: [
      'Commercial Office Property',
      'Institutional Property Investment',
      'Private Commercial Property',
      'Tenant Representation',
      'Property Development',
      'Flexible & Coworking Workspace',
    ],
    contact_email:   'info@cadigal.com.au',
    website_url:     'https://www.cadigal.com.au/',
    enquiry_enabled: true,
    media_assets: {
      intro_video_url: videoUrl,
      logo_url:        logoUrl,
      hero_image_url:  heroUrl,
    },
    badges: [
      'Dexus Office Agency of the Year 2025',
      'Dexus Office Agent of the Year 2025 — Grant Jennings',
      'Pure Office Leasing Specialist',
      'Founded 2011 — 15 Years',
      'Cole Classic Partner 3 Years',
    ],
    acknowledgement_of_country: 'Cadigal acknowledges the Gadigal people of the Eora Nation as the Traditional Custodians of the land on which we live and work in Sydney. Our company name was chosen in recognition of and respect for the Gadigal people, with the approval and support of the Metropolitan Local Aboriginal Land Council. We pay our respects to Elders past, present, and emerging.',
  }, { onConflict: 'business_id' })
  if (bppErr) console.warn('  business_profile_pages:', bppErr.message)
  else console.log('  ✓ business_profile_pages')

  // ── Jobs ──────────────────────────────────────────────────────────────────
  console.log('\n[Fix 3] Jobs...')
  const jobs = [
    {
      title: 'Senior Leasing Executive — Sydney CBD Office',
      description: `Cadigal is seeking a driven and experienced Senior Leasing Executive to join our Sydney CBD team.\n\nThis is a rare opportunity to work at Sydney's most respected pure office leasing agency — directly alongside our Executive Directors on the city's most significant building campaigns.\n\n**The Role**\nYou will manage a portfolio of institutional and private leasing campaigns across Premium and A-Grade Sydney CBD office buildings, driving enquiry, conducting inspections, negotiating Heads of Agreement, and guiding transactions through to lease execution.\n\n**Key Responsibilities**\n- Lead leasing campaigns on major Sydney CBD office buildings\n- Manage tenant enquiry, inspections, and negotiation pipelines\n- Develop and maintain relationships with tenant representatives, corporate occupiers, and building owners\n- Contribute to market research, building appraisals, and competitive analysis\n- Work alongside Executive Directors on pitch and strategy\n\n**What We Offer**\n- Direct access to Sydney's most significant office leasing mandates (Australia Square, One Farrer Place, and more)\n- Work alongside co-founders Mark Tindale, Grant Jennings, and Peter Ferguson\n- Competitive salary + commission structure\n- In-house research support from Research Director Lok So (24+ years experience)\n- Genuine career progression to Director level`,
      city: 'Sydney', state: 'NSW', country: 'Australia', location: 'Sydney CBD, NSW, Australia',
      employment_type: 'Full-time', experience_level: 'Senior',
      salary_min: 120000, salary_max: 160000, salary_currency: 'AUD',
      required_skills: ['Commercial Office Leasing', 'Lease Negotiation', 'Tenant Relations', 'Heads of Agreement', 'Market Knowledge'],
      preferred_skills: ['Sydney CBD Market', 'Institutional Landlord Experience', 'Tenant Representation'],
      requirements: '- Minimum 4 years experience in commercial office leasing (CBD preferred)\n- Current NSW Real Estate Licence\n- Proven track record completing leasing transactions in A/Premium Grade buildings\n- Strong understanding of Sydney CBD office market dynamics\n- Excellent negotiation, communication, and relationship management skills',
    },
    {
      title: 'Leasing Executive — North Sydney Office Market',
      description: `Join Cadigal's North Sydney team — the team behind the market's most significant deals including the landmark Mastercard transactions at 72 Christie Street, St Leonards.\n\n**The Role**\nYou will support and progressively lead leasing campaigns across North Sydney, St Leonards, Crows Nest, and Chatswood office buildings.\n\n**Key Responsibilities**\n- Manage tenant enquiry and inspection pipeline for North Sydney building campaigns\n- Develop relationships with tenants, tenant representatives, and building owners\n- Conduct building inspections and prepare leasing proposals\n- Assist with Heads of Agreement negotiations\n- Contribute to North Shore Market Pulse research\n\n**What We Offer**\n- Mentorship from Craig Dolman (19 years North Sydney experience) and Marcus Pratley (350,000+ sqm of leases)\n- Access to landmark North Shore building mandates\n- Structured career development to Director level\n- Competitive salary + commission`,
      city: 'North Sydney', state: 'NSW', country: 'Australia', location: 'North Sydney, NSW, Australia',
      employment_type: 'Full-time', experience_level: 'Mid-level',
      salary_min: 90000, salary_max: 130000, salary_currency: 'AUD',
      required_skills: ['Commercial Leasing', 'Tenant Relations', 'Market Research', 'Building Inspections', 'Negotiation'],
      preferred_skills: ['North Sydney Market', 'A-Grade Office Experience', 'Landlord Representation'],
      requirements: '- 2+ years experience in commercial office or commercial property leasing\n- Current NSW Real Estate Licence (or eligible to obtain)\n- Strong communication, presentation, and relationship-building skills\n- Highly organised with excellent attention to detail',
    },
    {
      title: 'Leasing & Research Analyst — Sydney CBD',
      description: `Cadigal is seeking a sharp, analytically minded Leasing & Research Analyst to join our Sydney CBD team.\n\nIdeal first or second role in commercial property for a motivated graduate — working directly with Research Director Lok So and our CBD leasing team.\n\n**Key Responsibilities**\n- Compile and maintain Sydney CBD and North Shore vacancy, absorption, and rental data\n- Contribute to bi-annual Market Pulse reports and bespoke tenant market reports\n- Prepare building marketing materials, information memoranda, and floor plan packages\n- Track competitor buildings, leasing transactions, and tenant movements\n- Support leasing directors with inspection scheduling and proposal preparation\n\n**What We Offer**\n- Direct mentorship from Lok So — 24+ years of commercial real estate research expertise\n- Exposure to every aspect of a premium Sydney CBD office leasing business\n- Clear career pathway to Leasing Executive\n- Professional development support and industry training`,
      city: 'Sydney', state: 'NSW', country: 'Australia', location: 'Sydney CBD, NSW, Australia',
      employment_type: 'Full-time', experience_level: 'Graduate',
      salary_min: 65000, salary_max: 85000, salary_currency: 'AUD',
      required_skills: ['Data Analysis', 'Microsoft Excel', 'Research', 'Attention to Detail', 'Written Communication'],
      preferred_skills: ['Commercial Property Knowledge', 'InDesign/Canva', 'CoStar or PCA Data', 'Property Economics Degree'],
      requirements: '- Bachelor\'s degree in Property Economics, Commerce, Business, Finance, or related field\n- Strong analytical and data interpretation skills\n- Excellent written and verbal communication\n- Genuine interest in commercial real estate and Sydney\'s office market',
    },
    {
      title: 'Marketing & Communications Coordinator — Sydney CBD',
      description: `Cadigal is seeking a talented Marketing & Communications Coordinator to join our Sydney CBD team.\n\nWorking with Marketing Manager Kelly Radovanovic, you will bring creativity and digital fluency to one of Sydney's most admired boutique agencies.\n\n**Key Responsibilities**\n- Produce leasing campaign materials: information memoranda, floor plan packages, email campaigns, and signage\n- Manage and grow Cadigal's LinkedIn and Instagram channels (@cadigal_office_leasing)\n- Coordinate digital and print marketing for major building campaign launches\n- Organise Cadigal events including industry functions and charity activities\n- Support the preparation of new business pitches and award submissions\n\n**What We Offer**\n- Work on premium building campaigns at the heart of Sydney's commercial property market\n- Creative freedom within a well-established and respected brand\n- Collaborative, close-knit team environment\n- Competitive salary and genuine career development opportunity`,
      city: 'Sydney', state: 'NSW', country: 'Australia', location: 'Sydney CBD, NSW, Australia',
      employment_type: 'Full-time', experience_level: 'Mid-level',
      salary_min: 75000, salary_max: 95000, salary_currency: 'AUD',
      required_skills: ['Digital Marketing', 'Social Media Management', 'Adobe InDesign', 'Content Creation', 'Email Marketing'],
      preferred_skills: ['Commercial Real Estate', 'LinkedIn Marketing', 'MailChimp or Campaign Monitor', 'Event Management'],
      requirements: '- 2+ years experience in marketing, communications, or a related creative role\n- Proficient in Adobe Creative Suite (InDesign, Photoshop) and Canva\n- Proven social media management experience (LinkedIn and Instagram)\n- Strong copywriting and proofreading skills',
    },
  ]

  for (const job of jobs) {
    const { data, error } = await supabase.from('jobs').insert({
      business_profile_id: userId,
      business_id:         userId,
      location_id:         locationId,
      status:              'published',
      is_active:           true,
      list_on_creerlio:    true,
      ...job,
    }).select('id').single()
    if (error) console.warn(`  ✗ Job "${job.title}": ${error.message}`)
    else console.log(`  ✓ Job: ${job.title} → id ${data.id}`)
  }

  // ── Products & Services ───────────────────────────────────────────────────
  console.log('\n[Fix 4] Products & Services overview...')
  const { error: ovErr } = await supabase.from('business_products_services_overview').upsert({
    business_id:        userId,
    user_id:            userId,
    short_headline:     'Pure Office Leasing — Sydney CBD, Barangaroo, North Sydney & Fringe. Both Landlord & Tenant Sides.',
    summary:            'Cadigal provides specialist office leasing services exclusively in the Sydney metropolitan market. Our six core service lines span landlord leasing campaign management, tenant representation, development consultancy, market research & intelligence, flexible workspace advisory, and general leasing consultancy. Every service is underpinned by the deepest market knowledge in Sydney office leasing — built over 15 years of exclusive focus.',
    primary_industries: ['Commercial Office Real Estate', 'Institutional Property Investment', 'Tenant Representation', 'Property Development Advisory', 'Flexible Workspace'],
    business_model:     'B2B',
    is_public:          true,
  }, { onConflict: 'business_id' })
  if (ovErr) console.warn('  Overview:', ovErr.message)
  else console.log('  ✓ Overview')

  const { error: rmErr } = await supabase.from('business_product_roadmap').upsert({
    business_id:       userId,
    user_id:           userId,
    upcoming_products: [
      'Enhanced Market Pulse Digital Platform — interactive online versions of our bi-annual Sydney CBD and North Shore Market Pulse reports',
      'Cadigal Rubberdesk 2.0 — expanded national flexible workspace advisory capability',
    ],
    roadmap_ideas:     'Developing proprietary digital tools for real-time vacancy tracking, leasing evidence analytics, and tenant market depth mapping.',
    expansion_plans:   'Deepening our presence in the St Leonards/Crows Nest precinct following the Mastercard mandate success, and expanding Pyrmont/Ultimo coverage.',
    new_markets:       'Growing our flexible workspace advisory business through Rubberdesk as hybrid work drives sustained demand for flexible leasing solutions.',
    is_public:         true,
  }, { onConflict: 'business_id' })
  if (rmErr) console.warn('  Roadmap:', rmErr.message)
  else console.log('  ✓ Roadmap')

  console.log('\n[Fix 5] Service cards...')
  const services = [
    {
      name: 'Landlord Leasing Campaigns', category: 'Service', order_index: 0,
      short_description: 'End-to-end leasing campaign management for Sydney office building owners — strategy, marketing, through to lease execution. Trusted by Dexus, Lendlease, GPT, Stockland, Brookfield, Mirvac, Centuria, and more.',
      who_it_is_for: 'Institutional and private building owners with office assets in Sydney CBD, North Sydney, Barangaroo, and fringe markets.',
      problem_it_solves: 'Maximising rental outcomes and minimising vacancy in Sydney\'s competitive office market through targeted marketing, superior intelligence, and experienced negotiation.',
    },
    {
      name: 'Tenant Representation', category: 'Service', order_index: 1,
      short_description: 'Independent, specialist advisory for businesses seeking office space in Sydney — off-market opportunities, competitive lease negotiation, sub-leasing strategy, and market intelligence at no cost to the tenant.',
      who_it_is_for: 'Businesses of all sizes seeking premium, A-Grade, or B-Grade office space in Sydney CBD, North Sydney, Barangaroo, Pyrmont, or fringe markets.',
      problem_it_solves: 'Navigating Sydney\'s complex office market without the knowledge, relationships, or negotiating leverage that only a specialist agent can provide.',
    },
    {
      name: 'Market Research & Intelligence', category: 'Service', order_index: 2,
      short_description: 'Bi-annual Sydney CBD and North Shore Market Pulse reports, bespoke tenant market reports, vacancy and absorption analytics, rental benchmarking. Led by Research Director Lok So (24+ years experience).',
      who_it_is_for: 'Building owners, fund managers, developers, corporates, and government agencies requiring authoritative Sydney office market data.',
      problem_it_solves: 'Making informed, evidence-based decisions on office leasing, development, acquisition, and divestiture in Sydney\'s complex office market.',
    },
    {
      name: 'Development Consultancy', category: 'Service', order_index: 3,
      short_description: 'Strategic advisory for new and repositioned Sydney office projects — floor plate optimisation, rental benchmarking, tenant market depth analysis, and pre-commitment leasing strategy.',
      who_it_is_for: 'Developers, fund managers, and building owners planning new office construction or significant repositioning projects in Sydney.',
      problem_it_solves: 'Maximising commercial viability and pre-commitment success of new office developments through expert leasing intelligence from the earliest design stage.',
    },
    {
      name: 'Flexible & Coworking Workspace', category: 'Offering', order_index: 4,
      short_description: 'National flexible workspace advisory through Cadigal\'s joint venture with Rubberdesk — helping businesses find and compare serviced offices, coworking spaces, and flexible lease solutions across Australia.',
      who_it_is_for: 'Businesses seeking flexible office solutions alongside or as an alternative to traditional leases.',
      problem_it_solves: 'Finding and evaluating the best flexible workspace options in a fragmented, fast-moving market — with objective, expert guidance.',
    },
  ]

  const insertedSvcs = []
  for (const svc of services) {
    const { data, error } = await supabase.from('business_products_services').insert({
      ...svc,
      business_id: userId,
      user_id:     userId,
      is_published: true,
      is_active:   true,
    }).select('id').single()
    if (error) console.warn(`  ✗ "${svc.name}": ${error.message}`)
    else { insertedSvcs.push({ id: data.id, name: svc.name }); console.log(`  ✓ ${svc.name} → id ${data.id}`) }
  }

  if (insertedSvcs.length === 5) {
    const [landlord, tenant, research, devcon, flex] = insertedSvcs.map(s => s.id)
    const ins = async (table, rows) => {
      const { error } = await supabase.from(table).insert(rows)
      if (error) console.warn(`  ${table}: ${error.message}`)
      else console.log(`  ✓ ${table}: ${rows.length} rows`)
    }

    await ins('business_product_roles', [
      { product_id: landlord, business_id: userId, user_id: userId, role_name: 'Senior Leasing Executive',        order_index: 0 },
      { product_id: landlord, business_id: userId, user_id: userId, role_name: 'Associate Director — Leasing',   order_index: 1 },
      { product_id: landlord, business_id: userId, user_id: userId, role_name: 'Leasing Executive',              order_index: 2 },
      { product_id: tenant,   business_id: userId, user_id: userId, role_name: 'Tenant Representative',          order_index: 0 },
      { product_id: tenant,   business_id: userId, user_id: userId, role_name: 'Senior Leasing Executive',       order_index: 1 },
      { product_id: research, business_id: userId, user_id: userId, role_name: 'Research Director',              order_index: 0 },
      { product_id: research, business_id: userId, user_id: userId, role_name: 'Leasing & Research Analyst',     order_index: 1 },
      { product_id: devcon,   business_id: userId, user_id: userId, role_name: 'Executive Director',             order_index: 0 },
      { product_id: flex,     business_id: userId, user_id: userId, role_name: 'Flexible Workspace Advisor',     order_index: 0 },
    ])
    await ins('business_product_skills', [
      { product_id: landlord, business_id: userId, user_id: userId, skill_name: 'Leasing Campaign Strategy' },
      { product_id: landlord, business_id: userId, user_id: userId, skill_name: 'Premium A-Grade Leasing' },
      { product_id: landlord, business_id: userId, user_id: userId, skill_name: 'Heads of Agreement Negotiation' },
      { product_id: landlord, business_id: userId, user_id: userId, skill_name: 'Lease Documentation' },
      { product_id: tenant,   business_id: userId, user_id: userId, skill_name: 'Off-Market Space Identification' },
      { product_id: tenant,   business_id: userId, user_id: userId, skill_name: 'Sub-leasing & Assignment' },
      { product_id: tenant,   business_id: userId, user_id: userId, skill_name: 'Lease Negotiation' },
      { product_id: research, business_id: userId, user_id: userId, skill_name: 'Vacancy & Absorption Analysis' },
      { product_id: research, business_id: userId, user_id: userId, skill_name: 'Rental Benchmarking' },
      { product_id: research, business_id: userId, user_id: userId, skill_name: 'Tenant Demand Mapping' },
      { product_id: devcon,   business_id: userId, user_id: userId, skill_name: 'Floor Plate Design Advisory' },
      { product_id: devcon,   business_id: userId, user_id: userId, skill_name: 'Pre-commitment Leasing' },
      { product_id: devcon,   business_id: userId, user_id: userId, skill_name: 'Expert Witness Services' },
      { product_id: flex,     business_id: userId, user_id: userId, skill_name: 'Coworking Market Knowledge' },
      { product_id: flex,     business_id: userId, user_id: userId, skill_name: 'Flexible Lease Structures' },
    ])
    await ins('business_product_impact', [
      { product_id: landlord, business_id: userId, user_id: userId, who_it_helps: 'Institutional and private building owners seeking to maximise rental return and minimise vacancy', what_it_improves: 'Leasing velocity, rental outcomes, tenant quality, and occupancy rates', real_world_outcomes: 'Dexus Agency of the Year 2025. 10 Shelley Street 100% pre-commitment. Australia Square campaign award winner.' },
      { product_id: tenant,   business_id: userId, user_id: userId, who_it_helps: 'Businesses of all sizes navigating Sydney\'s complex office market', what_it_improves: 'Lease terms, rental rates, fit-out contributions, and space quality', real_world_outcomes: 'Tenants secure better space at better terms with Cadigal\'s market relationships and intelligence edge.' },
      { product_id: research, business_id: userId, user_id: userId, who_it_helps: 'Fund managers, developers, corporates, and government agencies making major property decisions', what_it_improves: 'Decision quality and confidence through authoritative market data', real_world_outcomes: 'Bi-annual Market Pulse reports cited by Sydney\'s leading institutional property investors.' },
      { product_id: devcon,   business_id: userId, user_id: userId, who_it_helps: 'Developers repositioning assets or building new Sydney office projects', what_it_improves: 'Leasing feasibility and pre-commitment strategy from the earliest design stage', real_world_outcomes: '10 Shelley Street: 100% pre-committed to Suncorp (24,290sqm) and Iress (3,430sqm) before refurbishment completion.' },
      { product_id: flex,     business_id: userId, user_id: userId, who_it_helps: 'Businesses seeking flexible workspace solutions alongside or as an alternative to traditional leases', what_it_improves: 'Speed of market entry, flexibility, and workspace quality', real_world_outcomes: 'Cadigal Rubberdesk provides a single trusted advisor for flexible and traditional leasing needs across Sydney and nationally.' },
    ])
    await ins('business_product_signals', [
      { product_id: landlord, business_id: userId, user_id: userId, we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: false, currently_scaling: true  },
      { product_id: tenant,   business_id: userId, user_id: userId, we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: false, currently_scaling: true  },
      { product_id: research, business_id: userId, user_id: userId, we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: true,  currently_scaling: false },
      { product_id: devcon,   business_id: userId, user_id: userId, we_are_hiring_for_this: false, open_to_partnerships: true,  in_research_and_development: false, currently_scaling: false },
      { product_id: flex,     business_id: userId, user_id: userId, we_are_hiring_for_this: false, open_to_partnerships: true,  in_research_and_development: false, currently_scaling: true  },
    ])
    await ins('business_product_permissions', [
      { product_id: landlord, business_id: userId, user_id: userId },
      { product_id: tenant,   business_id: userId, user_id: userId },
      { product_id: research, business_id: userId, user_id: userId },
      { product_id: devcon,   business_id: userId, user_id: userId },
      { product_id: flex,     business_id: userId, user_id: userId },
    ])
  }

  console.log('\n════════════════════════════════════════════════════════════')
  console.log('  ✅  Cadigal fix complete!')
  console.log('════════════════════════════════════════════════════════════')
  console.log('  Email:    demo.cadigal@creerlio.com')
  console.log('  Password: DemoCaldigal2025!')
  console.log('  User ID:  ' + userId)
  console.log('════════════════════════════════════════════════════════════')
}

run().catch(err => { console.error('FATAL:', err.message || err); process.exit(1) })
