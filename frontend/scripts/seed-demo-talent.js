/**
 * Seed script: creates a complete demo Talent profile
 * Run from /frontend:  node scripts/seed-demo-talent.js
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://empehaulljtwfyzjmvmn.supabase.co'
const SERVICE_ROLE_KEY =
  '' + process.env.SUPABASE_SERVICE_ROLE_KEY + ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Demo profile data ────────────────────────────────────────────────────────

const DEMO_EMAIL = 'demo.talent@creerlio.com'
const DEMO_PASSWORD = 'DemoTalent2025!'

const PROFILE = {
  name: 'Jordan Riley',
  title: 'Senior Event & Hospitality Manager',
  headline: 'Events • Hospitality • Customer Experience • Open to new roles',
  bio: `Dynamic hospitality and events professional with 8+ years of experience designing and delivering memorable guest experiences across luxury hotels, corporate events, and festival productions. I specialise in end-to-end event coordination, team leadership, and creating seamless hospitality operations that consistently exceed client expectations.\n\nPassionate about people-first service culture, I bring a calm under-pressure demeanour paired with sharp organisational skills. Whether managing a 500-person gala or coaching front-of-house teams, I thrive on turning visions into flawlessly executed realities.\n\nCurrently seeking senior roles in events management, hotel operations, or guest experience within innovative hospitality brands in Sydney or nationally.`,
  skills: [
    'Event Planning & Coordination',
    'Venue & Vendor Management',
    'Budget Management',
    'Team Leadership',
    'Guest Experience Design',
    'Stakeholder Communication',
    'Front-of-House Operations',
    'CRM & Booking Systems',
    'Menu & Catering Planning',
    'Risk & Compliance Management',
    'Social Media Marketing',
    'Corporate & Gala Events',
  ],
  location: 'Sydney, NSW, Australia',
  city: 'Sydney',
  state: 'NSW',
  country: 'Australia',
  latitude: -33.8688,
  longitude: 151.2093,
  phone: '+61 412 345 678',
  search_visible: true,
  search_summary:
    '8+ years in hospitality & events. Senior Event Manager with luxury hotel and corporate background. Available immediately, open to permanent or contract in Sydney.',
  availability_description:
    'Available to start immediately. Open to full-time permanent, contract, or consulting engagements. Flexible on location — Sydney preferred, national travel considered.',
  // Public Unsplash images — no storage upload needed, stored as external URLs
  avatar_url:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face&auto=format',
  banner_url:
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&h=400&fit=crop&auto=format',
  visible_sections: ['intro', 'skills', 'experience', 'education', 'projects', 'social'],
  selected_template_id: 3,
  experience_years: 8,
  is_active: true,
}

const EXPERIENCE = [
  {
    item_type: 'experience',
    title: 'Senior Events Manager',
    description:
      'Led end-to-end delivery of 80+ corporate and social events per year including galas, product launches, and multi-day conferences for clients such as Deloitte, Atlassian, and NSW Government. Managed a team of 12 event coordinators and casual staff, overseeing scheduling, briefing, and post-event review. Delivered consistent NPS scores above 90 and reduced average event cost overrun from 18% to 4% through tighter supplier negotiations.',
    metadata: {
      company: 'Ovation Group Events',
      start_date: '2021-03',
      end_date: null,
      is_current: true,
      employment_type: 'Full-time',
      location: 'Sydney, NSW',
    },
  },
  {
    item_type: 'experience',
    title: 'Event & Catering Coordinator',
    description:
      'Coordinated weddings, corporate functions, and social events for a 5-star Darling Harbour hotel with a ballroom capacity of 350. Managed all catering logistics including menu design with the executive chef, dietary accommodations, and AV requirements. Handled day-of production for 120+ events annually with a perfect delivery record. Promoted from coordinator to senior coordinator within 14 months.',
    metadata: {
      company: 'Hyatt Regency Sydney',
      start_date: '2018-06',
      end_date: '2021-02',
      is_current: false,
      employment_type: 'Full-time',
      location: 'Sydney, NSW',
    },
  },
  {
    item_type: 'experience',
    title: 'Front-of-House Supervisor',
    description:
      'Supervised FOH operations for a high-volume fine-dining restaurant (130 covers, 7 nights). Trained and mentored 20 wait staff, managed reservation system (OpenTable), and maintained Tripadvisor #8 ranking for Sydney CBD. Key achievement: introduced service standards playbook that cut onboarding time for new staff from 3 weeks to 10 days.',
    metadata: {
      company: 'Quay Restaurant',
      start_date: '2016-01',
      end_date: '2018-05',
      is_current: false,
      employment_type: 'Full-time',
      location: 'Sydney, NSW',
    },
  },
]

const EDUCATION = [
  {
    item_type: 'education',
    title: 'Bachelor of Event Management',
    description:
      'Specialisation in corporate events and venue management. Completed capstone project delivering a 200-person industry networking event in partnership with the Sydney Business Chamber. Graduated with Distinction.',
    metadata: {
      institution: 'William Blue College of Hospitality Management',
      degree: 'Bachelor of Event Management',
      field_of_study: 'Event Management & Hospitality',
      year_completed: '2015',
      grade: 'Distinction',
    },
  },
  {
    item_type: 'education',
    title: 'Certificate IV in Hospitality Management',
    description:
      'Covered food & beverage operations, financial management for hospitality, and leadership in service environments. Completed while working part-time as a hospitality assistant.',
    metadata: {
      institution: 'TAFE NSW',
      degree: 'Certificate IV',
      field_of_study: 'Hospitality Management',
      year_completed: '2013',
      grade: 'Credit',
    },
  },
]

const PROJECTS = [
  {
    item_type: 'project',
    title: 'Sydney Fintech Summit 2023',
    description:
      'Full end-to-end production of a 600-delegate two-day fintech conference at the International Convention Centre Sydney. Scope included venue liaison, catering for 3 meal periods per day, AV and livestream production, speaker management, and sponsor fulfilment. Delivered $180K under budget with zero critical incidents. Post-event survey rated overall experience 4.8/5.',
    metadata: {
      url: 'https://sydneyfintechsummit.com.au',
      role: 'Lead Event Manager',
      year: '2023',
      outcome: 'Delivered under budget, 4.8/5 attendee rating',
    },
  },
  {
    item_type: 'project',
    title: 'Gala Dinner Series — Ovation Group',
    description:
      'Designed and launched a recurring quarterly black-tie gala series for corporate clients. Created a replicable production playbook covering décor, entertainment sourcing, menu design, run-of-show scripting, and photography briefing. The series generated $2.1M in annual revenue for the business and was featured in Spice Magazine.',
    metadata: {
      url: '',
      role: 'Creator & Event Lead',
      year: '2022',
      outcome: '$2.1M revenue generated, featured in Spice Magazine',
    },
  },
  {
    item_type: 'project',
    title: 'Volunteer: Vivid Sydney Hospitality Hub 2019',
    description:
      'Coordinated the hospitality operations (bar, pop-up food vendors, guest flow) for the Circular Quay activation zone during Vivid Sydney. Managed 45 volunteers across 10-day festival run, liaising with Destination NSW, City of Sydney, and 6 food & beverage operators to maintain smooth guest experience across 120,000+ visitors.',
    metadata: {
      url: 'https://vividinternational.com.au',
      role: 'Hospitality Operations Coordinator (Volunteer)',
      year: '2019',
      outcome: '120K+ visitors, zero critical incidents over 10-day run',
    },
  },
]

const SOCIAL_LINKS = [
  { item_type: 'social', title: 'LinkedIn', metadata: { platform: 'linkedin', url: 'https://linkedin.com/in/jordan-riley-events' } },
  { item_type: 'social', title: 'Instagram', metadata: { platform: 'instagram', url: 'https://instagram.com/jordanriley.events' } },
]

// ── Script ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding demo talent profile...\n')

  // 1. Create auth user (or fetch existing)
  let userId

  // Check if user already exists by listing users (admin API)
  const { data: userList, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 500 })
  if (listErr) {
    console.error('Error listing users:', listErr.message)
    process.exit(1)
  }
  const existing = userList?.users?.find(u => u.email === DEMO_EMAIL)

  if (existing) {
    userId = existing.id
    console.log(`✅  Auth user already exists: ${userId}`)
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { user_type: 'talent', name: PROFILE.name },
    })
    if (createErr) {
      console.error('Error creating auth user:', createErr.message)
      process.exit(1)
    }
    userId = created.user.id
    console.log(`✅  Created auth user: ${userId}`)
  }

  // 2. Upsert talent_profiles
  const { error: profileErr } = await supabase
    .from('talent_profiles')
    .upsert(
      { ...PROFILE, user_id: userId, email: DEMO_EMAIL, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (profileErr) {
    console.error('Error upserting talent_profiles:', profileErr.message)
    process.exit(1)
  }
  console.log('✅  talent_profiles upserted')

  // Fetch the profile id
  const { data: profileRow, error: fetchErr } = await supabase
    .from('talent_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()
  if (fetchErr || !profileRow) {
    console.error('Could not fetch profile id:', fetchErr?.message)
    process.exit(1)
  }
  const profileId = profileRow.id
  console.log(`   Profile id: ${profileId}`)

  // 3. Clear old bank items for this user (clean re-seed)
  await supabase.from('talent_bank_items').delete().eq('user_id', userId)
  console.log('🗑️   Cleared old talent_bank_items')

  // 4. Insert experience
  for (const item of EXPERIENCE) {
    const { error } = await supabase.from('talent_bank_items').insert({ ...item, user_id: userId })
    if (error) console.error('  ⚠️  Experience insert error:', error.message)
    else console.log(`✅  Experience: ${item.title}`)
  }

  // 5. Insert education
  for (const item of EDUCATION) {
    const { error } = await supabase.from('talent_bank_items').insert({ ...item, user_id: userId })
    if (error) console.error('  ⚠️  Education insert error:', error.message)
    else console.log(`✅  Education: ${item.title}`)
  }

  // 6. Insert projects
  for (const item of PROJECTS) {
    const { error } = await supabase.from('talent_bank_items').insert({ ...item, user_id: userId })
    if (error) console.error('  ⚠️  Project insert error:', error.message)
    else console.log(`✅  Project: ${item.title}`)
  }

  // 7. Insert social links
  for (const item of SOCIAL_LINKS) {
    const { error } = await supabase.from('talent_bank_items').insert({ ...item, user_id: userId })
    if (error) console.error('  ⚠️  Social insert error:', error.message)
    else console.log(`✅  Social: ${item.title}`)
  }

  // 8. Upsert portfolio share config (all sections shared)
  const shareConfig = {
    talent_profile_id: profileId,
    user_id: userId,
    share_intro: true,
    share_social: true,
    share_skills: true,
    share_experience: true,
    share_education: true,
    share_referees: false,
    share_projects: true,
    share_attachments: false,
    share_avatar: true,
    share_banner: true,
    share_intro_video: false,
  }
  // Delete existing then insert (avoids needing to know unique constraint name)
  await supabase.from('talent_portfolio_share_config').delete().eq('user_id', userId)
  const { error: shareErr } = await supabase
    .from('talent_portfolio_share_config')
    .insert(shareConfig)
  if (shareErr) console.error('  ⚠️  Share config error:', shareErr.message)
  else console.log('✅  Portfolio share config set')

  console.log('\n🎉  Done!\n')
  console.log('  Email:    ', DEMO_EMAIL)
  console.log('  Password: ', DEMO_PASSWORD)
  console.log('  Profile:  ', `${SUPABASE_URL.replace('https://', 'https://app.')}/table-editor`)
  console.log('\n  To view in app, sign in at /login/talent')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
