/**
 * Populates Products & Services for Fortitude Legal.
 * Run from /frontend: node scripts/fortitude-products.js
 */
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const BIZ_ID = '3d44f9d3-8ee2-4834-a048-ef31607f5d8d'
const USER_ID = '3d44f9d3-8ee2-4834-a048-ef31607f5d8d'

async function run() {

  // ── 1. Overview ─────────────────────────────────────────────────────────────
  console.log('[1] Inserting products & services overview...')
  const { error: ovErr } = await sb.from('business_products_services_overview').upsert({
    business_id: BIZ_ID,
    user_id: USER_ID,
    short_headline: 'Expert Legal Services Across Corporate, Property & Employment Law',
    summary:
      'Fortitude Legal delivers high-quality, commercially focused legal advice to individuals, businesses, and organisations across Western Australia. ' +
      'Our practice areas span corporate and commercial transactions, property law, employment and workplace relations, and civil dispute resolution. ' +
      'We combine deep technical expertise with a practical, outcomes-focused approach — giving our clients the clarity and confidence they need to move forward.',
    primary_industries: ['Legal Services', 'Corporate & Commercial Law', 'Property Law', 'Employment & Workplace Relations', 'Civil Litigation'],
    business_model: 'B2B',
    is_public: true,
  }, { onConflict: 'business_id' })
  if (ovErr) console.error('Overview error:', ovErr.message)
  else console.log('  Overview: OK')

  // ── 2. Roadmap ───────────────────────────────────────────────────────────────
  console.log('[2] Inserting product roadmap...')
  const { error: rmErr } = await sb.from('business_product_roadmap').upsert({
    business_id: BIZ_ID,
    user_id: USER_ID,
    upcoming_products: [
      'Client Portal — 24/7 matter tracking and secure document exchange',
      'Fixed-Fee Startup Legal Package — streamlined legal setup for WA founders',
    ],
    roadmap_ideas:
      'Expanding our pro bono program to include free monthly legal clinics across Perth\'s outer suburbs, in partnership with Community Legal WA.',
    expansion_plans:
      'Planning to open a second Perth office in Fremantle by late 2026 to better serve south-of-river clients and the growing Fremantle precinct.',
    new_markets:
      'Actively targeting the emerging WA renewable energy and critical minerals sectors, where complex project agreements, joint ventures, and government approvals require specialist legal support.',
    is_public: true,
  }, { onConflict: 'business_id' })
  if (rmErr) console.error('Roadmap error:', rmErr.message)
  else console.log('  Roadmap: OK')

  // ── 3. Practice Area / Service cards ────────────────────────────────────────
  console.log('[3] Inserting practice area service cards...')

  const services = [
    {
      name: 'Corporate & Commercial Law',
      category: 'Service',
      short_description:
        'Full-service corporate and commercial legal advice — from structuring new businesses and drafting shareholder agreements to complex M&A transactions and joint ventures.',
      who_it_is_for:
        'ASX-listed companies, private businesses, startups, investors, and entrepreneurs seeking commercial legal certainty.',
      problem_it_solves:
        'Navigating complex commercial transactions, mitigating contractual risk, and ensuring regulatory compliance so businesses can grow with confidence.',
      order_index: 0,
    },
    {
      name: 'Property Law & Conveyancing',
      category: 'Service',
      short_description:
        'Expert property law advice across residential conveyancing, commercial acquisitions, development projects, leasing, and strata disputes.',
      who_it_is_for:
        'Residential buyers and sellers, property developers, commercial landlords, retail tenants, and real estate investors.',
      problem_it_solves:
        'Protecting property rights, de-risking transactions, and resolving disputes efficiently — whether purchasing a first home or executing a large-scale development.',
      order_index: 1,
    },
    {
      name: 'Employment & Workplace Relations',
      category: 'Service',
      short_description:
        'Comprehensive employment law services — employment contracts, unfair dismissal defence, enterprise bargaining, workplace investigations, and executive terminations.',
      who_it_is_for:
        'Employers, HR teams, C-suite executives, and employees navigating workplace legal issues in the private and public sectors.',
      problem_it_solves:
        'Reducing exposure to employment claims, ensuring Fair Work compliance, and resolving workplace disputes before they escalate into litigation.',
      order_index: 2,
    },
    {
      name: 'Dispute Resolution & Litigation',
      category: 'Offering',
      short_description:
        'Strategic dispute resolution and litigation services — mediation, arbitration, and Supreme Court representation across commercial, property, and employment disputes.',
      who_it_is_for:
        'Businesses and individuals facing contractual disputes, debt recovery, negligence claims, or complex civil litigation in Western Australia.',
      problem_it_solves:
        'Achieving the best possible outcome efficiently — resolving disputes through negotiation where possible, and litigating decisively when necessary.',
      order_index: 3,
    },
  ]

  const insertedIds = []
  for (const svc of services) {
    const { data, error } = await sb
      .from('business_products_services')
      .insert({ ...svc, business_id: BIZ_ID, user_id: USER_ID, is_published: true, is_active: true })
      .select('id')
      .single()
    if (error) {
      console.error(`  "${svc.name}" error:`, error.message)
    } else {
      console.log(`  "${svc.name}" id: ${data.id}`)
      insertedIds.push({ id: data.id, name: svc.name })
    }
  }

  if (!insertedIds.length) {
    console.log('No products inserted — skipping sub-tables')
    return
  }

  // ── 4. Sub-tables ────────────────────────────────────────────────────────────
  const [corp, prop, emp, disp] = insertedIds.map(i => i.id)

  // Roles hiring
  console.log('[4] Inserting product roles...')
  const roles = [
    { product_id: corp,  role_name: 'Corporate Solicitor',          order_index: 0 },
    { product_id: corp,  role_name: 'M&A Associate',                order_index: 1 },
    { product_id: corp,  role_name: 'Corporate Law Graduate',        order_index: 2 },
    { product_id: prop,  role_name: 'Property Law Solicitor',        order_index: 0 },
    { product_id: prop,  role_name: 'Conveyancing Associate',        order_index: 1 },
    { product_id: emp,   role_name: 'Employment Law Solicitor',       order_index: 0 },
    { product_id: emp,   role_name: 'Workplace Relations Associate',  order_index: 1 },
    { product_id: emp,   role_name: 'Employment Law Paralegal',       order_index: 2 },
    { product_id: disp,  role_name: 'Litigation Solicitor',          order_index: 0 },
    { product_id: disp,  role_name: 'Dispute Resolution Associate',  order_index: 1 },
  ]
  const { error: rolesErr } = await sb.from('business_product_roles').insert(roles)
  if (rolesErr) console.error('  Roles error:', rolesErr.message)
  else console.log(`  Inserted ${roles.length} roles`)

  // Skills
  console.log('[5] Inserting product skills...')
  const skills = [
    { product_id: corp,  skill_name: 'Corporate Governance' },
    { product_id: corp,  skill_name: 'M&A Due Diligence' },
    { product_id: corp,  skill_name: 'Shareholder Agreements' },
    { product_id: corp,  skill_name: 'Contract Drafting & Negotiation' },
    { product_id: corp,  skill_name: 'ASIC Compliance' },
    { product_id: prop,  skill_name: 'Residential Conveyancing' },
    { product_id: prop,  skill_name: 'Commercial Property Transactions' },
    { product_id: prop,  skill_name: 'Property Development Law' },
    { product_id: prop,  skill_name: 'Strata & Community Title' },
    { product_id: emp,   skill_name: 'Fair Work Act Compliance' },
    { product_id: emp,   skill_name: 'Enterprise Bargaining' },
    { product_id: emp,   skill_name: 'Unfair Dismissal Defence' },
    { product_id: emp,   skill_name: 'Workplace Investigations' },
    { product_id: disp,  skill_name: 'Supreme Court Litigation' },
    { product_id: disp,  skill_name: 'Mediation & Arbitration' },
    { product_id: disp,  skill_name: 'Debt Recovery' },
  ]
  const { error: skillsErr } = await sb.from('business_product_skills').insert(skills)
  if (skillsErr) console.error('  Skills error:', skillsErr.message)
  else console.log(`  Inserted ${skills.length} skills`)

  // Teams
  console.log('[6] Inserting product teams...')
  const teams = [
    { product_id: corp,  team_name: 'Corporate & Commercial Team' },
    { product_id: prop,  team_name: 'Property & Conveyancing Team' },
    { product_id: emp,   team_name: 'Employment & Workplace Relations Team' },
    { product_id: disp,  team_name: 'Litigation & Dispute Resolution Team' },
  ]
  const { error: teamsErr } = await sb.from('business_product_teams').insert(teams)
  if (teamsErr) console.error('  Teams error:', teamsErr.message)
  else console.log(`  Inserted ${teams.length} teams`)

  // Growth areas
  console.log('[7] Inserting growth areas...')
  const growth = [
    { product_id: corp,  growth_area: 'WA technology and startup sector' },
    { product_id: corp,  growth_area: 'Critical minerals and resources M&A' },
    { product_id: prop,  growth_area: 'Large-scale residential development projects' },
    { product_id: prop,  growth_area: 'Commercial leasing advisory' },
    { product_id: emp,   growth_area: 'Executive remuneration and retention strategy' },
    { product_id: emp,   growth_area: 'Psychosocial safety compliance' },
    { product_id: disp,  growth_area: 'Construction and infrastructure disputes' },
    { product_id: disp,  growth_area: 'Cross-border commercial arbitration' },
  ]
  const { error: growthErr } = await sb.from('business_product_growth_areas').insert(growth)
  if (growthErr) console.error('  Growth areas error:', growthErr.message)
  else console.log(`  Inserted ${growth.length} growth areas`)

  // Impact
  console.log('[8] Inserting product impact...')
  const impact = [
    {
      product_id: corp,
      who_it_helps: 'Businesses of all sizes — from sole traders through to ASX-listed companies',
      what_it_improves: 'Commercial certainty, risk management, and governance structures',
      real_world_outcomes: 'Clients close transactions faster, reduce disputes, and operate with greater legal confidence',
    },
    {
      product_id: prop,
      who_it_helps: 'First-home buyers, property investors, and developers across WA',
      what_it_improves: 'Transaction certainty, title protection, and contract risk management',
      real_world_outcomes: 'Clients settle on time, avoid costly surprises, and resolve disputes without litigation',
    },
    {
      product_id: emp,
      who_it_helps: 'WA employers and HR professionals managing a diverse workforce',
      what_it_improves: 'Workplace compliance, risk exposure, and employee relations',
      real_world_outcomes: 'Fewer Fair Work claims, stronger employment contracts, and healthier workplace cultures',
    },
    {
      product_id: disp,
      who_it_helps: 'Individuals and businesses caught in disputes they cannot resolve independently',
      what_it_improves: 'Speed and cost-efficiency of dispute resolution',
      real_world_outcomes: 'Most matters resolved before trial — saving clients time, money, and reputational risk',
    },
  ]
  const { error: impactErr } = await sb.from('business_product_impact').insert(impact)
  if (impactErr) console.error('  Impact error:', impactErr.message)
  else console.log(`  Inserted ${impact.length} impact rows`)

  // Signals
  console.log('[9] Inserting product signals...')
  const signals = [
    { product_id: corp,  we_are_hiring_for_this: true,  open_to_partnerships: true,  in_research_and_development: false, currently_scaling: true  },
    { product_id: prop,  we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: false, currently_scaling: false },
    { product_id: emp,   we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: false, currently_scaling: true  },
    { product_id: disp,  we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: false, currently_scaling: false },
  ]
  const { error: sigErr } = await sb.from('business_product_signals').insert(signals)
  if (sigErr) console.error('  Signals error:', sigErr.message)
  else console.log(`  Inserted ${signals.length} signals`)

  // Permissions
  console.log('[10] Inserting product permissions...')
  const perms = insertedIds.map(({ id }) => ({ product_id: id, visibility_level: 'public' }))
  const { error: permErr } = await sb.from('business_product_permissions').insert(perms)
  if (permErr) console.error('  Permissions error:', permErr.message)
  else console.log(`  Inserted ${perms.length} permissions`)

  console.log('\nDone! Products & Services populated for Fortitude Legal.')
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
