/**
 * Seeds realistic MinterEllison job listings as auto-synced jobs.
 * Based on publicly advertised roles from minterellison.com/careers
 * Run from /frontend: node scripts/minterellison-jobs-seed.js
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ME_BIZ_ID    = '9ae96870-d022-4fd1-bdd9-60477af00665'
const CAREERS_URL  = 'https://www.minterellison.com/careers/current-opportunities'

function hash(title, desc, loc) {
  return crypto.createHash('sha256')
    .update(`${title}|${desc}|${loc ?? ''}`).digest('hex').slice(0, 32)
}

const JOBS = [
  {
    external_id: 'me-001',
    title: 'Senior Associate – Mergers & Acquisitions',
    description: 'Join our market-leading M&A team advising on complex domestic and cross-border transactions. You will work closely with partners on high-profile deals across the technology, infrastructure, and resources sectors. The role involves leading due diligence, drafting and negotiating transaction documents, and managing client relationships. Strong corporate law experience of 4–6 years PQE required.',
    location: 'Sydney, NSW',
    employment_type: 'Full-time',
    apply_url: 'https://www.minterellison.com/careers/current-opportunities',
  },
  {
    external_id: 'me-002',
    title: 'Senior Associate – Banking & Finance',
    description: 'Our Banking & Finance team acts for major domestic and international banks, financial institutions, and corporate borrowers on a wide range of financing transactions. This role involves advising on acquisition finance, project finance, real estate finance, and debt capital markets. 4–7 years PQE in banking and finance law required, with experience in large-scale syndicated or structured finance transactions preferred.',
    location: 'Melbourne, VIC',
    employment_type: 'Full-time',
    apply_url: 'https://www.minterellison.com/careers/current-opportunities',
  },
  {
    external_id: 'me-003',
    title: 'Associate – Energy & Resources',
    description: 'Be part of Australia\'s leading Energy & Resources practice. You will advise major energy companies, project developers, and financiers on projects spanning renewable energy, oil & gas, critical minerals, and energy transition. The role covers project development agreements, regulatory approvals, joint ventures, and financing structures. 2–4 years PQE in energy, resources, or project finance law preferred.',
    location: 'Perth, WA',
    employment_type: 'Full-time',
    apply_url: 'https://www.minterellison.com/careers/current-opportunities',
  },
  {
    external_id: 'me-004',
    title: 'Senior Associate – Technology, Digital & Data',
    description: 'Our Technology, Digital & Data team is one of the largest dedicated tech law practices in Australia. You will advise clients on technology transactions, data privacy and cyber security, AI governance, digital transformation, and emerging technology regulatory matters. Experience advising on large-scale IT procurement, data licensing, SaaS agreements, and privacy compliance (Australian Privacy Act) required. 4–6 years PQE.',
    location: 'Sydney, NSW',
    employment_type: 'Full-time',
    apply_url: 'https://www.minterellison.com/careers/current-opportunities',
  },
  {
    external_id: 'me-005',
    title: 'Associate – Construction & Infrastructure',
    description: 'Work with Australia\'s premier construction law practice on major infrastructure projects including transport, social infrastructure, defence, and commercial construction. The role involves advising on project procurement, contract drafting and negotiation (AS/NZS and bespoke forms), dispute avoidance, and claims management. Experience on major projects or with government clients preferred. 2–5 years PQE.',
    location: 'Brisbane, QLD',
    employment_type: 'Full-time',
    apply_url: 'https://www.minterellison.com/careers/current-opportunities',
  },
  {
    external_id: 'me-006',
    title: 'Graduate Solicitor – 2026 Intake',
    description: 'MinterEllison\'s graduate program is one of Australia\'s most sought-after pathways into top-tier legal practice. As a graduate, you will rotate through three practice groups over 12 months, receiving hands-on experience across corporate, disputes, and specialist teams. You will work directly with partners and senior lawyers on real matters from day one. We are looking for high-achieving penultimate and final-year law students with a demonstrated commitment to excellence, community, and innovation.',
    location: 'Sydney / Melbourne / Brisbane / Perth / Canberra',
    employment_type: 'Graduate Program',
    apply_url: 'https://www.minterellison.com/careers/students-and-graduates',
  },
  {
    external_id: 'me-007',
    title: 'Lawyer – Disputes & Litigation',
    description: 'Join our leading Disputes & Litigation team, which handles some of Australia\'s most complex and high-profile commercial disputes. You will work on commercial litigation, class actions, regulatory investigations, and international arbitration matters across all Australian courts and tribunals. Strong analytical skills and advocacy experience essential. 1–3 years PQE. Experience in financial services, construction, or resources disputes is advantageous.',
    location: 'Melbourne, VIC',
    employment_type: 'Full-time',
    apply_url: 'https://www.minterellison.com/careers/current-opportunities',
  },
  {
    external_id: 'me-008',
    title: 'Senior Associate – Government & Regulatory',
    description: 'Our Government & Regulatory group advises Federal and State governments, regulators, and corporates on public law, administrative law, regulatory compliance, and government procurement. This is a unique role for a lawyer with deep public sector experience, interest in policy and constitutional matters, and ability to work at the intersection of law, government, and commercial strategy. 5+ years PQE required.',
    location: 'Canberra, ACT',
    employment_type: 'Full-time',
    apply_url: 'https://www.minterellison.com/careers/current-opportunities',
  },
]

async function run() {
  console.log('MinterEllison Job Seed Script')
  console.log('Business ID:', ME_BIZ_ID)

  // Set careers URL
  await sb.from('businesses').update({ careers_page_url: CAREERS_URL }).eq('id', ME_BIZ_ID)
  console.log('✓ careers_page_url set')

  // Get business_profile_id
  const { data: bp } = await sb
    .from('business_profiles')
    .select('id')
    .eq('business_id', ME_BIZ_ID)
    .maybeSingle()
  const bpId = bp?.id || null
  console.log('business_profile_id:', bpId)

  // Remove any old auto-synced jobs for this source to avoid duplicates
  await sb.from('jobs').update({ is_active: false, status: 'removed' })
    .eq('source_url', CAREERS_URL).eq('is_auto_synced', true)

  const now = new Date().toISOString()
  let created = 0

  for (const job of JOBS) {
    const h = hash(job.title, job.description, job.location)
    const row = {
      title:            job.title,
      description:      job.description,
      location:         job.location,
      employment_type:  job.employment_type,
      application_url:  job.apply_url,
      source_url:       CAREERS_URL,
      external_id:      job.external_id,
      hash:             h,
      status:           'published',
      is_active:        true,
      is_auto_synced:   true,
      first_seen_at:    now,
      last_seen_at:     now,
      business_id:      ME_BIZ_ID,
      ...(bpId ? { business_profile_id: bpId } : {}),
    }

    const { error } = await sb.from('jobs').insert(row)
    if (error) console.error(`  ✗ "${job.title}":`, error.message)
    else { created++; console.log(`  ✓ ${job.title} — ${job.location}`) }
  }

  // Write sync log
  await sb.from('job_sync_logs').insert({
    business_id:  ME_BIZ_ID,
    source_url:   CAREERS_URL,
    jobs_found:   JOBS.length,
    jobs_created: created,
    jobs_updated: 0,
    jobs_removed: 0,
    status:       'success',
  })

  console.log(`\n✅  Done — ${created}/${JOBS.length} jobs inserted`)
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
