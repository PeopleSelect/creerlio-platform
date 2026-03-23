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

function generateClaimToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Resolve the ffmpeg binary path — tries system paths before ffmpeg-static (which breaks when bundled) */
function getFfmpegBin(): string {
  const systemPaths = [
    process.env.FFMPEG_PATH,
    '/usr/bin/ffmpeg',        // Vercel / AWS Lambda Linux
    '/usr/local/bin/ffmpeg',  // Homebrew / some Linux
    '/opt/bin/ffmpeg',        // Lambda layers
  ].filter(Boolean) as string[]

  for (const p of systemPaths) {
    try { if (fs.existsSync(p)) return p } catch (_) {}
  }

  // ffmpeg-static works in local dev but path breaks when Next.js bundles the route
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const staticPath: string = require('ffmpeg-static')
    if (staticPath && fs.existsSync(staticPath)) return staticPath
  } catch (_) {}

  throw new Error('ffmpeg not found on this system')
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

// SSL-tolerant HTTPS agent — handles company sites with self-signed or chain-broken certs
const insecureAgent = new https.Agent({ rejectUnauthorized: false })

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const proto = url.startsWith('https') ? https : http
    const opts: any = { headers: { 'User-Agent': 'Mozilla/5.0' } }
    if (url.startsWith('https')) opts.agent = insecureAgent
    const req = proto.get(url, opts, (res: any) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        try { fs.unlinkSync(dest) } catch (_) {}
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

/** Hard timeout wrapper — resolves with fallback after ms regardless of DNS/connect hangs */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

async function fetchWebsiteText(url: string, maxBytes = 40000): Promise<string> {
  const inner = new Promise<string>((resolve) => {
    const proto = url.startsWith('https') ? https : http
    const opts: any = { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Creerlio/1.0)' } }
    if (url.startsWith('https')) opts.agent = insecureAgent
    let body = ''
    const req = proto.get(url, opts, (r: any) => {
      r.setEncoding('utf8')
      r.on('data', (d: string) => { body += d; if (body.length > maxBytes) (req as any).destroy() })
      r.on('end', () => resolve(body.slice(0, maxBytes)))
    })
    ;(req as any).on('error', () => resolve(''))
    ;(req as any).setTimeout(6000, () => { (req as any).destroy(); resolve(body) })
  })
  return withTimeout(inner, 8000, '')
}

/** Fetch and parse JSON from an API endpoint — larger buffer, ATS-focused */
async function fetchJson(url: string): Promise<any> {
  const inner = new Promise<string>((resolve) => {
    const proto = url.startsWith('https') ? https : http
    const opts: any = { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }
    if (url.startsWith('https')) opts.agent = insecureAgent
    let body = ''
    const req = proto.get(url, opts, (r: any) => {
      r.setEncoding('utf8')
      r.on('data', (d: string) => { body += d; if (body.length > 500000) (req as any).destroy() })
      r.on('end', () => resolve(body))
    })
    ;(req as any).on('error', () => resolve(''))
    ;(req as any).setTimeout(8000, () => { (req as any).destroy(); resolve(body) })
  })
  const text = await withTimeout(inner, 10000, '')
  if (!text.trim()) throw new Error('Empty response')
  return JSON.parse(text)
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n').trim()
}

/** Detect ATS / careers URL from scraped homepage HTML */
function detectCareersUrl(html: string, baseOrigin: string): string | null {
  // Known external ATS platforms — check href attributes and raw URL matches
  const atsRegexes = [
    /https?:\/\/[a-z0-9-]+\.csod\.com\/ux\/ats\/careersite\/[^\s"'<>]+/i,
    /https?:\/\/boards\.greenhouse\.io\/[^\s"'<>]+/i,
    /https?:\/\/jobs\.lever\.co\/[^\s"'<>]+/i,
    /https?:\/\/[a-z0-9-]+\.smartrecruiters\.com\/[^\s"'<>]+/i,
    /https?:\/\/[a-z0-9-]+\.bamboohr\.com\/jobs\/[^\s"'<>]+/i,
    /https?:\/\/[a-z0-9-]+\.myworkdayjobs\.com\/[^\s"'<>]+/i,
    /https?:\/\/[a-z0-9-]+\.taleo\.net\/[^\s"'<>]+/i,
    /https?:\/\/careers\.seek\.com\.au\/[^\s"'<>]+/i,
  ]
  for (const re of atsRegexes) {
    const m = html.match(re)
    if (m) return m[0].replace(/['">\s]+$/, '')
  }
  // Internal careers page href
  const hrefRe = /href=["']([^"']*(?:\/careers|\/jobs|\/join-us|\/work-with-us)[^"']*)["']/i
  const hm = html.match(hrefRe)
  if (hm) {
    const href = hm[1]
    if (href.startsWith('http')) return href
    try { return new URL(href, baseOrigin).href } catch (_) {}
  }
  return null
}

/** Scrape real jobs from a known ATS URL. Returns [] on failure so caller can fall back to GPT. */
async function scrapeJobsFromATS(careersUrl: string, log: (m: string) => void): Promise<any[]> {
  const toJob = (title: string, description: string, location: string, city: string, state: string, employmentType: string, applyUrl: string) => ({
    title: title.trim(),
    description: stripHtmlTags(description).slice(0, 800),
    city: city.trim(), state: state.trim(), country: 'Australia',
    location: location.trim(), employment_type: employmentType || 'Full-time',
    experience_level: '', salary_min: null, salary_max: null, salary_currency: 'AUD',
    required_skills: [], preferred_skills: [], requirements: '', apply_url: applyUrl,
  })

  try {
    // ── CSOD (Cornerstone OnDemand) ───────────────────────────────────────
    if (careersUrl.includes('.csod.com')) {
      const tenant = (careersUrl.match(/https?:\/\/([^.]+)\.csod\.com/) || [])[1]
      const siteId = (careersUrl.match(/careersite\/(\d+)/) || [])[1]
      if (tenant && siteId) {
        const data = await fetchJson(`https://${tenant}.csod.com/ux/ats/careersite/${siteId}/home/requisition?skip=0&take=100`)
        const rows: any[] = data?.data ?? data?.requisitions ?? (Array.isArray(data) ? data : [])
        if (rows.length > 0) {
          log(`  ✓ CSOD API: ${rows.length} real jobs found`)
          return rows.map((j: any) => {
            const city = j.city || (j.location || '').split(',')[0]?.trim() || ''
            const state = j.state || (j.location || '').split(',')[1]?.trim() || ''
            return toJob(
              j.req_title || j.title || j.displayJobTitle || '',
              j.job_description || j.description || j.req_description || '',
              j.city_state || j.location || city,
              city, state, j.employment_type || j.scheduleType || 'Full-time',
              `https://${tenant}.csod.com/ux/ats/careersite/${siteId}/home/requisition/${j.req_id || j.id}`,
            )
          })
        }
      }
    }

    // ── Greenhouse ────────────────────────────────────────────────────────
    if (careersUrl.includes('greenhouse.io')) {
      const company = (careersUrl.match(/greenhouse\.io\/([^/?#\s]+)/) || [])[1]
      if (company) {
        const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`)
        const jobs: any[] = data?.jobs ?? []
        if (jobs.length > 0) {
          log(`  ✓ Greenhouse API: ${jobs.length} real jobs found`)
          return jobs.slice(0, 50).map((j: any) => {
            const loc = j.location?.name || ''
            const parts = loc.split(',')
            return toJob(j.title || '', j.content || '', loc, parts[0]?.trim() || '', parts[1]?.trim() || '', 'Full-time', j.absolute_url || careersUrl)
          })
        }
      }
    }

    // ── Lever ─────────────────────────────────────────────────────────────
    if (careersUrl.includes('lever.co')) {
      const company = (careersUrl.match(/lever\.co\/([^/?#\s]+)/) || [])[1]
      if (company) {
        const jobs: any[] = await fetchJson(`https://api.lever.co/v0/postings/${company}?mode=json&limit=100`)
        if (Array.isArray(jobs) && jobs.length > 0) {
          log(`  ✓ Lever API: ${jobs.length} real jobs found`)
          return jobs.slice(0, 50).map((j: any) => {
            const loc = j.categories?.location || ''
            const parts = loc.split(',')
            const reqs = (j.lists || []).map((l: any) => stripHtmlTags(l.content || '')).join('\n').slice(0, 500)
            return { ...toJob(j.text || '', j.descriptionBody || j.description || '', loc, parts[0]?.trim() || '', parts[1]?.trim() || '', j.categories?.commitment || 'Full-time', j.hostedUrl || careersUrl), requirements: reqs }
          })
        }
      }
    }

    // ── SmartRecruiters ───────────────────────────────────────────────────
    if (careersUrl.includes('smartrecruiters.com')) {
      const company = (careersUrl.match(/smartrecruiters\.com\/([^/?#\s]+)/) || [])[1]
      if (company) {
        const data = await fetchJson(`https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=100`)
        const jobs: any[] = data?.content ?? []
        if (jobs.length > 0) {
          log(`  ✓ SmartRecruiters API: ${jobs.length} real jobs found`)
          return jobs.slice(0, 50).map((j: any) => toJob(
            j.name || '', j.jobAd?.sections?.jobDescription?.text || '',
            [j.location?.city, j.location?.region].filter(Boolean).join(', '),
            j.location?.city || '', j.location?.region || '',
            j.typeOfEmployment?.label || 'Full-time',
            `https://jobs.smartrecruiters.com/${company}/${j.id}`,
          ))
        }
      }
    }

    log(`  ⚠ No matching ATS API for ${careersUrl} — will use AI-generated jobs`)
  } catch (e: any) {
    log(`  ⚠ ATS scraping error: ${e.message} — will use AI-generated jobs`)
  }
  return []
}

/**
 * SEEK job search — scrapes SEEK search results page for jobs at a given company.
 * Parses __NEXT_DATA__ JSON embedded in the page.
 */
async function seekJobSearch(companyName: string, log: (m: string) => void): Promise<any[]> {
  try {
    const query = encodeURIComponent(companyName)
    const seekUrl = `https://www.seek.com.au/jobs?keywords=${query}&where=Australia&page=1`
    log(`  Searching SEEK: ${seekUrl}`)
    const html = await fetchWebsiteText(seekUrl, 300000)
    if (!html) { log('  ⚠ SEEK returned empty response'); return [] }

    // Extract __NEXT_DATA__ JSON from script tag
    const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
    if (!nextDataMatch) { log('  ⚠ SEEK: __NEXT_DATA__ not found'); return [] }

    const nextData = JSON.parse(nextDataMatch[1])
    // SEEK embeds jobs in props.pageProps.results or props.pageProps.jobsearch.hits
    const jobResults: any[] =
      nextData?.props?.pageProps?.results ??
      nextData?.props?.pageProps?.jobsearch?.hits ??
      nextData?.props?.pageProps?.jobs ??
      []

    if (!Array.isArray(jobResults) || jobResults.length === 0) {
      log('  ⚠ SEEK: no jobs found in page data'); return []
    }

    // Filter to jobs that match the company name (case-insensitive partial match)
    const lowerCompany = companyName.toLowerCase()
    const matched = jobResults.filter((j: any) => {
      const advertiserName: string = (j.advertiser?.description || j.companyName || j.advertiser?.name || '').toLowerCase()
      return advertiserName.includes(lowerCompany) || lowerCompany.split(/\s+/).some(w => w.length > 3 && advertiserName.includes(w))
    })

    const toProcess = matched.length > 0 ? matched : jobResults.slice(0, 20)
    log(`  ✓ SEEK: found ${toProcess.length} matching jobs (of ${jobResults.length} total)`)

    return toProcess.slice(0, 30).map((j: any) => {
      const loc = j.location || j.suburb || ''
      const area = j.area || j.state || ''
      return {
        title: j.title || j.jobTitle || '',
        description: (j.teaser || j.description || '').slice(0, 600),
        city: loc, state: area, country: 'Australia',
        location: [loc, area].filter(Boolean).join(', '),
        employment_type: j.workType || 'Full-time',
        experience_level: '', salary_min: null, salary_max: null, salary_currency: 'AUD',
        required_skills: [], preferred_skills: [], requirements: '',
        apply_url: j.listingDate ? `https://www.seek.com.au/job/${j.id}` : '',
      }
    })
  } catch (e: any) {
    log(`  ⚠ SEEK scraping error: ${e.message}`)
    return []
  }
}

/**
 * Auto-discover a company's YouTube channel via YouTube Data API v3.
 * Returns the channel URL if found, null otherwise.
 * Requires YOUTUBE_API_KEY env var — silently skips if missing.
 */
async function findYouTubeChannel(companyName: string, log: (m: string) => void): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return null

  try {
    const q = encodeURIComponent(companyName)
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${q}&maxResults=3&key=${apiKey}`
    log(`  Searching YouTube for channel: ${companyName}`)
    const data = await fetchJson(apiUrl)
    const items: any[] = data?.items ?? []
    if (!items.length) { log('  ⚠ YouTube: no channels found'); return null }

    // Pick the channel whose title best matches the company name
    const lowerCompany = companyName.toLowerCase()
    const best = items.find((it: any) => {
      const title = (it.snippet?.title || '').toLowerCase()
      return title.includes(lowerCompany) || lowerCompany.includes(title.split(/\s+/)[0])
    }) ?? items[0]

    const channelId = best?.id?.channelId || best?.snippet?.channelId
    if (!channelId) return null

    const channelUrl = `https://www.youtube.com/channel/${channelId}`
    log(`  ✓ YouTube channel found: ${best.snippet?.title} — ${channelUrl}`)
    return channelUrl
  } catch (e: any) {
    log(`  ⚠ YouTube discovery error: ${e.message}`)
    return null
  }
}

/**
 * Enrichment pass — second targeted GPT call to fill in any service sub-sections
 * (teams, roles, skills, growth_areas) that the main pass left empty.
 */
async function enrichServiceSections(
  openai: OpenAI,
  services: any[],
  companyName: string,
  industry: string,
  log: (m: string) => void
): Promise<any[]> {
  // Find services with any empty critical arrays
  const weakIdxs = services
    .map((s: any, i: number) => ({ s, i }))
    .filter(({ s }) =>
      !s.teams?.length || !s.roles?.length || !s.skills?.length || !s.growth_areas?.length
    )

  if (weakIdxs.length === 0) {
    log('  ✓ All service sections populated — skipping enrichment pass')
    return services
  }

  log(`  Running enrichment pass on ${weakIdxs.length} weak service(s)...`)

  const weakList = weakIdxs.map(({ s, i }) => ({
    index: i,
    name: s.name,
    short_description: s.short_description,
    missing: [
      !s.teams?.length && 'teams',
      !s.roles?.length && 'roles',
      !s.skills?.length && 'skills',
      !s.growth_areas?.length && 'growth_areas',
    ].filter(Boolean),
  }))

  const enrichPrompt = `You are filling in missing sub-sections for ${companyName} (${industry}) service cards.

For each service below, provide ONLY the missing fields listed.

Services to enrich:
${JSON.stringify(weakList, null, 2)}

Rules:
- teams: minimum 2 internal team names that deliver this service (e.g. "Engineering", "Delivery", "Consulting")
- roles: minimum 2 specific job titles needed for this service
- skills: minimum 3 specific technical/professional skills for this service
- growth_areas: minimum 2 emerging trends or growth opportunities relevant to this service
- Infer from the service name, description, and industry — do NOT leave anything empty
- Return ONLY valid JSON array matching this structure:
[{ "index": 0, "teams": [], "roles": [], "skills": [], "growth_areas": [] }]`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: 2000,
      messages: [{ role: 'user', content: enrichPrompt }],
    })
    const raw = (completion.choices[0].message.content || '[]').trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    const enriched: any[] = JSON.parse(raw)

    for (const patch of enriched) {
      const svc = services[patch.index]
      if (!svc) continue
      if (!svc.teams?.length && patch.teams?.length) svc.teams = patch.teams
      if (!svc.roles?.length && patch.roles?.length) svc.roles = patch.roles
      if (!svc.skills?.length && patch.skills?.length) svc.skills = patch.skills
      if (!svc.growth_areas?.length && patch.growth_areas?.length) svc.growth_areas = patch.growth_areas
    }
    log(`  ✓ Enrichment pass complete`)
  } catch (e: any) {
    log(`  ⚠ Enrichment pass failed: ${e.message}`)
  }

  return services
}

/** Scrape homepage + comprehensive subpages — all in parallel, hard 12s total cap */
async function fetchMultiplePages(websiteUrl: string, targetLocation?: string): Promise<string> {
  const base = new URL(websiteUrl)
  // Always scrape the actual homepage (origin), not a deep-link or search results page
  const homepage = base.origin
  const urls = [
    homepage,
    `${homepage}/about`,
    `${homepage}/about-us`,
    `${homepage}/our-story`,
    `${homepage}/careers`,
    `${homepage}/services`,
    `${homepage}/what-we-do`,
    `${homepage}/practice-areas`,
    `${homepage}/expertise`,
    `${homepage}/solutions`,
    `${homepage}/team`,
    `${homepage}/our-team`,
    `${homepage}/people`,
    `${homepage}/contact`,
    `${homepage}/contact-us`,
  ]

  // If a target location/suburb is provided, try the most likely location-specific page only
  if (targetLocation) {
    const suburb = targetLocation.split(/[,\s]+/)[0].toLowerCase().replace(/\s+/g, '-')
    urls.push(`${homepage}/locations/${suburb}`)
    urls.push(`${homepage}/offices/${suburb}`)
  }

  const seen = new Set<string>()
  const uniqueUrls = urls.filter(url => { if (seen.has(url)) return false; seen.add(url); return true })

  // Fetch all pages in parallel with a hard 12s wall-clock cap on the entire batch
  const batchPromise = Promise.allSettled(uniqueUrls.map(url => fetchWebsiteText(url, 20000)))
  const results = await withTimeout(batchPromise, 12000, uniqueUrls.map(() => ({ status: 'fulfilled' as const, value: '' })))

  const parts: string[] = []
  for (let i = 0; i < uniqueUrls.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled' && r.value.length > 300) {
      parts.push(`=== ${uniqueUrls[i]} ===\n${r.value.slice(0, 8000)}`)
    }
  }
  return parts.join('\n\n').slice(0, 50000)
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

/** Resolve a raw href to an absolute URL, or null if invalid */
function resolveUrl(href: string, origin: string): string | null {
  if (!href || href.length < 4) return null
  try { return href.startsWith('http') ? href : new URL(href, origin).href } catch (_) { return null }
}

/**
 * Comprehensive logo discovery with strict priority order:
 * 1. <img> tags with logo/brand in src/class/id/alt — SVG preferred
 * 2. <link> tags: apple-touch-icon, manifest, PNG/SVG icons
 * 3. Common well-known asset paths (/logo.svg, /logo.png, etc.)
 * 4. og:image / twitter:image (marketing images, not ideal logos)
 * 5. /favicon.ico (last resort before DALL-E)
 */
async function findBestLogoUrl(html: string, origin: string, linkedinUrl?: string): Promise<{ url: string; source: string } | null> {
  type Candidate = { url: string; score: number; source: string }
  const candidates: Candidate[] = []
  const seen = new Set<string>()

  const add = (href: string | null | undefined, score: number, source: string) => {
    const url = resolveUrl(href || '', origin)
    if (!url || seen.has(url)) return
    seen.add(url)
    candidates.push({ url, score, source })
  }

  // ── 1. <img> tags with logo/brand/header in any attribute ──────────────
  for (const m of html.matchAll(/<img([^>]+)>/gi)) {
    const tag = m[1]
    const src = tag.match(/src=["']([^"']+)["']/i)?.[1]
    if (!src) continue
    const attrs = tag.toLowerCase()
    const isLogoLike = /logo|brand|header/.test(attrs) || /logo|brand/.test(src.toLowerCase())
    if (!isLogoLike) continue
    const isSvg = /\.svg(\?|$)/i.test(src)
    const isPng = /\.png(\?|$)/i.test(src)
    // SVG img tag logo = highest confidence
    add(src, isSvg ? 100 : isPng ? 90 : 80, `<img> tag (${isSvg ? 'SVG' : isPng ? 'PNG' : 'JPG'})`)
  }

  // ── 2. <picture> / <source> with logo in src ───────────────────────────
  for (const m of html.matchAll(/<source([^>]+)>/gi)) {
    const src = m[1].match(/srcset=["']([^"'\s,]+)/i)?.[1]
    if (src && /logo|brand/i.test(src)) {
      add(src, /\.svg/i.test(src) ? 95 : 85, '<picture> source')
    }
  }

  // ── 3. SVG <use> or inline <symbol> — skip (can't download inline SVG)

  // ── 4. <link> tags: apple-touch-icon, manifest icons ──────────────────
  const apple = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
             || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i)
  add(apple?.[1], 50, 'apple-touch-icon')

  for (const m of html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+\.(?:png|svg))["']/gi)) {
    const isSvg = /\.svg/i.test(m[1])
    add(m[1], isSvg ? 70 : 45, `<link> icon (${isSvg ? 'SVG' : 'PNG'})`)
  }

  // ── 5. og:image / twitter:image ────────────────────────────────────────
  const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
             || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
  add(ogImg, 30, 'og:image')

  const twImg = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
             || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)?.[1]
  add(twImg, 25, 'twitter:image')

  // Sort by score desc — try in priority order
  candidates.sort((a, b) => b.score - a.score)

  // ── 6. Common asset paths — try in parallel (HEAD check) ───────────────
  const commonPaths = [
    '/logo.svg', '/logo.png', '/logo.jpg',
    '/images/logo.svg', '/images/logo.png',
    '/assets/logo.svg', '/assets/logo.png',
    '/static/logo.svg', '/static/logo.png',
    '/media/logo.svg', '/media/logo.png',
    '/brand/logo.svg', '/brand/logo.png',
    '/img/logo.svg', '/img/logo.png',
  ]

  const pathChecks = await Promise.allSettled(
    commonPaths.map(async (p) => {
      const url = `${origin}${p}`
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3000)
      try {
        const r = await fetch(url, { method: 'HEAD', signal: controller.signal })
        clearTimeout(timer)
        if (r.ok) return { url, source: `common path ${p}`, score: /\.svg/.test(p) ? 88 : 82 }
      } catch (_) { clearTimeout(timer) }
      return null
    })
  )

  for (const r of pathChecks) {
    if (r.status === 'fulfilled' && r.value) {
      candidates.push(r.value)
    }
  }

  // ── 7. Clearbit Logo API — highly reliable for known companies ──────────
  try {
    const domain = origin.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    const clearbitUrl = `https://logo.clearbit.com/${domain}?size=256`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const cbRes = await fetch(clearbitUrl, { method: 'HEAD', signal: controller.signal }).catch(() => null)
    clearTimeout(timer)
    if (cbRes?.ok && cbRes.headers.get('content-type')?.startsWith('image/')) {
      candidates.push({ url: clearbitUrl, score: 78, source: `Clearbit logo API (${domain})` })
    }
  } catch (_) {}

  // ── 8. LinkedIn og:image (MANDATORY if linkedinUrl provided) ───────────
  if (linkedinUrl) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      const liRes = await fetch(linkedinUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
        signal: controller.signal,
      }).catch(() => null)
      clearTimeout(timer)
      if (liRes?.ok) {
        const liHtml = await liRes.text()
        const liOg = liHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
                  || liHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
        if (liOg && /media\.licdn\.com|linkedin\.com/.test(liOg)) {
          candidates.push({ url: liOg, score: 75, source: 'LinkedIn og:image' })
        }
      }
    } catch (_) {}
  }

  // Re-sort after all sources
  candidates.sort((a, b) => b.score - a.score)

  // Return best available candidate; favicon is last resort
  const best = candidates[0]
  if (best) return best

  return { url: `${origin}/favicon.ico`, source: 'favicon.ico fallback' }
}

// ── GPT-4o Research ───────────────────────────────────────────────────────────

async function researchCompany(
  openai: OpenAI,
  websiteUrl: string,
  linkedinUrl: string,
  youtubeUrl: string,
  socialLinks: Record<string, string>,
  websiteContent: string,
  targetLocation: string,
  log: (msg: string) => void,
  scrapedJobTitles?: string[],
  discoveredYouTube?: string
): Promise<any> {
  log(`  Got ${websiteContent.length} chars from website (multi-page scan)`)

  const branchInstructions = targetLocation ? `
═══ BRANCH RESOLUTION (MANDATORY) ═══

A specific location has been requested: "${targetLocation}"

You MUST profile the LOCAL BRANCH at this location, NOT the corporate head office.

PRIORITY ORDER for website selection:
1. Branch-specific website (e.g. lanecove.ljhooker.com.au) — highest priority
2. Location-specific page on main domain (e.g. /offices/lane-cove)
3. General company homepage — fallback only

YOU MUST:
• Identify the exact branch/office serving ${targetLocation}
• Extract LOCAL details: branch address, local phone number, local team members
• Name the business as: "{Brand Name} — {Suburb}" (e.g. "LJ Hooker — Lane Cove")
• Use business.name in that exact format
• Set hq_city and hq_address to the LOCAL branch address, not head office
• Set jobs city/state to match the target suburb/state
• Extract local services if they differ from national offerings
• If branch-specific data is not available on the website, use your training knowledge to provide accurate local branch details — label inferred address/phone as "location-specific (estimated)"

DO NOT:
• Default to corporate HQ address or national phone numbers
• Use generic brand-wide content without localising to ${targetLocation}
• Merge multiple branches — profile only the ${targetLocation} branch
` : ''

  const systemPrompt = `You are CADE — the Creerlio Autonomous Data Engine. You build complete, verified, production-ready business profiles for the Creerlio talent platform.
${branchInstructions}
════════════════════════════════════════════════════════════
🚫 CORE RULES — NON-NEGOTIABLE
════════════════════════════════════════════════════════════
• ZERO empty fields. ZERO empty arrays. ZERO "not listed" or "N/A".
• ZERO generic placeholders (e.g. "competitive salary", "great culture").
• If data is not on the website → use your full training knowledge about this company, its industry, real competitors, Australian market rates, and sector norms.
• Partial output = FAILURE. Weak data = FAILURE.

════════════════════════════════════════════════════════════
🧠 INFERENCE ENGINE (MANDATORY FOR ALL ARRAYS)
════════════════════════════════════════════════════════════
If a field (roles, skills, growth_areas, etc.) is not explicitly stated in the website content, you MUST infer it from:
1. The service description and what delivering it requires
2. Job descriptions present in the scraped content
3. Industry standards for this type of company in Australia
4. The company's known clients, products, or positioning

EXAMPLE — If service = "Residential Property Management":
→ roles MUST include: Property Manager, Leasing Consultant, Property Administrator, BDM
→ skills MUST include: REIQ/relevant licence, PropertyMe/Palace, tenancy legislation, landlord negotiation, arrears management
→ growth_areas MUST include: short-stay/Airbnb management, build-to-rent sector, digital inspection tooling

EMPTY ARRAYS ARE A CRITICAL FAILURE. Always populate with minimum values stated.

════════════════════════════════════════════════════════════
🔁 SELF-CHECK BEFORE OUTPUT (MANDATORY)
════════════════════════════════════════════════════════════
Before returning JSON, you MUST internally verify:
✅ All arrays have required minimum entries (roles ≥ 2, skills ≥ 3, growth_areas ≥ 2)
✅ No field contains only "" or []
✅ Company name is consistent throughout
✅ All counts: jobs=4, services=5, impact_stats=5, culture_values=5, benefits=5, hiring_interests=6, skills=6
✅ Grammar, spelling, professional tone throughout
If any check fails → fix it before outputting.

════════════════════════════════════════════════════════════
📋 FIELD-BY-FIELD REQUIREMENTS
════════════════════════════════════════════════════════════

ABOUT (profile.about):
• Exactly 5 paragraphs, each 4–6 sentences
• Para 1: Founding story, history, mission roots — specific years, founders, original vision
• Para 2: Core services and what makes them genuinely different from competitors
• Para 3: Scale, reach, market position, notable clients/projects
• Para 4: Workplace culture, team ethos, how people describe working there
• Para 5: Growth trajectory, future direction, why this is an exciting time to join

TAGLINE: Memorable, company-specific — not generic. Max 10 words.

IMPACT STATS (exactly 5):
• Real or well-estimated figures: years operating, team size, clients served, offices, projects
• Format: "500+", "20 years", "$2B+", "98%" — concrete numbers only

CULTURE VALUES (exactly 5):
• Title: 1–2 words (real values or well-inferred)
• Description: 3–4 sentences — how this value manifests in real day-to-day work

SERVICES (exactly 5):
• Each service: specific to what this company actually offers
• short_description: 3–4 sentences on HOW the service works and what clients receive
• who_it_is_for: specific persona (e.g. "Landlords in the Lane Cove area with 1–3 investment properties")
• problem_it_solves: real pain point, written with empathy
• teams: MINIMUM 2 internal teams involved in delivering this service (e.g. "Engineering", "Product", "Sales", "Customer Success"). Infer from industry. NEVER empty.
• roles: MINIMUM 2 specific job titles. Infer from industry if not stated. NEVER empty.
• skills: MINIMUM 3 specific technical/professional skills. Infer if needed. NEVER empty.
• growth_areas: MINIMUM 2 emerging areas. Infer from market trends if needed. NEVER empty.
• impact.who_it_helps: specific client/user type who benefits. NEVER empty.
• impact.what_it_improves: what measurably improves for them. NEVER empty.
• impact.real_world_outcomes: 1–2 concrete outcomes (e.g. "40% faster onboarding", "2x retention rate"). NEVER empty.
• we_are_hiring: set to true if this service requires specialist staff to deliver
• currently_scaling: set to true if this is a growth area for the company

JOBS (exactly 4):
• Titles: realistic for this company and industry
• description: 5–6 sentences — role, day-to-day, team, impact
• requirements: specific years of experience, licences, qualifications, tools
• salary: realistic Australian market rates for this role/seniority
• city/state: actual office locations where known
• apply_url: real careers page URL or realistic SEEK/LinkedIn URL. NEVER placeholder text.

BENEFITS (exactly 5):
• Specific to this company type — NOT "competitive salary" or "great team"
• description: 2–3 sentences on what this benefit actually looks like in practice

PROGRAMS (3–5): Real or highly plausible programs this company type offers. Include URL paths.

SOCIAL PROOF (3 quotes): Specific, plausible quotes from realistic clients or employees.

DALL-E IMAGE PROMPTS:
• Vivid, cinematic, industry-specific — 2–3 sentences each
• Reference actual industry aesthetic, city setting, office type, client type
• NO generic stock photo descriptions
• logo: brand identity style (colours, typography feel, mark style)
• hero: dramatic establishing shot for their industry and location
• office: specific interior (open plan CBD, boutique suburban, etc.)
• community: specific initiative this company type would run

HIRING INTERESTS: exactly 6 specific role types this company hires for
SKILLS: exactly 6 specific technical/professional skills valued here
SPECIALISATIONS: exactly 5 specific practice areas

CREDENTIALS:
• email: demo.[slug]@creerlio.com
• password: Demo[CompanyNameNoSpaces]2025!

════════════════════════════════════════════════════════════
🥇 SOURCE PRIORITY (for resolving conflicts)
════════════════════════════════════════════════════════════
1. Official website (specific page > homepage)
2. LinkedIn company page
3. YouTube channel
4. Trusted business directories (ASIC, Google Business, Seek company profiles)

════════════════════════════════════════════════════════════
RETURN ONLY valid JSON. No markdown, no explanation, no code fences.
════════════════════════════════════════════════════════════`

  const detectedLinkedin  = socialLinks.linkedin  || linkedinUrl || 'not provided'
  const detectedFacebook  = socialLinks.facebook  || 'not provided'
  const detectedInstagram = socialLinks.instagram || 'not provided'
  const detectedTwitter   = socialLinks.twitter   || 'not provided'
  const detectedYoutube   = discoveredYouTube || socialLinks.youtube || youtubeUrl || 'not provided'

  const locationLine = targetLocation ? `Target Location (LOCAL BRANCH): ${targetLocation}\n` : ''

  const jobTitlesSection = scrapedJobTitles && scrapedJobTitles.length > 0
    ? `\nReal job titles scraped from ATS/SEEK (use these to accurately represent the company's actual hiring — reflect them in services, roles, and jobs):\n${scrapedJobTitles.slice(0, 40).map(t => `• ${t}`).join('\n')}\n`
    : ''

  const userPrompt = `Company Website: ${websiteUrl}
${locationLine}LinkedIn: ${detectedLinkedin}
YouTube: ${detectedYoutube}
Facebook: ${detectedFacebook}
Instagram: ${detectedInstagram}
Twitter/X: ${detectedTwitter}
${jobTitlesSection}
Website Content (scraped from homepage + services/about/team/contact pages):
${websiteContent.slice(0, 32000)}

${websiteContent.length < 2000 ? '⚠ IMPORTANT: Website returned minimal content — it is almost certainly JavaScript-rendered. You MUST use your training knowledge about this company and its industry to produce a rich, accurate, comprehensive profile. Do not produce generic content.' : ''}
${targetLocation ? `⚠ BRANCH REMINDER: Profile the LOCAL branch in "${targetLocation}" specifically. Business name must follow format: "{Brand} — {Suburb}". Use local address and phone, not head office defaults.` : ''}

Generate the complete Creerlio Business Profile JSON:

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
  "services": [{ "name": "", "category": "Service", "short_description": "", "who_it_is_for": "", "problem_it_solves": "", "teams": [], "roles": [], "skills": [], "growth_areas": [], "impact": { "who_it_helps": "", "what_it_improves": "", "real_world_outcomes": "" }, "we_are_hiring": true, "open_to_partnerships": false, "currently_scaling": false }],
  "jobs": [{ "title": "", "description": "", "city": "", "state": "", "country": "Australia", "location": "", "employment_type": "Full-time", "experience_level": "", "salary_min": 0, "salary_max": 0, "salary_currency": "AUD", "required_skills": [], "preferred_skills": [], "requirements": "", "apply_url": "" }],
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
  "credentials": { "email": "", "password": "" }
}`

  log('\n  Calling GPT-4o to generate profile (this takes ~30s)...')
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.4,
    max_tokens: 8000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
  })

  const raw = completion.choices[0].message.content || ''
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  return JSON.parse(cleaned)
}

/** Dedicated narration script generation — produces a rich 90s spoken video script */
async function generateNarration(
  openai: OpenAI,
  companyName: string,
  data: any,
  log: (msg: string) => void
): Promise<string> {
  log('  Generating narration script...')
  const about = (data.profile?.about || '').slice(0, 800)
  const tagline = data.profile?.tagline || ''
  const mission = data.content?.mission || ''
  const industry = data.profile?.industry || ''
  const values = (data.culture_values || []).slice(0, 3).map((v: any) => v.title).join(', ')
  const hiring = (data.hiring_interests || []).slice(0, 4).join(', ')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 500,
    temperature: 0.5,
    messages: [{
      role: 'user',
      content: `Write a 90-second professional video narration script for ${companyName}, an Australian ${industry} company.

Key info:
- Tagline: ${tagline}
- Mission: ${mission}
- Core values: ${values}
- Currently hiring: ${hiring}
- About (excerpt): ${about}

Requirements:
• 280–320 words — exactly right for 90 seconds at a measured pace
• Warm, confident narrator voice — like a premium employer brand video
• Structure: hook (10s) → company story & impact (30s) → culture & people (20s) → opportunity & call to action (30s)
• Specific to this company — reference their actual industry, services, and values
• End with: "Explore opportunities at ${companyName} today."
• Return ONLY the script text — no stage directions, no labels, no formatting`,
    }],
  })

  return completion.choices[0].message.content?.trim() || `Welcome to ${companyName}. ${about}`
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
  claimToken: string | null
}

async function generateSingleProfile(opts: {
  supabase: SupabaseClient<any>
  openai: OpenAI
  SUPABASE_URL: string
  websiteUrl: string
  linkedinUrl?: string
  youtubeUrl?: string
  customSlug?: string
  targetLocation?: string
  log: (msg: string) => void
  err: (msg: string) => void
}): Promise<ProfileResult> {
  const { supabase, openai, SUPABASE_URL, log, err } = opts
  const websiteUrl     = opts.websiteUrl
  const linkedinUrl    = opts.linkedinUrl    || ''
  const youtubeUrl     = opts.youtubeUrl     || ''
  const customSlug     = opts.customSlug     || ''
  const targetLocation = opts.targetLocation || ''

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creerlio-biz-'))

  try {
    // ── Step 1: Research ─────────────────────────────────────────────────
    log('\n[1/12] Researching company...')
    if (targetLocation) log(`  Target location: ${targetLocation}`)
    log('  Scanning website for social links and logo...')
    const websiteHtml    = await fetchMultiplePages(websiteUrl, targetLocation)
    const detectedSocial = extractSocialLinks(websiteHtml)
    const origin         = new URL(websiteUrl).origin
    log('  Discovering logo...')
    const effectiveLinkedin = (detectedSocial.linkedin || linkedinUrl) || undefined
    const logoCandidate  = await withTimeout(findBestLogoUrl(websiteHtml, origin, effectiveLinkedin), 8000, null)

    if (Object.keys(detectedSocial).length > 0) {
      log(`  ✓ Found social links: ${Object.keys(detectedSocial).join(', ')}`)
    }

    // Detect ATS / careers URL and scrape real jobs before calling GPT
    log('  Scanning for real job listings...')
    const careersUrl = detectCareersUrl(websiteHtml, origin)
    let scrapedJobs: any[] = []
    if (careersUrl) {
      log(`  Detected careers URL: ${careersUrl}`)
      scrapedJobs = await scrapeJobsFromATS(careersUrl, log)
    }

    // DIE: also search SEEK for additional real jobs (run in parallel with ATS if ATS returned few)
    if (scrapedJobs.length < 5) {
      log('  Searching SEEK for additional job listings...')
      // Extract a rough company name from the URL for SEEK search
      const domainName = origin.replace(/^https?:\/\/(?:www\.)?/, '').split('.')[0]
      const seekJobs = await seekJobSearch(domainName, log)
      if (seekJobs.length > 0) {
        // Merge: add SEEK jobs that don't duplicate ATS titles
        const existingTitles = new Set(scrapedJobs.map(j => j.title.toLowerCase()))
        const newJobs = seekJobs.filter(j => !existingTitles.has(j.title.toLowerCase()))
        scrapedJobs = [...scrapedJobs, ...newJobs]
        log(`  ✓ Total after SEEK merge: ${scrapedJobs.length} jobs`)
      }
    }

    if (scrapedJobs.length > 0) {
      log(`  ✓ ${scrapedJobs.length} real jobs will be imported`)
    } else {
      log('  No real jobs found — AI will generate representative listings')
    }

    // DIE: auto-discover YouTube channel if not provided
    let effectiveYoutube = youtubeUrl
    if (!effectiveYoutube && !detectedSocial.youtube) {
      log('  No YouTube URL provided — attempting auto-discovery...')
      // Use domain name as search term; we'll refine after GPT gives us the company name
      const domainName = origin.replace(/^https?:\/\/(?:www\.)?/, '').split('.')[0]
      const discovered = await findYouTubeChannel(domainName, log)
      if (discovered) effectiveYoutube = discovered
    } else if (detectedSocial.youtube) {
      log(`  ✓ YouTube detected from website: ${detectedSocial.youtube}`)
    }

    // Collect real job titles to pass as context to GPT
    const scrapedJobTitles = scrapedJobs.map(j => j.title).filter(Boolean)

    const data = await researchCompany(
      openai, websiteUrl, linkedinUrl, effectiveYoutube,
      detectedSocial, websiteHtml, targetLocation, log,
      scrapedJobTitles, effectiveYoutube || undefined
    )

    const companyName = data.business?.name || 'Company'
    const slug        = customSlug || slugify(companyName)
    const demoEmail   = data.credentials?.email || `demo.${slug}@creerlio.com`
    const demoPass    = data.credentials?.password || `Demo${companyName.replace(/\s/g, '')}2025!`

    log(`\n  ✓ Company: ${companyName}`)
    log(`  ✓ Slug:    ${slug}`)
    log(`  ✓ Email:   ${demoEmail}`)

    // DIE: enrichment pass — fill empty service sub-sections with targeted GPT call
    if (Array.isArray(data.services) && data.services.length > 0) {
      log('\n[1b/12] Running service enrichment pass...')
      data.services = await enrichServiceSections(openai, data.services, companyName, data.profile?.industry || '', log)
    }

    // DIE: if YouTube was auto-discovered after GPT (using real company name now), re-search with accurate name
    if (!effectiveYoutube && !detectedSocial.youtube) {
      log('  Retrying YouTube discovery with confirmed company name...')
      const discovered = await findYouTubeChannel(companyName, log)
      if (discovered) {
        effectiveYoutube = discovered
        data.business = data.business || {}
        data.business.youtube_url = discovered
      }
    }

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

    if (logoCandidate) {
      log(`  Logo source: ${logoCandidate.source}`)
      log(`  Downloading: ${logoCandidate.url}`)
      try {
        const isSvg = /\.svg(\?|$)/i.test(logoCandidate.url)
        const ext = isSvg ? 'svg' : /\.png(\?|$)/i.test(logoCandidate.url) ? 'png' : 'jpg'
        const logoFilename = `${slug}-logo.${ext}`
        const logoTmpPath  = path.join(tmpDir, logoFilename)
        await downloadFile(logoCandidate.url, logoTmpPath)
        const logoSize = fs.statSync(logoTmpPath).size
        if (logoSize > 500) {
          const storagePath = `${userId}/bank/${logoFilename}`
          const contentType = isSvg ? 'image/svg+xml'
            : ext === 'png' ? 'image/png'
            : /\.ico(\?|$)/i.test(logoCandidate.url) ? 'image/x-icon'
            : 'image/jpeg'
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(
            storagePath, fs.readFileSync(logoTmpPath), { contentType, upsert: true }
          )
          if (!upErr) {
            imageResults['logo'] = {
              storagePath, tmpPath: logoTmpPath,
              fileUrl: publicStorageUrl(SUPABASE_URL, storagePath), size: logoSize,
            }
            log(`  ✓ Real logo acquired via ${logoCandidate.source} (${(logoSize/1024).toFixed(0)} KB, ${ext.toUpperCase()})`)
          } else {
            err(`  ✗ Logo upload failed: ${upErr.message} — will generate with DALL-E`)
          }
        } else {
          log(`  Logo file too small (${logoSize}B) — trying DALL-E`)
        }
      } catch (e: any) {
        err(`  ✗ Logo download failed: ${e.message} — will generate with DALL-E`)
      }
    } else {
      log('  No logo found from website — will generate with DALL-E')
    }

    // Generate DALL-E images in parallel batches of 3 to respect rate limits
    const pendingDalle = dalleImages.filter((img: any) => !(img.key === 'logo' && imageResults['logo']))
    if (dalleImages.length > pendingDalle.length) log('  Skipping DALL-E logo (using real website logo)')

    const BATCH = 3
    for (let b = 0; b < pendingDalle.length; b += BATCH) {
      const batch = pendingDalle.slice(b, b + BATCH)
      await Promise.all(batch.map(async (img: any) => {
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
      }))
    }

    // ── Step 4: TTS ──────────────────────────────────────────────────────
    // If a YouTube URL was provided or discovered, use it directly as the intro video
    let videoPublicUrl: string | null = effectiveYoutube || null
    let videoSize = 0
    let audioDur = 60

    if (effectiveYoutube) {
      log('\n[4/12] YouTube URL available — skipping TTS generation')
      log(`  ✓ Using YouTube video: ${effectiveYoutube}`)
    } else {
      log('\n[4/12] Generating TTS narration...')
      const narrationText = await generateNarration(openai, companyName, data, log)
      log(`  Script: ${narrationText.split(' ').length} words`)
      const audioPath = path.join(tmpDir, 'narration.mp3')
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1-hd', voice: 'onyx',
        input: narrationText.slice(0, 4096), speed: 0.9,
      })
      fs.writeFileSync(audioPath, Buffer.from(await mp3.arrayBuffer()))
      log('  ✓ TTS generated')

      // ── Step 5: Video ──────────────────────────────────────────────────
      log('\n[5/12] Encoding intro video...')
      try {
        const ffmpegBin = getFfmpegBin()
        log(`  ffmpeg: ${ffmpegBin}`)
        try {
          execFileSync(ffmpegBin, ['-i', audioPath, '-f', 'null', '-'], { stdio: ['pipe','pipe','pipe'] })
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

          execFileSync(ffmpegBin, [
            '-y', '-f', 'concat', '-safe', '0', '-i', concatFile,
            '-i', audioPath,
            '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
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
        // Still upload the narration audio so the TTS work isn't wasted
        try {
          const audioStoragePath = `${userId}/bank/${slug}-narration.mp3`
          const { error: audioUpErr } = await supabase.storage.from(BUCKET).upload(
            audioStoragePath, fs.readFileSync(audioPath), { contentType: 'audio/mpeg', upsert: true }
          )
          if (!audioUpErr) {
            videoPublicUrl = publicStorageUrl(SUPABASE_URL, audioStoragePath)
            log('  ✓ Narration audio uploaded as fallback')
          }
        } catch (_) {}
      }
    } // end of else (no youtubeUrl)

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
      const isYouTube = videoPublicUrl.includes('youtube.com') || videoPublicUrl.includes('youtu.be')
      const { data: vidItem, error: vidErr } = await supabase.from('business_bank_items').insert({
        user_id: userId,
        item_type: isYouTube ? 'link' : 'business_introduction',
        title: `${companyName} — ${isYouTube ? 'YouTube Channel' : 'Introduction Video'}`,
        file_url: videoPublicUrl,
        file_type: isYouTube ? 'text/uri-list' : 'video/mp4',
        file_size: videoSize,
        metadata: { duration: Math.round(audioDur), is_youtube: isYouTube }, is_active: true,
      }).select('id').single()
      if (vidErr) err('  ✗ Video bank item: ' + vidErr.message)
      else { bankItems.push({ key: 'video', id: vidItem.id }); log(`  ✓ video → id ${vidItem.id}`) }
    }

    // Merge social URLs: detected from HTML → GPT-4o output → discovered → user-provided inputs
    const mergedLinkedin  = detectedSocial.linkedin  || data.business?.linkedin_url  || linkedinUrl      || null
    const mergedYoutube   = detectedSocial.youtube   || data.business?.youtube_url   || effectiveYoutube || null
    const mergedFacebook  = detectedSocial.facebook  || data.business?.facebook_url  || null
    const mergedInstagram = detectedSocial.instagram || data.business?.instagram_url || null
    const mergedTwitter   = detectedSocial.twitter   || data.business?.twitter_url   || null

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

    // Build socialLinks as the array format the view page expects
    const socialLinksArray = [
      { platform: 'Website',   url: websiteUrl },
      ...(mergedLinkedin  ? [{ platform: 'LinkedIn',   url: mergedLinkedin  }] : []),
      ...(mergedYoutube   ? [{ platform: 'YouTube',    url: mergedYoutube   }] : []),
      ...(mergedFacebook  ? [{ platform: 'Facebook',   url: mergedFacebook  }] : []),
      ...(mergedInstagram ? [{ platform: 'Instagram',  url: mergedInstagram }] : []),
      ...(mergedTwitter   ? [{ platform: 'X',          url: mergedTwitter   }] : []),
      ...(data.business?.careers_url ? [{ platform: 'Careers', url: data.business.careers_url }] : []),
    ]

    const profileMetadata = {
      // Core identity — drives the view page header
      name: companyName,
      title: data.profile?.tagline || '',
      bio: data.profile?.about || '',
      // Media — drives logo and banner display (must be storage path, not full URL)
      avatar_path: imageResults.logo?.storagePath || null,
      banner_path: imageResults.hero?.storagePath || null,
      // Bank item references
      logoId: logoItem?.id || null, heroImageId: heroItem?.id || null,
      introVideoId: videoItem?.id || null, introVideoUrl: videoPublicUrl,
      attachmentIds,
      // Social links as [{platform,url}] array (expected by view page)
      socialLinks: socialLinksArray,
      // Profile fields
      tagline: data.profile?.tagline || '',
      businessType: data.profile?.business_type || '', industry: data.profile?.industry || '',
      specialisations: data.specialisations || [], founded: data.profile?.founded_year || null,
      size: data.profile?.company_size || '', website: websiteUrl,
      skills: data.skills || [],
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
      visibility: 'private', claim_token: generateClaimToken(),
      claim_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      claim_status: 'pending', is_ai_generated: true,
    }, { onConflict: 'id' })
    if (bpErr) err('  business_profiles: ' + bpErr.message)
    else log('  ✓ business_profiles')

    // Fetch the claim_token we just wrote (needed for claim link in summary)
    let claimToken: string | null = null
    const { data: bpRow } = await supabase.from('business_profiles').select('claim_token').eq('id', userId).maybeSingle()
    claimToken = bpRow?.claim_token || null

    // Log business_created event
    await supabase.from('business_claim_events').insert({
      business_id: userId, event_type: 'business_created',
      metadata: { company_name: companyName, source: 'ai_generator', website: websiteUrl },
    })

    // ── Step 8: business_profile_pages ───────────────────────────────────
    log('\n[8/12] Creating business_profile_pages...')
    const logoUrl = imageResults.logo?.fileUrl || null
    const heroUrl = imageResults.hero?.fileUrl || null
    const { error: bppErr } = await supabase.from('business_profile_pages').upsert({
      business_id: userId, slug, is_published: false, name: companyName,
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
    // Delete any previously generated jobs so regeneration doesn't duplicate them
    const { error: delJobsErr } = await supabase.from('jobs').delete().eq('business_id', userId)
    if (delJobsErr) err('  ⚠ Could not clear old jobs: ' + delJobsErr.message)
    else log('  ✓ Cleared previous jobs')

    // Use real ATS jobs when available; fall back to GPT-generated
    const jobs = scrapedJobs.length > 0 ? scrapedJobs : (data.jobs || [])
    if (scrapedJobs.length > 0) log(`  Using ${jobs.length} real jobs from ATS`)
    else log(`  Using ${jobs.length} AI-generated jobs`)
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
        application_url: job.apply_url || null,
      })
      if (jErr) err(`  ✗ Job "${job.title}": ${jErr.message}`)
      else { jobCount++; log(`  ✓ ${job.title}`) }
    }

    // ── Step 12: Services ────────────────────────────────────────────────
    log('\n[12/12] Creating services...')
    // Delete previously generated services (and cascade-delete all sub-tables)
    const { data: existingProducts } = await supabase
      .from('business_products_services')
      .select('id')
      .eq('business_id', userId)
    if (existingProducts && existingProducts.length > 0) {
      const productIds = existingProducts.map(p => p.id)
      // Delete sub-tables first (guard against missing FK cascades)
      for (const tbl of ['business_product_teams', 'business_product_roles', 'business_product_skills',
        'business_product_growth_areas', 'business_product_impact', 'business_product_signals',
        'business_product_permissions', 'business_product_media']) {
        await supabase.from(tbl as any).delete().in('product_id', productIds)
      }
      await supabase.from('business_products_services').delete().eq('business_id', userId)
      log(`  ✓ Cleared ${existingProducts.length} previous services`)
    }

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

      if (Array.isArray(svc.teams) && svc.teams.length > 0) {
        await ins('business_product_teams', svc.teams.map((t: any, idx: number) => ({
          product_id: productId, business_id: userId, user_id: userId,
          team_name: typeof t === 'string' ? t : t.name, order_index: idx,
        })))
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
      await ins('business_product_impact', [{
        product_id: productId, business_id: userId, user_id: userId,
        who_it_helps: svc.impact?.who_it_helps || '',
        what_it_improves: svc.impact?.what_it_improves || '',
        real_world_outcomes: svc.impact?.real_world_outcomes || '',
      }])
      await ins('business_product_signals', [{
        product_id: productId, business_id: userId, user_id: userId,
        we_are_hiring_for_this: svc.we_are_hiring !== false,
        open_to_partnerships: svc.open_to_partnerships || false,
        in_research_and_development: false,
        currently_scaling: svc.currently_scaling || false,
      }])
      await ins('business_product_permissions', [{ product_id: productId, business_id: userId, user_id: userId }])
    }

    try { fs.rmSync(tmpDir, { recursive: true }) } catch (_) {}
    return { companyName, demoEmail, demoPass, jobCount, svcCount, videoUrl: videoPublicUrl, claimToken }
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

      // Heartbeat: send a dot every 20s so the connection doesn't look dead
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(': heartbeat\n\n')) } catch (_) {}
      }, 20000)

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
                targetLocation: location,
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
            targetLocation: location,
            log, err,
          })

          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://creerlio.com'
          const claimLink = result.claimToken ? `${siteUrl}/business/claim/${result.claimToken}` : null
          log('\n╔══════════════════════════════════════════════════════════════╗')
          log(`  ✅  ${result.companyName} profile created successfully!`)
          log('╚══════════════════════════════════════════════════════════════╝')
          log(`  Login Email:  ${result.demoEmail}`)
          log(`  Password:     ${result.demoPass}`)
          log(`  Jobs:         ${result.jobCount} created`)
          log(`  Services:     ${result.svcCount} created`)
          if (result.videoUrl) log(`  Video:        ${result.videoUrl}`)
          if (claimLink) log(`  Claim Link:   ${claimLink}`)
          log('  Status:       Private — awaiting claim')
          log('══════════════════════════════════════════════════════════════')
          send({ claimToken: result.claimToken, claimLink })
        }

        send({ done: true })
      } catch (e: any) {
        err('\n❌  FATAL: ' + (e?.message || String(e)))
        send({ error: e?.message || 'Generation failed' })
      } finally {
        clearInterval(heartbeat)
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
