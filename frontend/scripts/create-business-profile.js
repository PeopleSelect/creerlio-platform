#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║       CREERLIO — AUTO BUSINESS PROFILE GENERATOR                        ║
 * ║                                                                          ║
 * ║  Researches a company from its website + LinkedIn + YouTube,             ║
 * ║  generates DALL-E images, TTS narration, ffmpeg intro video,             ║
 * ║  and inserts a complete production-ready Business Profile into           ║
 * ║  the Creerlio database.                                                  ║
 * ║                                                                          ║
 * ║  Usage:                                                                  ║
 * ║    node scripts/create-business-profile.js \                             ║
 * ║      --website https://www.example.com \                                 ║
 * ║      --linkedin https://linkedin.com/company/example \                   ║
 * ║      --youtube  https://youtube.com/@example \                           ║
 * ║      --slug     example-company                                           ║
 * ║                                                                          ║
 * ║  Only --website is required. All other flags are optional.               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
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

const ffmpegPath = require('ffmpeg-static')

// ── Validate env ──────────────────────────────────────────────────────────────

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('\n❌  Missing environment variables.')
  console.error('    Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  console.error('    Check your frontend/.env.local file.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })

const BUCKET = 'business-bank'

// ── Parse CLI args ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const result = {}
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '')
    result[key] = args[i + 1]
  }
  return result
}

const argv = parseArgs()
const WEBSITE_URL  = argv.website
const LINKEDIN_URL = argv.linkedin || ''
const YOUTUBE_URL  = argv.youtube  || ''
const CUSTOM_SLUG  = argv.slug     || ''

