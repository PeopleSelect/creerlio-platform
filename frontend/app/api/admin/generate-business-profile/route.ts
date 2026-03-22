/**
 * Admin API — Generate Business Profile
 * Supports single and bulk modes. Streams SSE progress.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import os from 'os'
import https from 'https'
import http from 'http'
import { execFileSync } from 'child_process'

export const runtime = 'nodejs'
export const maxDuration = 300

// ── Clients ───────────────────────────────────────────────────────────────────

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

function isAdminUser(user: { email?: string | null; user_metadata?: Record<string, any> | null }) {
  const metadata = user.user_metadata || {}
  if (metadata.is_admin === true || metadata.admin === true) return true
  const email = (user.email || '').toLowerCase()
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  return !!email && adminEmails.includes(email)
}

const BUCKET = 'business-bank'

function publicStorageUrl(supabaseUrl: string, storagePath: string) {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${encoded}`
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const proto = url.startsWith('https') ? https : http
    const req = proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } } as any, (res: any) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        fs.unlinkSync(dest)
        downloadFile(res.headers.location, dest).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    })
    ;(req as any).on('error', reject)
  })
}

async function fetchWebsiteText(url: string): Promise<string> {
  return new Promise((resolve) => {
    const proto = url.startsWith('https') ? https : http
    let body = ''
    const req = proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } } as any, (r) => {
      r.setEncoding('utf8')
      r.on('data', (d: string) => { body += d; if (body.length > 40000) (req as any).destroy() })
      r.on('end', () => resolve(body.slice(0, 40000)))
    })
    ;(req as any).on('error', () => resolve(''))
    ;(req as any).setTimeout(5000, () => { (req as any).destroy(); resolve(body) })
  })
}

/** Scrape homepage + 3 key subpages — capped at 5s each to stay within lambda budget */
async function fetchMultiplePages(websiteUrl: string): Promise<string> {
  const base = new URL(websiteUrl)
  // Only fetch highest-value pages — homepage + about + careers
  const urls = [
    websiteUrl,
    `${base.origin}/about`,
    `${base.origin}/about-us`,
    `${base.origin}/careers`,
  ]
  const parts: string[] = []
  const seen = new Set<string>()
  for (const url of urls) {
    if (seen.has(url)) continue
    seen.add(url)
    try {
      const text = await fetchWebsiteText(url)
      if (text.length > 300) parts.push(`=== ${url} ===\n${text.slice(0, 10000)}`)
    } catch (_) {}
    if (parts.join('').length > 35000) break
  }
  return parts.join('\n\n').slice(0, 40000)
}

// ── HTML parsers ──────────────────────────────────────────────────────────────

