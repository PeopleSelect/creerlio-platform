/**
 * Seed script: creates a complete NSW Real Estate Agent demo profile + portfolio
 * Alex Hartley — Senior Sales Agent & Auctioneer, Ray White Eastern Suburbs
 * Run from /frontend:  node scripts/seed-demo-realestate.js
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

const DEMO_EMAIL = 'demo.realestate@creerlio.com'
const DEMO_PASSWORD = 'DemoRealEstate2025!'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// ── DALL-E image definitions ──────────────────────────────────────────────────

const IMAGES_TO_GENERATE = [
  {
    key: 'avatar',
    prompt:
      'Professional corporate headshot portrait of a confident Australian man in his early 40s, wearing a tailored dark navy suit and white shirt, warm smile, clean white studio background, sharp focus, photorealistic, high quality',
    filename: 'alex-hartley-headshot.jpg',
    title: 'Alex Hartley — Professional Headshot',
  },
  {
    key: 'banner',
    prompt:
      'Stunning aerial photography of the Sydney Eastern Suburbs coastline at golden hour, luxury waterfront homes visible, Bondi Beach and Double Bay in background, clear blue sky, professional real estate photography style',
    filename: 'eastern-suburbs-banner.jpg',
    title: 'Sydney Eastern Suburbs Banner',
  },
  {
    key: 'project_ocean_ave',
    prompt:
      'Luxurious modern Australian residential home exterior, white rendered facade, landscaped garden with native plants, double garage, dappled afternoon sunlight, professional real estate photography, wide angle shot',
    filename: 'ocean-avenue-double-bay.jpg',
    title: '42 Ocean Avenue, Double Bay',
    description: 'Sold $4.275M — 42 Ocean Avenue Double Bay. Pre-auction campaign, 147 inspections, 8 registered bidders.',
  },
  {
    key: 'project_bronte',
    prompt:
      'Modern coastal apartment building in Sydney, light render exterior, rooftop terrace visible, palm trees, sunny beachside suburb, professional real estate marketing photography',
    filename: 'bronte-road-apartment.jpg',
    title: '7/14 Bronte Road, Bronte',
    description: 'Sold at Auction $1.92M — 7/14 Bronte Road Bronte. 12 registered bidders, sold $120K above reserve.',
  },
  {
    key: 'project_paddington',
    prompt:
      'Beautiful Victorian terrace house in Sydney, ornate iron lacework balcony, freshly painted white and charcoal, sandstone steps, leafy street, golden afternoon light, professional real estate photography',
    filename: 'victoria-street-paddington.jpg',
    title: '23 Victoria Street, Paddington',
    description: 'Sold $3.15M — 23 Victoria Street Paddington. Off-market transaction within 18 days of listing.',
  },
  {
    key: 'auction_action',
    prompt:
      'A professional real estate auction in progress outdoors in front of a beautiful Sydney home, suited auctioneer at podium, crowd of bidders, "SOLD" sign visible, sunny day, photorealistic event photography',
    filename: 'auction-in-action.jpg',
    title: 'Live Auction — Double Bay 2024',
    description: 'Conducting an on-site auction — one of 60+ auctions called in 2024.',
  },
  {
    key: 'community_school',
    prompt:
      'Smiling professional man in a navy suit presenting a large cheque donation to a school principal and students at a primary school fete, colourful banners, sunny school grounds, photorealistic candid photo',
    filename: 'school-sponsorship.jpg',
    title: 'Woollahra Public School Fete Sponsor',
    description: 'Proud sponsor of the Woollahra Public School annual fete for the third year running — raising funds for new library resources.',
  },
  {
    key: 'community_surf',
    prompt:
      'A group of people including a suited professional man participating in a charity beach cleanup on a Sydney beach, smiling volunteers holding bags of rubbish, surf club in background, sunny day, candid photorealistic photo',
    filename: 'surf-lifesaving-charity.jpg',
    title: 'Bondi Surf Lifesaving Charity Auction',
    description: 'Volunteered as auctioneer for the Bondi SLSC annual charity gala, raising $38,000 for surf safety programs.',
  },
  {
    key: 'community_awards',
    prompt:
      'A professional networking awards night at a Sydney hotel ballroom, suited guests at round tables, stage with award podium, warm elegant lighting, photorealistic event photography',
    filename: 'eastern-suburbs-business-awards.jpg',
    title: 'Eastern Suburbs Business Excellence Awards',
    description: 'Table sponsor and presenter at the 2024 Eastern Suburbs Business Excellence Awards — celebrating local business achievement.',
  },
  {
    key: 'cert_licence',
    prompt:
      'A professional NSW government certificate document on cream paper with official NSW government logo and gold seal, text reads "Class 1 Real Estate Agent Licence" issued to "Alex Hartley", clean professional typography, flat lay photography on white desk',
    filename: 'class1-licence.jpg',
    title: 'Class 1 Real Estate Licence — NSW Fair Trading',
    description: 'Class 1 Real Estate Licence (Unrestricted) — NSW Fair Trading',
  },
  {
    key: 'cert_auctioneer',
    prompt:
      'A professional NSW government auctioneer licence certificate on cream paper with official seal, text reads "Auctioneer Licence" issued to "Alex Hartley", professional typography, flat lay photography on white marble surface',
    filename: 'auctioneer-licence.jpg',
    title: 'Auctioneer Licence — NSW Fair Trading',
    description: 'Auctioneer Licence — NSW Fair Trading (unrestricted)',
  },
  {
    key: 'cert_cpd',
    prompt:
      'A clean professional continuing professional development certificate on white background, reads "Certificate of Completion — CPD Real Estate 2024" with REIA logo, professional typography, flat lay photography',
    filename: 'cpd-certificate-2024.jpg',
    title: 'CPD Certificate 2024 — REIA',
    description: 'Continuing Professional Development Certificate — Real Estate Institute of Australia, 2024',
  },
]

// ── Talent Profile data ───────────────────────────────────────────────────────

const PROFILE = {
  name: 'Alex Hartley',
  title: 'Senior Sales Agent & Licensed Auctioneer',
  headline: 'Eastern Suburbs Specialist • Auctions • Residential Sales • 12 Years Experience',
  bio: `Award-winning NSW real estate agent with over 12 years of residential sales experience across Sydney's Eastern Suburbs, Inner West, and Lower North Shore. I hold a Class 1 Real Estate Licence and Auctioneer's Licence, and have personally managed over 600 property transactions totalling more than $1.2 billion in settled sales.\n\nI specialise in high-end residential sales, off-market campaigns, and on-site auctions — combining sharp market analysis with exceptional client communication to consistently achieve premium results for vendors. My approach is transparent, strategic, and always centred on my clients' goals.\n\nCurrently based with Ray White Eastern Suburbs, where I have been the top-performing agent for three consecutive years. I bring deep local knowledge, a large qualified buyer database, and a track record of outperforming suburb medians by an average of 8.4%.`,
  skills: [
    'Residential Sales & Auctions',
    'Property Valuation & Appraisal',
    'Negotiation & Offer Management',
    'Auction Calling & Management',
    'Vendor Communication & Reporting',
    'Buyer Qualification & Database Management',
    'Off-Market Campaign Strategy',
    'Marketing & Digital Advertising',
    'Contract Preparation & Management',
    'Market Research & CMA Reports',
    'CRM Systems (Rex, Agentbox)',
    'Property Styling & Photography Liaison',
    'Strata & Community Title Knowledge',
    'Investment Property Guidance',
  ],
  location: 'Double Bay, NSW, Australia',
  city: 'Double Bay',
  state: 'NSW',
  country: 'Australia',
  latitude: -33.8776,
  longitude: 151.2449,
  phone: '+61 411 876 543',
  search_visible: true,
  search_summary:
    '12+ years NSW real estate. Senior Sales Agent & Auctioneer — 600+ transactions, $1.2B+ in sales. Ray White Eastern Suburbs top performer 2022–2024. Class 1 Licence + Auctioneer. Available for senior agency and principal roles.',
  availability_description:
    'Open to principal, sales director, and senior agent opportunities. Available for the right role — 4 weeks notice required. Open to Eastern Suburbs, Inner East, and Lower North Shore agencies.',
  avatar_url:
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face&auto=format',
  banner_url:
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop&auto=format',
  visible_sections: ['intro', 'skills', 'experience', 'education', 'projects', 'social'],
  selected_template_id: 5,
  experience_years: 12,
  is_active: true,
}

// ── Portfolio sections (raw data — images filled in after upload) ─────────────

const EXPERIENCE = [
  {
    company: 'Ray White Eastern Suburbs',
    title: 'Senior Sales Agent & Auctioneer',
    startDate: 'January 2020',
    endDate: 'Present',
    description:
      'Top-performing agent for three consecutive years (2022, 2023, 2024). Manage a personal portfolio of 60–80 active listings per year with an average days-on-market of 22. Conduct 60+ on-site auctions annually across the Eastern Suburbs and Inner West. Key achievements: $312M in settled sales in 2023 alone; average vendor premium 8.4% above suburb median; cleared auction rate of 81% (vs. industry average 68%).',
  },
  {
    company: 'LJ Hooker Bondi Junction',
    title: 'Licensed Sales Agent',
    startDate: 'March 2016',
    endDate: 'December 2019',
    description:
      'Managed residential sales across Bondi, Bondi Beach, Bronte, and Randwick. Consistently in the top 3 agents in the office. Obtained Auctioneer\'s Licence in 2017 and began calling auctions for the team. Achieved $94M in settled sales in final year. Developed strong off-market buyer database, responsible for 18% of sales transacting without a public marketing campaign.',
  },
  {
    company: 'McGrath Estate Agents Inner West',
    title: 'Property Manager → Sales Associate',
    startDate: 'February 2013',
    endDate: 'February 2016',
    description:
      'Started in property management (45-property portfolio), managing leasing, maintenance, rent reviews, and tenant relations. Transitioned to residential sales in 2014 after completing Class 1 Licence. Mentored by principal and completed 3 years of structured sales training including negotiation, auction, and CMA methodology. Settled 34 properties in first year as licensed agent.',
  },
  {
    company: 'Various — Hospitality & Customer Service',
    title: 'Customer Service & Administration',
    startDate: 'January 2010',
    endDate: 'January 2013',
    description:
      'Worked in customer-facing roles while studying, building strong communication and client management foundations. Completed property-related work experience with a Sydney buyers\' agent during this period, which led to the transition into real estate.',
  },
]

const EDUCATION = [
  {
    institution: 'University of Technology Sydney',
    degree: 'Bachelor of Business',
    field: 'Property Economics',
    year: '2012',
  },
  {
    institution: 'NSW Fair Trading',
    degree: 'Certificate of Registration — Real Estate',
    field: 'Real Estate Practice',
    year: '2013',
  },
  {
    institution: 'NSW Fair Trading',
    degree: 'Class 1 Real Estate Agent Licence',
    field: 'Real Estate (Unrestricted)',
    year: '2015',
  },
]

const REFEREES = [
  {
    name: 'Catherine O\'Brien',
    relationship: 'Direct Manager / Principal',
    company: 'Ray White Eastern Suburbs',
    title: 'Principal & Licensee-in-Charge',
    email: 'catherine.obrien@raywhite.com',
    phone: '+61 2 9327 8800',
    notes:
      'Alex is without doubt the most complete agent I have worked with in 20 years running this office. His preparation is meticulous, his vendor communication is exemplary, and his auction results consistently outperform the market. He has been our top performer for three years and is ready for a principal role. I recommend him without any reservation.',
  },
  {
    name: 'David & Fiona Whitmore',
    relationship: 'Vendor Client',
    company: 'Private — 42 Ocean Avenue, Double Bay',
    title: 'Vendors',
    email: 'dfwhitmore@gmail.com',
    phone: '+61 412 345 111',
    notes:
      'We sold our family home of 18 years with Alex. It was an emotional and high-stakes process and he handled every step with professionalism, honesty, and genuine care. He achieved $275,000 above our original price expectation through a competitive auction campaign. We cannot recommend Alex highly enough — and have already referred three friends and colleagues to him.',
  },
  {
    name: 'James Papadopoulos',
    relationship: 'Buyer Client & Repeat Customer',
    company: 'Private Investor — Sydney Eastern Suburbs',
    title: 'Property Investor',
    email: 'j.papadopoulos.invest@gmail.com',
    phone: '+61 414 789 321',
    notes:
      'I have purchased three properties through Alex over five years. He is rare in that he treats buyers as seriously as vendors — he listens, understands your brief, and does not waste your time. His off-market network is genuinely the best I have encountered and I trust his market appraisals completely. He is the only agent I will use for my future acquisitions.',
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
    imageUrl = `https://images.unsplash.com/photo-1560250097-0b93528c311a?w=1024&h=1024&fit=crop&auto=format`
  }

  const fetchRes = await fetch(imageUrl)
  if (!fetchRes.ok) throw new Error(`Failed to download image: ${fetchRes.status}`)
  const buffer = Buffer.from(await fetchRes.arrayBuffer())

  const storagePath = `${userId}/image/${uuidv4()}-${imgDef.filename}`
  const { error: uploadErr } = await supabase.storage
    .from('talent-bank')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true })

  if (uploadErr) {
    console.error(`     ⚠️  Upload failed for "${imgDef.title}":`, uploadErr.message)
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
    console.error(`  ⚠️  Bank item error (${item.title}):`, error.message)
    return null
  }
  return data.id
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding NSW Real Estate Agent demo (Alex Hartley)...\n')

  // ── Auth user ─────────────────────────────────────────────────────────────
  let userId
  const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 500 })
  const existing = userList?.users?.find(u => u.email === DEMO_EMAIL)

  if (existing) {
    userId = existing.id
    console.log(`✅  Auth user exists: ${userId}`)
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { user_type: 'talent', name: PROFILE.name },
    })
    if (createErr) { console.error('❌  Create user failed:', createErr.message); process.exit(1) }
    userId = created.user.id
    console.log(`✅  Created auth user: ${userId}`)
  }

  // ── Talent profile ────────────────────────────────────────────────────────
  const { error: profileErr } = await supabase
    .from('talent_profiles')
    .upsert({ ...PROFILE, id: userId, user_id: userId, email: DEMO_EMAIL, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (profileErr) { console.error('❌  Profile upsert failed:', profileErr.message); process.exit(1) }
  console.log('✅  talent_profiles upserted')

  const { data: profileRow } = await supabase.from('talent_profiles').select('id').eq('user_id', userId).single()
  const profileId = profileRow.id
  console.log(`   Profile id: ${profileId}\n`)

  // ── Clear previous bank items ─────────────────────────────────────────────
  await supabase.from('talent_bank_items').delete().eq('user_id', userId)
  console.log('🗑️   Cleared old bank items\n')

  // ── Generate & upload images ──────────────────────────────────────────────
  console.log('📸  Generating & uploading DALL-E images (this takes ~3 min)...')
  const paths = {}
  for (const imgDef of IMAGES_TO_GENERATE) {
    paths[imgDef.key] = await generateAndUpload(userId, imgDef)
    await new Promise(r => setTimeout(r, 800))
  }
  console.log('\n')

  // ── Update profile with AI-generated avatar & banner ─────────────────────
  const avatarPath = paths['avatar']
  const bannerPath = paths['banner']
  if (avatarPath || bannerPath) {
    const avatarPublicUrl = avatarPath
      ? `${SUPABASE_URL}/storage/v1/object/public/talent-bank/${avatarPath}`
      : PROFILE.avatar_url
    const bannerPublicUrl = bannerPath
      ? `${SUPABASE_URL}/storage/v1/object/public/talent-bank/${bannerPath}`
      : PROFILE.banner_url

    await supabase.from('talent_profiles').update({
      avatar_url: avatarPublicUrl,
      banner_url: bannerPublicUrl,
    }).eq('user_id', userId)
    console.log('✅  Profile avatar & banner updated with AI-generated images')
  }

  // ── Create basic talent_bank_items (experience, education, social) ────────
  for (const item of EXPERIENCE) {
    await insertBankItem(userId, {
      item_type: 'experience',
      title: item.title,
      description: item.description,
      metadata: {
        company: item.company,
        start_date: item.startDate,
        end_date: item.endDate === 'Present' ? null : item.endDate,
        is_current: item.endDate === 'Present',
        employment_type: 'Full-time',
        location: 'Sydney, NSW',
      },
    })
    console.log(`✅  Experience: ${item.title}`)
  }

  for (const item of EDUCATION) {
    await insertBankItem(userId, {
      item_type: 'education',
      title: item.degree,
      description: `${item.field} — ${item.institution} (${item.year})`,
      metadata: {
        institution: item.institution,
        degree: item.degree,
        field_of_study: item.field,
        year_completed: item.year,
      },
    })
    console.log(`✅  Education: ${item.degree}`)
  }

  // ── Create image bank items ───────────────────────────────────────────────
  const projectImgDefs = {
    project_ocean_ave: IMAGES_TO_GENERATE.find(d => d.key === 'project_ocean_ave'),
    project_bronte:    IMAGES_TO_GENERATE.find(d => d.key === 'project_bronte'),
    project_paddington: IMAGES_TO_GENERATE.find(d => d.key === 'project_paddington'),
    auction_action:    IMAGES_TO_GENERATE.find(d => d.key === 'auction_action'),
  }

  const imgIds = {}
  for (const [key, imgDef] of Object.entries(projectImgDefs)) {
    if (!paths[key] || !imgDef) continue
    const id = await insertBankItem(userId, {
      item_type: 'image',
      title: imgDef.title,
      description: imgDef.description,
      file_path: paths[key],
      file_type: 'image/jpeg',
    })
    imgIds[key] = id
    console.log(`✅  Image item: ${imgDef.title} → id ${id}`)
  }

  const certDefs = {
    cert_licence:    IMAGES_TO_GENERATE.find(d => d.key === 'cert_licence'),
    cert_auctioneer: IMAGES_TO_GENERATE.find(d => d.key === 'cert_auctioneer'),
    cert_cpd:        IMAGES_TO_GENERATE.find(d => d.key === 'cert_cpd'),
  }
  const certIds = {}
  for (const [key, imgDef] of Object.entries(certDefs)) {
    if (!paths[key] || !imgDef) continue
    const id = await insertBankItem(userId, {
      item_type: 'image',
      title: imgDef.title,
      description: imgDef.description,
      file_path: paths[key],
      file_type: 'image/jpeg',
    })
    certIds[key] = id
    console.log(`✅  Cert image: ${imgDef.title} → id ${id}`)
  }

  const communityKeys = ['community_school', 'community_surf', 'community_awards']
  const communityImageIds = []
  const communityDescriptions = {}
  for (const key of communityKeys) {
    const imgDef = IMAGES_TO_GENERATE.find(d => d.key === key)
    if (!paths[key] || !imgDef) continue
    const id = await insertBankItem(userId, {
      item_type: 'image',
      title: imgDef.title,
      description: imgDef.description,
      file_path: paths[key],
      file_type: 'image/jpeg',
    })
    if (id) {
      communityImageIds.push(id)
      communityDescriptions[id] = imgDef.description
      console.log(`✅  Community image: ${imgDef.title} → id ${id}`)
    }
  }

  console.log('\n')

  // ── Build portfolio metadata ──────────────────────────────────────────────

  const avatarPortfolioPath = paths['avatar']
    ? `${SUPABASE_URL}/storage/v1/object/public/talent-bank/${paths['avatar']}`
    : PROFILE.avatar_url
  const bannerPortfolioPath = paths['banner']
    ? `${SUPABASE_URL}/storage/v1/object/public/talent-bank/${paths['banner']}`
    : PROFILE.banner_url

  const allAttachments = []
  const addAttachment = (id, title, filePath) => {
    if (!id) return
    allAttachments.push({ id, title, item_type: 'image', file_path: filePath, file_type: 'image/jpeg', url: null })
  }
  addAttachment(imgIds['project_ocean_ave'], '42 Ocean Avenue, Double Bay', paths['project_ocean_ave'])
  addAttachment(imgIds['project_bronte'], '7/14 Bronte Road, Bronte', paths['project_bronte'])
  addAttachment(imgIds['project_paddington'], '23 Victoria Street, Paddington', paths['project_paddington'])
  addAttachment(imgIds['auction_action'], 'Live Auction — Double Bay 2024', paths['auction_action'])
  addAttachment(certIds['cert_licence'], 'Class 1 Real Estate Licence', paths['cert_licence'])
  addAttachment(certIds['cert_auctioneer'], "Auctioneer's Licence", paths['cert_auctioneer'])
  addAttachment(certIds['cert_cpd'], 'CPD Certificate 2024', paths['cert_cpd'])
  for (const id of communityImageIds) {
    const match = IMAGES_TO_GENERATE.find(d => communityKeys.includes(d.key) && paths[d.key] && communityImageIds.indexOf(id) === communityKeys.indexOf(d.key))
    addAttachment(id, communityDescriptions[id]?.split('—')[0]?.trim() ?? 'Community', paths[communityKeys[communityImageIds.indexOf(id)]] ?? null)
  }

  const portfolioMetadata = {
    name: 'Alex Hartley',
    title: 'Senior Sales Agent & Licensed Auctioneer',
    bio: `Award-winning NSW real estate agent with over 12 years of residential sales experience across Sydney's Eastern Suburbs, Inner West, and Lower North Shore. I hold a Class 1 Real Estate Licence and Auctioneer's Licence, and have personally managed over 600 property transactions totalling more than $1.2 billion in settled sales.\n\nI specialise in high-end residential sales, off-market campaigns, and on-site auctions — combining sharp market analysis with exceptional client communication to consistently achieve premium results for vendors. My approach is transparent, strategic, and always centred on my clients' goals.\n\nCurrently based with Ray White Eastern Suburbs, where I have been the top-performing agent for three consecutive years. I bring deep local knowledge, a large qualified buyer database, and a track record of outperforming suburb medians by an average of 8.4%.`,

    avatar_path: avatarPortfolioPath,
    banner_path: bannerPortfolioPath,

    selected_template_id: 'sales-professional',

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

    introVideoId: null,

    socialLinks: [
      { platform: 'LinkedIn', url: 'https://linkedin.com/in/alex-hartley-realestate' },
      { platform: 'Instagram', url: 'https://instagram.com/alexhartleyproperty' },
      { platform: 'Website', url: 'https://alexhartley.com.au' },
      { platform: 'Facebook', url: 'https://facebook.com/alexhartleyrealestate' },
    ],

    skills: PROFILE.skills,

    experience: EXPERIENCE.map(e => ({
      company: e.company,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      description: e.description,
    })),

    education: [
      {
        institution: 'University of Technology Sydney',
        degree: 'Bachelor of Business (Property Economics)',
        field: 'Property Economics',
        year: '2012',
        attachmentIds: [],
      },
      {
        institution: 'NSW Fair Trading',
        degree: 'Certificate of Registration — Real Estate',
        field: 'Real Estate Practice',
        year: '2013',
        attachmentIds: [],
      },
      {
        institution: 'NSW Fair Trading',
        degree: 'Class 1 Real Estate Agent Licence',
        field: 'Real Estate (Unrestricted)',
        year: '2015',
        attachmentIds: certIds['cert_licence'] ? [certIds['cert_licence']] : [],
      },
    ],

    referees: REFEREES.map(r => ({ ...r, attachmentIds: [] })),

    projects: [
      {
        name: '42 Ocean Avenue, Double Bay — $4.275M',
        description:
          'Landmark 5-bedroom family home in one of Double Bay\'s most tightly-held streets. Designed a 5-week digital + print campaign generating 147 inspections and 8 registered bidders. Sold under the hammer at $4.275M — $325,000 above vendor expectations and a new street record. Vendor feedback: "The process was seamless and the result was extraordinary."',
        url: '',
        attachmentIds: imgIds['project_ocean_ave'] ? [imgIds['project_ocean_ave']] : [],
      },
      {
        name: '7/14 Bronte Road, Bronte — $1.92M',
        description:
          'Stylishly renovated 3-bed/2-bath top-floor apartment with ocean glimpses. 12 registered bidders on auction day; opened at $1.5M and was called on the market at $1.7M. Sold at $1.92M — $120,000 above reserve and $210,000 above the vendor\'s initial expectation. Cleared in 21 days on market with 60 group inspections.',
        url: '',
        attachmentIds: imgIds['project_bronte'] ? [imgIds['project_bronte']] : [],
      },
      {
        name: '23 Victoria Street, Paddington — $3.15M',
        description:
          'Fully renovated 4-bedroom Victorian terrace in the heart of Paddington. Transacted off-market within 18 days of listing — matched to an existing qualified buyer from my database. Vendor saved on advertising costs while achieving a premium outcome. One of 14 off-market transactions I facilitated in 2023.',
        url: '',
        attachmentIds: imgIds['project_paddington'] ? [imgIds['project_paddington']] : [],
      },
      {
        name: '2024 Auction Results — 81% Clearance Rate',
        description:
          'Conducted 63 on-site auctions in 2024 across the Eastern Suburbs and Inner West. Achieved an 81% clearance rate (vs. 68% Sydney-wide average). Average days on market for auctioned properties: 19. Average vendor premium above comparable private treaty sales: 6.2%. REINSW Auctioneer of the Year finalist 2024.',
        url: '',
        attachmentIds: imgIds['auction_action'] ? [imgIds['auction_action']] : [],
      },
    ],

    licences_accreditations: [
      {
        title: 'Class 1 Real Estate Agent Licence (Unrestricted)',
        description: 'NSW Fair Trading — Class 1 Licence allowing operation as an agent and licensee-in-charge. Continuous holder since 2015.',
        issuer: 'NSW Fair Trading',
        issueDate: '2015-04',
        expiryDate: null,
        attachmentIds: certIds['cert_licence'] ? [certIds['cert_licence']] : [],
      },
      {
        title: "Auctioneer's Licence — NSW",
        description: 'NSW Fair Trading — Auctioneer Licence authorising the conduct of property auctions. Holder since 2017.',
        issuer: 'NSW Fair Trading',
        issueDate: '2017-08',
        expiryDate: null,
        attachmentIds: certIds['cert_auctioneer'] ? [certIds['cert_auctioneer']] : [],
      },
      {
        title: 'CPD Certificate — Real Estate 2024',
        description: 'Completed 12 hours of Continuing Professional Development as required under the Property and Stock Agents Act 2002.',
        issuer: 'Real Estate Institute of Australia (REIA)',
        issueDate: '2024-11',
        expiryDate: null,
        attachmentIds: certIds['cert_cpd'] ? [certIds['cert_cpd']] : [],
      },
      {
        title: 'REINSW Membership — Full Member',
        description: 'Full member of the Real Estate Institute of NSW. Access to industry resources, training, and the REINSW professional network.',
        issuer: 'Real Estate Institute of NSW (REINSW)',
        issueDate: '2015-01',
        expiryDate: null,
        attachmentIds: [],
      },
    ],

    personal_documents: [
      {
        title: 'Professional CV — Alex Hartley',
        description:
          '12-year career CV covering all experience, qualifications, licences, notable transactions, and professional references. Available as PDF on request.',
        attachmentIds: [],
      },
      {
        title: 'Sales Results Statement — 2023/2024',
        description:
          'Verified sales results statement for the 2023 and 2024 financial years, including individual transaction records, total settled volume, clearance rates, and vendor premium data. Available on request.',
        attachmentIds: [],
      },
      {
        title: 'Marketing Portfolio & Case Studies',
        description:
          'Collection of 12 property marketing case studies showing campaign strategy, digital reach metrics, and outcome vs. expectation for each. Demonstrates full-service marketing capability across different property types and price points.',
        attachmentIds: [],
      },
    ],

    family_community: {
      imageIds: communityImageIds,
      descriptions: communityDescriptions,
    },

    attachments: allAttachments,
  }

  // ── Insert portfolio item ─────────────────────────────────────────────────
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

  if (portfolioErr) { console.error('❌  Portfolio insert failed:', portfolioErr.message); process.exit(1) }
  console.log(`✅  Portfolio item inserted (id: ${portfolioData.id})`)

  // ── Portfolio share config ────────────────────────────────────────────────
  await supabase.from('talent_portfolio_share_config').delete().eq('user_id', userId)
  const { error: shareErr } = await supabase.from('talent_portfolio_share_config').insert({
    talent_profile_id: profileId,
    user_id: userId,
    share_intro: true,
    share_social: true,
    share_skills: true,
    share_experience: true,
    share_education: true,
    share_referees: true,
    share_projects: true,
    share_attachments: true,
    share_avatar: true,
    share_banner: true,
    share_intro_video: false,
  })
  if (shareErr) console.error('  ⚠️  Share config:', shareErr.message)
  else console.log('✅  Portfolio share config set')

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n🎉  NSW Real Estate Agent demo fully seeded!\n')
  console.log('  Profile: Alex Hartley — Senior Sales Agent & Auctioneer')
  console.log('  Email:   ', DEMO_EMAIL)
  console.log('  Pass:    ', DEMO_PASSWORD)
  console.log('\n  Portfolio sections:')
  console.log('    ✅  Bio & intro')
  console.log('    ✅  Social links (LinkedIn, Instagram, Website, Facebook)')
  console.log('    ✅  14 skills')
  console.log('    ✅  4 experience entries (12-year career)')
  console.log('    ✅  3 education / qualification entries')
  console.log('    ✅  3 detailed referees')
  console.log('    ✅  4 projects (notable sales + auction stats)')
  console.log('    ✅  4 licences & accreditations with certificate images')
  console.log('    ✅  3 personal documents')
  console.log(`    ✅  ${communityImageIds.length} community & sponsorship photos`)
  console.log(`    ✅  ${allAttachments.length} total attachments`)
  console.log('\n  Sign in at /login/talent')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