if (!WEBSITE_URL) {
  console.error('\n❌  --website is required.')
  console.error('    Example: node scripts/create-business-profile.js --website https://www.example.com\n')
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function publicUrl(storagePath) {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encoded}`
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

async function downloadFile(url, dest) {
  return new Promise((res, rej) => {
    const f = fs.createWriteStream(dest)
    const proto = url.startsWith('https') ? https : http
    proto.get(url, r => {
      if (r.statusCode !== 200) { rej(new Error(`HTTP ${r.statusCode} from ${url}`)); return }
      r.pipe(f)
      f.on('finish', () => { f.close(); res() })
    }).on('error', rej)
  })
}

async function fetchWebsiteText(url) {
  return new Promise((res) => {
    const proto = url.startsWith('https') ? https : http
    let body = ''
    const req = proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      r.setEncoding('utf8')
      r.on('data', d => { body += d; if (body.length > 80000) req.destroy() })
      r.on('end', () => res(body.slice(0, 80000)))
    })
    req.on('error', () => res(''))
    req.setTimeout(10000, () => { req.destroy(); res(body) })
  })
}

async function generateAndUploadImage(userId, img, tmpDir) {
  const resp = await openai.images.generate({
    model:   'dall-e-3',
    prompt:  img.prompt,
    size:    img.size || '1792x1024',
    quality: 'hd',
    n:       1,
  })
  const imageUrl = resp.data[0].url
  const tmpPath  = path.join(tmpDir, img.filename)
  await downloadFile(imageUrl, tmpPath)

  const storagePath = `${userId}/bank/${img.filename}`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(
    storagePath, fs.readFileSync(tmpPath), { contentType: 'image/jpeg', upsert: true }
  )
  if (upErr) throw new Error(`Upload ${img.filename}: ${upErr.message}`)
  return { storagePath, fileUrl: publicUrl(storagePath), tmpPath }
}

// ── Step 1: Research the company with GPT-4o ─────────────────────────────────

async function researchCompany(websiteUrl, linkedinUrl, youtubeUrl) {
  console.log('\n  Fetching website content...')
  const websiteText = await fetchWebsiteText(websiteUrl)
  console.log(`  Got ${websiteText.length} chars from website`)

  const systemPrompt = `You are a Chief Information Officer building a complete, production-ready business profile for the Creerlio platform.

Your task: analyse the provided company information and return a STRICT JSON object with ALL fields populated — no empty strings, no null values, no placeholders. If the website content is sparse or the site is JavaScript-rendered (resulting in very little text), use your own extensive training knowledge about this company to fill in all details accurately and professionally.

CONTENT RULES:
- Professional, brand-aligned tone throughout
- Do NOT fabricate specific client names or deal values
- Write structured paragraphs, not bullet-point fragments
- All descriptions must be complete, polished, and ready to display on a live platform
- The "about" section must be 4–6 paragraphs covering: what the company does, history/founding, team/scale, achievements/clients, culture, and a hiring call-to-action
- All array fields must have at least 3–6 items
- social_proof items must be plausible client/employee testimonials (label source as "Client — [sector]" if fabricated)
- The credentials username must be: demo.[slugified-company-name]@creerlio.com
- The credentials password must be: Demo[CompanyName]2025! (capitalised, no spaces)

MANDATORY COUNTS — you MUST generate exactly these quantities:
- "jobs": exactly 4 realistic job vacancies (use varied titles, levels, and locations relevant to the company)
- "services": exactly 5 distinct service offerings (cover the company's main business lines)
- "impact_stats": exactly 5 stats
- "culture_values": exactly 5 values
- "benefits": exactly 5 benefits
- "hiring_interests": exactly 6 items
- "skills": exactly 6 items

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation, no code fences.`

  const userPrompt = `Company Website URL: ${websiteUrl}
LinkedIn URL: ${linkedinUrl || 'not provided'}
YouTube URL: ${youtubeUrl || 'not provided'}

Website Content (first 60,000 chars):
${websiteText.slice(0, 60000)}

NOTE: If the website content above is minimal (e.g. fewer than 2,000 characters), the site is JavaScript-rendered and you should rely on your own knowledge of this company to generate a rich, accurate profile. Do NOT produce a minimal profile just because the scraped HTML is sparse.

REMINDER: You MUST include exactly 4 jobs and exactly 5 services in the JSON.

Generate the complete Creerlio Business Profile JSON using this EXACT structure:

{
  "business": {
    "name": "",
    "slug": "",
    "website_url": "${websiteUrl}",
    "linkedin_url": "${linkedinUrl}",
    "youtube_url": "${youtubeUrl}",
    "careers_url": "",
    "phone": "",
    "email": ""
  },
  "profile": {
    "tagline": "",
    "about": "",
    "industry": "",
    "business_type": "",
    "hq_city": "",
    "hq_state": "",
    "hq_country": "",
    "hq_address": "",
    "latitude": 0,
    "longitude": 0,
    "company_size": "",
    "founded_year": 0,
    "ownership_type": ""
  },
  "content": {
    "mission": "",
    "value_prop_headline": "",
    "value_prop_body": "",
    "acknowledgement_of_country": ""
  },
  "impact_stats": [
    { "label": "", "value": "" }
  ],
  "culture_values": [
    { "title": "", "description": "" }
  ],
  "business_areas": [
    { "name": "", "description": "" }
  ],
  "benefits": [
    { "title": "", "description": "" }
  ],
  "programs": [
    { "name": "", "description": "", "url": "" }
  ],
  "social_proof": [
    { "quote": "", "source": "" }
  ],
  "hiring_interests": [],
  "industries_served": [],
  "specialisations": [],
  "skills": [],
  "badges": [],
  "services": [
    {
      "name": "",
      "category": "Service",
      "short_description": "",
      "who_it_is_for": "",
      "problem_it_solves": "",
      "roles": [],
      "skills": [],
      "growth_areas": [],
      "impact": {
        "who_it_helps": "",
        "what_it_improves": "",
        "real_world_outcomes": ""
      },
      "we_are_hiring": false,
      "open_to_partnerships": false,
      "currently_scaling": false
    }
  ],
  "jobs": [
    {
      "title": "",
      "description": "",
      "city": "",
      "state": "",
      "country": "",
      "location": "",
      "employment_type": "Full-time",
      "experience_level": "",
      "salary_min": 0,
      "salary_max": 0,
      "salary_currency": "AUD",
      "required_skills": [],
      "preferred_skills": [],
      "requirements": ""
    }
  ],
  "dal_le_images": [
    {
      "key": "logo",
      "filename": "logo.jpg",
      "bank_type": "logo",
      "title": "",
      "prompt": "",
      "size": "1024x1024"
    },
    {
      "key": "hero",
      "filename": "hero.jpg",
      "bank_type": "image",
      "title": "",
      "prompt": "",
      "size": "1792x1024"
    },
    {
      "key": "office",
      "filename": "office.jpg",
      "bank_type": "image",
      "title": "",
      "prompt": "",
      "size": "1792x1024"
    },
    {
      "key": "team",
      "filename": "team.jpg",
      "bank_type": "image",
      "title": "",
      "prompt": "",
      "size": "1792x1024"
    },
    {
      "key": "culture",
      "filename": "culture.jpg",
      "bank_type": "image",
      "title": "",
      "prompt": "",
      "size": "1792x1024"
    },
    {
      "key": "awards",
      "filename": "awards.jpg",
      "bank_type": "image",
      "title": "",
      "prompt": "",
      "size": "1792x1024"
    },
    {
      "key": "work",
      "filename": "work.jpg",
      "bank_type": "image",
      "title": "",
      "prompt": "",
      "size": "1792x1024"
    },
    {
      "key": "community",
      "filename": "community.jpg",
      "bank_type": "image",
      "title": "",
      "prompt": "",
      "size": "1792x1024"
    },
    {
      "key": "credential1",
      "filename": "credential1.jpg",
      "bank_type": "document",
      "title": "",
      "prompt": "",
      "size": "1024x1024"
    },
    {
      "key": "credential2",
      "filename": "credential2.jpg",
      "bank_type": "document",
      "title": "",
      "prompt": "",
      "size": "1024x1024"
    }
  ],
  "narration": "",
  "credentials": {
    "email": "",
    "password": ""
  }
}`

  console.log('\n  Calling GPT-4o to generate profile...')
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    max_tokens: 16000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
  })

  const raw = completion.choices[0].message.content || ''
  // Strip any markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch (e) {
    console.error('  GPT-4o returned invalid JSON. Saving to debug.json for inspection.')
    fs.writeFileSync('debug-profile.json', cleaned)
    throw new Error('JSON parse failed: ' + e.message + '\n(check debug-profile.json)')
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║   CREERLIO AUTO BUSINESS PROFILE GENERATOR                  ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log(`  Website:  ${WEBSITE_URL}`)
  console.log(`  LinkedIn: ${LINKEDIN_URL || '(not provided)'}`)
  console.log(`  YouTube:  ${YOUTUBE_URL || '(not provided)'}`)

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creerlio-biz-'))
  console.log(`  Temp dir: ${tmpDir}`)

  // ── Research ───────────────────────────────────────────────────────────────
  console.log('\n[1/12] Researching company...')
  const data = await researchCompany(WEBSITE_URL, LINKEDIN_URL, YOUTUBE_URL)

  const companyName = data.business?.name || 'Company'
  const slug        = CUSTOM_SLUG || slugify(companyName)
  const demoEmail   = data.credentials?.email || `demo.${slug}@creerlio.com`
  const demoPass    = data.credentials?.password || `Demo${companyName.replace(/\s/g, '')}2025!`

  console.log(`\n  ✓ Company: ${companyName}`)
  console.log(`  ✓ Slug:    ${slug}`)
  console.log(`  ✓ Email:   ${demoEmail}`)

  // Save research for reference
  // Write to /tmp when running on Vercel (read-only filesystem), otherwise current dir
  const outputFile = process.env.VERCEL
    ? `${os.tmpdir()}/generated-profile-${slug}.json`
    : `generated-profile-${slug}.json`
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2))
  console.log(`  ✓ Research saved to: ${outputFile}`)

  // ── Create auth user ───────────────────────────────────────────────────────
  console.log('\n[2/12] Creating auth user...')
  let userId
  const { data: existing } = await supabase.auth.admin.listUsers()
  const existingUser = existing?.users?.find(u => u.email === demoEmail)
  if (existingUser) {
    userId = existingUser.id
    console.log('  User already exists:', userId)
  } else {
    const { data: newUser, error: userErr } = await supabase.auth.admin.createUser({
      email:          demoEmail,
      password:       demoPass,
      email_confirm:  true,
      user_metadata:  { full_name: companyName, user_type: 'business' },
    })
    if (userErr) throw new Error('Create user: ' + userErr.message)
    userId = newUser.user.id
    console.log('  Created user:', userId)
  }

  // ── Generate DALL-E images ─────────────────────────────────────────────────
  console.log('\n[3/12] Generating DALL-E images...')
  const dalleImages = data.dal_le_images || []
  const imageResults = {}

  for (const img of dalleImages) {
    // Prefix filenames with slug to avoid collisions
    const safeName = `${slug}-${img.filename}`
    const imgObj = { ...img, filename: safeName }
    try {
      console.log(`  Generating: ${img.title || img.key}...`)
      const result = await generateAndUploadImage(userId, imgObj, tmpDir)
      imageResults[img.key] = result
      console.log(`    ✓ ${safeName}`)
    } catch (e) {
      console.warn(`    ✗ ${safeName}: ${e.message}`)
    }
  }

  // ── Generate TTS narration ─────────────────────────────────────────────────
  console.log('\n[4/12] Generating TTS narration...')
  const narrationText = data.narration || `Welcome to ${companyName}. ${data.profile?.about || ''}`
  const audioPath = path.join(tmpDir, 'narration.mp3')
  const mp3 = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'onyx',
    input: narrationText.slice(0, 4096),
    speed: 0.9,
  })
  fs.writeFileSync(audioPath, Buffer.from(await mp3.arrayBuffer()))
  console.log('  ✓ TTS generated')

  // ── Probe audio duration ───────────────────────────────────────────────────
  let audioDur = 60
  try { execFileSync(ffmpegPath, ['-i', audioPath, '-f', 'null', '-'], { stdio: ['pipe','pipe','pipe'] }) }
  catch (e) {
    const m = (e.stderr || Buffer.from('')).toString().match(/Duration:\s*(\d+):(\d+):([\d.]+)/)
    if (m) audioDur = parseInt(m[1])*3600 + parseInt(m[2])*60 + parseFloat(m[3])
  }
  console.log(`  Duration: ${audioDur.toFixed(1)}s`)

  // ── Build intro video ──────────────────────────────────────────────────────
  console.log('\n[5/12] Encoding intro video...')
  const slideKeys = ['hero','office','team','culture','awards','work','community']
  const slideImages = slideKeys
    .map(k => imageResults[k]?.tmpPath)
    .filter(Boolean)

  if (slideImages.length === 0) {
    console.warn('  No slide images available — skipping video')
  }

  let videoPublicUrl = null
  let videoSize = 0

  if (slideImages.length > 0) {
    const spi = audioDur / slideImages.length
    const concatLines = slideImages.map(p => `file '${p.replace(/\\/g,'/')}'\nduration ${spi.toFixed(3)}`).join('\n')
    const concatFile = path.join(tmpDir, 'concat.txt')
    fs.writeFileSync(concatFile, concatLines + `\nfile '${slideImages[slideImages.length-1].replace(/\\/g,'/')}'`)

    const videoFilename  = `${slug}-intro-video.mp4`
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

      videoSize = fs.statSync(videoLocalPath).size
      const videoStoragePath = `${userId}/bank/${videoFilename}`
      await supabase.storage.from(BUCKET).remove([videoStoragePath])
      const { error: vidUpErr } = await supabase.storage.from(BUCKET).upload(
        videoStoragePath, fs.readFileSync(videoLocalPath), { contentType: 'video/mp4', upsert: true }
      )
      if (vidUpErr) throw new Error('Video upload: ' + vidUpErr.message)
      videoPublicUrl = publicUrl(videoStoragePath)
      console.log(`  ✓ Video: ${(videoSize/1e6).toFixed(2)} MB`)
    } catch (e) {
      console.warn('  ✗ Video encoding failed:', e.message)
    }
  }

  // ── Insert bank items ──────────────────────────────────────────────────────
  console.log('\n[6/12] Inserting business bank items...')
  const bankItems = []

  for (const img of dalleImages) {
    const r = imageResults[img.key]
    if (!r) continue
    const { data: bi, error: biErr } = await supabase.from('business_bank_items').insert({
      user_id:     userId,
      item_type:   img.bank_type || 'image',
      title:       img.title || img.key,
      file_path:   r.storagePath,
      file_url:    r.fileUrl,
      file_type:   'image/jpeg',
      file_size:   fs.statSync(r.tmpPath).size,
      metadata:    {},
      is_active:   true,
    }).select('id').single()
    if (biErr) console.warn(`  ✗ Bank item ${img.key}: ${biErr.message}`)
    else { bankItems.push({ key: img.key, id: bi.id }); console.log(`  ✓ ${img.key} → id ${bi.id}`) }
  }

  // Video bank item
  if (videoPublicUrl) {
    const { data: vidItem, error: vidErr } = await supabase.from('business_bank_items').insert({
      user_id:     userId,
      item_type:   'business_introduction',
      title:       `${companyName} — Introduction Video`,
      file_url:    videoPublicUrl,
      file_type:   'video/mp4',
      file_size:   videoSize,
      metadata:    { duration: Math.round(audioDur) },
      is_active:   true,
    }).select('id').single()
    if (vidErr) console.warn('  ✗ Video bank item:', vidErr.message)
    else { bankItems.push({ key: 'video', id: vidItem.id }); console.log(`  ✓ video → id ${vidItem.id}`) }
  }

  // Links
  const linkDefs = [
    { title: `${companyName} Website`,  url: WEBSITE_URL },
    LINKEDIN_URL && { title: `${companyName} LinkedIn`, url: LINKEDIN_URL },
    YOUTUBE_URL  && { title: `${companyName} YouTube`,  url: YOUTUBE_URL },
    data.business?.careers_url && { title: `${companyName} Careers`, url: data.business.careers_url },
  ].filter(Boolean)

  for (const lnk of linkDefs) {
    const { data: li, error: liErr } = await supabase.from('business_bank_items').insert({
      user_id: userId, item_type: 'link', title: lnk.title, file_url: lnk.url, is_active: true,
    }).select('id').single()
    if (liErr) console.warn(`  ✗ Link "${lnk.title}": ${liErr.message}`)
    else { bankItems.push({ key: `link_${lnk.title.slice(0,15)}`, id: li.id }); console.log(`  ✓ link → ${lnk.title}`) }
  }

  // Profile metadata bank item
  const logoItem  = bankItems.find(b => b.key === 'logo')
  const heroItem  = bankItems.find(b => b.key === 'hero')
  const videoItem = bankItems.find(b => b.key === 'video')
  const credKeys  = ['credential1','credential2']
  const attachmentIds = bankItems.filter(b =>
    !['logo','link_'].some(p => b.key === 'logo' || b.key.startsWith('link_'))
  ).map(b => b.id)

  const profileMetadata = {
    bio:            data.profile?.about || '',
    tagline:        data.profile?.tagline || '',
    businessType:   data.profile?.business_type || '',
    industry:       data.profile?.industry || '',
    specialisations: data.specialisations || [],
    founded:        data.profile?.founded_year || null,
    size:           data.profile?.company_size || '',
    website:        WEBSITE_URL,
    logoId:         logoItem?.id || null,
    heroImageId:    heroItem?.id || null,
    introVideoId:   videoItem?.id || null,
    introVideoUrl:  videoPublicUrl,
    attachmentIds,
    socialLinks: {
      website:   WEBSITE_URL,
      linkedin:  LINKEDIN_URL || null,
      youtube:   YOUTUBE_URL  || null,
      careers:   data.business?.careers_url || null,
    },
    skills: data.skills || [],
  }

  const { data: metaItem, error: metaErr } = await supabase.from('business_bank_items').insert({
    user_id:   userId,
    item_type: 'profile',
    title:     `${companyName} — Business Profile`,
    metadata:  profileMetadata,
    is_active: true,
  }).select('id').single()
  if (metaErr) console.warn('  ✗ Profile metadata:', metaErr.message)
  else console.log(`  ✓ Profile metadata → id ${metaItem.id}`)

  // ── Create business record ─────────────────────────────────────────────────
  console.log('\n[7/12] Creating business records...')
  const { error: bizErr } = await supabase.from('businesses').upsert({
    id:       userId,
    name:     companyName,
    industry: data.profile?.industry || '',
  }, { onConflict: 'id' })
  if (bizErr) console.warn('  businesses:', bizErr.message)
  else console.log('  ✓ businesses')

  // ── Create business_profiles ───────────────────────────────────────────────
  const logoUrl = imageResults.logo?.fileUrl || null
  const heroUrl = imageResults.hero?.fileUrl || null

  const { error: bpErr } = await supabase.from('business_profiles').upsert({
    id:            userId,
    user_id:       userId,
    business_id:   userId,
    name:          companyName,
    business_name: companyName,
    description:   (data.profile?.about || '').slice(0, 500),
    slug,
    industry:      data.profile?.industry || '',
    size:          data.profile?.company_size || '',
    location:      `${data.profile?.hq_city || ''}, ${data.profile?.hq_state || ''}, ${data.profile?.hq_country || 'Australia'}`.replace(/^,\s*,\s*/,'').trim(),
    city:          data.profile?.hq_city || '',
    state:         data.profile?.hq_state || '',
    country:       data.profile?.hq_country || 'Australia',
    latitude:      data.profile?.latitude || null,
    longitude:     data.profile?.longitude || null,
    website:       WEBSITE_URL,
    email:         data.business?.email || '',
    is_active:     true,
    talent_community_enabled: true,
  }, { onConflict: 'id' })
  if (bpErr) console.warn('  business_profiles:', bpErr.message)
  else console.log('  ✓ business_profiles')

  // ── Create business_profile_pages ─────────────────────────────────────────
  console.log('\n[8/12] Creating business_profile_pages...')
  const { error: bppErr } = await supabase.from('business_profile_pages').upsert({
    business_id:             userId,
    slug,
    is_published:            true,
    name:                    companyName,
    logo_url:                logoUrl,
    hero_image_url:          heroUrl,
    tagline:                 data.profile?.tagline || '',
    mission:                 data.content?.mission || '',
    value_prop_headline:     data.content?.value_prop_headline || '',
    value_prop_body:         data.content?.value_prop_body || '',
    impact_stats:            data.impact_stats || [],
    culture_values:          data.culture_values || [],
    business_areas:          data.business_areas || [],
    benefits:                data.benefits || [],
    programs:                data.programs || [],
    social_proof:            data.social_proof || [],
    live_roles_count:        (data.jobs || []).length,
    talent_community_enabled: true,
    portfolio_intake_enabled: true,
    hiring_interests:        data.hiring_interests || [],
    industries_served:       data.industries_served || [],
    contact_email:           data.business?.email || '',
    website_url:             WEBSITE_URL,
    enquiry_enabled:         true,
    media_assets: {
      intro_video_url: videoPublicUrl,
      logo_url:        logoUrl,
      hero_image_url:  heroUrl,
    },
    badges:                  data.badges || [],
    acknowledgement_of_country: data.content?.acknowledgement_of_country || '',
  }, { onConflict: 'business_id' })
  if (bppErr) console.warn('  business_profile_pages:', bppErr.message)
  else console.log('  ✓ business_profile_pages')

  // ── Create location ────────────────────────────────────────────────────────
  console.log('\n[9/12] Creating location...')
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
      name:        `${companyName} — ${data.profile?.hq_city || 'HQ'}`,
      address:     data.profile?.hq_address || '',
      city:        data.profile?.hq_city || '',
      state:       data.profile?.hq_state || '',
      country:     data.profile?.hq_country || 'Australia',
      lat:         data.profile?.latitude || null,
      lng:         data.profile?.longitude || null,
    }).select('id').single()
    if (locErr) throw new Error('Create location: ' + locErr.message)
    locationId = newLoc.id
    console.log('  Created location:', locationId)
  }

  // ── Roles & preferences ────────────────────────────────────────────────────
  console.log('\n[10/12] Setting roles and preferences...')
  await supabase.from('user_business_roles').upsert({ user_id: userId, business_id: userId, role: 'business_admin' }, { onConflict: 'user_id,business_id' })
  await supabase.from('user_location_roles').upsert({ user_id: userId, location_id: locationId, role: 'location_admin' }, { onConflict: 'user_id,location_id' })
  await supabase.from('user_preferences').upsert({ user_id: userId, active_business_id: userId, active_location_id: locationId }, { onConflict: 'user_id' })
  console.log('  ✓ Roles and preferences')

  // ── Jobs ───────────────────────────────────────────────────────────────────
  console.log('\n[11/12] Creating jobs...')
  const jobs = data.jobs || []
  const insertedJobs = []
  for (const job of jobs) {
    const { data: jd, error: jErr } = await supabase.from('jobs').insert({
      business_profile_id: userId,
      business_id:         userId,
      location_id:         locationId,
      status:              'published',
      is_active:           true,
      list_on_creerlio:    true,
      title:               job.title || '',
      description:         job.description || '',
      city:                job.city || data.profile?.hq_city || '',
      state:               job.state || data.profile?.hq_state || '',
      country:             job.country || data.profile?.hq_country || 'Australia',
      location:            job.location || '',
      employment_type:     job.employment_type || 'Full-time',
      experience_level:    job.experience_level || '',
      salary_min:          job.salary_min || null,
      salary_max:          job.salary_max || null,
      salary_currency:     job.salary_currency || 'AUD',
      required_skills:     job.required_skills || [],
      preferred_skills:    job.preferred_skills || [],
      requirements:        job.requirements || '',
    }).select('id').single()
    if (jErr) console.warn(`  ✗ Job "${job.title}": ${jErr.message}`)
    else { insertedJobs.push(jd.id); console.log(`  ✓ ${job.title}`) }
  }

  // ── Services ───────────────────────────────────────────────────────────────
  console.log('\n[12/12] Creating services...')
  const services = data.services || []

  const { error: ovErr } = await supabase.from('business_products_services_overview').upsert({
    business_id:        userId,
    user_id:            userId,
    short_headline:     data.content?.value_prop_headline || `${companyName} — Services Overview`,
    summary:            data.content?.value_prop_body || '',
    primary_industries: data.industries_served?.slice(0, 5) || [],
    business_model:     'B2B',
    is_public:          true,
  }, { onConflict: 'business_id' })
  if (ovErr) console.warn('  Overview:', ovErr.message)
  else console.log('  ✓ Services overview')

  const insertedSvcs = []
  for (let i = 0; i < services.length; i++) {
    const svc = services[i]
    const { data: sv, error: svErr } = await supabase.from('business_products_services').insert({
      business_id:       userId,
      user_id:           userId,
      name:              svc.name || `Service ${i+1}`,
      category:          svc.category || 'Service',
      short_description: svc.short_description || '',
      who_it_is_for:     svc.who_it_is_for || '',
      problem_it_solves: svc.problem_it_solves || '',
      order_index:       i,
      is_published:      true,
      is_active:         true,
    }).select('id').single()
    if (svErr) console.warn(`  ✗ Service "${svc.name}": ${svErr.message}`)
    else {
      insertedSvcs.push({ id: sv.id, svc })
      console.log(`  ✓ ${svc.name} → id ${sv.id}`)
    }
  }

  // Sub-tables for services
  for (const { id: productId, svc } of insertedSvcs) {
    const ins = async (table, rows) => {
      if (!rows || rows.length === 0) return
      const { error } = await supabase.from(table).insert(rows)
      if (error) console.warn(`    ${table}: ${error.message}`)
    }

    if (Array.isArray(svc.roles) && svc.roles.length > 0) {
      await ins('business_product_roles', svc.roles.map((r, idx) => ({
        product_id: productId, business_id: userId, user_id: userId,
        role_name: typeof r === 'string' ? r : r.name, order_index: idx,
      })))
    }

    if (Array.isArray(svc.skills) && svc.skills.length > 0) {
      await ins('business_product_skills', svc.skills.map(s => ({
        product_id: productId, business_id: userId, user_id: userId,
        skill_name: typeof s === 'string' ? s : s.name,
      })))
    }

    if (Array.isArray(svc.growth_areas) && svc.growth_areas.length > 0) {
      await ins('business_product_growth_areas', svc.growth_areas.map(g => ({
        product_id: productId, business_id: userId, user_id: userId,
        growth_area: typeof g === 'string' ? g : g.area,
      })))
    }

    if (svc.impact) {
      await ins('business_product_impact', [{
        product_id:          productId,
        business_id:         userId,
        user_id:             userId,
        who_it_helps:        svc.impact.who_it_helps || '',
        what_it_improves:    svc.impact.what_it_improves || '',
        real_world_outcomes: svc.impact.real_world_outcomes || '',
      }])
    }

    await ins('business_product_signals', [{
      product_id:               productId,
      business_id:              userId,
      user_id:                  userId,
      we_are_hiring_for_this:   svc.we_are_hiring   || false,
      open_to_partnerships:     svc.open_to_partnerships || false,
      in_research_and_development: false,
      currently_scaling:        svc.currently_scaling || false,
    }])

    await ins('business_product_permissions', [{
      product_id: productId, business_id: userId, user_id: userId,
    }])
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  try { fs.rmSync(tmpDir, { recursive: true }) } catch (_) {}

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log(`  ✅  ${companyName} profile created successfully!`)
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log(`  Login Email:  ${demoEmail}`)
  console.log(`  Password:     ${demoPass}`)
  console.log(`  User ID:      ${userId}`)
  console.log(`  Location ID:  ${locationId}`)
  console.log(`  Jobs:         ${insertedJobs.length} created`)
  console.log(`  Services:     ${insertedSvcs.length} created`)
  console.log(`  Images:       ${Object.keys(imageResults).length} generated`)
  if (videoPublicUrl) console.log(`  Video:        ${videoPublicUrl}`)
  console.log(`  Profile JSON: ${outputFile}`)
  console.log('══════════════════════════════════════════════════════════════')
}

run().catch(err => {
  console.error('\n❌  FATAL:', err.message || err)
  process.exit(1)
})
