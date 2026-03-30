/**
 * Creates MinterEllison — a complete demo business profile on Creerlio.
 *
 * Creates:
 *  - Auth user: demo.minterellison@creerlio.com / DemoMinterEllison2025!
 *  - businesses + business_profiles + business_profile_pages
 *  - Sydney CBD location, roles, preferences
 *  - DALL-E logo + 9 images + 3 credential documents
 *  - TTS intro video (OpenAI + ffmpeg-static slideshow)
 *  - 3 link bank items + full profile metadata bank item
 *  - 4 published jobs
 *  - Products & services overview, roadmap, 5 practice area cards with sub-tables
 *
 * Run from /frontend:  node scripts/create-minterellison.js
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
  console.error('Missing env vars.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })

const BUCKET = 'business-bank'
const SLUG   = 'minterellison'

const DEMO_EMAIL    = 'demo.minterellison@creerlio.com'
const DEMO_PASSWORD = 'DemoMinterEllison2025!'

// ── DALL-E image definitions ──────────────────────────────────────────────────

const IMAGES = [
  {
    key: 'logo',
    filename: 'me-logo.jpg',
    bankType: 'logo',
    title: 'MinterEllison — Official Brand Logo',
    description: 'Official MinterEllison brand logo.',
    prompt: 'Premium Australian law firm logo on pure white background, bold clean modern wordmark "MINTERELLISON" in deep navy blue (#002366), minimalist corporate identity with thin horizontal rule accent in gold, perfectly centered, professional vector-style illustration, no people, no photos',
    size: '1024x1024',
  },
  {
    key: 'hero',
    filename: 'me-hero.jpg',
    bankType: 'image',
    title: 'MinterEllison — Sydney CBD Office, Governor Macquarie Tower',
    prompt: 'Prestigious corporate law firm exterior at Governor Macquarie Tower Sydney CBD Australia, modern glass skyscraper at golden hour, Sydney Harbour visible in background, premium professional signage, architectural corporate photography, clear blue sky, polished street-level perspective',
    size: '1792x1024',
  },
  {
    key: 'interior',
    filename: 'me-office.jpg',
    bankType: 'image',
    title: 'MinterEllison — Premium Sydney CBD Office Interior',
    prompt: 'Premium large Australian law firm open-plan office interior with panoramic city views through floor-to-ceiling windows, modern ergonomic collaborative workstations, diverse legal professionals working together, natural light, contemporary navy blue and white colour palette, sophisticated professional environment',
    size: '1792x1024',
  },
  {
    key: 'boardroom',
    filename: 'me-boardroom.jpg',
    bankType: 'image',
    title: 'MinterEllison — Partner Strategy Session',
    prompt: 'Senior diverse law firm partners in high-level strategy meeting around a premium boardroom table, Sydney CBD skyline visible through floor-to-ceiling windows, 50-50 gender balance, thoughtful engaged professionals in premium business attire, collaborative atmosphere, corporate documentary photography',
    size: '1792x1024',
  },
  {
    key: 'graduates',
    filename: 'me-graduates.jpg',
    bankType: 'image',
    title: 'MinterEllison — Graduate & Clerkship Cohort',
    prompt: 'Diverse group of young graduate lawyers and law clerks at a top-tier Australian law firm, modern collaborative workspace, genuine smiles and professional engagement, mixed gender and cultural backgrounds, casual business attire, natural light, inclusive welcoming team culture',
    size: '1792x1024',
  },
  {
    key: 'awards',
    filename: 'me-awards.jpg',
    bankType: 'image',
    title: 'MinterEllison — Chambers & Best Lawyers Awards Night',
    prompt: 'Premier Australian legal industry awards ceremony night, law firm partners accepting major award on a premium stage, elegant black-tie gala venue, professional award ceremony photography, celebratory atmosphere, branded backdrop, diverse award recipients',
    size: '1792x1024',
  },
  {
    key: 'culture',
    filename: 'me-culture.jpg',
    bankType: 'image',
    title: 'MinterEllison — Inclusive Culture & Belonging',
    prompt: 'Diverse inclusive Australian law firm team in a relaxed modern breakout lounge, mixed genders and cultural backgrounds, genuine laughter and connection, casual Friday professional attire, colourful modern office with plants and natural light, authentic team culture photography',
    size: '1792x1024',
  },
  {
    key: 'probono',
    filename: 'me-probono.jpg',
    bankType: 'image',
    title: 'MinterEllison — Pro Bono & Community Legal Clinic',
    prompt: 'Professional law firm team conducting a pro bono community legal clinic, diverse lawyers at tables helping community members one-on-one, warm supportive environment, inclusive and accessible setting, professional documentary photography, genuine human connection',
    size: '1792x1024',
  },
  {
    key: 'esg',
    filename: 'me-esg.jpg',
    bankType: 'image',
    title: 'MinterEllison — ESG & Sustainability Leadership',
    prompt: 'Australian corporate law firm ESG sustainability initiative, diverse professional team reviewing renewable energy and clean tech project documents, modern office with sustainability visuals, green plants, natural light, collaborative professional setting, genuine engagement',
    size: '1792x1024',
  },
  {
    key: 'sydney',
    filename: 'me-sydney.jpg',
    bankType: 'image',
    title: 'MinterEllison — Sydney CBD & Harbour Skyline',
    prompt: 'Spectacular panoramic aerial view of Sydney CBD skyline from premium law firm office floor, Sydney Opera House and Harbour Bridge visible, harbour glittering in afternoon light, high-rise glass towers, aspirational corporate perspective, professional photography',
    size: '1792x1024',
  },
]

const CREDENTIAL_DOCS = [
  {
    key: 'chambers',
    filename: 'me-chambers-ranking.jpg',
    bankType: 'document',
    title: 'Chambers Asia-Pacific 2024 — 37 Category Rankings',
    prompt: 'Premium law firm achievement certificate for Chambers Asia-Pacific 2024 rankings, elegant dark navy and gold certificate design with firm name "MinterEllison", "37 Category Rankings" headline, professional legal industry credential framing',
    size: '1024x1024',
  },
  {
    key: 'bestlawyers',
    filename: 'me-best-lawyers.jpg',
    bankType: 'document',
    title: 'Best Lawyers 2025 — Law Firm of the Year (Real Property)',
    prompt: 'Premium law firm industry award certificate, deep navy and gold colour scheme, "Best Lawyers Australia 2025" text, "Law Firm of the Year — Real Property Law" award designation, "MinterEllison" firm name, elegant professional certificate design',
    size: '1024x1024',
  },
  {
    key: 'wgea',
    filename: 'me-wgea-cert.jpg',
    bankType: 'document',
    title: 'WGEA Employer of Choice for Gender Equality — 14 Consecutive Years',
    prompt: 'Official WGEA Employer of Choice for Gender Equality certification 2024, professional Australian government style certification document, purple and white colour scheme, MinterEllison name, 14 consecutive years recognition badge, formal credential design',
    size: '1024x1024',
  },
]

// ── TTS Narration ─────────────────────────────────────────────────────────────

const NARRATION = [
  'Welcome to MinterEllison.',
  'For nearly two hundred years, we have partnered with Australia\'s most significant organisations — businesses, governments, and communities — to deliver sharp legal insight and elevated perspective.',
  'We are Australia\'s largest law firm.',
  'With more than twelve hundred legal professionals, two hundred and fifty partners, and offices across Australia and around the world, we bring the scale, expertise, and depth of relationships to tackle the challenges that matter most.',
  'Our integrated model combines leading legal capabilities with specialist consulting — across corporate and commercial law, banking and finance, construction and infrastructure, technology and data, energy and resources, employment and safety, and more.',
  'We are proud to serve thirty-six of Australia\'s ASX fifty companies, advise on landmark government infrastructure projects, and support communities through more than eleven million dollars in pro bono legal services each year.',
  'But what truly sets us apart is our people.',
  'Our culture of excellence, curiosity, and collaboration attracts the finest legal minds. We are a WGEA Employer of Choice for Gender Equality for fourteen consecutive years. An LGBTQ plus Platinum Employer. And we are recognised by peers with more than thirty-seven Chambers rankings and one hundred and eighty-six practitioners named in Best Lawyers 2025.',
  'We are a Climate Active Certified organisation, committed to achieving net zero by 2030.',
  'If you are an exceptional legal professional ready to work on the matters that shape Australia and the Asia-Pacific region — we invite you to discover what it means to be uniquely MinterEllison.',
  'MinterEllison. Sharp insight. Elevated perspective.',
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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'me-profile-'))
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
      user_metadata: { full_name: 'MinterEllison', user_type: 'business' },
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
  let audioDur = 60
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

  const videoFilename  = 'me-intro-video.mp4'
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

  const videoSize    = fs.statSync(videoLocalPath).size
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

  // Images & credentials
  for (const img of allImages) {
    const r = imageResults[img.key]
    if (!r) continue
    const { data, error } = await supabase.from('business_bank_items').insert({
      user_id:   userId,
      item_type: img.bankType,
      title:     img.title,
      description: img.description || null,
      file_path: r.storagePath,
      file_url:  r.fileUrl,
      file_type: 'image/jpeg',
      file_size: fs.statSync(r.tmpPath).size,
      metadata:  {},
      is_active: true,
    }).select('id').single()
    if (error) console.warn(`  Bank item ${img.key}: ${error.message}`)
    else { bankItems.push({ key: img.key, id: data.id }); console.log(`  ✓ ${img.key} → id ${data.id}`) }
  }

  // Intro video
  const { data: vidItem, error: vidItemErr } = await supabase.from('business_bank_items').insert({
    user_id:   userId,
    item_type: 'business_introduction',
    title:     'MinterEllison — Firm Introduction Video',
    description: 'Official MinterEllison introduction: our history, people, practice areas, and why the best legal minds choose MinterEllison.',
    file_path: videoStoragePath,
    file_url:  videoPublicUrl,
    file_type: 'video/mp4',
    file_size: videoSize,
    metadata:  { duration: Math.round(audioDur) },
    is_active: true,
  }).select('id').single()
  if (vidItemErr) console.warn('  Video bank item error:', vidItemErr.message)
  else { bankItems.push({ key: 'video', id: vidItem.id }); console.log(`  ✓ video → id ${vidItem.id}`) }

  // Links
  const links = [
    { title: 'MinterEllison Website',                url: 'https://www.minterellison.com' },
    { title: 'MinterEllison LinkedIn',               url: 'https://au.linkedin.com/company/minter-ellison' },
    { title: 'MinterEllison Graduates Portal',       url: 'https://graduates.minterellison.com' },
    { title: 'Chambers Asia-Pacific Rankings',       url: 'https://chambers.com/law-firm/minterellison-global-2:3601' },
  ]
  for (const lnk of links) {
    const { data, error } = await supabase.from('business_bank_items').insert({
      user_id: userId, item_type: 'link', title: lnk.title, file_url: lnk.url, is_active: true,
    }).select('id').single()
    if (error) console.warn(`  Link "${lnk.title}": ${error.message}`)
    else { bankItems.push({ key: 'link_' + lnk.title.slice(0, 15), id: data.id }); console.log(`  ✓ link → ${lnk.title}`) }
  }

  // ── 6. Build profile metadata ─────────────────────────────────────────────
  const logoItem    = bankItems.find(b => b.key === 'logo')
  const heroItem    = bankItems.find(b => b.key === 'hero')
  const videoItemId = bankItems.find(b => b.key === 'video')

  const attachments = bankItems
    .filter(b => ['interior','boardroom','graduates','awards','culture','probono','esg','sydney','chambers','bestlawyers','wgea'].includes(b.key))
    .map(b => ({ id: b.id }))

  const profileMetadata = {
    bio: `MinterEllison is Australia's largest law firm — and one of its oldest, with roots stretching back to 1827. With more than 1,200 legal professionals and 250 partners across 8 Australian offices and 20+ international locations, we deliver sharp legal insight and elevated commercial perspective to the organisations that shape our nation.\n\nOur clients include 36 of Australia's ASX50 companies, major Federal and State government departments, and leading organisations across financial services, energy & resources, infrastructure, technology, health, and education. We have advised on more than $156 billion in infrastructure projects, $68 billion in M&A transactions, and $10 billion in technology projects.\n\nBeyond legal excellence, we are committed to making a genuine difference — through more than $11 million in annual pro bono legal services, a Reconciliation Action Plan, Climate Active Carbon Neutral certification, and our goal of reaching net zero by 2030.\n\nOur 'Uniquely ME' culture is built on five pillars: Collaborate with the Best, Embody Excellence, Ignite Your Curiosity, Achieve Your Ambitions, and Belong and Be Valued. For fourteen consecutive years we have been recognised as a WGEA Employer of Choice for Gender Equality, and we are an LGBTQ+ AWEI Platinum Employer.\n\nIf you are ready to work on Australia's most significant legal matters — with a firm that genuinely invests in your growth — we want to hear from you.`,
    tagline: 'Sharp insight. Elevated perspective.',
    businessType: 'law-firm',
    industry: 'Legal Services',
    specialisations: ['Corporate & M&A', 'Banking & Finance', 'Construction & Infrastructure', 'Technology & Data', 'Energy & Resources', 'Employment & Safety', 'Dispute Resolution', 'Tax', 'Real Estate & Property', 'Government Advisory'],
    founded: 1827,
    size: '1000+',
    website: 'https://www.minterellison.com',
    logoId: logoItem?.id || null,
    heroImageId: heroItem?.id || null,
    introVideoId: videoItemId?.id || null,
    introVideoUrl: videoPublicUrl,
    attachmentIds: attachments.map(a => a.id),
    socialLinks: {
      linkedin: 'https://au.linkedin.com/company/minter-ellison',
      website:  'https://www.minterellison.com',
      graduates: 'https://graduates.minterellison.com',
    },
    skills: [
      'Corporate Law', 'M&A Advisory', 'Banking & Finance', 'Construction Law',
      'Technology & Data Law', 'Energy & Resources Law', 'Employment Law',
      'Dispute Resolution', 'Tax Advisory', 'Real Estate Law',
      'Government & Regulatory', 'ESG Advisory', 'Intellectual Property',
      'White-Collar Crime', 'Restructuring & Insolvency',
    ],
    cultureQA: [
      {
        question: 'What makes MinterEllison different from other large law firms?',
        answer: 'Our integrated model combines leading legal capabilities with specialist consulting — so our clients get sharp legal advice and practical commercial strategy in one place. We are also genuinely committed to innovation: we were early adopters of AI-enabled legal technology and continue to invest heavily in digital tools that make our lawyers more effective.',
      },
      {
        question: 'How does MinterEllison approach career development?',
        answer: 'Development at MinterEllison is structured and intentional. Our Graduate Program includes up to three six-month rotations across practice groups, funded Practical Legal Training, mentorship from senior practitioners, and tailored orientation. Senior lawyers benefit from our Emerging Leaders program, partnership track mentoring, and secondment opportunities with major clients domestically and internationally.',
      },
      {
        question: 'What is the culture like day-to-day?',
        answer: '"Uniquely ME" captures it well — ambitious, curious, collaborative, and inclusive. We work hard on genuinely important matters, and we celebrate diverse thinking and lived experience. From our Pride Mardi Gras participation to our 14-year WGEA Employer of Choice status, inclusion isn\'t a program — it\'s how we operate.',
      },
      {
        question: 'How does MinterEllison approach sustainability and ESG?',
        answer: 'We are a certified Carbon Neutral Organisation under the Australian Government\'s Climate Active program. Our near-term target is to reduce Scope 1 and 2 emissions to net zero by 2030, with Scope 3 targets also in place. All offices operate on renewable energy where available. We embed ESG advisory into our practice and lead by example on responsible business.',
      },
    ],
  }

  const { data: metaItem, error: metaErr } = await supabase.from('business_bank_items').insert({
    user_id:   userId,
    item_type: 'profile',
    title:     'MinterEllison — Business Profile',
    metadata:  profileMetadata,
    is_active: true,
  }).select('id').single()
  if (metaErr) console.warn('  Profile metadata error:', metaErr.message)
  else console.log(`  ✓ Profile metadata → id ${metaItem.id}`)

  // ── 7. Create business record ─────────────────────────────────────────────
  console.log('\n[6/14] Creating business records...')
  const { error: bizErr } = await supabase.from('businesses').upsert({
    id:       userId,
    name:     'MinterEllison',
    industry: 'Legal Services',
  }, { onConflict: 'id' })
  if (bizErr) console.warn('  businesses:', bizErr.message)
  else console.log('  ✓ businesses')

  // ── 8. Create business_profiles ───────────────────────────────────────────
  const logoUrl = imageResults.logo?.fileUrl || null
  const heroUrl = imageResults.hero?.fileUrl || null

  const { error: bpErr } = await supabase.from('business_profiles').upsert({
    id:            userId,
    user_id:       userId,
    business_name: 'MinterEllison',
    tagline:       'Sharp insight. Elevated perspective.',
    bio:           profileMetadata.bio,
    website:       'https://www.minterellison.com',
    logo_url:      logoUrl,
    hero_image_url: heroUrl,
    industry:      'Legal Services',
    business_type: 'law-firm',
    founded_year:  1827,
    company_size:  '1000+',
    city:          'Sydney',
    state:         'NSW',
    country:       'Australia',
    linkedin_url:  'https://au.linkedin.com/company/minter-ellison',
    is_published:  true,
  }, { onConflict: 'id' })
  if (bpErr) console.warn('  business_profiles:', bpErr.message)
  else console.log('  ✓ business_profiles')

  // ── 9. Create business_profile_pages ─────────────────────────────────────
  const { error: bppErr } = await supabase.from('business_profile_pages').upsert({
    business_id:   userId,
    slug:          SLUG,
    is_published:  true,
    name:          'MinterEllison',
    logo_url:      logoUrl,
    hero_image_url: heroUrl,
    tagline:       'Sharp insight. Elevated perspective.',
    mission:       'MinterEllison exists to create sustainable value with our clients, our people, and our communities. We combine nearly 200 years of legal heritage with a forward-looking, innovation-first approach — delivering sharp insight and elevated perspective on Australia\'s most significant matters.',
    value_prop_headline: 'Australia\'s most trusted law firm — integrated legal and consulting expertise for the challenges that matter most',
    value_prop_body: 'We advise 36 of the ASX50, lead on $156B+ in infrastructure projects, and deliver more than $11M in annual pro bono legal services. Our integrated model brings together Australia\'s deepest bench of legal talent and specialist consulting expertise — giving clients a single, trusted partner for even the most complex challenges.',
    impact_stats: [
      { label: 'Years of History',       value: '195+' },
      { label: 'Partners',               value: '250+' },
      { label: 'Legal Professionals',    value: '1,200+' },
      { label: 'ASX50 Clients',          value: '36' },
      { label: 'Offices Globally',       value: '20+' },
      { label: 'Pro Bono Value (annual)', value: '$11M+' },
    ],
    culture_values: [
      {
        title:       'Excellence',
        description: 'The hallmark of everything we do. We set the standard — in our advice, in our relationships, and in how we show up every day.',
      },
      {
        title:       'Curiosity',
        description: 'We ask better questions, explore new approaches, and embrace innovation — including AI-enabled legal practice — to solve complex problems in new ways.',
      },
      {
        title:       'Collaboration',
        description: 'We work as one integrated firm — across practice groups, offices, and disciplines — to deliver the best possible outcome for every client.',
      },
      {
        title:       'Inclusion',
        description: 'Belonging is not a policy — it\'s our culture. 65% of our workforce are women. We are an LGBTQ+ AWEI Platinum Employer. Diverse thinking makes us better.',
      },
      {
        title:       'Responsibility',
        description: 'We lead by example on environmental sustainability, reconciliation, and pro bono service — because being Australia\'s most trusted law firm means more than legal excellence.',
      },
    ],
    business_areas: [
      {
        name:        'Corporate & M&A',
        description: 'Market-leading advice on public and private market transactions, cross-border M&A, private equity, and joint ventures. Acted on $68B+ in M&A transactions.',
      },
      {
        name:        'Banking & Finance',
        description: 'Full-service banking and finance advice across property finance, asset finance, corporate lending, debt capital markets, and securitisation.',
      },
      {
        name:        'Construction & Infrastructure',
        description: 'Australia\'s leading construction and infrastructure legal practice. Advised on $156B+ in infrastructure projects including the Melbourne Metro.',
      },
      {
        name:        'Technology, Digital & Data',
        description: 'Expert advice on technology transactions, AI governance, data privacy, digital transformation, and cyber security for Australia\'s leading organisations.',
      },
      {
        name:        'Energy & Resources',
        description: 'Comprehensive advice on mining, critical minerals, hydrogen, petroleum, renewable energy, and the regulatory frameworks shaping Australia\'s energy transition.',
      },
      {
        name:        'Employment & Safety',
        description: 'End-to-end employment law — enterprise bargaining, workplace health & safety, Fair Work Commission proceedings, and workplace investigations.',
      },
    ],
    benefits: [
      { title: 'Market-Leading Remuneration',   description: 'Competitive salary packages benchmarked to top-tier legal market, with transparent progression and bonus structures.' },
      { title: 'Flexible Working',              description: 'Hybrid work arrangements across all offices — structured flexibility for legal professionals at every career stage.' },
      { title: 'Parental Leave',                description: 'Up to 26 weeks paid parental leave for all parents, with superannuation paid for 12 months including unpaid leave.' },
      { title: 'Wellbeing Support',             description: 'Employee Assistance Program, fitness subsidies, mental health days, and access to the ME Wellbeing Hub.' },
      { title: 'Professional Development',      description: 'Funded CPD, PLT support for graduates, Emerging Leaders program, and international secondment opportunities.' },
      { title: 'Inclusion Leave',               description: 'Cultural and religious leave (2 days paid), gender affirmation leave (6 weeks paid), and 10 days paid domestic violence leave.' },
      { title: 'Technology & Innovation Access', description: 'Early access to AI-enabled legal tools, innovation labs, and tech upskilling programs as we shape the future of legal practice.' },
    ],
    programs: [
      {
        name:        'Graduate Program',
        description: 'Up to three six-month rotations across different practice groups, funded Practical Legal Training, dedicated mentorship, and full support through admission to the legal profession.',
        url:         'https://graduates.minterellison.com',
      },
      {
        name:        'Clerkship Program',
        description: 'Summer and winter holiday placements for penultimate and final-year law students. Real work on active client matters — the most authentic preview of life at MinterEllison.',
        url:         'https://graduates.minterellison.com/clerkship-program',
      },
      {
        name:        'Discover ME',
        description: 'Three in-person sessions for pre-penultimate law students at Sydney, Melbourne, or Brisbane — early exposure to the firm and pathways into a career in law.',
        url:         'https://graduates.minterellison.com',
      },
      {
        name:        'MinterEllison Flex',
        description: 'On-demand, flexible legal professional engagements for experienced lawyers seeking project-based or interim arrangements with a top-tier firm.',
        url:         'https://www.minterellison.com/careers/minterellison-flex',
      },
    ],
    social_proof: [
      {
        quote:  'A practical, commercially savvy team that knows how to navigate clients through the intricacies of public and private market deals.',
        source: 'Legal 500 — Corporate & M&A',
      },
      {
        quote:  'Incredible depth of expertise and talent for dealing with complex or intractable industrial relations issues.',
        source: 'Legal 500 — Labour & Employment',
      },
      {
        quote:  'Excellent technical capability and breadth of experience across debt, securitisation and equity matters.',
        source: 'Legal 500 — Capital Markets',
      },
      {
        quote:  'We are thrilled to have been recognised as Australia\'s Law Firm of the Year in Real Property Law for the second year running.',
        source: 'Virginia Briggs, CEO & Managing Partner',
      },
    ],
    hiring_interests: [
      'Senior Associates & Special Counsel across all practice groups',
      'Technology, Digital & Data lawyers — all levels',
      'Energy & Resources Associates (critical minerals, hydrogen, renewables)',
      'M&A / Private Equity Associates',
      'Graduate Solicitors — all major offices',
      'Law Clerks (Summer & Winter programs)',
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
    contact_email:   'careers@minterellison.com',
    website_url:     'https://www.minterellison.com',
    enquiry_enabled: true,
    acknowledgement_of_country: 'MinterEllison acknowledges the Traditional Custodians of the land and waters on which we live and work across Australia, and we pay our respects to their Elders past, present and emerging. We are committed to reconciliation and to walking alongside First Nations communities.',
    live_roles_count:         4,
    talent_community_enabled: true,
    portfolio_intake_enabled: true,
    media_assets: {
      intro_video_url: videoPublicUrl,
      logo_url:        logoUrl,
      hero_image_url:  heroUrl,
    },
    badges: ['Top Tier Legal', 'WGEA Employer of Choice', 'AWEI Platinum', 'Climate Active Certified', 'Chambers Ranked'],
  }, { onConflict: 'business_id' })
  if (bppErr) console.warn('  business_profile_pages:', bppErr.message)
  else console.log('  ✓ business_profile_pages')

  // ── 10. Create location ───────────────────────────────────────────────────
  console.log('\n[7/14] Creating location...')
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
      name:        'MinterEllison — Governor Macquarie Tower, Sydney CBD',
      address:     'Level 40, Governor Macquarie Tower, 1 Farrer Place',
      city:        'Sydney',
      state:       'NSW',
      country:     'Australia',
      lat:         -33.8651,
      lng:         151.2099,
    }).select('id').single()
    if (locErr) throw new Error('Create location: ' + locErr.message)
    locationId = newLoc.id
    console.log('  Created location:', locationId)
  }

  // ── 11. Roles & preferences ───────────────────────────────────────────────
  console.log('\n[8/14] Creating roles and preferences...')
  await supabase.from('user_business_roles').upsert({ user_id: userId, business_id: userId, role: 'business_admin' }, { onConflict: 'user_id,business_id' })
  await supabase.from('user_location_roles').upsert({ user_id: userId, location_id: locationId, role: 'location_admin' }, { onConflict: 'user_id,location_id' })
  await supabase.from('user_preferences').upsert({ user_id: userId, active_business_id: userId, active_location_id: locationId }, { onConflict: 'user_id' })
  console.log('  ✓ Roles and preferences set')

  // ── 12. Create jobs ───────────────────────────────────────────────────────
  console.log('\n[9/14] Creating job vacancies...')
  const jobs = [
    {
      title:           'Senior M&A Associate — Corporate & Commercial',
      description:     `MinterEllison is seeking a Senior Associate to join our market-leading Corporate & M&A Practice Group in Sydney.\n\nWork on Australia's most significant public and private market transactions — from ASX-listed mergers and acquisitions to complex cross-border deals involving some of the world's largest corporations.\n\n**The Role**\nYou will manage a diverse portfolio of M&A, private equity, and corporate advisory matters, working directly with partners and clients on active transactions. You will lead junior teams, develop client relationships, and contribute to business development.\n\n**Key Responsibilities**\n- Lead M&A due diligence, structuring, and transaction execution\n- Draft and negotiate complex transaction documents\n- Advise on corporate governance, shareholder arrangements, and regulatory matters\n- Mentor and supervise junior lawyers and graduates\n- Contribute to client relationship development and pitch materials\n\n**What We Offer**\n- Market-leading remuneration with transparent progression\n- Direct access to Australia's most significant corporate transactions\n- Mentorship from award-winning M&A partners\n- International secondment opportunities\n- Hybrid flexibility and wellbeing support`,
      city:            'Sydney',
      state:           'NSW',
      country:         'Australia',
      location:        'Sydney CBD, NSW, Australia',
      employment_type: 'Full-time',
      experience_level: 'Senior',
      salary_min:      200000,
      salary_max:      260000,
      salary_currency: 'AUD',
      required_skills: ['Corporate Law', 'M&A Advisory', 'Due Diligence', 'Transaction Management', 'Contract Drafting'],
      preferred_skills: ['Cross-Border M&A', 'Private Equity', 'ASX Listed Companies', 'Capital Markets'],
      requirements:    '- Admitted to practise in Australia with 5+ years PQE in corporate/M&A law\n- Strong track record advising on public or private market transactions\n- Excellent drafting, negotiation, and analytical skills\n- Strong client management and communication capability\n- Ability to lead junior teams and manage competing priorities',
    },
    {
      title:           'Technology, Digital & Data Senior Associate — Sydney or Melbourne',
      description:     `Join MinterEllison's rapidly growing Technology, Digital & Data Practice Group — one of Australia's premier technology law teams.\n\nAdvise leading corporations, government agencies, and technology companies on AI governance, data privacy, technology procurement, digital transformation, and cybersecurity. This is one of the most dynamic practice areas in Australian law.\n\n**The Role**\nYou will work alongside leading technology lawyers advising on complex tech transactions, data privacy compliance (Privacy Act reform, GDPR), AI governance frameworks, and digital transformation projects for major Australian and international clients.\n\n**Key Responsibilities**\n- Advise clients on technology contracts, SaaS, cloud, and outsourcing agreements\n- Provide data privacy and AI governance advice (Privacy Act, GDPR, AI frameworks)\n- Lead technology due diligence on M&A transactions\n- Advise on cybersecurity incidents and regulatory notifications\n- Develop and deliver client training on emerging technology law\n\n**What We Offer**\n- Early access to AI-enabled legal tools and innovation programs\n- Work on cutting-edge technology and AI governance mandates\n- Hybrid working — Sydney or Melbourne offices\n- International technology law network access`,
      city:            'Sydney',
      state:           'NSW',
      country:         'Australia',
      location:        'Sydney or Melbourne, Australia',
      employment_type: 'Full-time',
      experience_level: 'Mid-level',
      salary_min:      160000,
      salary_max:      210000,
      salary_currency: 'AUD',
      required_skills: ['Technology Law', 'Data Privacy', 'Contract Drafting', 'AI Governance', 'Cybersecurity Law'],
      preferred_skills: ['Privacy Act Reform', 'GDPR', 'Cloud Computing Agreements', 'SaaS Contracts', 'Digital Transformation'],
      requirements:    '- Admitted to practise in Australia with 4+ years PQE in technology or commercial law\n- Sound knowledge of Australian privacy law and digital regulatory frameworks\n- Experience drafting and negotiating technology and data agreements\n- Strong analytical ability and client communication skills\n- Interest in AI, data, and the future of digital regulation',
    },
    {
      title:           'Energy & Resources Associate — Critical Minerals & Clean Energy',
      description:     `MinterEllison is seeking an Associate to join our Energy & Resources Practice Group, focused on Australia's booming critical minerals and clean energy sectors.\n\nAdvise on the transactions and regulatory frameworks shaping Australia's energy transition — including critical minerals project development, hydrogen energy infrastructure, renewable energy finance, and resources M&A.\n\n**The Role**\nYou will support partners and senior associates on energy and resources transactions and regulatory matters, developing deep expertise in one of Australia's most strategically important sectors.\n\n**Key Responsibilities**\n- Assist on critical minerals project development and joint venture agreements\n- Support due diligence and documentation for resources M&A transactions\n- Research and advise on energy regulatory frameworks and government policy\n- Assist with renewable energy project finance and offtake agreements\n- Develop client materials and contribute to sector knowledge initiatives\n\n**What We Offer**\n- Work at the heart of Australia's energy transition\n- Access to a national and international energy & resources practice\n- Structured development pathway with clear partnership track\n- Perth, Brisbane, or Sydney office`,
      city:            'Perth',
      state:           'WA',
      country:         'Australia',
      location:        'Perth, Brisbane or Sydney, Australia',
      employment_type: 'Full-time',
      experience_level: 'Mid-level',
      salary_min:      130000,
      salary_max:      170000,
      salary_currency: 'AUD',
      required_skills: ['Energy Law', 'Resources Law', 'Contract Drafting', 'Regulatory Advice', 'Due Diligence'],
      preferred_skills: ['Critical Minerals', 'Renewable Energy', 'Hydrogen Projects', 'Project Finance', 'Joint Ventures'],
      requirements:    '- Admitted to practise in Australia with 2–5 years PQE in energy, resources, or commercial law\n- Interest in the energy transition, critical minerals, and clean energy sectors\n- Strong research, drafting, and analytical skills\n- Ability to manage multiple matters simultaneously\n- WA or QLD Practicing Certificate preferred (or ability to apply)',
    },
    {
      title:           'Graduate Solicitor — Multiple Offices (Sydney, Melbourne, Brisbane, Perth)',
      description:     `MinterEllison\'s Graduate Program is one of the most respected legal graduate programs in Australia — and your next chapter starts here.\n\nJoin a cohort of exceptional graduates and rotate across up to three different practice groups over 12–18 months, gaining genuine hands-on experience on matters that shape Australia.\n\n**What You Will Do**\n- Complete up to three six-month rotations across different practice groups\n- Work directly with partners and senior lawyers on active client matters\n- Undertake funded Practical Legal Training (PLT)\n- Build technical and commercial skills through structured development programs\n- Receive dedicated mentor support throughout admission and beyond\n\n**Practice Groups Include**\nCorporate & M&A | Banking & Finance | Construction & Infrastructure | Technology & Data | Energy & Resources | Employment & Safety | Dispute Resolution | Tax | Real Estate & Property | Government\n\n**What MinterEllison Offers Graduates**\n- Market-competitive graduate salary with annual progression\n- Funded PLT and professional development programs\n- Mentorship from leading practitioners in your area of interest\n- Access to innovation, AI, and technology programs\n- Inclusive culture — WGEA Employer of Choice for 14 years running\n- Flexible hybrid working from day one`,
      city:            'Sydney',
      state:           'NSW',
      country:         'Australia',
      location:        'Sydney, Melbourne, Brisbane, Perth — all offices',
      employment_type: 'Full-time',
      experience_level: 'Graduate',
      salary_min:      75000,
      salary_max:      95000,
      salary_currency: 'AUD',
      required_skills: ['Legal Research', 'Legal Drafting', 'Client Communication', 'Attention to Detail', 'Time Management'],
      preferred_skills: ['Clerkship Experience', 'Commercial Law Studies', 'Moot Experience', 'Pro Bono Work'],
      requirements:    '- Completed or completing an LLB or JD (admitted or eligible for admission in relevant state)\n- Strong academic record with demonstrated commercial interest\n- Genuine curiosity and commitment to legal excellence\n- Excellent written and verbal communication skills\n- Ability to work collaboratively in a fast-paced environment',
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
  console.log('\n[10/14] Inserting products & services overview...')

  const { error: ovErr } = await supabase.from('business_products_services_overview').upsert({
    business_id: userId,
    user_id:     userId,
    short_headline: 'Australia\'s Leading Integrated Legal & Consulting Firm — 20+ Practice Areas',
    summary:     'MinterEllison delivers expert legal and consulting advice across every major practice area — from corporate M&A and banking & finance, to construction, technology & data, energy & resources, employment, and government advisory. With nearly 200 years of heritage and a forward-looking innovation culture, we bring sharp insight and elevated perspective to Australia\'s most significant commercial and regulatory challenges.',
    primary_industries: ['Legal Services', 'Corporate & M&A', 'Banking & Finance', 'Construction & Infrastructure', 'Technology & Data', 'Energy & Resources', 'Government Advisory'],
    business_model: 'B2B',
    is_public:   true,
  }, { onConflict: 'business_id' })
  if (ovErr) console.warn('  Overview:', ovErr.message)
  else console.log('  ✓ Overview')

  console.log('\n[11/14] Inserting product roadmap...')
  const { error: rmErr } = await supabase.from('business_product_roadmap').upsert({
    business_id: userId,
    user_id:     userId,
    upcoming_products: [
      'ME AI Legal Companion — AI-powered legal research and document review for in-house clients',
      'ME Flex 2.0 — expanded flexible legal professional platform for enterprise and government clients',
    ],
    roadmap_ideas:   'Deepening investment in purpose-built generative AI tools for legal drafting, contract analysis, and regulatory monitoring — co-developed with major institutional clients.',
    expansion_plans: 'Opening a specialist AI & Technology Law hub within the Sydney office in 2026; further deepening our Singapore presence to service growing South-East Asian mandates.',
    new_markets:     'Expanding critical minerals and clean energy advisory capabilities as Australia positions itself as a global leader in the energy transition and the Government\'s Future Made in Australia policy agenda.',
    is_public:       true,
  }, { onConflict: 'business_id' })
  if (rmErr) console.warn('  Roadmap:', rmErr.message)
  else console.log('  ✓ Roadmap')

  console.log('\n[12/14] Inserting practice area cards...')
  const services = [
    {
      name:              'Corporate & M&A',
      category:          'Service',
      short_description: 'Market-leading advice on public and private M&A, private equity, joint ventures, and cross-border transactions. Acted on $68B+ in transactions for ASX-listed and international clients.',
      who_it_is_for:     'ASX-listed companies, private equity funds, government-linked entities, international corporates, and Australian businesses seeking M&A advisory.',
      problem_it_solves: 'Navigating the complexity, risk, and regulatory requirements of major corporate transactions — from initial due diligence through to post-completion integration.',
      order_index:       0,
    },
    {
      name:              'Banking & Finance',
      category:          'Service',
      short_description: 'Comprehensive banking and finance advice across property finance, corporate lending, asset finance, debt capital markets, and securitisation for Australia\'s leading financial institutions.',
      who_it_is_for:     'Major Australian and international banks, non-bank lenders, borrowers, REITs, and financial institutions requiring expert finance law advice.',
      problem_it_solves: 'Structuring and documenting complex financing arrangements, navigating banking regulation, and providing certainty on large-scale transactions.',
      order_index:       1,
    },
    {
      name:              'Construction & Infrastructure',
      category:          'Service',
      short_description: 'Australia\'s leading construction and infrastructure legal practice. $156B+ in infrastructure project advisory including the Melbourne Metro, major road, rail, and public-private partnerships.',
      who_it_is_for:     'State and Federal government departments, infrastructure developers, construction contractors, project financiers, and PPP participants.',
      problem_it_solves: 'Delivering complex infrastructure projects on time and on budget — from procurement and contract structuring through to dispute resolution and completion.',
      order_index:       2,
    },
    {
      name:              'Technology, Digital & Data',
      category:          'Service',
      short_description: 'Expert advice on AI governance, data privacy (Privacy Act reform, GDPR), technology transactions, digital transformation, cybersecurity, and tech-enabled M&A for Australia\'s leading organisations.',
      who_it_is_for:     'Technology companies, financial services groups, government agencies, and major corporates navigating the legal complexity of digital transformation and data regulation.',
      problem_it_solves: 'Managing technology risk, data privacy compliance, and AI governance in a rapidly evolving regulatory environment — while enabling digital-first business strategies.',
      order_index:       3,
    },
    {
      name:              'Energy & Resources',
      category:          'Offering',
      short_description: 'Comprehensive legal advice on mining, critical minerals, hydrogen, petroleum, and renewable energy — spanning project development, transactions, regulatory approvals, and policy advisory.',
      who_it_is_for:     'Mining and resources companies, renewable energy developers, hydrogen project proponents, government agencies, and institutional investors in the energy sector.',
      problem_it_solves: 'Managing legal complexity across the energy transition — from critical minerals joint ventures and project financing through to environmental approvals and government engagement.',
      order_index:       4,
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
    if (error) console.warn(`  Service "${svc.name}": ${error.message}`)
    else { insertedSvcs.push({ id: data.id, name: svc.name }); console.log(`  ✓ ${svc.name} → id ${data.id}`) }
  }

  // ── 14. Product sub-tables ────────────────────────────────────────────────
  if (insertedSvcs.length === 5) {
    console.log('\n[13/14] Inserting practice area sub-tables...')
    const [corp, bank, const_, tech, energy] = insertedSvcs.map(s => s.id)

    const ins = async (table, rows) => {
      const { error } = await supabase.from(table).insert(rows)
      if (error) console.warn(`  ${table}: ${error.message}`)
      else console.log(`  ✓ ${table}: ${rows.length} rows`)
    }

    await ins('business_product_roles', [
      { product_id: corp,   business_id: userId, user_id: userId, role_name: 'Senior M&A Associate',           order_index: 0 },
      { product_id: corp,   business_id: userId, user_id: userId, role_name: 'Corporate Solicitor',             order_index: 1 },
      { product_id: corp,   business_id: userId, user_id: userId, role_name: 'M&A Graduate Solicitor',          order_index: 2 },
      { product_id: bank,   business_id: userId, user_id: userId, role_name: 'Banking & Finance Senior Associate', order_index: 0 },
      { product_id: bank,   business_id: userId, user_id: userId, role_name: 'Finance Associate',               order_index: 1 },
      { product_id: const_, business_id: userId, user_id: userId, role_name: 'Infrastructure Senior Associate', order_index: 0 },
      { product_id: const_, business_id: userId, user_id: userId, role_name: 'Construction Solicitor',          order_index: 1 },
      { product_id: tech,   business_id: userId, user_id: userId, role_name: 'Technology Law Senior Associate', order_index: 0 },
      { product_id: tech,   business_id: userId, user_id: userId, role_name: 'Data Privacy Solicitor',          order_index: 1 },
      { product_id: tech,   business_id: userId, user_id: userId, role_name: 'AI Governance Associate',         order_index: 2 },
      { product_id: energy, business_id: userId, user_id: userId, role_name: 'Energy & Resources Associate',    order_index: 0 },
      { product_id: energy, business_id: userId, user_id: userId, role_name: 'Critical Minerals Solicitor',     order_index: 1 },
    ])

    await ins('business_product_skills', [
      { product_id: corp,   business_id: userId, user_id: userId, skill_name: 'Public M&A (ASX)' },
      { product_id: corp,   business_id: userId, user_id: userId, skill_name: 'Private M&A & PE' },
      { product_id: corp,   business_id: userId, user_id: userId, skill_name: 'Due Diligence' },
      { product_id: corp,   business_id: userId, user_id: userId, skill_name: 'Corporate Governance' },
      { product_id: corp,   business_id: userId, user_id: userId, skill_name: 'Cross-Border Transactions' },
      { product_id: bank,   business_id: userId, user_id: userId, skill_name: 'Property Finance' },
      { product_id: bank,   business_id: userId, user_id: userId, skill_name: 'Debt Capital Markets' },
      { product_id: bank,   business_id: userId, user_id: userId, skill_name: 'Securitisation' },
      { product_id: bank,   business_id: userId, user_id: userId, skill_name: 'Asset Finance & Leasing' },
      { product_id: const_, business_id: userId, user_id: userId, skill_name: 'Construction Contracts (NEC/AS4300)' },
      { product_id: const_, business_id: userId, user_id: userId, skill_name: 'PPP/PFI Structures' },
      { product_id: const_, business_id: userId, user_id: userId, skill_name: 'Project Finance' },
      { product_id: const_, business_id: userId, user_id: userId, skill_name: 'Infrastructure Procurement' },
      { product_id: tech,   business_id: userId, user_id: userId, skill_name: 'AI Governance' },
      { product_id: tech,   business_id: userId, user_id: userId, skill_name: 'Data Privacy (Privacy Act/GDPR)' },
      { product_id: tech,   business_id: userId, user_id: userId, skill_name: 'Technology Contracts' },
      { product_id: tech,   business_id: userId, user_id: userId, skill_name: 'Cybersecurity Law' },
      { product_id: energy, business_id: userId, user_id: userId, skill_name: 'Critical Minerals Project Development' },
      { product_id: energy, business_id: userId, user_id: userId, skill_name: 'Renewable Energy Finance' },
      { product_id: energy, business_id: userId, user_id: userId, skill_name: 'Resources M&A' },
      { product_id: energy, business_id: userId, user_id: userId, skill_name: 'Environmental Approvals (EPBC)' },
    ])

    await ins('business_product_teams', [
      { product_id: corp,   business_id: userId, user_id: userId, team_name: 'Corporate & M&A Practice Group' },
      { product_id: bank,   business_id: userId, user_id: userId, team_name: 'Banking & Finance Practice Group' },
      { product_id: const_, business_id: userId, user_id: userId, team_name: 'Construction & Infrastructure Practice Group' },
      { product_id: tech,   business_id: userId, user_id: userId, team_name: 'Technology, Digital & Data Practice Group' },
      { product_id: energy, business_id: userId, user_id: userId, team_name: 'Energy & Resources Practice Group' },
    ])

    await ins('business_product_growth_areas', [
      { product_id: corp,   business_id: userId, user_id: userId, growth_area: 'Asia-Pacific cross-border M&A' },
      { product_id: corp,   business_id: userId, user_id: userId, growth_area: 'Critical minerals sector transactions' },
      { product_id: bank,   business_id: userId, user_id: userId, growth_area: 'Green and sustainable finance' },
      { product_id: bank,   business_id: userId, user_id: userId, growth_area: 'Infrastructure debt markets' },
      { product_id: const_, business_id: userId, user_id: userId, growth_area: 'Defence infrastructure projects' },
      { product_id: const_, business_id: userId, user_id: userId, growth_area: 'Social infrastructure (hospitals, schools)' },
      { product_id: tech,   business_id: userId, user_id: userId, growth_area: 'Generative AI governance and regulation' },
      { product_id: tech,   business_id: userId, user_id: userId, growth_area: 'Privacy Act 2024 reform compliance' },
      { product_id: energy, business_id: userId, user_id: userId, growth_area: 'Hydrogen and clean energy infrastructure' },
      { product_id: energy, business_id: userId, user_id: userId, growth_area: 'Future Made in Australia policy mandates' },
    ])

    await ins('business_product_impact', [
      {
        product_id: corp, business_id: userId, user_id: userId,
        who_it_helps:        '36 of the ASX50, private equity sponsors, and international corporates entering the Australian market',
        what_it_improves:    'Transaction certainty, deal execution speed, and regulatory compliance',
        real_world_outcomes: 'Clients close major transactions with confidence — including $68B+ in M&A deals advised by our team',
      },
      {
        product_id: bank, business_id: userId, user_id: userId,
        who_it_helps:        'Australia\'s largest financial institutions, property developers, and infrastructure borrowers',
        what_it_improves:    'Financing structure certainty, documentation quality, and regulatory confidence',
        real_world_outcomes: 'Complex financing transactions completed efficiently, on time and in compliance with banking regulations',
      },
      {
        product_id: const_, business_id: userId, user_id: userId,
        who_it_helps:        'Governments, developers, and contractors delivering Australia\'s critical infrastructure',
        what_it_improves:    'Project delivery certainty, risk allocation, and dispute avoidance',
        real_world_outcomes: 'Over $156B in infrastructure projects delivered — including flagship projects like the Melbourne Metro',
      },
      {
        product_id: tech, business_id: userId, user_id: userId,
        who_it_helps:        'Boards, general counsel, and technology leaders managing digital risk',
        what_it_improves:    'AI governance, data compliance, and technology contract risk',
        real_world_outcomes: 'Clients navigate Privacy Act reform, AI regulation, and technology deals with reduced legal risk',
      },
      {
        product_id: energy, business_id: userId, user_id: userId,
        who_it_helps:        'Mining companies, renewable energy developers, and government agencies in the energy transition',
        what_it_improves:    'Project development speed, regulatory certainty, and transaction execution',
        real_world_outcomes: 'Clients successfully develop, finance, and transact on critical minerals and clean energy projects',
      },
    ])

    await ins('business_product_signals', [
      { product_id: corp,   business_id: userId, user_id: userId, we_are_hiring_for_this: true,  open_to_partnerships: true,  in_research_and_development: false, currently_scaling: true  },
      { product_id: bank,   business_id: userId, user_id: userId, we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: false, currently_scaling: false },
      { product_id: const_, business_id: userId, user_id: userId, we_are_hiring_for_this: true,  open_to_partnerships: false, in_research_and_development: false, currently_scaling: true  },
      { product_id: tech,   business_id: userId, user_id: userId, we_are_hiring_for_this: true,  open_to_partnerships: true,  in_research_and_development: true,  currently_scaling: true  },
      { product_id: energy, business_id: userId, user_id: userId, we_are_hiring_for_this: true,  open_to_partnerships: true,  in_research_and_development: false, currently_scaling: true  },
    ])

    await ins('business_product_permissions', [
      { product_id: corp,   business_id: userId, user_id: userId },
      { product_id: bank,   business_id: userId, user_id: userId },
      { product_id: const_, business_id: userId, user_id: userId },
      { product_id: tech,   business_id: userId, user_id: userId },
      { product_id: energy, business_id: userId, user_id: userId },
    ])
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n[14/14] Cleaning up...')
  try { fs.rmSync(tmpDir, { recursive: true }) } catch (_) {}

  console.log('\n════════════════════════════════════════════════════════════')
  console.log('  ✅  MinterEllison profile created successfully!')
  console.log('════════════════════════════════════════════════════════════')
  console.log('  Login:    ' + DEMO_EMAIL)
  console.log('  Password: ' + DEMO_PASSWORD)
  console.log('  User ID:  ' + userId)
  console.log('  Location: ' + locationId)
  console.log('  Jobs:     ' + insertedJobs.length + ' created')
  console.log('  Services: ' + insertedSvcs.length + ' practice areas')
  console.log('  Video:    ' + videoPublicUrl)
  console.log('════════════════════════════════════════════════════════════')
}

run().catch(err => {
  console.error('\n❌  FATAL:', err.message || err)
  process.exit(1)
})
