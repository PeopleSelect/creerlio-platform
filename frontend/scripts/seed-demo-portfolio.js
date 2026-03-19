/**
 * Seed script: builds a complete demo Portfolio for Jordan Riley (demo.talent@creerlio.com)
 * Generates DALL-E images, uploads to Supabase Storage, and creates the full portfolio record.
 * Run from /frontend:  node scripts/seed-demo-portfolio.js
 */

const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const { v4: uuidv4 } = require('uuid')

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://empehaulljtwfyzjmvmn.supabase.co'
const SERVICE_ROLE_KEY =
  '' + process.env.SUPABASE_SERVICE_ROLE_KEY + ''
const OPENAI_API_KEY =
  '' + process.env.OPENAI_API_KEY + ''
const DEMO_EMAIL = 'demo.talent@creerlio.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// ── DALL-E image definitions ──────────────────────────────────────────────────

const IMAGES_TO_GENERATE = [
  {
    key: 'community_1',
    prompt:
      'A warm candid photo of a professional woman in her early 30s volunteering at a community food drive event, smiling and handing bags to people, soft natural lighting, photorealistic',
    filename: 'community-food-drive.jpg',
    title: 'Community Food Drive Volunteer',
    description: 'Volunteering at the North Shore Community Food Drive — an annual event I help coordinate each winter.',
  },
  {
    key: 'community_2',
    prompt:
      'A group of smiling volunteers at an outdoor charity fun run event, colourful banners visible in background, sunny day, photorealistic candid photo',
    filename: 'charity-fun-run.jpg',
    title: 'Harbour Fun Run 2024',
    description: 'Organising the Harbour Charity Fun Run with 800 participants raising funds for youth homelessness.',
  },
  {
    key: 'community_3',
    prompt:
      'A professional woman speaking on stage at a community leadership forum, podium with microphone, engaged audience, modern event venue, photorealistic',
    filename: 'community-leadership-forum.jpg',
    title: 'Community Leadership Forum Speaker',
    description: 'Speaking at the Sydney Young Leaders Forum on hospitality as a career pathway.',
  },
  {
    key: 'community_4',
    prompt:
      'A team of diverse young professionals planting trees in a park on a sunny day, community green space restoration project, smiling and working together, photorealistic',
    filename: 'tree-planting-day.jpg',
    title: 'Green Sydney Tree Planting Day',
    description: 'Part of the Green Sydney initiative — planting 500 trees in Centennial Park with 60 corporate volunteers.',
  },
  {
    key: 'project_fintech',
    prompt:
      'An elegant large-scale business conference in a modern convention centre, hundreds of delegates seated, professional stage with screens showing "Sydney Fintech Summit 2023", dramatic lighting, photorealistic',
    filename: 'fintech-summit-2023.jpg',
    title: 'Sydney Fintech Summit 2023',
    description: 'Main plenary hall — Sydney Fintech Summit 2023, ICC Sydney.',
  },
  {
    key: 'project_gala',
    prompt:
      'A stunning black-tie gala dinner in a grand ballroom, round tables with white linen and elaborate floral centrepieces, warm candlelit atmosphere, elegantly dressed guests, photorealistic',
    filename: 'gala-dinner-setup.jpg',
    title: 'Annual Gala Dinner Series',
    description: 'Ballroom setup for the Q3 2023 Ovation Group Gala — 280 guests, Shangri-La Sydney.',
  },
  {
    key: 'cert_rsa',
    prompt:
      'A clean professional certificate document on cream paper with a gold seal, text reads "Responsible Service of Alcohol Certificate" issued to "Jordan Riley", professional typography, flat lay photography',
    filename: 'rsa-certificate.jpg',
    title: 'RSA Certificate',
    description: 'Responsible Service of Alcohol — NSW Food Authority',
  },
  {
    key: 'cert_firstaid',
    prompt:
      'A professional first aid certificate document on white background with red cross logo, text reads "Certificate in First Aid" with date 2024, clean and professional, flat lay photography',
    filename: 'first-aid-certificate.jpg',
    title: 'First Aid Certificate',
    description: 'Provide First Aid (HLTAID011) — St John Ambulance Australia',
  },
  {
    key: 'cert_events',
    prompt:
      'A framed certificate of achievement on a desk, reads "Advanced Event Management Certification" with gold embossed border and official seal, professional photography',
    filename: 'event-management-cert.jpg',
    title: 'Advanced Event Management Certification',
    description: 'Events Australia Professional Development Program — Advanced Certification',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

async function generateAndUpload(userId, imgDef) {
  console.log(`  🎨  Generating: ${imgDef.title}...`)
  let imageUrl
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imgDef.prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    })
    imageUrl = response.data[0].url
  } catch (err) {
    console.error(`     ⚠️  DALL-E failed for "${imgDef.title}":`, err.message)
    // Fallback to a relevant Unsplash image
    imageUrl = `https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1024&h=1024&fit=crop&auto=format&q=80`
  }

  // Download image
  const fetchRes = await fetch(imageUrl)
  if (!fetchRes.ok) throw new Error(`Failed to download image: ${fetchRes.status}`)
  const arrayBuffer = await fetchRes.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Upload to Supabase storage
  const storagePath = `${userId}/image/${uuidv4()}-${imgDef.filename}`
  const { error: uploadErr } = await supabase.storage
    .from('talent-bank')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true })

  if (uploadErr) {
    console.error(`     ⚠️  Storage upload failed for "${imgDef.title}":`, uploadErr.message)
    return null
  }

  console.log(`     ✅  Uploaded: ${storagePath}`)
  return storagePath
}

