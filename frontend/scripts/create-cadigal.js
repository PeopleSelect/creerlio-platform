/**
 * Creates Cadigal — a complete demo Business Profile on Creerlio.
 *
 * Cadigal Office Leasing: Sydney's leading pure office leasing specialist.
 * Founded 2011 by Mark Tindale, Grant Jennings & Peter Ferguson.
 * Dexus Office Agency of the Year 2025.
 *
 * Creates:
 *  - Auth user: demo.cadigal@creerlio.com / DemoCaldigal2025!
 *  - businesses + business_profiles + business_profile_pages
 *  - Sydney CBD location, roles, preferences
 *  - DALL-E logo + 9 images + 3 credential documents
 *  - TTS intro video (OpenAI + ffmpeg-static slideshow)
 *  - 4 link bank items + full profile metadata bank item
 *  - 4 published jobs
 *  - Products & services overview, roadmap, 5 service cards with sub-tables
 *
 * Run from /frontend:  node scripts/create-cadigal.js
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const OpenAI           = require('openai')
const fs               = require('fs')
const path             = require('path')
const os               = require('os')
const { execFileSync } = require('child_process')
const https            = require('https')
const http             = require('http')
const { randomUUID }   = require('crypto')

const ffmpegPath = require('ffmpeg-static')

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('Missing env vars. Check NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })

const BUCKET = 'business-bank'
const SLUG   = 'cadigal'

const DEMO_EMAIL    = 'demo.cadigal@creerlio.com'
const DEMO_PASSWORD = 'DemoCaldigal2025!'

// ── DALL-E image definitions ──────────────────────────────────────────────────

const IMAGES = [
  {
    key: 'logo',
    filename: 'cadigal-logo.jpg',
    bankType: 'logo',
    title: 'Cadigal Office Leasing — Brand Logo',
    description: 'Official Cadigal brand logo.',
    prompt: 'Premium Australian commercial real estate agency logo on pure white background, bold clean modern wordmark "CADIGAL" in deep charcoal grey (#1a1a2e), minimalist corporate identity with a subtle geometric accent in warm gold, sophisticated boutique agency aesthetic, perfectly centered, professional vector-style illustration, no people, no photos, no tagline',
    size: '1024x1024',
  },
  {
    key: 'hero',
    filename: 'cadigal-hero.jpg',
    bankType: 'image',
    title: 'Cadigal — Sydney CBD Premium Office Tower, 9 Castlereagh Street',
    prompt: 'Stunning exterior of a premium Grade A commercial office tower in Sydney CBD Australia at golden hour, glass curtain wall facade reflecting the late afternoon sky, Castlereagh Street in the foreground with Sydney streetscape, prestigious corporate real estate, architectural photography style, no people text or logos',
    size: '1792x1024',
  },
  {
    key: 'interior',
    filename: 'cadigal-office.jpg',
    bankType: 'image',
    title: 'Cadigal — Premium Sydney CBD Office Interior',
    prompt: 'Elegant boutique commercial real estate agency office interior in Sydney CBD, level 24 of a premium tower, panoramic floor-to-ceiling views of Sydney CBD skyline, sleek modern workstations with dual screens, warm timber accents, polished concrete floors, contemporary Australian workplace design, sophisticated and aspirational atmosphere, no people',
    size: '1792x1024',
  },
  {
    key: 'barangaroo',
    filename: 'cadigal-barangaroo.jpg',
    bankType: 'image',
    title: 'Cadigal — Barangaroo International Towers, Sydney',
    prompt: 'Dramatic aerial view of the Barangaroo precinct in Sydney showing the three International Towers rising above Sydney Harbour at dusk, city lights beginning to glow, premium commercial real estate precinct, architectural photography, Sydney CBD and harbour in background',
    size: '1792x1024',
  },
  {
    key: 'northsydney',
    filename: 'cadigal-northsydney.jpg',
    bankType: 'image',
    title: 'Cadigal — North Sydney Office Market',
    prompt: 'Panoramic view of North Sydney CBD commercial office district from Miller Street, modern glass towers against a clear Sydney sky, Sydney Harbour Bridge visible in the distance, premium suburban office market, professional real estate photography style, early morning light',
    size: '1792x1024',
  },
  {
    key: 'team',
    filename: 'cadigal-team.jpg',
    bankType: 'image',
    title: 'Cadigal — Expert Leasing Team',
    prompt: 'Professional team photo of a small elite commercial real estate leasing team of 8 people in premium business attire, diverse mix of men and women aged 30-55, standing confidently in a premium modern Sydney CBD office with harbour views through floor-to-ceiling windows, genuine and approachable, photorealistic',
    size: '1792x1024',
  },
  {
    key: 'negotiation',
    filename: 'cadigal-negotiation.jpg',
    bankType: 'image',
    title: 'Cadigal — Lease Negotiation & Advisory',
    prompt: 'Two commercial real estate leasing professionals in a premium boardroom reviewing large-format floor plans of a Sydney CBD office building, lease documents on the table, tablets showing building specifications, professional business attire, Sydney CBD skyline visible through windows, sophisticated corporate advisory environment',
    size: '1792x1024',
  },
  {
    key: 'research',
    filename: 'cadigal-research.jpg',
    bankType: 'image',
    title: 'Cadigal — Market Research & Intelligence',
    prompt: 'Commercial real estate research analyst at a premium workstation with three large monitors displaying Sydney CBD office vacancy maps, net absorption charts, rental data graphs, and market heat maps, sophisticated data visualisation, modern office environment with natural light, professional documentary photography',
    size: '1792x1024',
  },
  {
    key: 'awards',
    filename: 'cadigal-awards.jpg',
    bankType: 'image',
    title: 'Cadigal — Dexus Office Agency of the Year 2025',
    prompt: 'Premium commercial property industry awards ceremony, boutique agency team of 6 professionals celebrating winning a major award on stage, elegant event venue with professional staging, branded award, genuine celebration, smart business attire, photorealistic documentary event photography',
    size: '1792x1024',
  },
  {
    key: 'cole',
    filename: 'cadigal-community.jpg',
    bankType: 'image',
    title: 'Cadigal — Cole Classic Ocean Swim, Manly Beach',
    prompt: 'Group of professional commercial real estate team members participating in an ocean swimming charity event at Manly Beach Sydney, blue ocean background, colourful swimming caps and event gear, genuine camaraderie and sporting spirit, morning light on the beach, photorealistic',
    size: '1792x1024',
  },
]

const CREDENTIAL_DOCS = [
  {
    key: 'dexus_agency',
    filename: 'cadigal-dexus-agency-award.jpg',
    bankType: 'document',
    title: 'Dexus Excellence in Office Agency — Office Agency of the Year 2025',
    prompt: 'Premium commercial property industry award certificate in elegant dark charcoal and gold design, text "Dexus Excellence in Office Agency Awards 2025", "Office Agency of the Year" in large bold heading, "Cadigal Office Leasing" as recipient, sophisticated Australian commercial property award aesthetic',
    size: '1024x1024',
  },
  {
    key: 'dexus_agent',
    filename: 'cadigal-dexus-agent-award.jpg',
    bankType: 'document',
    title: 'Dexus Excellence in Office Agency — Office Agent of the Year 2025 (Grant Jennings)',
    prompt: 'Premium commercial real estate industry award certificate, dark navy and gold colour scheme, "Dexus Excellence Awards 2025" header, "Office Agent of the Year — Australia Square" award designation, "Grant Jennings — Cadigal" as recipient, professional award certificate design',
    size: '1024x1024',
  },
  {
    key: 'mastercard_deal',
    filename: 'cadigal-mastercard-deal.jpg',
    bankType: 'document',
    title: 'Landmark Transaction — Mastercard 7,227sqm St Leonards (2026)',
    prompt: 'Professional commercial real estate transaction case study document, clean modern design with charcoal and gold colours, "Landmark Leasing Transaction" header, "Mastercard — 72 Christie Street St Leonards, 7,227 sqm, 2026" details, Cadigal branding elements, premium boutique agency document style',
    size: '1024x1024',
  },
]

// ── TTS Narration ─────────────────────────────────────────────────────────────

const NARRATION = [
  'Welcome to Cadigal Office Leasing.',
  'For fifteen years, Cadigal has been Sydney\'s leading specialist in pure office leasing — and our focus has never wavered.',
  'We do one thing, and we do it exceptionally well: connecting businesses with their perfect office space in Sydney CBD, Barangaroo, and North Sydney.',
  'Founded in 2011 by Mark Tindale, Grant Jennings, and Peter Ferguson — three of Sydney\'s most experienced commercial leasing professionals — Cadigal was built on a simple belief: that a specialist, independent agency delivers better outcomes for both owners and tenants.',
  'Our founding clients included Dexus, Lendlease, and Stockland. Fifteen years later, we are trusted by virtually every major institutional property owner in Sydney — and we have earned that trust through performance, intelligence, and integrity.',
  'Our team of twenty-five specialists includes dedicated research, marketing, and finance professionals who support our leasing directors across Sydney CBD and North Sydney.',
  'We were proud to win the Dexus Office Agency of the Year award in 2025 — and to see our Executive Director Grant Jennings named Office Agent of the Year for his work on Australia Square.',
  'From the landmark International Towers at Barangaroo to One Farrer Place, 10 Shelley Street, and 72 Christie Street in St Leonards — our track record speaks for itself.',
  'But beyond the deals, what defines Cadigal is our people and our values: passion for property, intelligence in everything we do, and integrity in every client relationship.',
  'We are always interested in meeting exceptional leasing talent — experienced agents who want to be part of Sydney\'s most respected boutique office leasing team.',
  'If that is you, we would love to hear from you.',
  'Cadigal. Pure Office Leasing Sydney.',
].join(' ')

// ── Helpers ───────────────────────────────────────────────────────────────────

function publicUrl(storagePath) {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encoded}`
}

async function downloadFile(url, dest) {
  return new Promise((res, rej) => {
    const f = fs.createWriteStream(dest)
    const proto = url.startsWith('https') ? https : http
    proto.get(url, r => {
      if (r.statusCode !== 200) { rej(new Error(`HTTP ${r.statusCode}`)); return }
      r.pipe(f); f.on('finish', () => { f.close(); res() })
    }).on('error', rej)
  })
}

async function generateAndUploadImage(userId, img, tmpDir) {
  console.log(`  Generating: ${img.title}`)
  const resp = await openai.images.generate({
    model: 'dall-e-3',
    prompt: img.prompt,
    size: img.size,
    quality: 'hd',
    n: 1,
  })
  const imageUrl = resp.data[0].url
  const tmpPath  = path.join(tmpDir, img.filename)
  await downloadFile(imageUrl, tmpPath)

  const storagePath = `${userId}/bank/${img.filename}`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(
    storagePath, fs.readFileSync(tmpPath), { contentType: 'image/jpeg', upsert: true }
  )
  if (upErr) throw new Error(`Upload ${img.filename}: ${upErr.message}`)

  const fileUrl = publicUrl(storagePath)
  return { storagePath, fileUrl, tmpPath }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cadigal-profile-'))
  console.log('Temp dir:', tmpDir)

  // ── 1. Create auth user ───────────────────────────────────────────────────
  console.log('\n[1/14] Creating auth user...')
  let userId

  const { data: existing } = await supabase.auth.admin.listUsers()
  const existingUser = existing?.users?.find(u => u.email === DEMO_EMAIL)
  if (existingUser) {
    userId = existingUser.id
    console.log('  User already exists:', userId)
  } else {
    const { data: newUser, error: userErr } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Cadigal Office Leasing', user_type: 'business' },
    })
    if (userErr) throw new Error('Create user: ' + userErr.message)
    userId = newUser.user.id
    console.log('  Created user:', userId)
  }

  // ── 2. Generate & upload images ───────────────────────────────────────────
  console.log('\n[2/14] Generating DALL-E images...')
  const allImages = [...IMAGES, ...CREDENTIAL_DOCS]
  const imageResults = {}

  for (const img of allImages) {
    try {
      const result = await generateAndUploadImage(userId, img, tmpDir)
      imageResults[img.key] = result
      console.log(`    ✓ ${img.filename}`)
    } catch (e) {
      console.warn(`    ✗ ${img.filename}: ${e.message}`)
    }
  }

  // ── 3. Generate TTS audio ─────────────────────────────────────────────────
  console.log('\n[3/14] Generating TTS narration...')
  const audioPath = path.join(tmpDir, 'narration.mp3')
  const mp3 = await openai.audio.speech.create({ model: 'tts-1-hd', voice: 'onyx', input: NARRATION, speed: 0.9 })
  fs.writeFileSync(audioPath, Buffer.from(await mp3.arrayBuffer()))
  console.log('  TTS done')

  // ── 4. Probe audio duration ───────────────────────────────────────────────
  let audioDur = 75
  try { execFileSync(ffmpegPath, ['-i', audioPath, '-f', 'null', '-'], { stdio: ['pipe','pipe','pipe'] }) }
  catch (e) {
    const m = (e.stderr || Buffer.from('')).toString().match(/Duration:\s*(\d+):(\d+):([\d.]+)/)
    if (m) audioDur = parseInt(m[1])*3600 + parseInt(m[2])*60 + parseFloat(m[3])
  }
  console.log(`  Duration: ${audioDur.toFixed(1)}s`)

  // ── 5. Build intro video ──────────────────────────────────────────────────
  console.log('\n[4/14] Encoding intro video...')
  const slideImages = IMAGES.filter(i => imageResults[i.key]).map(i => imageResults[i.key].tmpPath)
  const spi = audioDur / slideImages.length
  const concatLines = slideImages.map(p => `file '${p.replace(/\\/g, '/')}'\nduration ${spi.toFixed(3)}`).join('\n')
  const lastSlide = slideImages[slideImages.length - 1].replace(/\\/g, '/')
  const concatFile = path.join(tmpDir, 'concat.txt')
  fs.writeFileSync(concatFile, concatLines + `\nfile '${lastSlide}'`)

  const videoFilename  = 'cadigal-intro-video.mp4'
  const videoLocalPath = path.join(tmpDir, videoFilename)

  try {
    execFileSync(ffmpegPath, [
      '-y', '-f', 'concat', '-safe', '0', '-i', concatFile,
      '-i', audioPath,
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-shortest', '-movflags', '+faststart',
      videoLocalPath,
    ], { stdio: 'pipe', timeout: 300000 })
  } catch (e) {
    console.error('ffmpeg error:', (e.stderr || Buffer.from('')).toString().slice(-1000))
    throw new Error('ffmpeg failed')
  }

  const videoSize        = fs.statSync(videoLocalPath).size
  const videoStoragePath = `${userId}/bank/${videoFilename}`
  await supabase.storage.from(BUCKET).remove([videoStoragePath])
  const { error: vidUpErr } = await supabase.storage.from(BUCKET).upload(
    videoStoragePath, fs.readFileSync(videoLocalPath), { contentType: 'video/mp4', upsert: true }
  )
  if (vidUpErr) throw new Error('Video upload: ' + vidUpErr.message)
  const videoPublicUrl = publicUrl(videoStoragePath)
  console.log(`  Video: ${(videoSize/1e6).toFixed(2)} MB → ${videoPublicUrl}`)

  // ── 5. Insert bank items ──────────────────────────────────────────────────
  console.log('\n[5/14] Inserting business bank items...')
  const bankItems = []

  for (const img of allImages) {
    const r = imageResults[img.key]
    if (!r) continue
    const { data, error } = await supabase.from('business_bank_items').insert({
      user_id:     userId,
      item_type:   img.bankType,
      title:       img.title,
      description: img.description || null,
      file_path:   r.storagePath,
      file_url:    r.fileUrl,
      file_type:   'image/jpeg',
      file_size:   fs.statSync(r.tmpPath).size,
      metadata:    {},
      is_active:   true,
    }).select('id').single()
    if (error) console.warn(`  Bank item ${img.key}: ${error.message}`)
    else { bankItems.push({ key: img.key, id: data.id }); console.log(`  ✓ ${img.key} → id ${data.id}`) }
  }

  // Intro video bank item
  const { data: vidItem, error: vidItemErr } = await supabase.from('business_bank_items').insert({
    user_id:     userId,
    item_type:   'business_introduction',
    title:       'Cadigal Office Leasing — Firm Introduction Video',
    description: 'Official Cadigal introduction: our history, team, specialist expertise, and why exceptional leasing talent chooses Cadigal.',
    file_path:   videoStoragePath,
    file_url:    videoPublicUrl,
    file_type:   'video/mp4',
    file_size:   videoSize,
    metadata:    { duration: Math.round(audioDur) },
    is_active:   true,
  }).select('id').single()
  if (vidItemErr) console.warn('  Video bank item error:', vidItemErr.message)
  else { bankItems.push({ key: 'video', id: vidItem.id }); console.log(`  ✓ video → id ${vidItem.id}`) }

  // Links
  const links = [
    { title: 'Cadigal Website',                    url: 'https://www.cadigal.com.au/' },
    { title: 'Cadigal LinkedIn',                   url: 'https://au.linkedin.com/company/cadigal-office-leasing' },
    { title: 'Cadigal Instagram',                  url: 'https://www.instagram.com/cadigal_office_leasing/' },
    { title: 'Cadigal Market Pulse — Sydney CBD',  url: 'https://www.cadigal.com.au/research/' },
  ]
  for (const lnk of links) {
    const { data, error } = await supabase.from('business_bank_items').insert({
      user_id: userId, item_type: 'link', title: lnk.title, file_url: lnk.url, is_active: true,
    }).select('id').single()
    if (error) console.warn(`  Link "${lnk.title}": ${error.message}`)
    else { bankItems.push({ key: 'link_' + lnk.title.replace(/\s/g,'_').slice(0, 20), id: data.id }); console.log(`  ✓ link → ${lnk.title}`) }
  }

  // ── 6. Build profile metadata bank item ──────────────────────────────────
  console.log('\n[6/14] Inserting profile metadata bank item...')
  const logoItem    = bankItems.find(b => b.key === 'logo')
  const heroItem    = bankItems.find(b => b.key === 'hero')
  const videoItemId = bankItems.find(b => b.key === 'video')

  const attachmentKeys = ['interior','barangaroo','northsydney','team','negotiation','research','awards','cole','dexus_agency','dexus_agent','mastercard_deal']
  const attachments = bankItems.filter(b => attachmentKeys.includes(b.key)).map(b => ({ id: b.id }))

  const profileMetadata = {
    bio: `Cadigal is Sydney's leading specialist in pure office leasing. For fifteen years, we have done one thing exceptionally well: connecting businesses and property owners with the right office space in Sydney CBD, Barangaroo, Pyrmont, and North Sydney.\n\nFounded in 2011 by Mark Tindale, Grant Jennings, and Peter Ferguson — three of Sydney's most experienced commercial leasing professionals — Cadigal was built on the belief that independence, specialisation, and integrity produce better outcomes for both owners and tenants. Our founding clients included Dexus, Lendlease, GPT Group, and Stockland. Fifteen years later, we are trusted leasing agents for virtually every major institutional property owner in Sydney.\n\nOur team of ~25 specialists includes Executive Directors, Directors, Associate Directors, Leasing Executives, and dedicated Research, Marketing, Finance, and Operations professionals. We operate from two integrated offices: Level 24, 9 Castlereagh Street in the Sydney CBD and Level 13, 124 Walker Street in North Sydney.\n\nIn 2025, we were proud to win the Dexus Office Agency of the Year award, and to see our Executive Director Grant Jennings named Office Agent of the Year for his outstanding work on the Australia Square campaign.\n\nWe are active in our community through three years of partnership with the Cole Classic Ocean Swim supporting Aussie Ark, our Coast Shelter partnership, and annual International Women's Day initiatives. Our company name honours the Gadigal people of the Eora Nation, whose country we work on each day.\n\nIf you are an experienced commercial leasing professional who shares our passion for office property and our commitment to excellence — we would love to hear from you.`,
    tagline: 'Pure Office Leasing Sydney.',
    businessType: 'real-estate-agency',
    industry: 'Commercial Real Estate',
    specialisations: [
      'Sydney CBD Office Leasing',
      'North Sydney Office Leasing',
      'Barangaroo Precinct',
      'Pyrmont & Ultimo',
      'Tenant Representation',
      'Landlord Leasing Campaigns',
      'Development Consultancy',
      'Market Research & Analytics',
      'Flexible & Coworking Space',
      'Sub-leasing & Assignment',
    ],
    founded: 2011,
    size: '11-50',
    website: 'https://www.cadigal.com.au/',
    logoId: logoItem?.id || null,
    heroImageId: heroItem?.id || null,
    introVideoId: videoItemId?.id || null,
    introVideoUrl: videoPublicUrl,
    attachmentIds: attachments.map(a => a.id),
    socialLinks: {
      linkedin:  'https://au.linkedin.com/company/cadigal-office-leasing',
      instagram: 'https://www.instagram.com/cadigal_office_leasing/',
      facebook:  'https://www.facebook.com/CadigalOfficeLeasing/',
      website:   'https://www.cadigal.com.au/',
    },
    skills: [
      'Office Leasing Strategy',
      'Tenant Representation',
      'Lease Negotiation',
      'Development Consultancy',
      'Market Research & Analytics',
      'Sydney CBD Office Market',
      'North Sydney Office Market',
      'Barangaroo Precinct',
      'Heads of Agreement',
      'Flexible Workspace Advisory',
      'Sub-leasing & Assignment',
      'Expert Witness Services',
    ],
    cultureQA: [
      {
        question: 'What makes Cadigal different from larger commercial agencies like JLL, CBRE, or Colliers?',
        answer: 'Our specialisation. We do only Sydney office leasing — nothing else. That singular focus means our team has deeper market knowledge, stronger relationships, and a sharper competitive edge than any generalist agency can offer. When you work at Cadigal, every deal, every conversation, and every piece of research is about Sydney offices. It\'s what we live and breathe.',
      },
      {
        question: 'What is the team culture like at Cadigal?',
        answer: 'Collaborative, driven, and genuinely collegiate. We are a small, high-performing team — which means you work directly with the founders and executive directors, not buried in a corporate hierarchy. Multiple team members have been with us for 10+ years, which tells you everything about the culture. We celebrate wins together, we support each other through challenges, and we genuinely invest in our people.',
      },
      {
        question: 'How does Cadigal approach professional development?',
        answer: 'We believe in learning by doing on major mandates. Junior team members get direct exposure to significant leasing campaigns — not just observation. We pair new team members with senior directors, provide structured mentoring, and encourage participation in industry events and research projects. If you have ambition and commercial instinct, Cadigal will help you build a genuinely distinguished career.',
      },
      {
        question: 'What types of mandates does Cadigal work on?',
        answer: 'Across the spectrum — from premium A-Grade towers in the Sydney CBD (Australia Square, One Farrer Place, Liberty Place) to North Sydney\'s most significant buildings, to landmark precinct projects like Barangaroo. We also have a growing flexible workspace business through our Rubberdesk joint venture. Our team handles both landlord leasing campaigns and tenant representation mandates, giving you exposure to every side of the market.',
      },
    ],
    acknowledgement_of_country: 'Cadigal acknowledges the Gadigal people of the Eora Nation as the Traditional Custodians of the land on which we live and work in Sydney. Our company name was chosen in recognition of and respect for the Gadigal people, with the approval and support of the Metropolitan Local Aboriginal Land Council. We pay our respects to Elders past, present, and emerging.',
  }

  const { data: metaItem, error: metaErr } = await supabase.from('business_bank_items').insert({
    user_id:   userId,
    item_type: 'profile',
    title:     'Cadigal Office Leasing — Business Profile',
    metadata:  profileMetadata,
    is_active: true,
  }).select('id').single()
  if (metaErr) console.warn('  Profile metadata error:', metaErr.message)
  else console.log(`  ✓ Profile metadata → id ${metaItem.id}`)

  // ── 7. Create business record ─────────────────────────────────────────────
  console.log('\n[7/14] Creating business records...')
  const { error: bizErr } = await supabase.from('businesses').upsert({
    id:       userId,
    name:     'Cadigal Office Leasing',
    industry: 'Commercial Real Estate',
  }, { onConflict: 'id' })
  if (bizErr) console.warn('  businesses:', bizErr.message)
  else console.log('  ✓ businesses')

  // ── 8. Create business_profiles ───────────────────────────────────────────
  const logoUrl = imageResults.logo?.fileUrl || null
  const heroUrl = imageResults.hero?.fileUrl || null

  const { error: bpErr } = await supabase.from('business_profiles').upsert({
    id:              userId,
    user_id:         userId,
    business_name:   'Cadigal Office Leasing',
    tagline:         'Pure Office Leasing Sydney.',
    bio:             profileMetadata.bio,
    website:         'https://www.cadigal.com.au/',
    logo_url:        logoUrl,
    hero_image_url:  heroUrl,
    industry:        'Commercial Real Estate',
    business_type:   'real-estate-agency',
    founded_year:    2011,
    company_size:    '11-50',
    city:            'Sydney',
    state:           'NSW',
    country:         'Australia',
    location:        'Sydney CBD, NSW, Australia',
    linkedin_url:    'https://au.linkedin.com/company/cadigal-office-leasing',
    instagram_url:   'https://www.instagram.com/cadigal_office_leasing/',
    latitude:        -33.8714,
    longitude:       151.2073,
    email:           'info@cadigal.com.au',
    phone:           '+61 2 8188 5555',
    is_published:    true,
    is_active:       true,
  }, { onConflict: 'id' })
  if (bpErr) console.warn('  business_profiles:', bpErr.message)
  else console.log('  ✓ business_profiles')

  // ── 9. Create business_profile_pages ─────────────────────────────────────
  console.log('\n[8/14] Creating business_profile_pages...')
  const { error: bppErr } = await supabase.from('business_profile_pages').upsert({
    business_id:    userId,
    slug:           SLUG,
    is_published:   true,
    name:           'Cadigal Office Leasing',
    logo_url:       logoUrl,
    hero_image_url: heroUrl,
    tagline:        'Pure Office Leasing Sydney.',
    mission:        'To be Sydney\'s most trusted office leasing specialist — delivering exceptional results for building owners and tenants through deep market expertise, genuine independence, and a relentless commitment to our clients\' success.',
    value_prop_headline: 'Sydney\'s Most Trusted Pure Office Leasing Specialist — 15 Years, 2 Offices, Every Major Building',
    value_prop_body: 'Cadigal\'s sole focus is Sydney office leasing — CBD, Barangaroo, Pyrmont, North Sydney, and St Leonards. Founded in 2011, we have been appointed by virtually every major institutional landlord in Sydney and have facilitated some of the city\'s landmark leasing transactions. We are not a generalist agency. We are the firm you call when you want the best possible outcome for your Sydney office asset or space requirement — and we have 15 years of results to prove it. Winner: Dexus Office Agency of the Year 2025.',
    impact_stats: [
      { label: 'Years of Pure Office Leasing',    value: '15+' },
      { label: 'Offices (CBD & North Sydney)',     value: '2' },
      { label: 'Specialist Team Members',          value: '~25' },
      { label: 'Major Institutional Clients',      value: '20+' },
      { label: 'Mastercard — Largest N Shore Deal', value: '7,227sqm' },
      { label: 'Cole Classic — Charity Swims',     value: '3 Years' },
    ],
    culture_values: [
      {
        title:       'Passion',
        description: 'Our team is handpicked for their genuine passion for Sydney office property. We don\'t do this as a job — we do it because we love it.',
      },
      {
        title:       'Intelligence',
        description: 'Rigorous research and data-driven market intelligence underpin every leasing campaign and tenant mandate. Our dedicated Research Director publishes bi-annual Sydney CBD and North Shore Market Pulse reports.',
      },
      {
        title:       'Integrity',
        description: 'We always put our clients\' best interests first — even when that means telling them something they might not want to hear. Our long-term client relationships are built on trust.',
      },
      {
        title:       'Excellence',
        description: 'Cadigal was built for the top end of the market. Our team, our marketing, and our results are all held to the highest standards — consistently.',
      },
    ],
    business_areas: [
      {
        name:        'Landlord Leasing Campaigns',
        description: 'Full strategy, marketing, competition monitoring, tenant targeting, and transaction management for Sydney\'s institutional and private building owners. From initial appointment through to lease execution.',
      },
      {
        name:        'Tenant Representation',
        description: 'Independent, expert advice for businesses navigating the Sydney office market — including space discovery, off-market opportunities, sub-leasing strategy, and lease negotiation.',
      },
      {
        name:        'Development Consultancy',
        description: 'Advisory for new office projects: floor plate design, rental benchmarking, tenant market depth analysis, and competitive positioning to maximise leasing outcomes.',
      },
      {
        name:        'Market Research & Intelligence',
        description: 'Dedicated in-house research capability producing bi-annual Sydney CBD and North Shore Market Pulse reports, bespoke tenant reports, and vacancy & rental analytics.',
      },
      {
        name:        'Flexible & Coworking Workspace',
        description: 'National flexible workspace advisory through the Cadigal Rubberdesk joint venture — expert guidance for businesses exploring coworking, serviced offices, and flexible leasing.',
      },
      {
        name:        'General Consultancy & Expert Witness',
        description: 'Specialist leasing evidence for court proceedings, building acquisition and divestiture advice, and customised property research for complex advisory mandates.',
      },
    ],
    benefits: [
      { title: 'Elite Mandate Access',           description: 'Work directly on Sydney\'s most significant office leasing campaigns — Australia Square, One Farrer Place, Barangaroo, and more. No other boutique agency has our mandate depth.' },
      { title: 'Founders in the Business',       description: 'Mark Tindale, Grant Jennings, and Peter Ferguson are still active directors — available, accessible, and invested in your success. This is not a corporate HR model.' },
      { title: 'Best-in-Class Research Support', description: 'Our dedicated Research Director Lok So (24+ years experience) gives our whole team a genuine market intelligence edge that no competitor can match at our size.' },
      { title: 'Strong Team Retention',          description: 'The average tenure of our team members speaks for itself. Multiple people have been with Cadigal for 10+ years. We build careers, not just jobs.' },
      { title: 'High-Performance Culture',       description: 'We are small enough to be agile and collegiate, large enough to handle Sydney\'s biggest leasing mandates. The culture is driven, collaborative, and genuinely meritocratic.' },
      { title: 'Community & Wellbeing',          description: 'Cole Classic Ocean Swim partnership (3 years), Coast Shelter charity support, IWD programs, and team events that reflect our values and build genuine camaraderie.' },
    ],
    programs: [
      {
        name:        'Leasing Executive Development Program',
        description: 'Structured pathway for emerging leasing professionals — direct mentorship from Executive Directors, exposure to major building campaigns, and clear progression to Director level.',
        url:         'https://www.cadigal.com.au/',
      },
      {
        name:        'Cadigal Rubberdesk — Flexible Workspace',
        description: 'Our national joint venture with Rubberdesk for the coworking and flexible office market — offering team members expanded service capability and client relationships beyond traditional leasing.',
        url:         'https://www.rubberdesk.com.au/',
      },
    ],
    social_proof: [
      {
        quote:  'Cadigal are the best office leasing team in Sydney. Their market knowledge is unmatched — they knew about our upcoming vacancy before we had even made a formal decision.',
        source: 'Institutional Landlord — Sydney CBD Premium Tower',
      },
      {
        quote:  'Grant and the Cadigal team achieved an exceptional outcome on Australia Square. They brought the right tenants, negotiated brilliantly, and delivered results ahead of programme.',
        source: 'Dexus — Australia Square, 264 George Street (Dexus Awards citation)',
      },
      {
        quote:  'Marcus and the North Sydney team\'s knowledge of the St Leonards market was instrumental in securing Mastercard\'s commitment. This was a landmark deal for the precinct.',
        source: 'UOL Group — 72 Christie Street, St Leonards',
      },
      {
        quote:  'The research capability at Cadigal is extraordinary for a firm of their size. Lok\'s market analysis gives us a genuine edge in how we position our buildings.',
        source: 'Major Institutional Building Owner — North Sydney',
      },
    ],
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
    contact_email:              'info@cadigal.com.au',
    website_url:                'https://www.cadigal.com.au/',
    phone_cbd:                  '+61 2 8188 5555',
    phone_north_sydney:         '+61 2 8667 5555',
    enquiry_enabled:            true,
    live_roles_count:           4,
    talent_community_enabled:   true,
    portfolio_intake_enabled:   true,
    media_assets: {
      intro_video_url: videoPublicUrl,
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
    acknowledgement_of_country: profileMetadata.acknowledgement_of_country,
  }, { onConflict: 'business_id' })
  if (bppErr) console.warn('  business_profile_pages:', bppErr.message)
  else console.log('  ✓ business_profile_pages')

  // ── 10. Create location ───────────────────────────────────────────────────
  console.log('\n[9/14] Creating location...')
  let locationId

  const { data: existingLoc } = await supabase.from('locations').select('id').eq('owner_id', userId).maybeSingle()
  if (existingLoc) {
    locationId = existingLoc.id
    console.log('  Location exists:', locationId)
  } else {
    const { data: newLoc, error: locErr } = await supabase.from('locations').insert({
      owner_type:  'business',
      owner_id:    userId,
      business_id: userId,
      name:        'Cadigal Office Leasing — Sydney CBD',
      address:     'Level 24, 9 Castlereagh Street',
      city:        'Sydney',
      state:       'NSW',
      country:     'Australia',
      lat:         -33.8714,
      lng:         151.2073,
    }).select('id').single()
    if (locErr) throw new Error('Create location: ' + locErr.message)
    locationId = newLoc.id
    console.log('  Created location:', locationId)
  }

  // ── 11. Roles & preferences ───────────────────────────────────────────────
  console.log('\n[10/14] Creating roles and preferences...')
  await supabase.from('user_business_roles').upsert({ user_id: userId, business_id: userId, role: 'business_admin' }, { onConflict: 'user_id,business_id' })
  await supabase.from('user_location_roles').upsert({ user_id: userId, location_id: locationId, role: 'location_admin' }, { onConflict: 'user_id,location_id' })
  await supabase.from('user_preferences').upsert({ user_id: userId, active_business_id: userId, active_location_id: locationId }, { onConflict: 'user_id' })
  console.log('  ✓ Roles and preferences set')

  // ── 12. Create jobs ───────────────────────────────────────────────────────
  console.log('\n[11/14] Creating job vacancies...')
  const jobs = [
    {
      title:            'Senior Leasing Executive — Sydney CBD Office',
      description:      `Cadigal is seeking a driven and experienced Senior Leasing Executive to join our Sydney CBD team.\n\nThis is a rare opportunity to work at Sydney's most respected pure office leasing agency — directly alongside our Executive Directors on the city's most significant building campaigns.\n\n**The Role**\nYou will manage a portfolio of institutional and private leasing campaigns across Premium and A-Grade Sydney CBD office buildings, driving enquiry, conducting inspections, negotiating Heads of Agreement, and guiding transactions through to lease execution.\n\n**Key Responsibilities**\n- Lead leasing campaigns on major Sydney CBD office buildings\n- Manage tenant enquiry, inspections, and negotiation pipelines\n- Develop and maintain relationships with tenant representatives, corporate occupiers, and building owners\n- Contribute to market research, building appraisals, and competitive analysis\n- Work alongside Executive Directors and Directors on pitch and strategy\n- Represent Cadigal at industry events and networking functions\n\n**What We Offer**\n- Direct access to Sydney's most significant office leasing mandates\n- Work alongside co-founders Mark Tindale, Grant Jennings, and Peter Ferguson\n- Competitive salary + commission structure\n- In-house research support from Research Director Lok So (24+ years experience)\n- Genuine career progression to Director level\n- Collaborative, high-performance boutique culture with strong team retention`,
      city:             'Sydney',
      state:            'NSW',
      country:          'Australia',
      location:         'Sydney CBD, NSW, Australia',
      employment_type:  'Full-time',
      experience_level: 'Senior',
      salary_min:       120000,
      salary_max:       160000,
      salary_currency:  'AUD',
      required_skills:  ['Commercial Office Leasing', 'Lease Negotiation', 'Tenant Relations', 'Heads of Agreement', 'Market Knowledge'],
      preferred_skills: ['Sydney CBD Market', 'Institutional Landlord Experience', 'Tenant Representation', 'REA/Domain for Commercial'],
      requirements:     '- Minimum 4 years experience in commercial office leasing (CBD preferred)\n- Current NSW Real Estate Licence\n- Proven track record completing leasing transactions in A/Premium Grade buildings\n- Strong understanding of Sydney CBD office market dynamics\n- Excellent negotiation, communication, and relationship management skills\n- Professional presentation and genuine passion for commercial property',
    },
    {
      title:            'Leasing Executive — North Sydney Office Market',
      description:      `Join Cadigal\'s North Sydney team and become part of the team behind the market\'s most significant deals — including the landmark Mastercard transactions at 72 Christie Street, St Leonards.\n\nThis is an excellent opportunity for a motivated leasing professional to develop their career in North Sydney\'s dynamic office market under the mentorship of Executive Directors Craig Dolman and Marcus Pratley.\n\n**The Role**\nYou will support and progressively lead leasing campaigns across North Sydney, St Leonards, Crows Nest, and Chatswood office buildings, building your expertise in one of Sydney\'s most active commercial precincts.\n\n**Key Responsibilities**\n- Manage tenant enquiry and inspection pipeline for North Sydney building campaigns\n- Develop relationships with tenants, tenant representatives, and building owners\n- Conduct building inspections and prepare leasing proposals\n- Assist with Heads of Agreement negotiations and lease documentation\n- Contribute to North Shore Market Pulse research and building appraisals\n- Attend and represent Cadigal at industry events\n\n**What We Offer**\n- Mentorship from Craig Dolman (19 years North Sydney experience) and Marcus Pratley (350,000+ sqm of leases)\n- Access to landmark North Shore building mandates\n- Structured career development to Director level\n- Strong team culture with excellent retention\n- Competitive salary + commission`,
      city:             'North Sydney',
      state:            'NSW',
      country:          'Australia',
      location:         'North Sydney, NSW, Australia',
      employment_type:  'Full-time',
      experience_level: 'Mid-level',
      salary_min:       90000,
      salary_max:       130000,
      salary_currency:  'AUD',
      required_skills:  ['Commercial Leasing', 'Tenant Relations', 'Market Research', 'Building Inspections', 'Negotiation'],
      preferred_skills: ['North Sydney Market', 'A-Grade Office Experience', 'Landlord Representation', 'CRM Systems'],
      requirements:     '- 2+ years experience in commercial office or commercial property leasing\n- Current NSW Real Estate Licence (or eligible to obtain)\n- Sound understanding of North Sydney/Lower North Shore commercial market preferred\n- Strong communication, presentation, and relationship-building skills\n- Highly organised with excellent attention to detail\n- Collaborative team player with genuine ambition to build a distinguished leasing career',
    },
    {
      title:            'Leasing & Research Analyst — Sydney CBD',
      description:      `Cadigal is seeking a sharp, analytically minded Leasing & Research Analyst to join our Sydney CBD team.\n\nThis is an ideal first or second role in commercial property for a motivated graduate — working directly with Research Director Lok So and our CBD leasing team, contributing to our market-leading Market Pulse publications and building campaign support.\n\n**The Role**\nYou will support both the research and leasing functions of the Sydney CBD team — producing market analysis, building reports, vacancy tracking, and leasing campaign materials, while developing a deep understanding of the Sydney office market through hands-on experience.\n\n**Key Responsibilities**\n- Compile and maintain Sydney CBD and North Shore vacancy, absorption, and rental data\n- Contribute to bi-annual Market Pulse reports and bespoke tenant market reports\n- Prepare building marketing materials, information memoranda, and floor plan packages\n- Track and analyse competitor buildings, leasing transactions, and tenant movements\n- Support leasing directors with inspection scheduling, proposal preparation, and follow-up\n- Assist with social media content, event coordination, and marketing campaigns\n\n**What We Offer**\n- Direct mentorship from Lok So — 24+ years of commercial real estate research expertise\n- Exposure to every aspect of a premium Sydney CBD office leasing business\n- Clear career pathway to Leasing Executive\n- Small team environment where your contribution genuinely matters\n- Professional development support and industry training`,
      city:             'Sydney',
      state:            'NSW',
      country:          'Australia',
      location:         'Sydney CBD, NSW, Australia',
      employment_type:  'Full-time',
      experience_level: 'Graduate',
      salary_min:       65000,
      salary_max:       85000,
      salary_currency:  'AUD',
      required_skills:  ['Data Analysis', 'Microsoft Excel', 'Research', 'Attention to Detail', 'Written Communication'],
      preferred_skills: ['Commercial Property Knowledge', 'InDesign/Canva', 'CoStar or PCA Data', 'Property Economics Degree'],
      requirements:     '- Bachelor\'s degree in Property Economics, Commerce, Business, Finance, or related field\n- Strong analytical and data interpretation skills\n- Advanced Excel; experience with InDesign, Canva, or similar design tools a plus\n- Excellent written and verbal communication\n- Highly organised and able to manage multiple projects and deadlines\n- Genuine interest in commercial real estate and Sydney\'s office market',
    },
    {
      title:            'Marketing & Communications Coordinator — Sydney CBD',
      description:      `Cadigal is seeking a talented Marketing & Communications Coordinator to join our Sydney CBD team.\n\nThis role is central to how we market our building campaigns, maintain our brand, and communicate with the Sydney commercial property market. Working with Marketing Manager Kelly Radovanovic, you will bring creativity, digital fluency, and exceptional attention to detail to one of Sydney\'s most admired boutique agencies.\n\n**The Role**\nYou will coordinate and produce marketing content and materials across all Cadigal channels — building campaign collateral, social media, email communications, our website, and events — ensuring a consistently premium and on-brand presence.\n\n**Key Responsibilities**\n- Produce leasing campaign materials: information memoranda, floor plan packages, email campaigns, and signage\n- Manage and grow Cadigal\'s LinkedIn and Instagram channels (@cadigal_office_leasing)\n- Coordinate digital and print marketing for major building campaign launches\n- Assist with website content updates and news articles\n- Organise Cadigal events including industry functions and charity activities\n- Coordinate with external photographers, videographers, and creative agencies\n- Support the preparation of new business pitches and award submissions\n\n**What We Offer**\n- Work on premium building campaigns at the heart of Sydney\'s commercial property market\n- Creative freedom within a well-established and respected brand\n- Collaborative, close-knit team environment\n- Exposure to industry events and stakeholder networks\n- Competitive salary and genuine career development opportunity`,
      city:             'Sydney',
      state:            'NSW',
      country:          'Australia',
      location:         'Sydney CBD, NSW, Australia',
      employment_type:  'Full-time',
      experience_level: 'Mid-level',
      salary_min:       75000,
      salary_max:       95000,
      salary_currency:  'AUD',
      required_skills:  ['Digital Marketing', 'Social Media Management', 'Adobe InDesign', 'Content Creation', 'Email Marketing'],
      preferred_skills: ['Commercial Real Estate', 'LinkedIn Marketing', 'MailChimp or Campaign Monitor', 'Photography/Videography Coordination', 'Event Management'],
      requirements:     '- 2+ years experience in marketing, communications, or a related creative role\n- Proficient in Adobe Creative Suite (InDesign, Photoshop) and Canva\n- Proven social media management experience (LinkedIn and Instagram)\n- Strong copywriting and proofreading skills\n- Highly organised, deadline-driven, and able to manage multiple projects simultaneously\n- An eye for design and brand consistency\n- Experience in property, professional services, or B2B marketing preferred',
    },
  ]

  const insertedJobs = []
  for (const job of jobs) {
    const { data, error } = await supabase.from('jobs').insert({
      business_profile_id: userId,
      business_id:         userId,
      location_id:         locationId,
      status:              'published',
      is_active:           true,
      list_on_creerlio:    true,
      seek_source_tag:     'seek',
      website_source_tag:  'website',
      ...job,
    }).select('id').single()
    if (error) console.warn(`  Job "${job.title}": ${error.message}`)
    else { insertedJobs.push({ id: data.id, title: job.title }); console.log(`  ✓ Job: ${job.title}`) }
  }

  // ── 13. Products & Services ───────────────────────────────────────────────
  console.log('\n[12/14] Inserting products & services overview...')

  const { error: ovErr } = await supabase.from('business_products_services_overview').upsert({
    business_id:        userId,
    user_id:            userId,
    short_headline:     'Pure Office Leasing — Sydney CBD, Barangaroo, North Sydney & Fringe. Both Landlord & Tenant Sides.',
    summary:            'Cadigal provides specialist office leasing services exclusively in the Sydney metropolitan market. Our six core service lines span landlord leasing campaign management, tenant representation, development consultancy, market research & intelligence, flexible workspace advisory, and general leasing consultancy including expert witness services. Every service is underpinned by the deepest market knowledge in Sydney office leasing — built over 15 years of exclusive focus.',
    primary_industries: ['Commercial Office Real Estate', 'Institutional Property Investment', 'Tenant Representation', 'Property Development Advisory', 'Flexible Workspace'],
    business_model:     'B2B',
    is_public:          true,
  }, { onConflict: 'business_id' })
  if (ovErr) console.warn('  Overview:', ovErr.message)
  else console.log('  ✓ Overview')

  console.log('\n[12b/14] Inserting product roadmap...')
  const { error: rmErr } = await supabase.from('business_product_roadmap').upsert({
    business_id:       userId,
    user_id:           userId,
    upcoming_products: [
      'Enhanced Market Pulse Digital Platform — interactive online versions of our bi-annual Sydney CBD and North Shore Market Pulse reports',
      'Cadigal Rubberdesk 2.0 — expanded national flexible workspace advisory capability',
    ],
    roadmap_ideas:     'Developing proprietary digital tools for real-time vacancy tracking, leasing evidence analytics, and tenant market depth mapping — extending our already-best-in-class research capability.',
    expansion_plans:   'Deepening our presence in the St Leonards / Crows Nest precinct following the success of the Mastercard mandate, and expanding our Pyrmont/Ultimo coverage as the tech sector\'s return to office drives activity in Sydney\'s inner west fringe.',
    new_markets:       'Continuing to grow our flexible workspace advisory business through Rubberdesk as the hybrid work era drives sustained demand for flexible leasing solutions from Sydney\'s corporate sector.',
    is_public:         true,
  }, { onConflict: 'business_id' })
  if (rmErr) console.warn('  Roadmap:', rmErr.message)
  else console.log('  ✓ Roadmap')

  console.log('\n[13/14] Inserting service cards...')
  const services = [
    {
      name:              'Landlord Leasing Campaigns',
      category:          'Service',
      short_description: 'End-to-end leasing campaign management for Sydney office building owners — from strategy and marketing through to lease execution. Trusted by Dexus, Lendlease, GPT, Stockland, Brookfield, Mirvac, Centuria, and more.',
      who_it_is_for:     'Institutional and private building owners with office assets in Sydney CBD, North Sydney, Barangaroo, and fringe markets.',
      problem_it_solves: 'Maximising rental outcomes and minimising vacancy in Sydney\'s competitive and complex office market — through targeted marketing, superior market intelligence, and experienced negotiation.',
      order_index:       0,
    },
    {
      name:              'Tenant Representation',
      category:          'Service',
      short_description: 'Independent, specialist advisory for businesses seeking office space in Sydney — including off-market opportunity identification, competitive lease negotiation, sub-leasing strategy, and market intelligence at no cost to the tenant.',
      who_it_is_for:     'Businesses of all sizes seeking premium, A-Grade, or B-Grade office space in Sydney CBD, North Sydney, Barangaroo, Pyrmont, or fringe markets.',
      problem_it_solves: 'Navigating Sydney\'s complex and rapidly changing office market without the knowledge, relationships, or negotiating leverage that only a specialist agent can provide.',
      order_index:       1,
    },
    {
      name:              'Market Research & Intelligence',
      category:          'Service',
      short_description: 'Bi-annual Sydney CBD and North Shore Market Pulse reports, bespoke tenant market reports, vacancy and absorption analytics, rental benchmarking, and leasing evidence research. Led by Research Director Lok So (24+ years experience).',
      who_it_is_for:     'Building owners, fund managers, developers, corporates, and government agencies requiring authoritative Sydney office market data and analysis.',
      problem_it_solves: 'Making informed, evidence-based decisions on office leasing, development, acquisition, and divestiture in Sydney\'s complex office market.',
      order_index:       2,
    },
    {
      name:              'Development Consultancy',
      category:          'Service',
      short_description: 'Strategic advisory for new and repositioned Sydney office projects — including floor plate optimisation, competitive rental benchmarking, tenant market depth analysis, and pre-commitment leasing strategy.',
      who_it_is_for:     'Developers, fund managers, and building owners planning new office construction or significant repositioning projects in Sydney.',
      problem_it_solves: 'Maximising the commercial viability and pre-commitment success of new office developments through expert leasing market intelligence from the earliest design stage.',
      order_index:       3,
    },
    {
      name:              'Flexible & Coworking Workspace',
      category:          'Offering',
      short_description: 'National flexible workspace advisory through Cadigal\'s joint venture with Rubberdesk — helping businesses find and compare serviced offices, coworking spaces, and flexible lease solutions across Australia.',
      who_it_is_for:     'Businesses seeking flexible office solutions alongside or as an alternative to traditional leases, including startups, scale-ups, and enterprise teams needing agile workspace.',
      problem_it_solves: 'Finding and evaluating the best flexible workspace options in a fragmented, fast-moving market — with objective, expert guidance.',
      order_index:       4,
    },
  ]

  const insertedSvcs = []
  for (const svc of services) {
    const { data, error } = await supabase.from('business_products_services').insert({
      ...svc,
      business_id:  userId,
      user_id:      userId,
      is_published: true,
      is_active:    true,
    }).select('id').single()
    if (error) console.warn(`  Service "${svc.name}": ${error.message}`)
    else { insertedSvcs.push({ id: data.id, name: svc.name }); console.log(`  ✓ ${svc.name} → id ${data.id}`) }
  }

  // ── 14. Product sub-tables ────────────────────────────────────────────────
  if (insertedSvcs.length === 5) {
    console.log('\n[14/14] Inserting service sub-tables...')
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
      { product_id: devcon,   business_id: userId, user_id: userId, role_name: 'Development Leasing Consultant', order_index: 1 },
      { product_id: flex,     business_id: userId, user_id: userId, role_name: 'Flexible Workspace Advisor',     order_index: 0 },
    ])

    await ins('business_product_skills', [
      { product_id: landlord, business_id: userId, user_id: userId, skill_name: 'Leasing Campaign Strategy' },
      { product_id: landlord, business_id: userId, user_id: userId, skill_name: 'Premium A-Grade Leasing' },
      { product_id: landlord, business_id: userId, user_id: userId, skill_name: 'Heads of Agreement Negotiation' },
      { product_id: landlord, business_id: userId, user_id: userId, skill_name: 'Lease Documentation' },
      { product_id: landlord, business_id: userId, user_id: userId, skill_name: 'Tenant Targeting & Outreach' },
      { product_id: tenant,   business_id: userId, user_id: userId, skill_name: 'Off-Market Space Identification' },
      { product_id: tenant,   business_id: userId, user_id: userId, skill_name: 'Sub-leasing & Assignment' },
      { product_id: tenant,   business_id: userId, user_id: userId, skill_name: 'Lease Negotiation' },
      { product_id: tenant,   business_id: userId, user_id: userId, skill_name: 'Market Comparison & Benchmarking' },
      { product_id: research, business_id: userId, user_id: userId, skill_name: 'Vacancy & Absorption Analysis' },
      { product_id: research, business_id: userId, user_id: userId, skill_name: 'Rental Benchmarking' },
      { product_id: research, business_id: userId, user_id: userId, skill_name: 'Tenant Demand Mapping' },
      { product_id: research, business_id: userId, user_id: userId, skill_name: 'Leasing Evidence Research' },
      { product_id: devcon,   business_id: userId, user_id: userId, skill_name: 'Floor Plate Design Advisory' },
      { product_id: devcon,   business_id: userId, user_id: userId, skill_name: 'Pre-commitment Leasing' },
      { product_id: devcon,   business_id: userId, user_id: userId, skill_name: 'Expert Witness Services' },
      { product_id: flex,     business_id: userId, user_id: userId, skill_name: 'Coworking Market Knowledge' },
      { product_id: flex,     business_id: userId, user_id: userId, skill_name: 'Flexible Lease Structures' },
    ])

    await ins('business_product_teams', [
      { product_id: landlord, business_id: userId, user_id: userId, team_name: 'Sydney CBD Leasing Team' },
      { product_id: landlord, business_id: userId, user_id: userId, team_name: 'North Sydney Leasing Team' },
      { product_id: tenant,   business_id: userId, user_id: userId, team_name: 'Sydney CBD Leasing Team' },
      { product_id: tenant,   business_id: userId, user_id: userId, team_name: 'North Sydney Leasing Team' },
      { product_id: research, business_id: userId, user_id: userId, team_name: 'Research & Analytics' },
      { product_id: devcon,   business_id: userId, user_id: userId, team_name: 'Executive Directors' },
      { product_id: flex,     business_id: userId, user_id: userId, team_name: 'Cadigal Rubberdesk' },
    ])

    await ins('business_product_growth_areas', [
      { product_id: landlord, business_id: userId, user_id: userId, growth_area: 'St Leonards / Crows Nest emerging precinct' },
      { product_id: landlord, business_id: userId, user_id: userId, growth_area: 'Pyrmont / Ultimo tech sector revival' },
      { product_id: landlord, business_id: userId, user_id: userId, growth_area: 'Chatswood suburban office market' },
      { product_id: tenant,   business_id: userId, user_id: userId, growth_area: 'Corporate return-to-office mandates driving expansion' },
      { product_id: tenant,   business_id: userId, user_id: userId, growth_area: 'Government agency office consolidations' },
      { product_id: research, business_id: userId, user_id: userId, growth_area: 'Digital Market Pulse interactive platform' },
      { product_id: devcon,   business_id: userId, user_id: userId, growth_area: 'Barangaroo South precinct development advisory' },
      { product_id: flex,     business_id: userId, user_id: userId, growth_area: 'Enterprise flexible workspace mandates' },
      { product_id: flex,     business_id: userId, user_id: userId, growth_area: 'National Rubberdesk platform expansion' },
    ])

    await ins('business_product_impact', [
      {
        product_id: landlord, business_id: userId, user_id: userId,
        who_it_helps:        'Institutional and private building owners seeking to maximise rental return and minimise vacancy in Sydney\'s competitive office market',
        what_it_improves:    'Leasing velocity, rental outcomes, tenant quality, and building occupancy rates',
        real_world_outcomes: 'Landmark results including 10 Shelley Street 100% pre-commitment, Australia Square Dexus Award winner, and consistent outperformance against market vacancy',
      },
      {
        product_id: tenant, business_id: userId, user_id: userId,
        who_it_helps:        'Businesses of all sizes navigating Sydney\'s complex office market',
        what_it_improves:    'Lease terms, rental rates, fit-out contributions, and space quality relative to business objectives',
        real_world_outcomes: 'Tenants secure better space at better terms — with the benefit of Cadigal\'s market intelligence and negotiating relationships with every major landlord in Sydney',
      },
      {
        product_id: research, business_id: userId, user_id: userId,
        who_it_helps:        'Fund managers, developers, corporates, and government agencies making major property decisions',
        what_it_improves:    'Decision quality and confidence through authoritative market data',
        real_world_outcomes: 'Bi-annual Market Pulse reports cited by Sydney\'s leading property investors; bespoke research enabling well-informed acquisition and leasing decisions',
      },
      {
        product_id: devcon, business_id: userId, user_id: userId,
        who_it_helps:        'Developers and building owners repositioning assets or developing new office projects in Sydney',
        what_it_improves:    'Leasing feasibility, pre-commitment strategy, and design-for-leasing optimisation',
        real_world_outcomes: '10 Shelley Street repositioning achieved 100% pre-commitment (Suncorp + Iress) before refurbishment completion — a landmark case study in Sydney office development consultancy',
      },
      {
        product_id: flex, business_id: userId, user_id: userId,
        who_it_helps:        'Businesses seeking flexible workspace alongside or instead of traditional office leases',
        what_it_improves:    'Speed of market entry, flexibility, and workspace quality for growing teams',
        real_world_outcomes: 'Cadigal Rubberdesk provides businesses a single trusted advisor for flexible and traditional leasing needs across Sydney and nationally',
      },
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

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\nCleaning up temp files...')
  try { fs.rmSync(tmpDir, { recursive: true }) } catch (_) {}

  console.log('\n════════════════════════════════════════════════════════════')
  console.log('  ✅  Cadigal Office Leasing profile created successfully!')
  console.log('════════════════════════════════════════════════════════════')
  console.log('  Login:    ' + DEMO_EMAIL)
  console.log('  Password: ' + DEMO_PASSWORD)
  console.log('  User ID:  ' + userId)
  console.log('  Location: ' + locationId)
  console.log('  Jobs:     ' + insertedJobs.length + ' created')
  console.log('  Services: ' + insertedSvcs.length + ' service areas')
  console.log('  Video:    ' + videoPublicUrl)
  console.log('════════════════════════════════════════════════════════════')
  console.log('\n  CREDENTIALS FOR DEMO USE:')
  console.log('  ─────────────────────────────────────────────────────────')
  console.log('  Email:    demo.cadigal@creerlio.com')
  console.log('  Password: DemoCaldigal2025!')
  console.log('  Role:     Business / Admin')
  console.log('  Company:  Cadigal Office Leasing Pty Ltd')
  console.log('  URL:      /business/cadigal (once profile page published)')
  console.log('════════════════════════════════════════════════════════════')
}

run().catch(err => {
  console.error('\n❌  FATAL:', err.message || err)
  process.exit(1)
})
