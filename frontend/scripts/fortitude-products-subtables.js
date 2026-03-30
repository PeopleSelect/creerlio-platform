/**
 * Inserts sub-table data for Fortitude Legal's 4 service cards (ids 6-9).
 * Run from /frontend: node scripts/fortitude-products-subtables.js
 */
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const BIZ  = '3d44f9d3-8ee2-4834-a048-ef31607f5d8d'
const USER = '3d44f9d3-8ee2-4834-a048-ef31607f5d8d'

// Product IDs from previous run
const [corp, prop, emp, disp] = [6, 7, 8, 9]

async function ins(table, rows) {
  const { error } = await sb.from(table).insert(rows)
  if (error) console.error(`  ${table} error:`, error.message)
  else console.log(`  ${table}: ${rows.length} rows OK`)
}

async function run() {
  // Roles
  await ins('business_product_roles', [
    { product_id: corp, business_id: BIZ, user_id: USER, role_name: 'Corporate Solicitor',         order_index: 0 },
    { product_id: corp, business_id: BIZ, user_id: USER, role_name: 'M&A Associate',               order_index: 1 },
    { product_id: corp, business_id: BIZ, user_id: USER, role_name: 'Corporate Law Graduate',       order_index: 2 },
    { product_id: prop, business_id: BIZ, user_id: USER, role_name: 'Property Law Solicitor',       order_index: 0 },
    { product_id: prop, business_id: BIZ, user_id: USER, role_name: 'Conveyancing Associate',       order_index: 1 },
    { product_id: emp,  business_id: BIZ, user_id: USER, role_name: 'Employment Law Solicitor',     order_index: 0 },
    { product_id: emp,  business_id: BIZ, user_id: USER, role_name: 'Workplace Relations Associate',order_index: 1 },
    { product_id: emp,  business_id: BIZ, user_id: USER, role_name: 'Employment Law Paralegal',     order_index: 2 },
    { product_id: disp, business_id: BIZ, user_id: USER, role_name: 'Litigation Solicitor',         order_index: 0 },
    { product_id: disp, business_id: BIZ, user_id: USER, role_name: 'Dispute Resolution Associate', order_index: 1 },
  ])

  // Skills
  await ins('business_product_skills', [
    { product_id: corp, business_id: BIZ, user_id: USER, skill_name: 'Corporate Governance' },
    { product_id: corp, business_id: BIZ, user_id: USER, skill_name: 'M&A Due Diligence' },
    { product_id: corp, business_id: BIZ, user_id: USER, skill_name: 'Shareholder Agreements' },
    { product_id: corp, business_id: BIZ, user_id: USER, skill_name: 'Contract Drafting & Negotiation' },
    { product_id: corp, business_id: BIZ, user_id: USER, skill_name: 'ASIC Compliance' },
    { product_id: prop, business_id: BIZ, user_id: USER, skill_name: 'Residential Conveyancing' },
    { product_id: prop, business_id: BIZ, user_id: USER, skill_name: 'Commercial Property Transactions' },
    { product_id: prop, business_id: BIZ, user_id: USER, skill_name: 'Property Development Law' },
    { product_id: prop, business_id: BIZ, user_id: USER, skill_name: 'Strata & Community Title' },
    { product_id: emp,  business_id: BIZ, user_id: USER, skill_name: 'Fair Work Act Compliance' },
    { product_id: emp,  business_id: BIZ, user_id: USER, skill_name: 'Enterprise Bargaining' },
    { product_id: emp,  business_id: BIZ, user_id: USER, skill_name: 'Unfair Dismissal Defence' },
    { product_id: emp,  business_id: BIZ, user_id: USER, skill_name: 'Workplace Investigations' },
    { product_id: disp, business_id: BIZ, user_id: USER, skill_name: 'Supreme Court Litigation' },
    { product_id: disp, business_id: BIZ, user_id: USER, skill_name: 'Mediation & Arbitration' },
    { product_id: disp, business_id: BIZ, user_id: USER, skill_name: 'Debt Recovery' },
  ])

  // Teams
  await ins('business_product_teams', [
    { product_id: corp, business_id: BIZ, user_id: USER, team_name: 'Corporate & Commercial Team' },
    { product_id: prop, business_id: BIZ, user_id: USER, team_name: 'Property & Conveyancing Team' },
    { product_id: emp,  business_id: BIZ, user_id: USER, team_name: 'Employment & Workplace Relations Team' },
    { product_id: disp, business_id: BIZ, user_id: USER, team_name: 'Litigation & Dispute Resolution Team' },
  ])

  // Growth areas
  await ins('business_product_growth_areas', [
    { product_id: corp, business_id: BIZ, user_id: USER, growth_area: 'WA technology and startup sector' },
    { product_id: corp, business_id: BIZ, user_id: USER, growth_area: 'Critical minerals and resources M&A' },
    { product_id: prop, business_id: BIZ, user_id: USER, growth_area: 'Large-scale residential development projects' },
    { product_id: prop, business_id: BIZ, user_id: USER, growth_area: 'Commercial leasing advisory' },
    { product_id: emp,  business_id: BIZ, user_id: USER, growth_area: 'Executive remuneration and retention strategy' },
    { product_id: emp,  business_id: BIZ, user_id: USER, growth_area: 'Psychosocial safety compliance' },
    { product_id: disp, business_id: BIZ, user_id: USER, growth_area: 'Construction and infrastructure disputes' },
    { product_id: disp, business_id: BIZ, user_id: USER, growth_area: 'Cross-border commercial arbitration' },
  ])

  // Impact
  await ins('business_product_impact', [
    {
      product_id: corp, business_id: BIZ, user_id: USER,
      who_it_helps: 'Businesses of all sizes — from sole traders through to ASX-listed companies',
      what_it_improves: 'Commercial certainty, risk management, and governance structures',
      real_world_outcomes: 'Clients close transactions faster, reduce disputes, and operate with greater legal confidence',
    },
    {
      product_id: prop, business_id: BIZ, user_id: USER,
      who_it_helps: 'First-home buyers, property investors, and developers across WA',
      what_it_improves: 'Transaction certainty, title protection, and contract risk management',
      real_world_outcomes: 'Clients settle on time, avoid costly surprises, and resolve disputes without litigation',
    },
    {
      product_id: emp, business_id: BIZ, user_id: USER,
      who_it_helps: 'WA employers and HR professionals managing a diverse workforce',
      what_it_improves: 'Workplace compliance, risk exposure, and employee relations',
      real_world_outcomes: 'Fewer Fair Work claims, stronger employment contracts, and healthier workplace cultures',
    },
    {
      product_id: disp, business_id: BIZ, user_id: USER,
      who_it_helps: 'Individuals and businesses caught in disputes they cannot resolve independently',
      what_it_improves: 'Speed and cost-efficiency of dispute resolution',
      real_world_outcomes: 'Most matters resolved before trial — saving clients time, money, and reputational risk',
    },
  ])

  // Signals
  await ins('business_product_signals', [
    { product_id: corp, business_id: BIZ, user_id: USER, we_are_hiring_for_this: true,  open_to_partnerships: true,  in_research_and_development: false, currently_scaling: true  },
    { product_id: prop, business_id: BIZ, user_id: USER, we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: false, currently_scaling: false },
    { product_id: emp,  business_id: BIZ, user_id: USER, we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: false, currently_scaling: true  },
    { product_id: disp, business_id: BIZ, user_id: USER, we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: false, currently_scaling: false },
  ])

  // Permissions (use default visibility_level by not specifying it)
  await ins('business_product_permissions', [
    { product_id: corp, business_id: BIZ, user_id: USER },
    { product_id: prop, business_id: BIZ, user_id: USER },
    { product_id: emp,  business_id: BIZ, user_id: USER },
    { product_id: disp, business_id: BIZ, user_id: USER },
  ])

  console.log('\nDone!')
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