async function insertBankItem(userId, item) {
  const { data, error } = await supabase
    .from('talent_bank_items')
    .insert({ ...item, user_id: userId })
    .select('id')
    .single()
  if (error) {
    console.error(`  ⚠️  Bank item insert error (${item.title}):`, error.message)
    return null
  }
  return data.id
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Building complete demo Portfolio for Jordan Riley...\n')

  // Get the demo user
  const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 500 })
  const user = userList?.users?.find(u => u.email === DEMO_EMAIL)
  if (!user) {
    console.error('❌  Demo user not found. Run seed-demo-talent.js first.')
    process.exit(1)
  }
  const userId = user.id
  console.log(`✅  Found user: ${userId}\n`)

  // Remove old portfolio item(s) for a clean re-seed
  await supabase.from('talent_bank_items').delete().eq('user_id', userId).eq('item_type', 'portfolio')
  console.log('🗑️   Cleared old portfolio items\n')

  // ── Step 1: Load previously uploaded image paths from bank items ───────────
  // (Images already uploaded — read existing bank items to get their IDs & paths)
  const { data: existingImages } = await supabase
    .from('talent_bank_items')
    .select('id, title, file_path')
    .eq('user_id', userId)
    .eq('item_type', 'image')
    .order('id', { ascending: true })

  const skipGeneration = existingImages && existingImages.length >= IMAGES_TO_GENERATE.length

  let uploadedPaths = {}
  if (skipGeneration) {
    console.log(`📸  Found ${existingImages.length} existing images — skipping generation.\n`)
    // Map by filename suffix
    for (const imgDef of IMAGES_TO_GENERATE) {
      const match = existingImages.find(e => e.file_path && e.file_path.includes(imgDef.filename.split('.')[0]))
      uploadedPaths[imgDef.key] = match?.file_path ?? null
    }
  } else {
    console.log('📸  Generating & uploading images (this takes ~2 min)...')
    for (const imgDef of IMAGES_TO_GENERATE) {
      uploadedPaths[imgDef.key] = await generateAndUpload(userId, imgDef)
      await new Promise(r => setTimeout(r, 800))
    }
    console.log('\n')
  }

  // ── Step 2: Reuse or create talent_bank_items for images ────────────────────

  // Helper: find existing bank item by path fragment, or insert new one
  async function getOrInsertImageItem(userId, imgDef, storagePath) {
    if (!storagePath) return null
    // Check if already exists
    if (existingImages) {
      const match = existingImages.find(e => e.file_path === storagePath)
      if (match) {
        console.log(`  ♻️   Reusing existing bank item: ${imgDef.title} → id ${match.id}`)
        return match.id
      }
    }
    return insertBankItem(userId, {
      item_type: 'image',
      title: imgDef.title,
      description: imgDef.description,
      file_path: storagePath,
      file_type: 'image/jpeg',
    })
  }

  const communityImageIds = []
  const communityDescriptions = {}
  const communityKeys = ['community_1', 'community_2', 'community_3', 'community_4']
  for (const imgDef of IMAGES_TO_GENERATE.filter(d => communityKeys.includes(d.key))) {
    const path = uploadedPaths[imgDef.key]
    if (!path) continue
    const id = await getOrInsertImageItem(userId, imgDef, path)
    if (id) {
      communityImageIds.push(id)
      communityDescriptions[id] = imgDef.description
      console.log(`✅  Community image: ${imgDef.title} → id ${id}`)
    }
  }

  const fintechDef = IMAGES_TO_GENERATE.find(d => d.key === 'project_fintech')
  const fintechImgId = await getOrInsertImageItem(userId, fintechDef, uploadedPaths['project_fintech'])
  if (fintechImgId) console.log(`✅  Project image: Fintech Summit → id ${fintechImgId}`)

  const galaDef = IMAGES_TO_GENERATE.find(d => d.key === 'project_gala')
  const galaImgId = await getOrInsertImageItem(userId, galaDef, uploadedPaths['project_gala'])
  if (galaImgId) console.log(`✅  Project image: Gala Dinner → id ${galaImgId}`)

  const rsaDef = IMAGES_TO_GENERATE.find(d => d.key === 'cert_rsa')
  const rsaId = await getOrInsertImageItem(userId, rsaDef, uploadedPaths['cert_rsa'])
  if (rsaId) console.log(`✅  Licence image: RSA Certificate → id ${rsaId}`)

  const firstAidDef = IMAGES_TO_GENERATE.find(d => d.key === 'cert_firstaid')
  const firstAidId = await getOrInsertImageItem(userId, firstAidDef, uploadedPaths['cert_firstaid'])
  if (firstAidId) console.log(`✅  Licence image: First Aid Certificate → id ${firstAidId}`)

  const eventsDef = IMAGES_TO_GENERATE.find(d => d.key === 'cert_events')
  const eventsCredId = await getOrInsertImageItem(userId, eventsDef, uploadedPaths['cert_events'])
  if (eventsCredId) console.log(`✅  Credential image: Events Cert → id ${eventsCredId}`)

  console.log('\n')

  // ── Step 3: Build the portfolio metadata object ─────────────────────────────

  // Build attachments array (all bank items we created)
  const attachments = []
  const allImageItems = [
    fintechImgId && { id: fintechImgId, title: 'Sydney Fintech Summit 2023', file_path: uploadedPaths['project_fintech'] },
    galaImgId && { id: galaImgId, title: 'Gala Dinner Series', file_path: uploadedPaths['project_gala'] },
    rsaId && { id: rsaId, title: 'RSA Certificate', file_path: uploadedPaths['cert_rsa'] },
    firstAidId && { id: firstAidId, title: 'First Aid Certificate', file_path: uploadedPaths['cert_firstaid'] },
    eventsCredId && { id: eventsCredId, title: 'Advanced Event Management Cert', file_path: uploadedPaths['cert_events'] },
  ].filter(Boolean)

  for (const item of allImageItems) {
    attachments.push({
      id: item.id,
      title: item.title,
      item_type: 'image',
      file_path: item.file_path,
      file_type: 'image/jpeg',
      url: null,
    })
  }
  for (const id of communityImageIds) {
    const imgDef = IMAGES_TO_GENERATE.find(d => communityKeys.includes(d.key))
    attachments.push({
      id,
      title: communityDescriptions[id]?.split('—')[0]?.trim() ?? 'Community Image',
      item_type: 'image',
      file_path: uploadedPaths[communityKeys[communityImageIds.indexOf(id)]] ?? null,
      file_type: 'image/jpeg',
      url: null,
    })
  }

  const portfolioMetadata = {
    // ── Basic info ──────────────────────────────────────────────────────────
    name: 'Jordan Riley',
    title: 'Senior Event & Hospitality Manager',
    bio: `Dynamic hospitality and events professional with 8+ years of experience designing and delivering memorable guest experiences across luxury hotels, corporate events, and festival productions. I specialise in end-to-end event coordination, team leadership, and creating seamless hospitality operations that consistently exceed client expectations.\n\nPassionate about people-first service culture, I bring a calm under-pressure demeanour paired with sharp organisational skills. Whether managing a 500-person gala or coaching front-of-house teams, I thrive on turning visions into flawlessly executed realities.\n\nCurrently seeking senior roles in events management, hotel operations, or guest experience within innovative hospitality brands in Sydney or nationally.`,

    // ── Images (external Unsplash URLs — visible without storage auth) ──────
    avatar_path:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face&auto=format',
    banner_path:
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&h=400&fit=crop&auto=format',

    // ── Template ────────────────────────────────────────────────────────────
    selected_template_id: 'event-planner',

    // ── Section order & visibility ──────────────────────────────────────────
    sectionOrder: [
      'intro',
      'social',
      'skills',
      'experience',
      'education',
      'referees',
      'projects',
      'licences_accreditations',
      'personal_documents',
      'family_community',
      'attachments',
    ],
    sectionVisibility: {
      intro: true,
      social: true,
      skills: true,
      experience: true,
      education: true,
      referees: true,
      projects: true,
      licences_accreditations: true,
      personal_documents: true,
      family_community: true,
      attachments: true,
    },

    // ── Intro video (YouTube — Vivid Sydney event highlights as stand-in) ───
    introVideoId: null, // No video bank item; use YouTube via social link instead

    // ── Social links ─────────────────────────────────────────────────────────
    socialLinks: [
      { platform: 'LinkedIn', url: 'https://linkedin.com/in/jordan-riley-events' },
      { platform: 'Instagram', url: 'https://instagram.com/jordanriley.events' },
      { platform: 'Website', url: 'https://jordanrileyevents.com.au' },
    ],

    // ── Skills ───────────────────────────────────────────────────────────────
    skills: [
      'Event Planning & Coordination',
      'Venue & Vendor Management',
      'Budget Management',
      'Team Leadership & Mentoring',
      'Guest Experience Design',
      'Stakeholder Communication',
      'Front-of-House Operations',
      'CRM & Booking Systems',
      'Catering & Menu Planning',
      'Risk & Compliance Management',
      'Social Media & Event Marketing',
      'Corporate & Gala Events',
      'Conference & Convention Management',
      'AV & Technical Production Liaison',
    ],

    // ── Experience ───────────────────────────────────────────────────────────
    experience: [
      {
        company: 'Ovation Group Events',
        title: 'Senior Events Manager',
        startDate: 'March 2021',
        endDate: 'Present',
        description:
          'Led end-to-end delivery of 80+ corporate and social events per year including galas, product launches, and multi-day conferences for clients such as Deloitte, Atlassian, and NSW Government. Managed a team of 12 event coordinators and casual staff, overseeing scheduling, briefing, and post-event review. Delivered consistent NPS scores above 90 and reduced average event cost overrun from 18% to 4% through tighter supplier negotiations and a new vendor onboarding process.',
      },
      {
        company: 'Hyatt Regency Sydney',
        title: 'Event & Catering Coordinator',
        startDate: 'June 2018',
        endDate: 'February 2021',
        description:
          'Coordinated weddings, corporate functions, and social events for a 5-star Darling Harbour hotel with a ballroom capacity of 350. Managed all catering logistics including menu design with the executive chef, dietary accommodations, and AV requirements. Handled day-of production for 120+ events annually with a perfect delivery record. Promoted from coordinator to senior coordinator within 14 months.',
      },
      {
        company: 'Quay Restaurant',
        title: 'Front-of-House Supervisor',
        startDate: 'January 2016',
        endDate: 'May 2018',
        description:
          'Supervised FOH operations for a high-volume fine-dining restaurant (130 covers, 7 nights). Trained and mentored 20 wait staff, managed reservation system (OpenTable), and maintained Tripadvisor #8 ranking for Sydney CBD. Introduced service standards playbook that cut onboarding time from 3 weeks to 10 days and reduced staff turnover by 22%.',
      },
      {
        company: 'Various Sydney Venues',
        title: 'Casual Events & Hospitality Assistant',
        startDate: 'February 2013',
        endDate: 'December 2015',
        description:
          'Worked across multiple venues including Doltone House, Luna Park Sydney, and the Sydney Opera House during study. Gained broad experience in setup, bump-in/out, bar service, and guest relations across weddings, corporate events, and public performances.',
      },
    ],

    // ── Education ────────────────────────────────────────────────────────────
    education: [
      {
        institution: 'William Blue College of Hospitality Management',
        degree: 'Bachelor of Event Management',
        field: 'Event Management & Hospitality',
        year: '2015',
        attachmentIds: eventsCredId ? [eventsCredId] : [],
      },
      {
        institution: 'TAFE NSW',
        degree: 'Certificate IV in Hospitality Management',
        field: 'Hospitality Management',
        year: '2013',
        attachmentIds: [],
      },
    ],

    // ── Referees ─────────────────────────────────────────────────────────────
    referees: [
      {
        name: 'Marcus Chen',
        relationship: 'Direct Manager',
        company: 'Ovation Group Events',
        title: 'General Manager — Events',
        email: 'marcus.chen@ovationgroup.com.au',
        phone: '+61 2 9876 5432',
        notes:
          'Jordan has been one of the most dependable and creative event managers I have worked with in 15 years in this industry. Her ability to manage complex multi-day conferences while maintaining the warmth and attention to detail that clients love is exceptional. I recommend her without reservation for any senior events or hospitality leadership role.',
        attachmentIds: [],
      },
      {
        name: 'Priya Nair',
        relationship: 'Former Manager',
        company: 'Hyatt Regency Sydney',
        title: 'Director of Events & Catering',
        email: 'p.nair@hyattregency.com.au',
        phone: '+61 2 9234 1234',
        notes:
          'Jordan joined us as a junior coordinator and within 14 months we promoted her. She has an instinct for anticipating client needs and an extraordinary ability to remain composed under the pressure of live events. Her catering and F&B knowledge is particularly strong. Any hotel or events business would be lucky to have her.',
        attachmentIds: [],
      },
      {
        name: 'Sarah Okafor',
        relationship: 'Peer & Client',
        company: 'NSW Government — Events & Protocol',
        title: 'Senior Events Officer',
        email: 's.okafor@dpie.nsw.gov.au',
        phone: '+61 2 8765 4321',
        notes:
          'I have worked with Jordan on four major government events over the past two years. She is professional, thorough, and a genuine pleasure to work with. Her stakeholder communication and compliance management on government events — which require particular rigor — has been consistently excellent.',
        attachmentIds: [],
      },
    ],

    // ── Projects ─────────────────────────────────────────────────────────────
    projects: [
      {
        name: 'Sydney Fintech Summit 2023',
        description:
          'Full end-to-end production of a 600-delegate two-day fintech conference at the International Convention Centre Sydney. Scope included venue liaison, catering for 3 meal periods per day, AV and livestream production, speaker management, and sponsor fulfilment. Delivered $180K under original budget estimate with zero critical incidents. Post-event survey rated overall experience 4.8/5.',
        url: 'https://sydneyfintechsummit.com.au',
        attachmentIds: fintechImgId ? [fintechImgId] : [],
      },
      {
        name: 'Ovation Gala Dinner Series',
        description:
          'Designed and launched a recurring quarterly black-tie gala series for corporate clients. Created a replicable production playbook covering décor, entertainment sourcing, menu design, run-of-show scripting, and photography briefing. The series generates $2.1M in annual revenue for Ovation Group and was featured in Spice Magazine as an example of innovative recurring event formats.',
        url: '',
        attachmentIds: galaImgId ? [galaImgId] : [],
      },
      {
        name: 'Vivid Sydney Hospitality Hub 2019',
        description:
          'Coordinated the hospitality operations for the Circular Quay activation zone during Vivid Sydney: bar service, pop-up food vendors, guest flow management. Managed 45 volunteers across the 10-day festival, liaising with Destination NSW, City of Sydney, and 6 F&B operators to maintain smooth guest experience for 120,000+ visitors with zero critical safety incidents.',
        url: 'https://vividsydney.com',
        attachmentIds: [],
      },
    ],

    // ── Licences & Accreditations ─────────────────────────────────────────────
    licences_accreditations: [
      {
        title: 'Responsible Service of Alcohol (RSA)',
        description: 'NSW Food Authority — approved RSA certification for hospitality professionals',
        issuer: 'NSW Food Authority',
        issueDate: '2022-03',
        expiryDate: '2025-03',
        attachmentIds: rsaId ? [rsaId] : [],
      },
      {
        title: 'Provide First Aid (HLTAID011)',
        description: 'St John Ambulance Australia — current first aid certification',
        issuer: 'St John Ambulance Australia',
        issueDate: '2024-01',
        expiryDate: '2027-01',
        attachmentIds: firstAidId ? [firstAidId] : [],
      },
      {
        title: 'Advanced Event Management Certification',
        description: 'Events Australia Professional Development Program — Advanced Level',
        issuer: 'Events Australia',
        issueDate: '2020-06',
        expiryDate: null,
        attachmentIds: eventsCredId ? [eventsCredId] : [],
      },
    ],

    // ── Personal Documents ────────────────────────────────────────────────────
    personal_documents: [
      {
        title: 'Professional CV — Jordan Riley',
        description:
          'Full curriculum vitae covering all experience, education, skills, and professional references. Available on request in PDF format.',
        attachmentIds: [],
      },
      {
        title: 'Cover Letter — Senior Events Roles',
        description:
          'Tailored cover letter for senior event management and hospitality leadership roles across Sydney and nationally. Highlights leadership, client management, and budget track record.',
        attachmentIds: [],
      },
    ],

    // ── Family & Community ────────────────────────────────────────────────────
    family_community: {
      imageIds: communityImageIds,
      descriptions: communityDescriptions,
    },

    // ── Attachments (flat list of all bank item references) ──────────────────
    attachments,
  }

  // ── Step 4: Insert the portfolio item ──────────────────────────────────────
  const { data: portfolioData, error: portfolioErr } = await supabase
    .from('talent_bank_items')
    .insert({
      user_id: userId,
      item_type: 'portfolio',
      title: 'Portfolio',
      metadata: portfolioMetadata,
    })
    .select('id')
    .single()

  if (portfolioErr) {
    console.error('❌  Portfolio insert failed:', portfolioErr.message)
    process.exit(1)
  }

  console.log(`✅  Portfolio item inserted (id: ${portfolioData.id})`)
  console.log('\n🎉  Complete portfolio seeded!\n')
  console.log('  Sections populated:')
  console.log('    ✅  Bio & intro')
  console.log('    ✅  Social links (LinkedIn, Instagram, Website)')
  console.log('    ✅  14 skills')
  console.log('    ✅  4 experience entries')
  console.log('    ✅  2 education entries')
  console.log('    ✅  3 referees with detailed notes')
  console.log('    ✅  3 projects with images')
  console.log('    ✅  3 licences & accreditations with certificate images')
  console.log('    ✅  2 personal documents')
  console.log(`    ✅  ${communityImageIds.length} family/community photos`)
  console.log(`    ✅  ${attachments.length} total attachments`)
  console.log('\n  Sign in at /login/talent to view the portfolio.')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