function extractSocialLinks(html: string): Record<string, string> {
  const result: Record<string, string> = {}
  const patterns: [string, RegExp][] = [
    ['linkedin',  /https?:\/\/(?:www\.)?linkedin\.com\/company\/[^"'\s>]+/gi],
    ['facebook',  /https?:\/\/(?:www\.)?facebook\.com\/[^"'\s>]+/gi],
    ['instagram', /https?:\/\/(?:www\.)?instagram\.com\/[^"'\s>]+/gi],
    ['twitter',   /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"'\s>]+/gi],
    ['youtube',   /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|user\/)[^"'\s>]+/gi],
  ]
  for (const [key, pattern] of patterns) {
    const matches = html.match(pattern)
    if (matches?.length) result[key] = matches[0].replace(/['">\s]+$/, '')
  }
  return result
}

function extractLogoFromHtml(html: string, baseUrl: string): string | null {
  const base = new URL(baseUrl)
  const candidates: string[] = []
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  if (ogImage?.[1]) candidates.push(ogImage[1])
  const twImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
  if (twImage?.[1]) candidates.push(twImage[1])
  const apple = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)
               || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i)
  if (apple?.[1]) candidates.push(apple[1])
  const icons = [...html.matchAll(/<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]+href=["']([^"']+\.(?:png|svg|ico))["']/gi)]
  for (const m of icons) { if (m[1]) candidates.push(m[1]) }
  for (const c of candidates) {
    if (!c || c.length < 4) continue
    try { return c.startsWith('http') ? c : new URL(c, base.origin).href } catch (_) {}
  }
  return `${base.origin}/favicon.ico`
}

// ── GPT-4o Research ───────────────────────────────────────────────────────────

async function researchCompany(
  openai: OpenAI,
  websiteUrl: string,
  linkedinUrl: string,
  youtubeUrl: string,
  socialLinks: Record<string, string>,
  websiteContent: string,
  log: (msg: string) => void
): Promise<any> {
  log(`  Got ${websiteContent.length} chars from website (multi-page scan)`)

  const systemPrompt = `You are a Chief Information Officer building a complete, production-ready business profile for the Creerlio platform.

Your task: analyse the provided company information and return a STRICT JSON object with ALL fields populated — no empty strings, no null values, no placeholders. If the website content is sparse or the site is JavaScript-rendered, use your own extensive training knowledge about this company to fill in all details accurately and professionally.

CONTENT RULES:
- Professional, brand-aligned tone throughout
- Do NOT fabricate specific client names or deal values
- Write structured paragraphs, not bullet-point fragments
- All descriptions must be complete, polished, and ready to display on a live platform
- The "about" section must be 4–6 paragraphs
- All array fields must have at least 3–6 items
- social_proof items must be plausible testimonials (label source as "Client — [sector]" if fabricated)
- The credentials username must be: demo.[slugified-company-name]@creerlio.com
- The credentials password must be: Demo[CompanyName]2025! (capitalised, no spaces)

MANDATORY COUNTS:
- "jobs": exactly 4 realistic job vacancies
- "services": exactly 5 distinct service offerings
- "impact_stats": exactly 5 stats
- "culture_values": exactly 5 values
- "benefits": exactly 5 benefits
- "hiring_interests": exactly 6 items
- "skills": exactly 6 items

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation, no code fences.`

  const detectedLinkedin  = socialLinks.linkedin  || linkedinUrl || 'not provided'
  const detectedFacebook  = socialLinks.facebook  || 'not provided'
  const detectedInstagram = socialLinks.instagram || 'not provided'
  const detectedTwitter   = socialLinks.twitter   || 'not provided'
  const detectedYoutube   = socialLinks.youtube   || youtubeUrl  || 'not provided'

  const userPrompt = `Company Website URL: ${websiteUrl}
LinkedIn URL: ${detectedLinkedin}
YouTube URL: ${detectedYoutube}
Facebook URL: ${detectedFacebook}
Instagram URL: ${detectedInstagram}
Twitter/X URL: ${detectedTwitter}

Website Content (scraped from homepage + key subpages):
${websiteContent.slice(0, 60000)}

NOTE: If the website content is minimal (fewer than 2,000 characters), the site is JavaScript-rendered — rely on your own knowledge of this company to generate a rich, accurate profile. REMINDER: You MUST include exactly 4 jobs and exactly 5 services.

Generate the complete Creerlio Business Profile JSON using this EXACT structure:

{
  "business": { "name": "", "slug": "", "website_url": "${websiteUrl}", "linkedin_url": "${linkedinUrl}", "youtube_url": "${youtubeUrl}", "careers_url": "", "phone": "", "email": "" },
  "profile": { "tagline": "", "about": "", "industry": "", "business_type": "", "hq_city": "", "hq_state": "", "hq_country": "", "hq_address": "", "latitude": 0, "longitude": 0, "company_size": "", "founded_year": 0, "ownership_type": "" },
  "content": { "mission": "", "value_prop_headline": "", "value_prop_body": "", "acknowledgement_of_country": "" },
  "impact_stats": [{ "label": "", "value": "" }],
  "culture_values": [{ "title": "", "description": "" }],
  "business_areas": [{ "name": "", "description": "" }],
  "benefits": [{ "title": "", "description": "" }],
  "programs": [{ "name": "", "description": "", "url": "" }],
  "social_proof": [{ "quote": "", "source": "" }],
  "hiring_interests": [],
  "industries_served": [],
  "specialisations": [],
  "skills": [],
  "badges": [],
  "services": [{ "name": "", "category": "Service", "short_description": "", "who_it_is_for": "", "problem_it_solves": "", "roles": [], "skills": [], "growth_areas": [], "impact": { "who_it_helps": "", "what_it_improves": "", "real_world_outcomes": "" }, "we_are_hiring": false, "open_to_partnerships": false, "currently_scaling": false }],
  "jobs": [{ "title": "", "description": "", "city": "", "state": "", "country": "", "location": "", "employment_type": "Full-time", "experience_level": "", "salary_min": 0, "salary_max": 0, "salary_currency": "AUD", "required_skills": [], "preferred_skills": [], "requirements": "" }],
  "dal_le_images": [
    { "key": "logo",        "filename": "logo.jpg",        "bank_type": "logo",     "title": "", "prompt": "", "size": "1024x1024" },
    { "key": "hero",        "filename": "hero.jpg",        "bank_type": "image",    "title": "", "prompt": "", "size": "1792x1024" },
    { "key": "office",      "filename": "office.jpg",      "bank_type": "image",    "title": "", "prompt": "", "size": "1792x1024" },
    { "key": "team",        "filename": "team.jpg",        "bank_type": "image",    "title": "", "prompt": "", "size": "1792x1024" },
    { "key": "culture",     "filename": "culture.jpg",     "bank_type": "image",    "title": "", "prompt": "", "size": "1792x1024" },
    { "key": "awards",      "filename": "awards.jpg",      "bank_type": "image",    "title": "", "prompt": "", "size": "1792x1024" },
    { "key": "work",        "filename": "work.jpg",        "bank_type": "image",    "title": "", "prompt": "", "size": "1792x1024" },
    { "key": "community",   "filename": "community.jpg",   "bank_type": "image",    "title": "", "prompt": "", "size": "1792x1024" },
    { "key": "credential1", "filename": "credential1.jpg", "bank_type": "document", "title": "", "prompt": "", "size": "1024x1024" },
    { "key": "credential2", "filename": "credential2.jpg", "bank_type": "document", "title": "", "prompt": "", "size": "1024x1024" }
  ],
  "narration": "",
  "credentials": { "email": "", "password": "" }
}`

  log('\n  Calling GPT-4o to generate profile...')
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
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  return JSON.parse(cleaned)
}

/** GPT-4o: discover real businesses by industry + location */
async function discoverBusinesses(
  openai: OpenAI,
  industry: string,
  location: string,
  maxResults: number,
  log: (msg: string) => void
): Promise<Array<{ name: string; websiteUrl: string; linkedinUrl?: string }>> {
  log(`  Asking GPT-4o for ${maxResults} ${industry} businesses in ${location}...`)
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    max_tokens: 4000,
    messages: [
      { role: 'system', content: 'You are a business research assistant. Return ONLY valid JSON arrays. No markdown, no code fences.' },
      { role: 'user', content: `List ${maxResults} real, established businesses in the "${industry}" industry located in or near "${location}". Prioritise well-known active companies.

For each provide:
- name: exact trading name
- websiteUrl: their real website URL (must be a real URL you are confident exists)
- linkedinUrl: their LinkedIn company page URL, or null if unsure

Return ONLY this JSON format:
[{ "name": "...", "websiteUrl": "https://...", "linkedinUrl": "https://..." }]

Only include businesses whose URLs you are highly confident are real.` },
    ],
  })

  const raw = (completion.choices[0].message.content || '[]').trim()
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  try { return JSON.parse(cleaned) } catch (_) { return [] }
}

// ── Per-business pipeline ─────────────────────────────────────────────────────

interface ProfileResult {
  companyName: string
  demoEmail: string
  demoPass: string
  jobCount: number
  svcCount: number
  videoUrl: string | null
}

async function generateSingleProfile(opts: {
  supabase: SupabaseClient<any>
  openai: OpenAI
  SUPABASE_URL: string
  websiteUrl: string
  linkedinUrl?: string
  youtubeUrl?: string
  customSlug?: string
  log: (msg: string) => void
  err: (msg: string) => void
}): Promise<ProfileResult> {
  const { supabase, openai, SUPABASE_URL, log, err } = opts
  const websiteUrl  = opts.websiteUrl
  const linkedinUrl = opts.linkedinUrl || ''
  const youtubeUrl  = opts.youtubeUrl  || ''
  const customSlug  = opts.customSlug  || ''

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creerlio-biz-'))

  try {
    // ── Step 1: Research ─────────────────────────────────────────────────
    log('\n[1/12] Researching company...')
    log('  Scanning website for social links and logo...')
    const websiteHtml = await fetchMultiplePages(websiteUrl)
    const detectedSocial   = extractSocialLinks(websiteHtml)
    const detectedLogoUrl  = extractLogoFromHtml(websiteHtml, websiteUrl)

    if (Object.keys(detectedSocial).length > 0) {
      log(`  ✓ Found social links: ${Object.keys(detectedSocial).join(', ')}`)
    }
    if (detectedLogoUrl) log('  ✓ Found logo/brand image')

    const data = await researchCompany(openai, websiteUrl, linkedinUrl, youtubeUrl, detectedSocial, websiteHtml, log)

    const companyName = data.business?.name || 'Company'
    const slug        = customSlug || slugify(companyName)
    const demoEmail   = data.credentials?.email || `demo.${slug}@creerlio.com`
    const demoPass    = data.credentials?.password || `Demo${companyName.replace(/\s/g, '')}2025!`

    log(`\n  ✓ Company: ${companyName}`)
    log(`  ✓ Slug:    ${slug}`)
    log(`  ✓ Email:   ${demoEmail}`)

    // ── Step 2: Auth user ────────────────────────────────────────────────
    log('\n[2/12] Creating auth user...')
    let userId: string
    const { data: existing } = await supabase.auth.admin.listUsers()
    const existingUser = existing?.users?.find((u: any) => u.email === demoEmail)
    if (existingUser) {
      userId = existingUser.id
      log('  User already exists: ' + userId)
    } else {
      const { data: newUser, error: userErr } = await supabase.auth.admin.createUser({
        email: demoEmail, password: demoPass, email_confirm: true,
        user_metadata: { full_name: companyName, user_type: 'business' },
      })
      if (userErr) throw new Error('Create user: ' + userErr.message)
      userId = newUser.user.id
      log('  Created user: ' + userId)
    }

    // ── Step 3: Logo + DALL-E images ─────────────────────────────────────
    log('\n[3/12] Fetching logo and generating DALL-E images...')
    const dalleImages = data.dal_le_images || []
    const imageResults: Record<string, { storagePath: string; fileUrl: string; tmpPath: string; size: number }> = {}

    if (detectedLogoUrl) {
      log('  Downloading real logo from website...')
      try {
        const logoFilename = `${slug}-logo.jpg`
        const logoTmpPath  = path.join(tmpDir, logoFilename)
        await downloadFile(detectedLogoUrl, logoTmpPath)
        const logoSize = fs.statSync(logoTmpPath).size
        if (logoSize > 500) {
          const storagePath = `${userId}/bank/${logoFilename}`
          const contentType = detectedLogoUrl.endsWith('.png') ? 'image/png'
            : detectedLogoUrl.endsWith('.svg') ? 'image/svg+xml'
            : detectedLogoUrl.endsWith('.ico') ? 'image/x-icon'
            : 'image/jpeg'
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(
            storagePath, fs.readFileSync(logoTmpPath), { contentType, upsert: true }
          )
          if (!upErr) {
            imageResults['logo'] = {
              storagePath, tmpPath: logoTmpPath,
              fileUrl: publicStorageUrl(SUPABASE_URL, storagePath), size: logoSize,
            }
            log(`  ✓ Real logo downloaded (${(logoSize/1024).toFixed(0)} KB)`)
          } else {
            err(`  ✗ Logo upload: ${upErr.message} — will generate with DALL-E`)
          }
        } else {
          log(`  Logo too small (${logoSize}B) — will generate with DALL-E`)
        }
      } catch (e: any) {
        err(`  ✗ Logo download failed: ${e.message} — will generate with DALL-E`)
      }
    }

    for (const img of dalleImages) {
      if (img.key === 'logo' && imageResults['logo']) {
        log('  Skipping DALL-E logo (using real website logo)')
        continue
      }
      const safeName = `${slug}-${img.filename}`
      log(`  Generating: ${img.title || img.key}...`)
      try {
        const resp = await openai.images.generate({
          model: 'dall-e-3', prompt: img.prompt,
          size: img.size || '1792x1024', quality: 'hd', n: 1,
        })
        const imageUrl = resp.data[0].url!
        const tmpPath  = path.join(tmpDir, safeName)
        await downloadFile(imageUrl, tmpPath)
        const storagePath = `${userId}/bank/${safeName}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(
          storagePath, fs.readFileSync(tmpPath), { contentType: 'image/jpeg', upsert: true }
        )
        if (upErr) throw new Error(upErr.message)
        imageResults[img.key] = {
          storagePath, tmpPath,
          fileUrl: publicStorageUrl(SUPABASE_URL, storagePath),
          size: fs.statSync(tmpPath).size,
        }
        log(`    ✓ ${safeName}`)
      } catch (e: any) {
        err(`    ✗ ${safeName}: ${e.message}`)
      }
    }

    // ── Step 4: TTS ──────────────────────────────────────────────────────
    log('\n[4/12] Generating TTS narration...')
    const narrationText = data.narration || `Welcome to ${companyName}. ${data.profile?.about || ''}`
    const audioPath = path.join(tmpDir, 'narration.mp3')
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1-hd', voice: 'onyx',
      input: narrationText.slice(0, 4096), speed: 0.9,
    })
    fs.writeFileSync(audioPath, Buffer.from(await mp3.arrayBuffer()))
    log('  ✓ TTS generated')

    // ── Step 5: Video ────────────────────────────────────────────────────
    log('\n[5/12] Encoding intro video...')
    let videoPublicUrl: string | null = null
    let videoSize = 0
    let audioDur = 60

    try {
      try {
        execFileSync(require('ffmpeg-static'), ['-i', audioPath, '-f', 'null', '-'], { stdio: ['pipe','pipe','pipe'] })
      } catch (e: any) {
        const m = ((e.stderr || Buffer.alloc(0)) as Buffer).toString().match(/Duration:\s*(\d+):(\d+):([\d.]+)/)
        if (m) audioDur = parseInt(m[1])*3600 + parseInt(m[2])*60 + parseFloat(m[3])
      }
      log(`  Duration: ${audioDur.toFixed(1)}s`)

      const slideKeys = ['hero','office','team','culture','awards','work','community']
      const slideImages = slideKeys.map(k => imageResults[k]?.tmpPath).filter(Boolean) as string[]

      if (slideImages.length > 0) {
        const spi = audioDur / slideImages.length
        const concatLines = slideImages.map(p => `file '${p.replace(/\\/g,'/')}'\nduration ${spi.toFixed(3)}`).join('\n')
        const concatFile = path.join(tmpDir, 'concat.txt')
        fs.writeFileSync(concatFile, concatLines + `\nfile '${slideImages[slideImages.length-1].replace(/\\/g,'/')}'`)

        const videoFilename  = `${slug}-intro-video.mp4`
        const videoLocalPath = path.join(tmpDir, videoFilename)

        execFileSync(require('ffmpeg-static'), [
          '-y', '-f', 'concat', '-safe', '0', '-i', concatFile,
          '-i', audioPath,
          '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p',
          '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
          '-c:a', 'aac', '-b:a', '128k',
          '-shortest', '-movflags', '+faststart',
          videoLocalPath,
        ], { stdio: 'pipe', timeout: 240000 })

        videoSize = fs.statSync(videoLocalPath).size
        const videoStoragePath = `${userId}/bank/${videoFilename}`
        await supabase.storage.from(BUCKET).remove([videoStoragePath])
        const { error: vidUpErr } = await supabase.storage.from(BUCKET).upload(
          videoStoragePath, fs.readFileSync(videoLocalPath), { contentType: 'video/mp4', upsert: true }
        )
        if (vidUpErr) throw new Error('Video upload: ' + vidUpErr.message)
        videoPublicUrl = publicStorageUrl(SUPABASE_URL, videoStoragePath)
        log(`  ✓ Video: ${(videoSize/1e6).toFixed(2)} MB`)
      } else {
        log('  No slide images — skipping video')
      }
    } catch (e: any) {
      err('  ✗ Video skipped: ' + e.message)
    }

    // ── Step 6: Bank items ───────────────────────────────────────────────
    log('\n[6/12] Inserting business bank items...')
    const bankItems: { key: string; id: number }[] = []

    for (const img of dalleImages) {
      const r = imageResults[img.key]
      if (!r) continue
      const { data: bi, error: biErr } = await supabase.from('business_bank_items').insert({
        user_id: userId, item_type: img.bank_type || 'image',
        title: img.title || img.key, file_path: r.storagePath,
        file_url: r.fileUrl, file_type: 'image/jpeg', file_size: r.size,
        metadata: {}, is_active: true,
      }).select('id').single()
      if (biErr) err(`  ✗ Bank item ${img.key}: ${biErr.message}`)
      else { bankItems.push({ key: img.key, id: bi.id }); log(`  ✓ ${img.key} → id ${bi.id}`) }
    }

    if (videoPublicUrl) {
      const { data: vidItem, error: vidErr } = await supabase.from('business_bank_items').insert({
        user_id: userId, item_type: 'business_introduction',
        title: `${companyName} — Introduction Video`,
        file_url: videoPublicUrl, file_type: 'video/mp4', file_size: videoSize,
        metadata: { duration: Math.round(audioDur) }, is_active: true,
      }).select('id').single()
      if (vidErr) err('  ✗ Video bank item: ' + vidErr.message)
      else { bankItems.push({ key: 'video', id: vidItem.id }); log(`  ✓ video → id ${vidItem.id}`) }
    }

    const mergedLinkedin  = linkedinUrl  || detectedSocial.linkedin  || null
    const mergedYoutube   = youtubeUrl   || detectedSocial.youtube   || null
    const mergedFacebook  = detectedSocial.facebook  || null
    const mergedInstagram = detectedSocial.instagram || null
    const mergedTwitter   = detectedSocial.twitter   || null

    const linkDefs = [
      { title: `${companyName} Website`,   url: websiteUrl },
      mergedLinkedin  ? { title: `${companyName} LinkedIn`,  url: mergedLinkedin  } : null,
      mergedYoutube   ? { title: `${companyName} YouTube`,   url: mergedYoutube   } : null,
      mergedFacebook  ? { title: `${companyName} Facebook`,  url: mergedFacebook  } : null,
      mergedInstagram ? { title: `${companyName} Instagram`, url: mergedInstagram } : null,
      mergedTwitter   ? { title: `${companyName} Twitter/X`, url: mergedTwitter   } : null,
      data.business?.careers_url ? { title: `${companyName} Careers`, url: data.business.careers_url } : null,
    ].filter(Boolean) as { title: string; url: string }[]

    for (const lnk of linkDefs) {
      const { data: li, error: liErr } = await supabase.from('business_bank_items').insert({
        user_id: userId, item_type: 'link', title: lnk.title, file_url: lnk.url, is_active: true,
      }).select('id').single()
      if (liErr) err(`  ✗ Link "${lnk.title}": ${liErr.message}`)
      else { bankItems.push({ key: `link_${lnk.title.slice(0,15)}`, id: li.id }); log(`  ✓ link → ${lnk.title}`) }
    }

    const logoItem  = bankItems.find(b => b.key === 'logo')
    const heroItem  = bankItems.find(b => b.key === 'hero')
    const videoItem = bankItems.find(b => b.key === 'video')
    const attachmentIds = bankItems.filter(b => b.key !== 'logo' && !b.key.startsWith('link_')).map(b => b.id)

    const profileMetadata = {
      bio: data.profile?.about || '', tagline: data.profile?.tagline || '',
      businessType: data.profile?.business_type || '', industry: data.profile?.industry || '',
      specialisations: data.specialisations || [], founded: data.profile?.founded_year || null,
      size: data.profile?.company_size || '', website: websiteUrl,
      logoId: logoItem?.id || null, heroImageId: heroItem?.id || null,
      introVideoId: videoItem?.id || null, introVideoUrl: videoPublicUrl,
      attachmentIds, skills: data.skills || [],
      socialLinks: {
        website: websiteUrl, linkedin: mergedLinkedin, youtube: mergedYoutube,
        facebook: mergedFacebook, instagram: mergedInstagram, twitter: mergedTwitter,
        careers: data.business?.careers_url || null,
      },
    }

    const { data: metaItem, error: metaErr } = await supabase.from('business_bank_items').insert({
      user_id: userId, item_type: 'profile',
      title: `${companyName} — Business Profile`, metadata: profileMetadata, is_active: true,
    }).select('id').single()
    if (metaErr) err('  ✗ Profile metadata: ' + metaErr.message)
    else log(`  ✓ Profile metadata → id ${metaItem.id}`)

    // ── Step 7: businesses ───────────────────────────────────────────────
    log('\n[7/12] Creating business records...')
    const { error: bizErr } = await supabase.from('businesses').upsert({
      id: userId, name: companyName, industry: data.profile?.industry || '',
    }, { onConflict: 'id' })
    if (bizErr) err('  businesses: ' + bizErr.message)
    else log('  ✓ businesses')

    const { error: bpErr } = await supabase.from('business_profiles').upsert({
      id: userId, user_id: userId, business_id: userId,
      name: companyName, business_name: companyName,
      description: (data.profile?.about || '').slice(0, 500),
      slug, industry: data.profile?.industry || '',
      size: data.profile?.company_size || '',
      location: `${data.profile?.hq_city || ''}, ${data.profile?.hq_state || ''}, ${data.profile?.hq_country || 'Australia'}`.replace(/^,\s*,\s*/, '').trim(),
      city: data.profile?.hq_city || '', state: data.profile?.hq_state || '',
      country: data.profile?.hq_country || 'Australia',
      latitude: data.profile?.latitude || null, longitude: data.profile?.longitude || null,
      website: websiteUrl, email: data.business?.email || '',
      is_active: true, talent_community_enabled: true,
    }, { onConflict: 'id' })
    if (bpErr) err('  business_profiles: ' + bpErr.message)
    else log('  ✓ business_profiles')

    // ── Step 8: business_profile_pages ───────────────────────────────────
    log('\n[8/12] Creating business_profile_pages...')
    const logoUrl = imageResults.logo?.fileUrl || null
    const heroUrl = imageResults.hero?.fileUrl || null
    const { error: bppErr } = await supabase.from('business_profile_pages').upsert({
      business_id: userId, slug, is_published: true, name: companyName,
      logo_url: logoUrl, hero_image_url: heroUrl,
      tagline: data.profile?.tagline || '', mission: data.content?.mission || '',
      value_prop_headline: data.content?.value_prop_headline || '',
      value_prop_body: data.content?.value_prop_body || '',
      impact_stats: data.impact_stats || [], culture_values: data.culture_values || [],
      business_areas: data.business_areas || [], benefits: data.benefits || [],
      programs: data.programs || [], social_proof: data.social_proof || [],
      live_roles_count: (data.jobs || []).length, talent_community_enabled: true,
      portfolio_intake_enabled: true, hiring_interests: data.hiring_interests || [],
      industries_served: data.industries_served || [],
      contact_email: data.business?.email || '', website_url: websiteUrl,
      linkedin_url: mergedLinkedin, youtube_url: mergedYoutube,
      facebook_url: mergedFacebook, instagram_url: mergedInstagram, twitter_url: mergedTwitter,
      enquiry_enabled: true,
      media_assets: { intro_video_url: videoPublicUrl, logo_url: logoUrl, hero_image_url: heroUrl },
      badges: data.badges || [],
      acknowledgement_of_country: data.content?.acknowledgement_of_country || '',
    }, { onConflict: 'business_id' })
    if (bppErr) err('  business_profile_pages: ' + bppErr.message)
    else log('  ✓ business_profile_pages')

    // ── Step 9: Location ─────────────────────────────────────────────────
    log('\n[9/12] Creating location...')
    let locationId: string
    const { data: existingLoc } = await supabase.from('locations').select('id').eq('owner_id', userId).maybeSingle()
    if (existingLoc) {
      locationId = existingLoc.id
      log('  Location exists: ' + locationId)
    } else {
      const { data: newLoc, error: locErr } = await supabase.from('locations').insert({
        owner_type: 'business', owner_id: userId, business_id: userId,
        name: `${companyName} — ${data.profile?.hq_city || 'HQ'}`,
        address: data.profile?.hq_address || '',
        city: data.profile?.hq_city || '', state: data.profile?.hq_state || '',
        country: data.profile?.hq_country || 'Australia',
        lat: data.profile?.latitude || null, lng: data.profile?.longitude || null,
      }).select('id').single()
      if (locErr) throw new Error('Create location: ' + locErr.message)
      locationId = newLoc.id
      log('  Created location: ' + locationId)
    }

    // ── Step 10: Roles ───────────────────────────────────────────────────
    log('\n[10/12] Setting roles and preferences...')
    await supabase.from('user_business_roles').upsert({ user_id: userId, business_id: userId, role: 'business_admin' }, { onConflict: 'user_id,business_id' })
    await supabase.from('user_location_roles').upsert({ user_id: userId, location_id: locationId, role: 'location_admin' }, { onConflict: 'user_id,location_id' })
    await supabase.from('user_preferences').upsert({ user_id: userId, active_business_id: userId, active_location_id: locationId }, { onConflict: 'user_id' })
    log('  ✓ Roles and preferences')

    // ── Step 11: Jobs ────────────────────────────────────────────────────
    log('\n[11/12] Creating jobs...')
    const jobs = data.jobs || []
    let jobCount = 0
    for (const job of jobs) {
      const { error: jErr } = await supabase.from('jobs').insert({
        business_profile_id: userId, business_id: userId, location_id: locationId,
        status: 'published', is_active: true, list_on_creerlio: true,
        title: job.title || '', description: job.description || '',
        city: job.city || data.profile?.hq_city || '',
        state: job.state || data.profile?.hq_state || '',
        country: job.country || data.profile?.hq_country || 'Australia',
        location: job.location || '', employment_type: job.employment_type || 'Full-time',
        experience_level: job.experience_level || '',
        salary_min: job.salary_min || null, salary_max: job.salary_max || null,
        salary_currency: job.salary_currency || 'AUD',
        required_skills: job.required_skills || [], preferred_skills: job.preferred_skills || [],
        requirements: job.requirements || '',
      })
      if (jErr) err(`  ✗ Job "${job.title}": ${jErr.message}`)
      else { jobCount++; log(`  ✓ ${job.title}`) }
    }

    // ── Step 12: Services ────────────────────────────────────────────────
    log('\n[12/12] Creating services...')
    const services = data.services || []

    const { error: ovErr } = await supabase.from('business_products_services_overview').upsert({
      business_id: userId, user_id: userId,
      short_headline: data.content?.value_prop_headline || `${companyName} — Services Overview`,
      summary: data.content?.value_prop_body || '',
      primary_industries: (data.industries_served || []).slice(0, 5),
      business_model: 'B2B', is_public: true,
    }, { onConflict: 'business_id' })
    if (ovErr) err('  Overview: ' + ovErr.message)
    else log('  ✓ Services overview')

    let svcCount = 0
    for (let i = 0; i < services.length; i++) {
      const svc = services[i]
      const { data: sv, error: svErr } = await supabase.from('business_products_services').insert({
        business_id: userId, user_id: userId,
        name: svc.name || `Service ${i+1}`, category: svc.category || 'Service',
        short_description: svc.short_description || '', who_it_is_for: svc.who_it_is_for || '',
        problem_it_solves: svc.problem_it_solves || '', order_index: i,
        is_published: true, is_active: true,
      }).select('id').single()
      if (svErr) { err(`  ✗ Service "${svc.name}": ${svErr.message}`); continue }
      svcCount++
      log(`  ✓ ${svc.name} → id ${sv.id}`)

      const productId = sv.id
      const ins = async (table: string, rows: any[]) => {
        if (!rows || rows.length === 0) return
        const { error } = await supabase.from(table).insert(rows)
        if (error) err(`    ${table}: ${error.message}`)
      }

      if (Array.isArray(svc.roles) && svc.roles.length > 0) {
        await ins('business_product_roles', svc.roles.map((r: any, idx: number) => ({
          product_id: productId, business_id: userId, user_id: userId,
          role_name: typeof r === 'string' ? r : r.name, order_index: idx,
        })))
      }
      if (Array.isArray(svc.skills) && svc.skills.length > 0) {
        await ins('business_product_skills', svc.skills.map((s: any) => ({
          product_id: productId, business_id: userId, user_id: userId,
          skill_name: typeof s === 'string' ? s : s.name,
        })))
      }
      if (Array.isArray(svc.growth_areas) && svc.growth_areas.length > 0) {
        await ins('business_product_growth_areas', svc.growth_areas.map((g: any) => ({
          product_id: productId, business_id: userId, user_id: userId,
          growth_area: typeof g === 'string' ? g : g.area,
        })))
      }
      if (svc.impact) {
        await ins('business_product_impact', [{
          product_id: productId, business_id: userId, user_id: userId,
          who_it_helps: svc.impact.who_it_helps || '',
          what_it_improves: svc.impact.what_it_improves || '',
          real_world_outcomes: svc.impact.real_world_outcomes || '',
        }])
      }
      await ins('business_product_signals', [{
        product_id: productId, business_id: userId, user_id: userId,
        we_are_hiring_for_this: svc.we_are_hiring || false,
        open_to_partnerships: svc.open_to_partnerships || false,
        in_research_and_development: false,
        currently_scaling: svc.currently_scaling || false,
      }])
      await ins('business_product_permissions', [{ product_id: productId, business_id: userId, user_id: userId }])
    }

    try { fs.rmSync(tmpDir, { recursive: true }) } catch (_) {}
    return { companyName, demoEmail, demoPass, jobCount, svcCount, videoUrl: videoPublicUrl }
  } catch (e) {
    try { fs.rmSync(tmpDir, { recursive: true }) } catch (_) {}
    throw e
  }
}

// ── Main POST handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authz = req.headers.get('authorization') || ''
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : ''
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getAdminClient()
  const { data: { user: authedUser } } = await supabase.auth.getUser(token)
  if (!authedUser?.id || !isAdminUser(authedUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    mode = 'single',
    websiteUrl, linkedinUrl = '', youtubeUrl = '', slug: customSlug = '',
    industry = '', location = '', maxResults = 5,
  } = body

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch (_) {}
      }
      const log = (msg: string) => send({ log: msg })
      const err = (msg: string) => send({ log: msg, isError: true })

      try {
        if (mode === 'bulk') {
          if (!industry || !location) throw new Error('industry and location are required for bulk mode')
          const cap = Math.min(Math.max(1, parseInt(String(maxResults)) || 2), 2)

          log('\n╔══════════════════════════════════════════════════════════════╗')
          log('║   CREERLIO BULK PROFILE GENERATOR                           ║')
          log('╚══════════════════════════════════════════════════════════════╝')
          log(`  Industry:   ${industry}`)
          log(`  Location:   ${location}`)
          log(`  Max:        ${cap} businesses`)
          log('\n[DISCOVERY] Finding businesses...')

          const businesses = await discoverBusinesses(openai, industry, location, cap, log)
          log(`  ✓ Discovered ${businesses.length} businesses`)
          if (businesses.length === 0) throw new Error('No businesses discovered — try different industry/location')

          for (const biz of businesses) {
            log(`  • ${biz.name} — ${biz.websiteUrl}`)
          }

          const results: { name: string; email: string; success: boolean }[] = []

          for (let i = 0; i < businesses.length; i++) {
            const biz = businesses[i]
            log(`\n${'═'.repeat(62)}`)
            log(`  [${i+1}/${businesses.length}] ${biz.name}`)
            log(`  Website: ${biz.websiteUrl}`)
            log('═'.repeat(62))

            try {
              const result = await generateSingleProfile({
                supabase, openai, SUPABASE_URL,
                websiteUrl: biz.websiteUrl,
                linkedinUrl: biz.linkedinUrl || '',
                log, err,
              })
              results.push({ name: result.companyName, email: result.demoEmail, success: true })
              log(`\n  ✅  ${result.companyName} — done (${result.jobCount} jobs, ${result.svcCount} services)`)
            } catch (e: any) {
              err(`\n  ❌  ${biz.name} failed: ${e.message}`)
              results.push({ name: biz.name, email: '', success: false })
            }
          }

          const succeeded = results.filter(r => r.success).length
          log('\n╔══════════════════════════════════════════════════════════════╗')
          log(`  ✅  Bulk complete: ${succeeded}/${businesses.length} profiles created`)
          log('╚══════════════════════════════════════════════════════════════╝')
          for (const r of results) {
            log(`  ${r.success ? '✓' : '✗'} ${r.name}${r.email ? ' — ' + r.email : ''}`)
          }

        } else {
          if (!websiteUrl) throw new Error('websiteUrl is required')
          log('\n╔══════════════════════════════════════════════════════════════╗')
          log('║   CREERLIO AUTO BUSINESS PROFILE GENERATOR                  ║')
          log('╚══════════════════════════════════════════════════════════════╝')
          log(`  Website:  ${websiteUrl}`)

          const result = await generateSingleProfile({
            supabase, openai, SUPABASE_URL,
            websiteUrl, linkedinUrl, youtubeUrl, customSlug,
            log, err,
          })

          log('\n╔══════════════════════════════════════════════════════════════╗')
          log(`  ✅  ${result.companyName} profile created successfully!`)
          log('╚══════════════════════════════════════════════════════════════╝')
          log(`  Login Email:  ${result.demoEmail}`)
          log(`  Password:     ${result.demoPass}`)
          log(`  Jobs:         ${result.jobCount} created`)
          log(`  Services:     ${result.svcCount} created`)
          if (result.videoUrl) log(`  Video:        ${result.videoUrl}`)
          log('══════════════════════════════════════════════════════════════')
        }

        send({ done: true })
      } catch (e: any) {
        err('\n❌  FATAL: ' + (e?.message || String(e)))
        send({ error: e?.message || 'Generation failed' })
      } finally {
        try { controller.close() } catch (_) {}
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
