/**
 * Completes the MinterEllison profile: business_profile_pages, jobs, products & services.
 * Run after create-minterellison.js.
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const USER_ID     = '9ae96870-d022-4fd1-bdd9-60477af00665'
const LOCATION_ID = 'be76d3d7-c03a-49db-bab6-5eb4f15784dd'
const SLUG        = 'minterellison'

const LOGO_URL    = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-bank/${USER_ID}/bank/me-logo.jpg`
const HERO_URL    = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-bank/${USER_ID}/bank/me-hero.jpg`
const VIDEO_URL   = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-bank/${USER_ID}/bank/me-intro-video.mp4`

async function run() {

  // ── 1. business_profile_pages ─────────────────────────────────────────────
  console.log('[1] Inserting business_profile_pages...')
  const { error: bppErr } = await sb.from('business_profile_pages').upsert({
    business_id:   USER_ID,
    slug:          SLUG,
    is_published:  true,
    name:          'MinterEllison',
    logo_url:      LOGO_URL,
    hero_image_url: HERO_URL,
    tagline:       'Sharp insight. Elevated perspective.',
    mission:       "MinterEllison exists to create sustainable value with our clients, our people, and our communities. We combine nearly 200 years of legal heritage with a forward-looking, innovation-first approach — delivering sharp insight and elevated perspective on Australia's most significant matters.",
    value_prop_headline: "Australia's most trusted law firm — integrated legal and consulting expertise for the challenges that matter most",
    value_prop_body: "We advise 36 of the ASX50, lead on $156B+ in infrastructure projects, and deliver more than $11M in annual pro bono legal services. Our integrated model brings together Australia's deepest bench of legal talent and specialist consulting expertise — giving clients a single, trusted partner for even the most complex challenges.",
    impact_stats: [
      { label: 'Years of History',        value: '195+' },
      { label: 'Partners',                value: '250+' },
      { label: 'Legal Professionals',     value: '1,200+' },
      { label: 'ASX50 Clients',           value: '36' },
      { label: 'Offices Globally',        value: '20+' },
      { label: 'Annual Pro Bono Value',   value: '$11M+' },
    ],
    culture_values: [
      { title: 'Excellence',    description: "The hallmark of everything we do. We set the standard — in our advice, in our relationships, and in how we show up every day." },
      { title: 'Curiosity',     description: "We ask better questions, explore new approaches, and embrace innovation — including AI-enabled legal practice — to solve complex problems in new ways." },
      { title: 'Collaboration', description: "We work as one integrated firm — across practice groups, offices, and disciplines — to deliver the best possible outcome for every client." },
      { title: 'Inclusion',     description: "Belonging is not a policy — it's our culture. 65% of our workforce are women. LGBTQ+ AWEI Platinum Employer. Diverse thinking makes us better." },
      { title: 'Responsibility',description: "We lead by example on environmental sustainability, reconciliation, and pro bono service — because being Australia's most trusted law firm means more than legal excellence." },
    ],
    business_areas: [
      { name: 'Corporate & M&A',            description: "Market-leading advice on public and private market transactions, cross-border M&A, private equity, and joint ventures. Acted on $68B+ in M&A transactions." },
      { name: 'Banking & Finance',          description: "Full-service banking and finance advice across property finance, asset finance, corporate lending, debt capital markets, and securitisation." },
      { name: 'Construction & Infrastructure', description: "Australia's leading construction and infrastructure legal practice. Advised on $156B+ in infrastructure projects including the Melbourne Metro." },
      { name: 'Technology, Digital & Data', description: "Expert advice on AI governance, data privacy (Privacy Act reform, GDPR), technology transactions, digital transformation, and cybersecurity." },
      { name: 'Energy & Resources',         description: "Comprehensive advice on mining, critical minerals, hydrogen, petroleum, and renewable energy spanning project development, transactions, and regulatory approvals." },
      { name: 'Employment & Safety',        description: "End-to-end employment law — enterprise bargaining, WHS compliance, Fair Work Commission proceedings, workplace investigations, and executive matters." },
    ],
    benefits: [
      { title: 'Market-Leading Remuneration',    description: 'Competitive salary benchmarked to top-tier legal market with transparent progression and bonus structures.' },
      { title: 'Flexible & Hybrid Working',      description: 'Structured hybrid work arrangements across all offices — genuine flexibility for legal professionals at every career stage.' },
      { title: 'Parental Leave',                 description: 'Up to 26 weeks paid parental leave, superannuation paid for 12 months including unpaid leave, and emergency childcare support.' },
      { title: 'Wellbeing Support',              description: 'Employee Assistance Program, fitness subsidies, mental health days, and access to the ME Wellbeing Hub.' },
      { title: 'Professional Development',       description: 'Funded CPD, PLT support for graduates, Emerging Leaders program, and international secondment opportunities.' },
      { title: 'Inclusion & Belonging Leave',    description: 'Cultural and religious leave (2 days paid), gender affirmation leave (6 weeks paid), and 10 days paid domestic violence leave.' },
      { title: 'Technology & AI Access',         description: "Early access to AI-enabled legal tools, innovation labs, and tech upskilling — as we shape the future of legal practice." },
    ],
    programs: [
      { name: 'Graduate Program',    description: 'Up to three six-month rotations, funded PLT, mentorship, and full support through admission to the legal profession.', url: 'https://graduates.minterellison.com' },
      { name: 'Clerkship Program',   description: 'Summer and winter placements for penultimate and final-year law students — real work on active client matters.', url: 'https://graduates.minterellison.com/clerkship-program' },
      { name: 'Discover ME',         description: 'Three in-person sessions for pre-penultimate law students at Sydney, Melbourne, or Brisbane.', url: 'https://graduates.minterellison.com' },
      { name: 'MinterEllison Flex',  description: 'On-demand flexible engagements for experienced lawyers seeking project-based or interim arrangements.', url: 'https://www.minterellison.com/careers/minterellison-flex' },
    ],
    social_proof: [
      { quote: "A practical, commercially savvy team that knows how to navigate clients through the intricacies of public and private market deals.", source: 'Legal 500 — Corporate & M&A' },
      { quote: "Incredible depth of expertise and talent for dealing with complex or intractable industrial relations issues.", source: 'Legal 500 — Labour & Employment' },
      { quote: "Excellent technical capability and breadth of experience across debt, securitisation and equity matters.", source: 'Legal 500 — Capital Markets' },
      { quote: "We are thrilled to have been recognised as Australia's Law Firm of the Year in Real Property Law for the second year running.", source: 'Virginia Briggs, CEO & Managing Partner' },
    ],
    hiring_interests: [
      'Senior Associates & Special Counsel — all practice groups',
      'Technology, Digital & Data lawyers — all levels',
      'Energy & Resources Associates (critical minerals, hydrogen, renewables)',
      'M&A / Private Equity Associates — Sydney',
      'Graduate Solicitors — all major offices',
      'Law Clerks — Summer & Winter clerkship programs',
      'MinterEllison Flex — experienced lawyers for flexible engagements',
    ],
    industries_served: [
      'Financial Services & Banking',
      'Energy & Resources',
      'Infrastructure & Real Estate',
      'Technology & Digital',
      'Government & Public Sector',
      'Health & Life Sciences',
      'Education',
      'Private Equity',
      'Mining & Critical Minerals',
      'Food & Agribusiness',
    ],
    contact_email:    'careers@minterellison.com',
    website_url:      'https://www.minterellison.com',
    enquiry_enabled:  true,
    acknowledgement_of_country: "MinterEllison acknowledges the Traditional Custodians of the land and waters on which we live and work across Australia, and we pay our respects to their Elders past, present and emerging. We are committed to reconciliation and to walking alongside First Nations communities.",
    live_roles_count:          4,
    talent_community_enabled:  true,
    portfolio_intake_enabled:  true,
    media_assets: { intro_video_url: VIDEO_URL, logo_url: LOGO_URL, hero_image_url: HERO_URL },
    badges: ['Top Tier Legal', 'WGEA Employer of Choice', 'AWEI Platinum', 'Climate Active Certified', 'Chambers Ranked'],
  }, { onConflict: 'business_id' })
  if (bppErr) console.error('  BPP error:', bppErr.message)
  else console.log('  ✓ business_profile_pages')

  // ── 2. Jobs ───────────────────────────────────────────────────────────────
  console.log('\n[2] Inserting jobs...')
  const jobs = [
    {
      title: 'Senior M&A Associate — Corporate & Commercial',
      description: "MinterEllison is seeking a Senior Associate to join our market-leading Corporate & M&A Practice Group in Sydney.\n\nWork on Australia's most significant public and private market transactions — from ASX-listed mergers and acquisitions to complex cross-border deals involving some of the world's largest corporations.\n\n**The Role**\nYou will manage a diverse portfolio of M&A, private equity, and corporate advisory matters, working directly with partners and clients on active transactions. You will lead junior teams, develop client relationships, and contribute to business development.\n\n**Key Responsibilities**\n- Lead M&A due diligence, structuring, and transaction execution\n- Draft and negotiate complex transaction documents\n- Advise on corporate governance, shareholder arrangements, and regulatory matters\n- Mentor and supervise junior lawyers and graduates\n- Contribute to client relationship development and pitch materials\n\n**What MinterEllison Offers**\n- Market-leading remuneration with transparent progression\n- Direct access to Australia's most significant corporate transactions\n- Mentorship from award-winning M&A partners\n- International secondment opportunities",
      city: 'Sydney', state: 'NSW', country: 'Australia', location: 'Sydney CBD, NSW, Australia',
      employment_type: 'Full-time', experience_level: 'Senior',
      salary_min: 200000, salary_max: 260000, salary_currency: 'AUD',
      required_skills: ['Corporate Law', 'M&A Advisory', 'Due Diligence', 'Transaction Management', 'Contract Drafting'],
      preferred_skills: ['Cross-Border M&A', 'Private Equity', 'ASX Listed Companies', 'Capital Markets'],
    },
    {
      title: 'Technology, Digital & Data Senior Associate — Sydney or Melbourne',
      description: "Join MinterEllison's rapidly growing Technology, Digital & Data Practice Group — one of Australia's premier technology law teams.\n\nAdvise leading corporations, government agencies, and technology companies on AI governance, data privacy, technology procurement, digital transformation, and cybersecurity.\n\n**Key Responsibilities**\n- Advise clients on technology contracts, SaaS, cloud, and outsourcing agreements\n- Provide data privacy and AI governance advice (Privacy Act, GDPR)\n- Lead technology due diligence on M&A transactions\n- Advise on cybersecurity incidents and regulatory notifications\n- Develop and deliver client training on emerging technology law\n\n**What MinterEllison Offers**\n- Early access to AI-enabled legal tools and innovation programs\n- Work on cutting-edge technology and AI governance mandates\n- Hybrid working — Sydney or Melbourne offices",
      city: 'Sydney', state: 'NSW', country: 'Australia', location: 'Sydney or Melbourne, Australia',
      employment_type: 'Full-time', experience_level: 'Mid-level',
      salary_min: 160000, salary_max: 210000, salary_currency: 'AUD',
      required_skills: ['Technology Law', 'Data Privacy', 'Contract Drafting', 'AI Governance', 'Cybersecurity Law'],
      preferred_skills: ['Privacy Act Reform', 'GDPR', 'Cloud Computing Agreements', 'Digital Transformation'],
    },
    {
      title: 'Energy & Resources Associate — Critical Minerals & Clean Energy',
      description: "MinterEllison is seeking an Associate to join our Energy & Resources Practice Group, focused on Australia's booming critical minerals and clean energy sectors.\n\nAdvise on the transactions and regulatory frameworks shaping Australia's energy transition — including critical minerals project development, hydrogen energy infrastructure, renewable energy finance, and resources M&A.\n\n**Key Responsibilities**\n- Assist on critical minerals project development and joint venture agreements\n- Support due diligence and documentation for resources M&A transactions\n- Research and advise on energy regulatory frameworks and government policy\n- Assist with renewable energy project finance and offtake agreements\n\n**What MinterEllison Offers**\n- Work at the heart of Australia's energy transition\n- Access to a national and international energy & resources practice\n- Perth, Brisbane, or Sydney office",
      city: 'Perth', state: 'WA', country: 'Australia', location: 'Perth, Brisbane or Sydney, Australia',
      employment_type: 'Full-time', experience_level: 'Mid-level',
      salary_min: 130000, salary_max: 170000, salary_currency: 'AUD',
      required_skills: ['Energy Law', 'Resources Law', 'Contract Drafting', 'Regulatory Advice', 'Due Diligence'],
      preferred_skills: ['Critical Minerals', 'Renewable Energy', 'Hydrogen Projects', 'Project Finance'],
    },
    {
      title: 'Graduate Solicitor — Multiple Offices (Sydney, Melbourne, Brisbane, Perth)',
      description: "MinterEllison's Graduate Program is one of Australia's most respected legal graduate programs — and your next chapter starts here.\n\nJoin a cohort of exceptional graduates and rotate across up to three different practice groups over 12–18 months, gaining genuine hands-on experience on matters that shape Australia.\n\n**What You Will Do**\n- Complete up to three six-month rotations across different practice groups\n- Work directly with partners and senior lawyers on active client matters\n- Undertake funded Practical Legal Training (PLT)\n- Build technical and commercial skills through structured development programs\n- Receive dedicated mentor support throughout admission and beyond\n\n**Practice Groups Include**\nCorporate & M&A | Banking & Finance | Construction & Infrastructure | Technology & Data | Energy & Resources | Employment & Safety | Dispute Resolution | Tax | Real Estate | Government\n\n**What MinterEllison Offers Graduates**\n- Market-competitive graduate salary\n- Funded PLT and professional development\n- Mentorship from leading practitioners\n- Access to AI and technology programs\n- WGEA Employer of Choice for 14 years running",
      city: 'Sydney', state: 'NSW', country: 'Australia', location: 'Sydney, Melbourne, Brisbane, Perth',
      employment_type: 'Full-time', experience_level: 'Graduate',
      salary_min: 75000, salary_max: 95000, salary_currency: 'AUD',
      required_skills: ['Legal Research', 'Legal Drafting', 'Client Communication', 'Attention to Detail'],
      preferred_skills: ['Clerkship Experience', 'Commercial Law Studies', 'Moot Experience', 'Pro Bono Work'],
    },
  ]

  for (const job of jobs) {
    const { error } = await sb.from('jobs').insert({
      business_profile_id: USER_ID,
      business_id: USER_ID,
      location_id: LOCATION_ID,
      status: 'published', is_active: true,
      list_on_creerlio: true, seek_source_tag: 'seek', website_source_tag: 'website',
      remote_allowed: false, external_apply_enabled: false, website_embed_enabled: false,
      website_embed_style: 'primary',
      ...job,
    })
    if (error) console.error(`  Job "${job.title}": ${error.message}`)
    else console.log(`  ✓ ${job.title}`)
  }

  // ── 3. Products & Services ────────────────────────────────────────────────
  console.log('\n[3] Products & services overview...')
  const { error: ovErr } = await sb.from('business_products_services_overview').upsert({
    business_id: USER_ID, user_id: USER_ID,
    short_headline: "Australia's Leading Integrated Legal & Consulting Firm — 20+ Practice Areas",
    summary: "MinterEllison delivers expert legal and consulting advice across every major practice area — from corporate M&A and banking & finance, to construction, technology & data, energy & resources, employment, and government advisory. With nearly 200 years of heritage and a forward-looking innovation culture, we bring sharp insight and elevated perspective to Australia's most significant commercial and regulatory challenges.",
    primary_industries: ['Legal Services', 'Corporate & M&A', 'Banking & Finance', 'Construction & Infrastructure', 'Technology & Data', 'Energy & Resources', 'Government Advisory'],
    business_model: 'B2B', is_public: true,
  }, { onConflict: 'business_id' })
  if (ovErr) console.error('  Overview:', ovErr.message)
  else console.log('  ✓ Overview')

  const { error: rmErr } = await sb.from('business_product_roadmap').upsert({
    business_id: USER_ID, user_id: USER_ID,
    upcoming_products: [
      'ME AI Legal Companion — AI-powered legal research and document review for in-house clients',
      'ME Flex 2.0 — expanded flexible legal professional platform for enterprise and government clients',
    ],
    roadmap_ideas:   "Deepening investment in purpose-built generative AI tools for legal drafting, contract analysis, and regulatory monitoring — co-developed with major institutional clients.",
    expansion_plans: "Opening a specialist AI & Technology Law hub within the Sydney office in 2026; further deepening our Singapore presence to service growing South-East Asian mandates.",
    new_markets:     "Expanding critical minerals and clean energy advisory capabilities as Australia positions itself as a global leader in the energy transition and the Government's Future Made in Australia policy agenda.",
    is_public: true,
  }, { onConflict: 'business_id' })
  if (rmErr) console.error('  Roadmap:', rmErr.message)
  else console.log('  ✓ Roadmap')

  console.log('\n[4] Practice area cards...')
  const services = [
    {
      name: 'Corporate & M&A', category: 'Service', order_index: 0,
      short_description: "Market-leading advice on public and private M&A, private equity, joint ventures, and cross-border transactions. Acted on $68B+ in transactions for ASX-listed and international clients.",
      who_it_is_for:     "ASX-listed companies, private equity funds, government-linked entities, international corporates, and Australian businesses seeking M&A advisory.",
      problem_it_solves: "Navigating the complexity, risk, and regulatory requirements of major corporate transactions — from initial due diligence through to post-completion integration.",
    },
    {
      name: 'Banking & Finance', category: 'Service', order_index: 1,
      short_description: "Comprehensive banking and finance advice across property finance, corporate lending, asset finance, debt capital markets, and securitisation for Australia's leading financial institutions.",
      who_it_is_for:     "Major Australian and international banks, non-bank lenders, borrowers, REITs, and financial institutions requiring expert finance law advice.",
      problem_it_solves: "Structuring and documenting complex financing arrangements, navigating banking regulation, and providing certainty on large-scale transactions.",
    },
    {
      name: 'Construction & Infrastructure', category: 'Service', order_index: 2,
      short_description: "Australia's leading construction and infrastructure legal practice. $156B+ in infrastructure project advisory including the Melbourne Metro, major road, rail, and public-private partnerships.",
      who_it_is_for:     "State and Federal government departments, infrastructure developers, construction contractors, project financiers, and PPP participants.",
      problem_it_solves: "Delivering complex infrastructure projects on time and on budget — from procurement and contract structuring through to dispute resolution and completion.",
    },
    {
      name: 'Technology, Digital & Data', category: 'Service', order_index: 3,
      short_description: "Expert advice on AI governance, data privacy (Privacy Act reform, GDPR), technology transactions, digital transformation, cybersecurity, and tech-enabled M&A for Australia's leading organisations.",
      who_it_is_for:     "Technology companies, financial services groups, government agencies, and major corporates navigating the legal complexity of digital transformation and data regulation.",
      problem_it_solves: "Managing technology risk, data privacy compliance, and AI governance in a rapidly evolving regulatory environment — while enabling digital-first business strategies.",
    },
    {
      name: 'Energy & Resources', category: 'Offering', order_index: 4,
      short_description: "Comprehensive legal advice on mining, critical minerals, hydrogen, petroleum, and renewable energy — spanning project development, transactions, regulatory approvals, and policy advisory.",
      who_it_is_for:     "Mining and resources companies, renewable energy developers, hydrogen project proponents, government agencies, and institutional investors in the energy sector.",
      problem_it_solves: "Managing legal complexity across the energy transition — from critical minerals joint ventures and project financing through to environmental approvals and government engagement.",
    },
  ]

  const insertedSvcs = []
  for (const svc of services) {
    const { data, error } = await sb.from('business_products_services').insert({
      ...svc, business_id: USER_ID, user_id: USER_ID, is_published: true, is_active: true,
    }).select('id').single()
    if (error) console.error(`  "${svc.name}": ${error.message}`)
    else { insertedSvcs.push(data.id); console.log(`  ✓ ${svc.name} → id ${data.id}`) }
  }

  if (insertedSvcs.length === 5) {
    const [corp, bank, constr, tech, energy] = insertedSvcs
    const ins = async (table, rows) => {
      const { error } = await sb.from(table).insert(rows)
      if (error) console.error(`  ${table}: ${error.message}`)
      else console.log(`  ✓ ${table}: ${rows.length} rows`)
    }

    await ins('business_product_roles', [
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, role_name: 'Senior M&A Associate',              order_index: 0 },
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, role_name: 'Corporate Solicitor',               order_index: 1 },
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, role_name: 'M&A Graduate Solicitor',            order_index: 2 },
      { product_id: bank,   business_id: USER_ID, user_id: USER_ID, role_name: 'Banking & Finance Senior Associate', order_index: 0 },
      { product_id: bank,   business_id: USER_ID, user_id: USER_ID, role_name: 'Finance Associate',                 order_index: 1 },
      { product_id: constr, business_id: USER_ID, user_id: USER_ID, role_name: 'Infrastructure Senior Associate',   order_index: 0 },
      { product_id: constr, business_id: USER_ID, user_id: USER_ID, role_name: 'Construction Solicitor',            order_index: 1 },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID, role_name: 'Technology Law Senior Associate',   order_index: 0 },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID, role_name: 'Data Privacy Solicitor',            order_index: 1 },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID, role_name: 'AI Governance Associate',           order_index: 2 },
      { product_id: energy, business_id: USER_ID, user_id: USER_ID, role_name: 'Energy & Resources Associate',     order_index: 0 },
      { product_id: energy, business_id: USER_ID, user_id: USER_ID, role_name: 'Critical Minerals Solicitor',       order_index: 1 },
    ])

    await ins('business_product_skills', [
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, skill_name: 'Public M&A (ASX)' },
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, skill_name: 'Private M&A & PE' },
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, skill_name: 'Due Diligence' },
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, skill_name: 'Corporate Governance' },
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, skill_name: 'Cross-Border Transactions' },
      { product_id: bank,   business_id: USER_ID, user_id: USER_ID, skill_name: 'Property Finance' },
      { product_id: bank,   business_id: USER_ID, user_id: USER_ID, skill_name: 'Debt Capital Markets' },
      { product_id: bank,   business_id: USER_ID, user_id: USER_ID, skill_name: 'Securitisation' },
      { product_id: bank,   business_id: USER_ID, user_id: USER_ID, skill_name: 'Asset Finance & Leasing' },
      { product_id: constr, business_id: USER_ID, user_id: USER_ID, skill_name: 'Construction Contracts (NEC/AS4300)' },
      { product_id: constr, business_id: USER_ID, user_id: USER_ID, skill_name: 'PPP / PFI Structures' },
      { product_id: constr, business_id: USER_ID, user_id: USER_ID, skill_name: 'Project Finance' },
      { product_id: constr, business_id: USER_ID, user_id: USER_ID, skill_name: 'Infrastructure Procurement' },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID, skill_name: 'AI Governance' },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID, skill_name: 'Data Privacy (Privacy Act / GDPR)' },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID, skill_name: 'Technology Contracts' },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID, skill_name: 'Cybersecurity Law' },
      { product_id: energy, business_id: USER_ID, user_id: USER_ID, skill_name: 'Critical Minerals Project Development' },
      { product_id: energy, business_id: USER_ID, user_id: USER_ID, skill_name: 'Renewable Energy Finance' },
      { product_id: energy, business_id: USER_ID, user_id: USER_ID, skill_name: 'Resources M&A' },
      { product_id: energy, business_id: USER_ID, user_id: USER_ID, skill_name: 'Environmental Approvals (EPBC)' },
    ])

    await ins('business_product_teams', [
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, team_name: 'Corporate & M&A Practice Group' },
      { product_id: bank,   business_id: USER_ID, user_id: USER_ID, team_name: 'Banking & Finance Practice Group' },
      { product_id: constr, business_id: USER_ID, user_id: USER_ID, team_name: 'Construction & Infrastructure Practice Group' },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID, team_name: 'Technology, Digital & Data Practice Group' },
      { product_id: energy, business_id: USER_ID, user_id: USER_ID, team_name: 'Energy & Resources Practice Group' },
    ])

    await ins('business_product_growth_areas', [
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, growth_area: 'Asia-Pacific cross-border M&A' },
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, growth_area: 'Critical minerals sector transactions' },
      { product_id: bank,   business_id: USER_ID, user_id: USER_ID, growth_area: 'Green and sustainable finance' },
      { product_id: bank,   business_id: USER_ID, user_id: USER_ID, growth_area: 'Infrastructure debt markets' },
      { product_id: constr, business_id: USER_ID, user_id: USER_ID, growth_area: 'Defence infrastructure projects' },
      { product_id: constr, business_id: USER_ID, user_id: USER_ID, growth_area: 'Social infrastructure (hospitals, schools)' },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID, growth_area: 'Generative AI governance and regulation' },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID, growth_area: 'Privacy Act 2024 reform compliance' },
      { product_id: energy, business_id: USER_ID, user_id: USER_ID, growth_area: 'Hydrogen and clean energy infrastructure' },
      { product_id: energy, business_id: USER_ID, user_id: USER_ID, growth_area: "Future Made in Australia policy mandates" },
    ])

    await ins('business_product_impact', [
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, who_it_helps: '36 of the ASX50, private equity sponsors, and international corporates entering the Australian market', what_it_improves: 'Transaction certainty, deal execution speed, and regulatory compliance', real_world_outcomes: 'Clients close major transactions with confidence — $68B+ in M&A deals advised by our team' },
      { product_id: bank,   business_id: USER_ID, user_id: USER_ID, who_it_helps: "Australia's largest financial institutions, property developers, and infrastructure borrowers", what_it_improves: 'Financing structure certainty, documentation quality, and regulatory confidence', real_world_outcomes: 'Complex financing transactions completed efficiently, on time and in compliance with banking regulations' },
      { product_id: constr, business_id: USER_ID, user_id: USER_ID, who_it_helps: "Governments, developers, and contractors delivering Australia's critical infrastructure", what_it_improves: 'Project delivery certainty, risk allocation, and dispute avoidance', real_world_outcomes: 'Over $156B in infrastructure projects delivered — including the Melbourne Metro' },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID, who_it_helps: 'Boards, general counsel, and technology leaders managing digital risk', what_it_improves: 'AI governance, data compliance, and technology contract risk', real_world_outcomes: 'Clients navigate Privacy Act reform, AI regulation, and technology deals with reduced legal risk' },
      { product_id: energy, business_id: USER_ID, user_id: USER_ID, who_it_helps: 'Mining companies, renewable energy developers, and government agencies in the energy transition', what_it_improves: 'Project development speed, regulatory certainty, and transaction execution', real_world_outcomes: 'Clients successfully develop, finance, and transact on critical minerals and clean energy projects' },
    ])

    await ins('business_product_signals', [
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID, we_are_hiring_for_this: true,  open_to_partnerships: true,  in_research_and_development: false, currently_scaling: true  },
      { product_id: bank,   business_id: USER_ID, user_id: USER_ID, we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: false, currently_scaling: false },
      { product_id: constr, business_id: USER_ID, user_id: USER_ID, we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: false, currently_scaling: true  },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID, we_are_hiring_for_this: true,  open_to_partnerships: true,  in_research_and_development: true,  currently_scaling: true  },
      { product_id: energy, business_id: USER_ID, user_id: USER_ID, we_are_hiring_for_this: true,  open_to_partnerships: true,  in_research_and_development: false, currently_scaling: true  },
    ])

    await ins('business_product_permissions', [
      { product_id: corp,   business_id: USER_ID, user_id: USER_ID },
      { product_id: bank,   business_id: USER_ID, user_id: USER_ID },
      { product_id: constr, business_id: USER_ID, user_id: USER_ID },
      { product_id: tech,   business_id: USER_ID, user_id: USER_ID },
      { product_id: energy, business_id: USER_ID, user_id: USER_ID },
    ])
  }

  console.log('\n✅  MinterEllison profile complete!')
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
