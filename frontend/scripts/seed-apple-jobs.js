/**
 * Seeds 10 published jobs for the Apple showcase profile.
 * Apple business profile ID: 0df56505-172e-4f3a-9586-6d03cbd49100
 *
 * Run from /frontend:  node scripts/seed-apple-jobs.js
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const APPLE_ID = '0df56505-172e-4f3a-9586-6d03cbd49100'

const JOBS = [
  {
    title: 'Software Engineer — iOS Platform',
    description: 'Join the team that builds the world\'s most personal operating system. You\'ll work on core iOS frameworks, optimise performance at scale, and collaborate closely with hardware engineers to push what\'s possible on Apple silicon.',
    city: 'Cupertino',
    state: 'CA',
    country: 'United States',
    location: 'Cupertino, CA, United States',
    employment_type: 'Full-time',
    experience_level: 'Mid-level',
    salary_min: 160000,
    salary_max: 220000,
    salary_currency: 'USD',
  },
  {
    title: 'Machine Learning Engineer — Siri',
    description: 'Design and ship on-device ML models that power Siri across iPhone, iPad, Mac and Apple Watch. You\'ll work with cross-functional teams on natural language understanding, speech recognition, and personalisation at massive scale.',
    city: 'Cupertino',
    state: 'CA',
    country: 'United States',
    location: 'Cupertino, CA, United States',
    employment_type: 'Full-time',
    experience_level: 'Senior',
    salary_min: 190000,
    salary_max: 260000,
    salary_currency: 'USD',
  },
  {
    title: 'Product Designer — Apple Intelligence',
    description: 'Shape how people interact with AI on Apple devices. You\'ll craft intuitive, delightful experiences for Apple Intelligence features, working end-to-end from concept sketches to polished production UI in close partnership with engineering and research teams.',
    city: 'Cupertino',
    state: 'CA',
    country: 'United States',
    location: 'Cupertino, CA, United States',
    employment_type: 'Full-time',
    experience_level: 'Senior',
    salary_min: 165000,
    salary_max: 230000,
    salary_currency: 'USD',
  },
  {
    title: 'Hardware Engineer — Apple Silicon',
    description: 'Contribute to the design and bring-up of next-generation Apple silicon. You\'ll work on CPU/GPU architecture, power management, and thermal validation in one of the most advanced chip design teams in the world.',
    city: 'Cupertino',
    state: 'CA',
    country: 'United States',
    location: 'Cupertino, CA, United States',
    employment_type: 'Full-time',
    experience_level: 'Senior',
    salary_min: 180000,
    salary_max: 250000,
    salary_currency: 'USD',
  },
  {
    title: 'Software Engineer — SwiftUI Frameworks',
    description: 'Build and evolve the SwiftUI framework used by millions of developers worldwide. You\'ll tackle complex rendering challenges, design expressive APIs, and directly influence how apps are built across all Apple platforms.',
    city: 'Cupertino',
    state: 'CA',
    country: 'United States',
    location: 'Cupertino, CA, United States',
    employment_type: 'Full-time',
    experience_level: 'Senior',
    salary_min: 175000,
    salary_max: 240000,
    salary_currency: 'USD',
  },
  {
    title: 'Privacy Engineer',
    description: 'Help design and implement privacy-preserving technologies across Apple\'s products and services. You\'ll work on differential privacy, on-device processing, and privacy impact assessments to ensure user data is handled with the highest standards.',
    city: 'Cupertino',
    state: 'CA',
    country: 'United States',
    location: 'Cupertino, CA, United States',
    employment_type: 'Full-time',
    experience_level: 'Mid-level',
    salary_min: 155000,
    salary_max: 210000,
    salary_currency: 'USD',
  },
  {
    title: 'Retail Specialist — Apple Store',
    description: 'Inspire customers with a passion for Apple products. You\'ll deliver personalised one-to-one sessions, support Genius Bar repairs, and help customers get the most out of their devices in a dynamic, world-class retail environment.',
    city: 'San Francisco',
    state: 'CA',
    country: 'United States',
    location: 'San Francisco, CA, United States',
    employment_type: 'Part-time',
    experience_level: 'Entry-level',
    salary_min: 20,
    salary_max: 28,
    salary_currency: 'USD',
  },
  {
    title: 'Software Engineer — Safari WebKit',
    description: 'Work on one of the world\'s most widely deployed rendering engines. You\'ll implement web standards, improve JavaScript performance, and ensure Safari delivers the fastest, most power-efficient browsing experience across Apple devices.',
    city: 'Cupertino',
    state: 'CA',
    country: 'United States',
    location: 'Cupertino, CA, United States',
    employment_type: 'Full-time',
    experience_level: 'Senior',
    salary_min: 170000,
    salary_max: 235000,
    salary_currency: 'USD',
  },
  {
    title: 'Data Scientist — App Store Analytics',
    description: 'Use large-scale data to improve App Store discovery and developer success. You\'ll build models that power search ranking, recommendation systems, and business insights tools used by over 1.8 billion active devices worldwide.',
    city: 'Cupertino',
    state: 'CA',
    country: 'United States',
    location: 'Cupertino, CA, United States',
    employment_type: 'Full-time',
    experience_level: 'Mid-level',
    salary_min: 150000,
    salary_max: 200000,
    salary_currency: 'USD',
  },
  {
    title: 'Security Researcher — Platform Security',
    description: 'Protect billions of users by finding and fixing security vulnerabilities across Apple\'s platforms. You\'ll conduct deep vulnerability research, review cryptographic implementations, and work with product teams to build security in from the ground up.',
    city: 'Cupertino',
    state: 'CA',
    country: 'United States',
    location: 'Cupertino, CA, United States',
    employment_type: 'Full-time',
    experience_level: 'Senior',
    salary_min: 185000,
    salary_max: 255000,
    salary_currency: 'USD',
  },
]

async function run() {
  console.log('Seeding Apple jobs...')

  // Check no existing jobs first
  const { data: existing } = await sb.from('jobs').select('id').eq('business_id', APPLE_ID)
  if (existing && existing.length > 0) {
    console.log(`Apple already has ${existing.length} jobs. Deleting and re-seeding...`)
    await sb.from('jobs').delete().eq('business_id', APPLE_ID)
  }

  let inserted = 0
  for (const job of JOBS) {
    const { error } = await sb.from('jobs').insert({
      business_id:         APPLE_ID,
      business_profile_id: APPLE_ID,
      status:              'published',
      is_active:           true,
      list_on_creerlio:    true,
      ...job,
    })
    if (error) {
      console.error(`  ✗ "${job.title}": ${error.message}`)
    } else {
      console.log(`  ✓ ${job.title}`)
      inserted++
    }
  }

  console.log(`\nDone — ${inserted}/${JOBS.length} jobs inserted for Apple.`)
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
