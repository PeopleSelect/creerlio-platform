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

  // Try resolving via system PATH (works on Windows with choco/winget installs)
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    const result = execFileSync(cmd, ['ffmpeg'], { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim().split('\n')[0].trim()
    if (result && fs.existsSync(result)) return result
  } catch (_) {}

  // ffmpeg-static works in local dev but path breaks when Next.js bundles the route
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const staticPath: string = require('ffmpeg-static')
    if (staticPath && fs.existsSync(staticPath)) return staticPath
  } catch (_) {}

  throw new Error('ffmpeg not found — install it (https://ffmpeg.org/download.html) or set FFMPEG_PATH env var to enable video generation')
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

// SSL-tolerant HTTPS agent — handles company sites with self-signed or chain-broken certs
const insecureAgent = new https.Agent({ rejectUnauthorized: false })

async function downloadFile(url: string, dest: string, referer?: string, depth = 0): Promise<void> {
  if (depth > 4) throw new Error('Too many redirects')
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const proto = url.startsWith('https') ? https : http
    const origin = (() => { try { return new URL(url).origin } catch (_) { return '' } })()
    const opts: any = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': referer || origin || 'https://www.google.com/',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
    }
    if (url.startsWith('https')) opts.agent = insecureAgent
    const req = proto.get(url, opts, (res: any) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        file.close()
        try { fs.unlinkSync(dest) } catch (_) {}
        const location = res.headers.location
        if (!location) { reject(new Error('Redirect with no Location')); return }
        const next = location.startsWith('http') ? location : new URL(location, url).href
        downloadFile(next, dest, referer || origin, depth + 1).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    })
    ;(req as any).on('error', (e: any) => { file.close(); try { fs.unlinkSync(dest) } catch (_) {} reject(e) })
    ;(req as any).setTimeout(10000, () => { (req as any).destroy(); reject(new Error('Download timeout')) })
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
  // Internal careers page href — broad pattern covering nested paths
  const hrefRe = /href=["']([^"']*(?:career|\/jobs|join-us|work-with-us|employment|vacancies|opportunities|hiring)[^"']*)["']/i
  const hm = html.match(hrefRe)
  if (hm) {
    const href = hm[1]
    if (href.startsWith('http')) return href
    try { return new URL(href, baseOrigin).href } catch (_) {}
  }
  return null
}

/** Generic HTML careers page scraper — uses GPT-4o-mini to extract job listings from any custom careers page */
async function scrapeJobsFromHTML(
  careersUrl: string,
  openai: OpenAI,
  log: (m: string) => void
): Promise<any[]> {
  log(`  Scraping HTML careers page: ${careersUrl}`)
  try {
    const html = await withTimeout(fetchWebsiteText(careersUrl, 20000), 15000, '')
    if (!html || html.length < 100) { log('  ⚠ Could not fetch careers page HTML'); return [] }
    const text = html.slice(0, 14000)
    log(`  Got ${text.length} chars — extracting jobs with GPT...`)
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'system',
        content: 'Extract job listings from this careers page. Return JSON: { "jobs": [ { "title": "", "city": "", "state": "", "employment_type": "", "description": "" } ] }. Country is always Australia. Use empty string if unknown.'
      }, {
        role: 'user',
        content: `Extract ALL job listings from this careers page content:\n\n${text}`
      }]
    })
    const parsed = JSON.parse(resp.choices[0]?.message?.content || '{}')
    const jobs: any[] = Array.isArray(parsed.jobs) ? parsed.jobs : []
    if (jobs.length > 0) {
      log(`  ✓ GPT extracted ${jobs.length} jobs from careers page`)
      return jobs.map(j => ({
        title: j.title || '',
        description: j.description || '',
        city: j.city || '',
        state: j.state || '',
        country: 'Australia',
        location: [j.city, j.state].filter(Boolean).join(', '),
        employment_type: j.employment_type || 'Full-time',
        experience_level: '',
        salary_min: null, salary_max: null, salary_currency: 'AUD',
        required_skills: [], preferred_skills: [], requirements: '',
        apply_url: careersUrl,
      }))
    }
    log('  ⚠ GPT found no jobs on careers page')
  } catch (e: any) {
    log(`  ⚠ HTML job scraping error: ${e.message}`)
  }
  return []
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

  const enrichPrompt = `You are the ZGE enrichment pass for ${companyName} (${industry}) service cards.

Extract ONLY from the service name and short_description provided — do NOT guess or infer from general industry knowledge.

Services to enrich:
${JSON.stringify(weakList, null, 2)}

Rules:
- teams: extract any internal team names mentioned or strongly implied by the service description; if none → []
- roles: extract any job titles mentioned in the description; if none → []
- skills: extract any specific technical skills, tools, or qualifications mentioned; if none → []
- growth_areas: extract any growth areas, emerging trends, or future directions mentioned; if none → []
- DO NOT fabricate content not present in the service name or description
- Return ONLY valid JSON array:
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

// ── Phase 2: Careers subdomain discovery ─────────────────────────────────────

/** Try careers.domain.com / jobs.domain.com — returns first reachable subdomain URL */
async function discoverCareersSubdomain(origin: string, log: (m: string) => void): Promise<string | null> {
  const host = new URL(origin).hostname.replace(/^www\./, '')
  const candidates = [
    `https://careers.${host}`,
    `https://jobs.${host}`,
    `https://work.${host}`,
    `https://join.${host}`,
    `https://talent.${host}`,
  ]
  for (const url of candidates) {
    try {
      const text = await withTimeout(fetchWebsiteText(url, 3000), 5000, '')
      if (text.length > 500) {
        log(`  ✓ Careers subdomain found: ${url}`)
        return url
      }
    } catch (_) {}
  }
  return null
}

// ── Phase 3: Dynamic internal link discovery ──────────────────────────────────

/** Extract internal links from a page's HTML — returns paths matching high-value patterns */
function extractHighValueLinks(html: string, origin: string): string[] {
  const HIGH_VALUE = /career|job|people|team|culture|benefit|life-at|working|join|why-work|about|values|service|solution|expertise|practice|what-we-do/i
  const seen = new Set<string>()
  const links: string[] = []
  const hrefRe = /href=["']([^"'#?]+)["']/gi
  let m: RegExpExecArray | null
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1].trim()
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.endsWith('.pdf')) continue
    try {
      const abs = href.startsWith('http') ? href : new URL(href, origin).href
      if (!abs.startsWith(origin)) continue   // external — skip
      if (seen.has(abs)) continue
      if (HIGH_VALUE.test(abs)) { seen.add(abs); links.push(abs) }
    } catch (_) {}
  }
  return links.slice(0, 12)   // cap at 12 discovered links
}

// ── Phase 4: Interactive extraction via Browserless.io (optional) ─────────────

/**
 * If BROWSERLESS_API_URL is set, fetch page with a headless browser and extract
 * text from expanded accordions/tabs. Degrades gracefully when not configured.
 * Set BROWSERLESS_API_URL=https://chrome.browserless.io and BROWSERLESS_TOKEN=your_key
 */
async function fetchInteractiveContent(pageUrl: string, log: (m: string) => void): Promise<string> {
  const apiUrl  = process.env.BROWSERLESS_API_URL
  const token   = process.env.BROWSERLESS_TOKEN
  if (!apiUrl || !token) return ''

  log(`  [Interactive] Fetching ${pageUrl} via Browserless...`)
  try {
    const script = `
      module.exports = async ({ page }) => {
        await page.goto(${JSON.stringify(pageUrl)}, { waitUntil: 'networkidle2', timeout: 15000 });
        // Click common expand patterns
        const selectors = [
          '[data-toggle]', '[aria-expanded="false"]', '.accordion-button',
          '.expand', '.read-more', '[class*="accordion"]', '[class*="toggle"]',
        ];
        for (const sel of selectors) {
          try {
            const els = await page.$$(sel);
            for (const el of els.slice(0, 8)) { await el.click().catch(() => {}); await page.waitForTimeout(300); }
          } catch (_) {}
        }
        return page.evaluate(() => document.body?.innerText || '');
      };
    `
    const res = await withTimeout(
      fetch(`${apiUrl}/function?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/javascript' },
        body: script,
      }).then(r => r.text()),
      20000,
      ''
    )
    if (res && res.length > 200) {
      log(`  ✓ Interactive content: ${res.length} chars from ${pageUrl}`)
      return res.slice(0, 15000)
    }
  } catch (e: any) {
    log(`  ⚠ Interactive fetch failed: ${e.message}`)
  }
  return ''
}

// ── Phase 1: Secondary source scraping (Glassdoor, Indeed) ───────────────────

/** Scrape Glassdoor company overview page for rating, reviews, benefits mentions */
async function scrapeGlassdoor(companyName: string, domain: string, log: (m: string) => void): Promise<string> {
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  // Try direct working-at URL first; fall back to search page
  const candidates = [
    `https://www.glassdoor.com.au/Overview/Working-at-${slug}-EI.htm`,
    `https://www.glassdoor.com/Reviews/${slug}-Reviews-E.htm`,
  ]
  for (const url of candidates) {
    try {
      const html = await withTimeout(fetchWebsiteText(url, 30000), 8000, '')
      if (html.length > 500 && !html.toLowerCase().includes('enable javascript')) {
        log(`  ✓ Glassdoor content: ${html.length} chars`)
        return html.slice(0, 8000)
      }
    } catch (_) {}
  }
  log('  ⚠ Glassdoor: blocked or not found (JS-rendered — expected)')
  return ''
}

/** Scrape Indeed company page for reviews and benefits */
async function scrapeIndeed(companyName: string, log: (m: string) => void): Promise<string> {
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const url = `https://au.indeed.com/cmp/${slug}`
  try {
    const html = await withTimeout(fetchWebsiteText(url, 30000), 8000, '')
    if (html.length > 500 && !html.toLowerCase().includes('enable javascript')) {
      log(`  ✓ Indeed content: ${html.length} chars`)
      return html.slice(0, 8000)
    }
  } catch (_) {}
  log('  ⚠ Indeed: blocked or not found (JS-rendered — expected)')
  return ''
}

// ── Phase 8: Profile quality scoring ─────────────────────────────────────────

interface QualityScore {
  total: number       // 0–100
  completeness: number
  depth: number
  source_diversity: number
  breakdown: Record<string, boolean>
}

function scoreProfileQuality(data: any, sourcesUsed: string[]): QualityScore {
  const checks: Record<string, boolean> = {
    has_about:          (data.profile?.about || '').length > 300,
    has_company_summary:(data.profile?.company_summary || '').length > 200,
    has_business_model: (data.profile?.business_model || '').length > 50,
    has_tagline:        !!data.profile?.tagline && data.profile.tagline !== 'not_found',
    has_services_4plus: Array.isArray(data.services) && data.services.length >= 4,
    services_have_detail: Array.isArray(data.services) && data.services.some((s: any) => (s.short_description || '').length > 80),
    has_culture_values: Array.isArray(data.culture_values) && data.culture_values.length >= 2,
    has_benefits:       Array.isArray(data.benefits) && data.benefits.length >= 1,
    has_location:       !!data.profile?.hq_city && data.profile.hq_city !== 'not_found',
    has_jobs:           Array.isArray(data.jobs) && data.jobs.length > 0,
    has_intelligence:   !!data.intelligence?.operations_overview,
    has_market_position:!!data.intelligence?.market_position,
    has_hiring_interests: Array.isArray(data.hiring_interests) && data.hiring_interests.length > 0,
    has_impact_stats:   Array.isArray(data.impact_stats) && data.impact_stats.length > 0,
    has_mission:        (data.content?.mission || '').length > 30,
  }

  const trueCount = Object.values(checks).filter(Boolean).length
  const completeness = Math.round((trueCount / Object.keys(checks).length) * 100)

  // Depth: reward longer about + more services
  const aboutLen = (data.profile?.about || '').length
  const svcCount = (data.services || []).length
  const depth = Math.min(100, Math.round((Math.min(aboutLen, 3000) / 3000) * 50 + (Math.min(svcCount, 8) / 8) * 50))

  // Source diversity: how many distinct data sources were used
  const diversity = Math.min(100, sourcesUsed.length * 20)

  const total = Math.round(completeness * 0.5 + depth * 0.3 + diversity * 0.2)
  return { total, completeness, depth, source_diversity: diversity, breakdown: checks }
}

// ── Phase 7: Structured benefits extraction ───────────────────────────────────

async function extractStructuredBenefits(
  openai: OpenAI,
  allContent: string,
  companyName: string,
  log: (m: string) => void
): Promise<any> {
  if (!allContent || allContent.length < 200) return null
  log('  Extracting structured benefits...')
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'system',
        content: `You are an HR benefits analyst. Extract ALL employee benefits mentioned in the text.
Return JSON with these categories (use [] if nothing found for a category):
{
  "parental_leave": [],
  "health": [],
  "flexibility": [],
  "development": [],
  "perks": [],
  "financial": [],
  "wellbeing": [],
  "summary": ""
}
Each item is a short string. summary is 1-2 sentences about the overall benefits offering.
If the content has no benefits information, return all empty arrays and summary: "No benefits information found".`
      }, {
        role: 'user',
        content: `Company: ${companyName}\n\nContent:\n${allContent.slice(0, 12000)}`
      }]
    })
    const result = JSON.parse(resp.choices[0]?.message?.content || '{}')
    const hasData = Object.entries(result).some(([k, v]) => k !== 'summary' && Array.isArray(v) && (v as any[]).length > 0)
    if (hasData) log(`  ✓ Structured benefits extracted`)
    return hasData ? result : null
  } catch (e: any) {
    log(`  ⚠ Benefits extraction failed: ${e.message}`)
    return null
  }
}

/** Scrape homepage + comprehensive subpages — all in parallel, hard 15s total cap */
async function fetchMultiplePages(
  websiteUrl: string,
  targetLocation?: string,
  log?: (m: string) => void,
  extraUrls: string[] = []
): Promise<{ content: string; sourcesUsed: string[] }> {
  const base = new URL(websiteUrl)
  const homepage = base.origin

  // Priority 1 — careers/culture pages (highest value for talent profiles)
  const priorityUrls = [
    `${homepage}/careers`,
    `${homepage}/jobs`,
    `${homepage}/life-at-${base.hostname.replace(/^www\./, '').split('.')[0]}`,
    `${homepage}/working-here`,
    `${homepage}/join-us`,
    `${homepage}/join-our-team`,
    `${homepage}/culture`,
    `${homepage}/our-culture`,
    `${homepage}/benefits`,
    `${homepage}/employee-benefits`,
    `${homepage}/why-join-us`,
    `${homepage}/why-work-with-us`,
    `${homepage}/people`,
    `${homepage}/our-people`,
    `${homepage}/team`,
    `${homepage}/our-team`,
  ]

  // Priority 2 — company info
  const infoUrls = [
    homepage,
    `${homepage}/about`,
    `${homepage}/about-us`,
    `${homepage}/our-story`,
    `${homepage}/services`,
    `${homepage}/what-we-do`,
    `${homepage}/practice-areas`,
    `${homepage}/expertise`,
    `${homepage}/solutions`,
    `${homepage}/contact`,
    `${homepage}/contact-us`,
    `${homepage}/news`,
    `${homepage}/blog`,
    `${homepage}/leadership`,
    `${homepage}/partners`,
    `${homepage}/awards`,
    `${homepage}/why-us`,
    `${homepage}/media`,
  ]

  if (targetLocation) {
    const suburb = targetLocation.split(/[,\s]+/)[0].toLowerCase().replace(/\s+/g, '-')
    infoUrls.push(`${homepage}/locations/${suburb}`, `${homepage}/offices/${suburb}`)
  }

  // Merge: priority first, then info, then dynamically discovered, deduped, capped at 32
  const seen = new Set<string>()
  const allUrls: string[] = []
  for (const u of [...priorityUrls, ...extraUrls, ...infoUrls]) {
    if (!seen.has(u)) { seen.add(u); allUrls.push(u) }
    if (allUrls.length >= 32) break
  }

  log?.(`  Crawling ${allUrls.length} pages (priority: careers/culture first)...`)

  const batchPromise = Promise.allSettled(allUrls.map(url => fetchWebsiteText(url, 20000)))
  const results = await withTimeout(batchPromise, 15000, allUrls.map(() => ({ status: 'fulfilled' as const, value: '' })))

  const parts: string[] = []
  const sourcesUsed: string[] = []
  for (let i = 0; i < allUrls.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled' && r.value.length > 300) {
      parts.push(`=== ${allUrls[i]} ===\n${r.value.slice(0, 8000)}`)
      sourcesUsed.push(allUrls[i])
    }
  }
  const content = parts.join('\n\n').slice(0, 60000)
  log?.(`  ✓ Crawled ${sourcesUsed.length}/${allUrls.length} pages successfully`)
  return { content, sourcesUsed }
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

/** Decode common HTML entities in a scraped string */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .trim()
}

/** Clean "not_found" sentinels returned by ZGE before writing to DB */
function nf<T>(val: T, fallback: T): T {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string' && (val.trim() === '' || val.trim().toLowerCase() === 'not_found')) return fallback
  if (typeof val === 'number' && val === 0) return fallback
  return val
}
function nfStr(val: any): string { return nf(val, '') }
function nfNum(val: any): number | null { return nf(val, null as any) }
function nfArr(val: any): any[] { return Array.isArray(val) ? val.filter((v: any) => v !== 'not_found' && v !== null) : [] }

/**
 * Scrape LinkedIn company page — extract description, employee count, industry.
 * LinkedIn is JS-rendered so we parse whatever meta tags we can get.
 */
async function scrapeLinkedInData(linkedinUrl: string, log: (m: string) => void): Promise<{
  description: string; employees: string; industry: string
}> {
  const result = { description: '', employees: '', industry: '' }
  if (!linkedinUrl) return result
  try {
    log(`  Scraping LinkedIn: ${linkedinUrl}`)
    const html = await fetchWebsiteText(linkedinUrl, 100000)
    if (!html || html.length < 200) { log('  ⚠ LinkedIn: empty/blocked response'); return result }

    // og:description — LinkedIn puts company summary here
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
               ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1]
    if (ogDesc) result.description = decodeEntities(ogDesc)

    // Employee count
    const empM = html.match(/([\d,+]+)\s*(?:employees?|members?)\b/i)
    if (empM) result.employees = empM[0].trim()

    // Industry — appears in multiple places in LinkedIn HTML
    const indM = html.match(/"industry"\s*:\s*"([^"]+)"/i)
              ?? html.match(/industry[^\n]{0,40}?[">]([A-Za-z &/]+)[<"]/i)
    if (indM) result.industry = indM[1].trim()

    if (result.description) log(`  ✓ LinkedIn description extracted (${result.description.length} chars)`)
    if (result.employees)   log(`  ✓ LinkedIn employees: ${result.employees}`)
    if (result.industry)    log(`  ✓ LinkedIn industry: ${result.industry}`)
  } catch (e: any) {
    log(`  ⚠ LinkedIn scraping error: ${e.message}`)
  }
  return result
}

/**
 * Scrape YouTube channel page — extract channel description and find a representative video.
 */
async function scrapeYouTubeData(youtubeUrl: string, log: (m: string) => void): Promise<{
  description: string; channelName: string; featuredVideoUrl: string
}> {
  const result = { description: '', channelName: '', featuredVideoUrl: '' }
  if (!youtubeUrl) return result
  try {
    log(`  Scraping YouTube channel: ${youtubeUrl}`)
    const html = await fetchWebsiteText(youtubeUrl, 150000)
    if (!html || html.length < 200) { log('  ⚠ YouTube: empty response'); return result }

    // og:title → channel name
    const titleM = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    if (titleM) result.channelName = decodeEntities(titleM).replace(/\s*[-|]\s*YouTube\s*$/i, '').trim()

    // og:description → channel description
    const descM = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
               ?? html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    if (descM) result.description = decodeEntities(descM)

    // First video ID found in the page
    const vidM = html.match(/["']\/watch\?v=([a-zA-Z0-9_-]{11})["']/)?.[1]
              ?? html.match(/watch%3Fv%3D([a-zA-Z0-9_-]{11})/)?.[1]
    if (vidM) result.featuredVideoUrl = `https://www.youtube.com/watch?v=${vidM}`

    if (result.channelName)    log(`  ✓ YouTube channel: ${result.channelName}`)
    if (result.featuredVideoUrl) log(`  ✓ YouTube video found: ${result.featuredVideoUrl}`)
    if (result.description)    log(`  ✓ YouTube description extracted`)
  } catch (e: any) {
    log(`  ⚠ YouTube scraping error: ${e.message}`)
  }
  return result
}

/**
 * Scrape Instagram profile — extract bio and follower count from og tags.
 */
async function scrapeInstagramData(instagramUrl: string, log: (m: string) => void): Promise<{
  bio: string; followers: string
}> {
  const result = { bio: '', followers: '' }
  if (!instagramUrl) return result
  try {
    log(`  Scraping Instagram: ${instagramUrl}`)
    const html = await fetchWebsiteText(instagramUrl, 60000)
    if (!html || html.length < 200) { log('  ⚠ Instagram: empty/blocked response'); return result }

    const descM = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
               ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1]
    if (descM) {
      result.bio = decodeEntities(descM)
      const follM = descM.match(/([\d,.]+[kKmMbB]?)\s*Followers?/i)
      if (follM) result.followers = follM[1]
    }

    if (result.bio) log(`  ✓ Instagram bio found (${result.bio.length} chars)`)
  } catch (e: any) {
    log(`  ⚠ Instagram scraping error: ${e.message}`)
  }
  return result
}

/**
 * Comprehensive logo discovery with strict priority order:
 * 1. <img> tags with logo/brand in src/class/id/alt — SVG preferred
 * 2. <link> tags: apple-touch-icon, manifest, PNG/SVG icons
 * 3. Common well-known asset paths (/logo.svg, /logo.png, etc.)
 * 4. og:image / twitter:image (marketing images, not ideal logos)
 * 5. /favicon.ico (last resort)
 * Returns ALL candidates sorted by score so callers can try each in sequence.
 */
async function findBestLogoUrl(html: string, origin: string, linkedinUrl?: string): Promise<{ url: string; source: string }[]> {
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

  // Add favicon as absolute last resort
  const faviconUrl = `${origin}/favicon.ico`
  if (!seen.has(faviconUrl)) candidates.push({ url: faviconUrl, score: 1, source: 'favicon.ico fallback' })

  return candidates
}

// ── Company name → URL discovery ─────────────────────────────────────────────

async function discoverWebsiteFromName(
  openai: OpenAI,
  companyName: string,
  location: string,
  log: (msg: string) => void
): Promise<string | null> {
  log(`  Looking up website for "${companyName}"${location ? ` in ${location}` : ''}...`)
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 80,
      messages: [{ role: 'user', content: `What is the official website URL for the company "${companyName}"${location ? ` located in ${location}, Australia` : ''}? Reply with ONLY the full URL starting with https://, nothing else. If unknown reply "unknown".` }]
    })
    const url = (resp.choices[0]?.message?.content || '').trim()
    if (url && url !== 'unknown' && url.startsWith('http')) {
      log(`  ✓ Discovered website: ${url}`)
      return url
    }
    log('  ⚠ Could not auto-discover website URL')
  } catch (e: any) {
    log(`  ⚠ URL discovery error: ${e.message}`)
  }
  return null
}

// ── Mapbox geocoding ──────────────────────────────────────────────────────────

async function mapboxGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token || !address) return null
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&country=AU&limit=1`
    const resp = await withTimeout(
      fetch(url).then(r => r.json()) as Promise<any>,
      5000,
      null as any
    )
    if (resp?.features?.[0]?.center) {
      const [lng, lat] = resp.features[0].center
      return { lat: lat as number, lng: lng as number }
    }
  } catch (_) {}
  return null
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
  discoveredYouTube?: string,
  linkedinContent?: { description: string; employees: string; industry: string },
  youtubeContent?: { description: string; channelName: string; featuredVideoUrl: string },
  instagramContent?: { bio: string; followers: string }
): Promise<any> {
  log(`  Got ${websiteContent.length} chars from website (multi-page scan)`)

  const branchInstructions = targetLocation ? `
═══ BRANCH / LOCAL OFFICE RESOLUTION ═══
Target location requested: "${targetLocation}"
• Profile the LOCAL BRANCH at ${targetLocation} specifically — NOT corporate head office
• Business name format: "{Brand} — {Suburb}" (e.g. "LJ Hooker — Lane Cove")
• hq_city / hq_address: use the local branch address from the scraped content
• jobs city/state: set to ${targetLocation} area
• Extract local services if the website shows location-specific offerings
• If the local address is not in the scraped content → use "not_found"
` : ''

  // Detect if we have rich or sparse source content
  const isSourceRich = websiteContent.length > 3000
    || !!(linkedinContent?.description)
    || !!(youtubeContent?.description)

  const systemPrompt = `You are the ZGE — Creerlio Business Intelligence Engine.

Your task is NOT to summarise a website. Your task is to RECONSTRUCT this company as if preparing a high-quality internal analyst briefing.

The output must be richer, clearer, and more useful than the company's own website.
${branchInstructions}
════════════════════════════════════════════════════════════
⚖️ TWO-TIER DATA APPROACH
════════════════════════════════════════════════════════════
TIER 1 — HARD EXTRACTION (strict — never fabricate):
  • Company name, address, phone, email — extract exactly as written; "not_found" if absent
  • Job listings — use ONLY real ATS/SEEK jobs provided; never invent listings
  • Testimonials / social_proof — only verbatim quotes found in source text; [] if none
  • LinkedIn employee count, industry — extract exactly; "" if not found
  • URLs (careers, social) — extract exactly; null if not found

TIER 2 — ANALYST RECONSTRUCTION (your primary mode):
  • DO NOT just repeat or summarise website text
  • DO NOT produce generic statements like "offers a range of services"
  • EXPAND and clarify weak or vague information using real-world business knowledge
  • INFER missing detail based on strong signals (industry, size, job titles, service names)
  • Write as if a senior analyst has read all the sources and is briefing an executive
  • If the website is sparse (JS-rendered) — use your knowledge of this specific company
  • NEVER add fake testimonials, invented addresses, or wrong phone numbers

════════════════════════════════════════════════════════════
🔑 SOURCE PRIORITY
════════════════════════════════════════════════════════════
1. Official website scraped pages (provided below)
2. LinkedIn company description (provided if available)
3. YouTube channel description (provided if available)
4. Instagram bio (provided if available)
5. Real ATS/SEEK job listings (provided if available)
${isSourceRich ? '✓ Rich source content available — prioritise extraction from provided text.' : '⚠ Sparse source content — use knowledge of this specific company to produce accurate content.'}

════════════════════════════════════════════════════════════
📋 ANALYTICAL STEPS (follow in order)
════════════════════════════════════════════════════════════

STEP 1 — UNDERSTAND THE BUSINESS:
Determine with specificity:
• What the company actually does (in plain, practical terms — not marketing language)
• How they make money (fee-for-service, retainer, project, SaaS, transaction, etc.)
• Who their real customers are (industry, size, geography, buying role)
• What makes them genuinely different (evidence-based — not "we put clients first")
Write this as company_summary: a 4–6 paragraph analyst overview, not a company brochure.

STEP 2 — SERVICES (minimum 4, target 6–10):
Most websites under-describe services. You must identify ALL services — explicit AND implied.
For each service:
• name: exact name from website or derived from context
• short_description: what this service actually does — no fluff
• target_customers: specific customer type (not "businesses of all sizes")
• typical_use_cases: 2–3 real-world scenarios where a client would engage this service
• how_it_is_delivered: project-based / retainer / on-site / platform / consultation / etc.
• problem_it_solves: the specific pain point — be concrete
• roles: job titles involved in delivering this service
• skills: technical/professional skills required
• growth_areas: relevant trends or emerging demand for this service
• business_value: measurable or tangible outcome for the client

STEP 3 — COMPANY PROFILE (DEEP VERSION):
• about: 4–6 paragraphs. Topics: origin & founding → core services & differentiators → clients & scale → team & culture → growth trajectory
  DO NOT write marketing copy. Write like an analyst who has read the website and knows the industry.
• business_model: how revenue is generated — be specific (e.g. "hourly legal fees + fixed-fee packages for conveyancing + retainer for corporate clients")
• customer_segments: list of distinct customer types with brief descriptions
• industry: specific (e.g. "Commercial & Property Law" not just "Legal Services")
• company_size_estimate: estimate headcount range if not stated (e.g. "50–150 staff" based on office count, service breadth, LinkedIn data)
• operations_overview: key departments, delivery model, how the business operates day-to-day

STEP 4 — MARKET POSITIONING:
• market_position: where this company sits in its market (e.g. "mid-market specialist", "national challenger", "dominant regional player")
• competitors: types of direct competitors (not specific names unless well-known)
• strengths: evidence-based (extracted from real signals — client type, case studies, team depth, location, specialisations)

STEP 5 — HIRING CONTEXT:
• If real jobs exist: summarise what they signal about growth and team structure
• If no jobs: infer likely roles based on services and company stage
• hiring_context: 2–3 sentence narrative about hiring posture

════════════════════════════════════════════════════════════
📋 FIELD RULES
════════════════════════════════════════════════════════════

COMPANY NAME: Extract from title/h1/og:title. Preserve exact capitalisation.

TAGLINE: Extract from homepage if present as a standalone headline/slogan. If truly absent → "not_found".

CULTURE VALUES:
• Extract from any values/culture section if present on website
• If not explicitly stated but culture is described → infer 3–5 values from the text
• If no cultural content at all → return []

BENEFITS: Extract from website if stated. If not stated → return []

SOCIAL PROOF (HARD EXTRACTION):
• Verbatim quotes only — extract exactly
• If no quotes in source text → return []

PROGRAMS: Named programs/initiatives from the website. If none → return []

IMPACT STATS: Real numbers from website (years, team size, clients, offices). If not stated → return []

MISSION / VALUE PROP: Extract from "mission", "vision", or "what we do" content. Lightly structure.

HIRING INTERESTS: From job listings or careers content. If none → derive from services context.

SKILLS: From job listings or website. Populate with real skills for this industry if not stated.

SPECIALISATIONS: From services/practice areas. Populate from what you know if website is sparse.

LOCATIONS: Extract hq_city/state/country/address from contact page or footer EXACTLY. "not_found" only if genuinely absent.

DALL-E IMAGE PROMPTS: Generate vivid, cinematic, industry-specific image prompts based on extracted facts.
• Reference the company's actual industry, city, office type, and client type
• NO generic stock photo descriptions

CREDENTIALS: email: demo.[slug]@creerlio.com, password: Demo[CompanyNameNoSpaces]2025!

════════════════════════════════════════════════════════════
✅ OUTPUT VALIDATION
════════════════════════════════════════════════════════════
• company_summary: minimum 4 substantive paragraphs — analyst voice, no marketing fluff
• about: minimum 4 paragraphs — specific, informative
• business_model: specific revenue mechanism — not "provides services to clients"
• operations_overview: describes real departments and delivery model
• market_position: specific placement in market — not generic
• services: minimum 4, with ALL sub-fields populated
• Job array: ONLY real scraped jobs or []
• Social proof: ONLY verbatim quotes or []
• No fake addresses, no invented testimonials, no wrong phone numbers
• JSON is valid

FAIL CONDITION: If any section reads like a generic website summary, rewrite it.

════════════════════════════════════════════════════════════
RETURN ONLY valid JSON. No markdown, no explanation, no code fences.
════════════════════════════════════════════════════════════`

  const detectedLinkedin  = socialLinks.linkedin  || linkedinUrl || 'not provided'
  const detectedFacebook  = socialLinks.facebook  || 'not provided'
  const detectedInstagram = socialLinks.instagram || 'not provided'
  const detectedTwitter   = socialLinks.twitter   || 'not provided'
  const detectedYoutube   = discoveredYouTube || socialLinks.youtube || youtubeUrl || 'not provided'

  const locationLine = targetLocation ? `Target Location (LOCAL BRANCH): ${targetLocation}\n` : ''

  // Real jobs block — clearly labelled so GPT uses them verbatim
  const realJobsSection = scrapedJobTitles && scrapedJobTitles.length > 0
    ? `\n━━━ REAL JOB LISTINGS FROM ATS/SEEK (${scrapedJobTitles.length} jobs) ━━━\nExtract ONLY these job titles into the jobs array — do NOT invent additional roles:\n${scrapedJobTitles.slice(0, 50).map(t => `• ${t}`).join('\n')}\n`
    : '\n━━━ JOBS: No real job listings were found — return jobs: [] ━━━\n'

  // LinkedIn content block
  const linkedinBlock = linkedinContent?.description
    ? `\n━━━ LINKEDIN COMPANY DATA ━━━\nDescription: ${linkedinContent.description}\nEmployees: ${linkedinContent.employees || 'not found'}\nIndustry: ${linkedinContent.industry || 'not found'}\n`
    : ''

  // YouTube content block
  const youtubeBlock = youtubeContent?.channelName
    ? `\n━━━ YOUTUBE CHANNEL DATA ━━━\nChannel: ${youtubeContent.channelName}\nDescription: ${youtubeContent.description || 'not found'}\nFeatured video: ${youtubeContent.featuredVideoUrl || 'not found'}\n`
    : ''

  // Instagram content block
  const instagramBlock = instagramContent?.bio
    ? `\n━━━ INSTAGRAM PROFILE DATA ━━━\nBio: ${instagramContent.bio}\nFollowers: ${instagramContent.followers || 'not found'}\n`
    : ''

  const userPrompt = `Company Website: ${websiteUrl}
${locationLine}LinkedIn URL: ${detectedLinkedin}
YouTube URL: ${detectedYoutube}
Facebook URL: ${detectedFacebook}
Instagram URL: ${detectedInstagram}
Twitter/X URL: ${detectedTwitter}
${linkedinBlock}${youtubeBlock}${instagramBlock}${realJobsSection}
━━━ WEBSITE CONTENT (scraped: homepage, about, services, team, contact, careers) ━━━
${websiteContent.slice(0, 30000)}
${websiteContent.length < 1500 ? '\n⚠ SPARSE CONTENT: Website likely JavaScript-rendered — very little HTML text was captured. Use your knowledge of this specific company (identified by website URL, company name, LinkedIn data) to produce accurate, complete content. Prioritise any text that IS present.' : ''}
${targetLocation ? `\n⚠ BRANCH: Profile the ${targetLocation} branch specifically. Name format: "{Brand} — {Suburb}".` : ''}

Generate the complete Creerlio Business Profile JSON:

{
  "business": { "name": "", "slug": "", "website_url": "${websiteUrl}", "linkedin_url": "${linkedinUrl}", "youtube_url": "${youtubeUrl}", "careers_url": "", "phone": "", "email": "" },
  "profile": { "tagline": "", "about": "", "company_summary": "", "business_model": "", "industry": "", "business_type": "", "hq_city": "", "hq_state": "", "hq_country": "", "hq_address": "", "latitude": 0, "longitude": 0, "company_size": "", "company_size_estimate": "", "founded_year": 0, "ownership_type": "" },
  "content": { "mission": "", "value_prop_headline": "", "value_prop_body": "", "acknowledgement_of_country": "" },
  "intelligence": { "operations_overview": "", "market_position": "", "hiring_context": "", "customer_segments": [], "competitor_types": [], "strengths": [] },
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
  "services": [{ "name": "", "category": "Service", "short_description": "", "target_customers": "", "typical_use_cases": [], "how_it_is_delivered": "", "who_it_is_for": "", "problem_it_solves": "", "business_value": "", "teams": [], "roles": [], "skills": [], "growth_areas": [], "impact": { "who_it_helps": "", "what_it_improves": "", "real_world_outcomes": "" }, "we_are_hiring": true, "open_to_partnerships": false, "currently_scaling": false }],
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
    max_tokens: 12000,
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

/**
 * Employer Branding Pass — transforms analyst data into talent-facing content.
 * Runs after researchCompany so it has the full business picture to work from.
 */
async function generateTalentProfile(
  openai: OpenAI,
  companyName: string,
  data: any,
  log: (msg: string) => void
): Promise<any> {
  log('\n  Generating employer branding profile...')

  // Feed the key analyst outputs as context — keep within ~4000 tokens
  const context = JSON.stringify({
    name: companyName,
    industry: data.profile?.industry || '',
    about: (data.profile?.about || '').slice(0, 1200),
    company_summary: (data.profile?.company_summary || '').slice(0, 1000),
    business_model: data.profile?.business_model || '',
    operations_overview: data.intelligence?.operations_overview || '',
    market_position: data.intelligence?.market_position || '',
    customer_segments: data.intelligence?.customer_segments || [],
    strengths: data.intelligence?.strengths || [],
    services: (data.services || []).slice(0, 6).map((s: any) => ({
      name: s.name,
      short_description: s.short_description,
      roles: s.roles,
      skills: s.skills,
      target_customers: s.target_customers,
      how_it_is_delivered: s.how_it_is_delivered,
    })),
    culture_values: (data.culture_values || []).slice(0, 5),
    benefits: (data.benefits || []).slice(0, 5),
    hiring_interests: (data.hiring_interests || []).slice(0, 8),
    company_size: data.profile?.company_size || data.profile?.company_size_estimate || '',
    hq_city: data.profile?.hq_city || '',
    hq_state: data.profile?.hq_state || '',
    hq_country: data.profile?.hq_country || '',
    founded_year: data.profile?.founded_year || null,
  }, null, 0)

  const systemPrompt = `You are an expert employer branding specialist.

Your task is to transform business research data into compelling talent-facing content.

Every section must answer: "Why would a smart, capable person want to work here?"

════════════════════════════════════════════════════════════
CRITICAL RULES
════════════════════════════════════════════════════════════
• DO NOT produce generic marketing language
• DO NOT use phrases like "great place to work", "dynamic environment", "passionate team"
• Every claim must be grounded in the actual business data provided
• Be specific, concrete, and honest — top candidates are skeptical of hype
• Write in a clear, professional, human voice

FAIL CONDITION: If any section reads like a generic company bio, it is wrong.

════════════════════════════════════════════════════════════
OUTPUT FIELDS
════════════════════════════════════════════════════════════

company_overview (3–4 paragraphs):
  What this company actually does, what makes it interesting or genuinely different,
  its real role in the market. Written for a candidate who has never heard of them.
  NO marketing copy. Think: smart recruiter briefing a shortlisted candidate.

what_they_do (string, 2–3 paragraphs):
  Break down the company into clear service areas. Explain in practical terms what
  they deliver, who they serve, and what kind of work happens inside.

working_here (string, 3–4 paragraphs):
  Based on business type, size, and services — describe what working here likely
  looks like day-to-day. Type of environment, how teams operate, pace, client
  exposure, structure. Must feel realistic and specific, not promotional.

opportunities (string, 2–3 paragraphs):
  Growth opportunities, client/project exposure, learning potential, career
  progression paths. Tied to the actual business — not generic perks.

ideal_candidates (object):
  mindset: the thinking style and attitude that fits this company (2–3 sentences)
  experience_level: what level of experience makes sense here and why
  working_style: how people who thrive here approach their work
  background_fit: industries or backgrounds that translate well

services_talent_view (array — one entry per service):
  For each service: { name, what_you_do_here, skills_you_build, career_value }
  what_you_do_here: what a person in this service actually does day-to-day
  skills_you_build: tangible skills and knowledge gained working in this area
  career_value: how this experience positions them for future roles

company_snapshot (object):
  industry, business_model_summary, locations, company_size, what_sets_them_apart

confidence_score (0–100): how confident are you in the quality of this output

════════════════════════════════════════════════════════════
RETURN ONLY valid JSON. No markdown, no explanation, no code fences.
════════════════════════════════════════════════════════════`

  const userPrompt = `Company: ${companyName}

Business research data:
${context}

Generate the talent-facing employer brand profile JSON:

{
  "company_overview": "",
  "what_they_do": "",
  "working_here": "",
  "opportunities": "",
  "ideal_candidates": {
    "mindset": "",
    "experience_level": "",
    "working_style": "",
    "background_fit": ""
  },
  "services_talent_view": [
    { "name": "", "what_you_do_here": "", "skills_you_build": "", "career_value": "" }
  ],
  "company_snapshot": {
    "industry": "",
    "business_model_summary": "",
    "locations": [],
    "company_size": "",
    "what_sets_them_apart": ""
  },
  "confidence_score": 0
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.45,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    })
    const raw = completion.choices[0].message.content || ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    const result = JSON.parse(cleaned)
    log(`  ✓ Talent profile generated (confidence: ${result.confidence_score ?? '?'}%)`)
    return result
  } catch (e: any) {
    log(`  ⚠ Talent profile generation failed: ${e.message}`)
    return null
  }
}

/**
 * Dynamic Sections Engine — generates a talent-facing profile with flexible,
 * data-driven sections rather than a fixed schema. Stored as 'dynamic_sections'.
 */
async function generateDynamicSections(
  openai: OpenAI,
  companyName: string,
  masterContext: string,
  structuredData: any,
  talentProfile: any,
  scrapedJobs: any[],
  socialLinks: Record<string, string>,
  log: (m: string) => void
): Promise<any> {
  log('\n  Generating dynamic sections profile...')

  // Build a rich context summary from all available data
  const dataContext = JSON.stringify({
    profile: {
      tagline: structuredData.profile?.tagline,
      industry: structuredData.profile?.industry,
      business_model: structuredData.profile?.business_model,
      company_size: structuredData.profile?.company_size || structuredData.profile?.company_size_estimate,
      hq_city: structuredData.profile?.hq_city,
      hq_state: structuredData.profile?.hq_state,
      founded_year: structuredData.profile?.founded_year,
    },
    company_summary: (structuredData.profile?.company_summary || '').slice(0, 800),
    operations_overview: structuredData.intelligence?.operations_overview || '',
    market_position: structuredData.intelligence?.market_position || '',
    customer_segments: structuredData.intelligence?.customer_segments || [],
    strengths: structuredData.intelligence?.strengths || [],
    culture_values: structuredData.culture_values || [],
    benefits: structuredData.benefits || [],
    services: (structuredData.services || []).slice(0, 6).map((s: any) => ({
      name: s.name,
      short_description: s.short_description,
      target_customers: s.target_customers,
      how_it_is_delivered: s.how_it_is_delivered,
      roles: s.roles,
      skills: s.skills,
    })),
    impact_stats: structuredData.impact_stats || [],
    programs: structuredData.programs || [],
    hiring_interests: structuredData.hiring_interests || [],
    talent: talentProfile ? {
      company_overview: talentProfile.company_overview,
      working_here: talentProfile.working_here,
      opportunities: talentProfile.opportunities,
      ideal_candidates: talentProfile.ideal_candidates,
    } : null,
  }, null, 0)

  const systemPrompt = `You are an advanced AI research engine and business analyst building a talent-attracting business profile.

You must behave like a human researcher — combining multiple sources into a unified, compelling profile.

════════════════════════════════════════════════════════════
CORE OBJECTIVE
════════════════════════════════════════════════════════════
Build the most complete, accurate, and compelling business profile possible.
The output must feel like a human spent hours researching the company.
It must be better than what the company presents on its own website.

════════════════════════════════════════════════════════════
SOURCE PRIORITY (follow this order)
════════════════════════════════════════════════════════════
1. Careers / "Life at Company" pages → DOMINATE the output if content exists
2. Benefits and culture pages
3. Job listings and role descriptions
4. Main website content
5. Social profiles and descriptions
6. Structured analyst data provided

If careers content exists in the scraped pages → it must drive the working_here, benefits, and culture sections.

════════════════════════════════════════════════════════════
DYNAMIC SECTION CREATION RULES
════════════════════════════════════════════════════════════
DO NOT force content into fixed sections.
CREATE sections based on what data actually exists.

Choose from these (only include if you have real content):
- what_the_company_does
- how_the_business_operates
- teams_and_departments
- life_at_the_company
- benefits_and_perks
- learning_and_development
- ways_of_working
- community_and_culture
- opportunities_and_roles
- why_join
- client_and_market_context
- technology_and_tools
- company_story

For each section:
  key: snake_case identifier
  title: human-readable heading (e.g. "Life at the Company", "Benefits & Perks")
  content: rich string OR structured JSON object — choose whichever is more readable
  priority: 1 (highest) – 5 (lowest). Careers/culture = 1–2. General info = 3–4.
  confidence: 0–100 based on how much real source data supports this section

════════════════════════════════════════════════════════════
BENEFITS — CRITICAL
════════════════════════════════════════════════════════════
Extract detailed, specific benefits. Categories:
  parental_leave, health, flexibility, development, perks, financial, wellbeing
Be specific — "18 weeks paid parental leave" not "we support families".
If benefits aren't explicitly stated → infer likely offerings for this company type/size/industry.

════════════════════════════════════════════════════════════
JOBS
════════════════════════════════════════════════════════════
If real jobs are provided → include them exactly.
If none → infer likely roles based on services, industry, and company size.
Mark inferred roles clearly with "inferred": true.

════════════════════════════════════════════════════════════
QUALITY STANDARDS
════════════════════════════════════════════════════════════
✔ Each section must be specific and informative — not a generic summary
✔ working_here / life_at_the_company must feel realistic and grounded
✔ benefits must be detailed, not "we offer competitive benefits"
✔ Minimum 5 sections, target 7–10 where data allows
✔ overall_confidence reflects true data quality

FAIL CONDITION: If any section reads like a generic company bio, rewrite it.

════════════════════════════════════════════════════════════
RETURN ONLY valid JSON. No markdown, no explanation, no code fences.
════════════════════════════════════════════════════════════`

  const realJobsBlock = scrapedJobs.length > 0
    ? `\n━━━ REAL JOB LISTINGS (${scrapedJobs.length}) ━━━\n${scrapedJobs.slice(0, 20).map(j => `• ${j.title}${j.city ? ` — ${j.city}` : ''}${j.employment_type ? ` (${j.employment_type})` : ''}`).join('\n')}`
    : '\n━━━ JOBS: No real listings found — infer likely roles ━━━'

  const socialsBlock = Object.entries(socialLinks)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const userPrompt = `Company: ${companyName}

━━━ STRUCTURED ANALYST DATA ━━━
${dataContext}
${realJobsBlock}

━━━ SOCIAL PROFILES FOUND ━━━
${socialsBlock || 'None detected'}

━━━ SCRAPED WEBSITE + CAREERS CONTENT (prioritise careers/culture sections) ━━━
${masterContext.slice(0, 25000)}

Generate the dynamic sections profile JSON:

{
  "sections": [
    {
      "key": "",
      "title": "",
      "content": "",
      "priority": 1,
      "confidence": 85
    }
  ],
  "socials": [
    { "platform": "", "url": "" }
  ],
  "jobs": [
    { "title": "", "location": "", "employment_type": "", "description": "", "inferred": false }
  ],
  "overall_confidence": 0
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.4,
      max_tokens: 6000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    })
    const raw = completion.choices[0].message.content || ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    const result = JSON.parse(cleaned)
    log(`  ✓ Dynamic sections: ${result.sections?.length ?? 0} sections (confidence: ${result.overall_confidence ?? '?'}%)`)
    return result
  } catch (e: any) {
    log(`  ⚠ Dynamic sections generation failed: ${e.message}`)
    return null
  }
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

// ── Hiring Intelligence Engine ────────────────────────────────────────────────

interface HiringSignal {
  type: 'explicit_job' | 'hiring_signal' | 'growth_signal'
  source: string
  text: string
  confidence: number
}

interface HiringIntelligence {
  hiring_status: 'active' | 'passive' | 'potential' | 'none'
  confidence_score: number
  jobs_found_count: number
  hidden_jobs_count: number
  top_signals: string[]
  raw_signals: HiringSignal[]
}

function detectHiringSignals(
  html: string,
  careersUrl: string | null,
  scrapedJobs: any[],
  linkedinContent?: { description: string; employees: string; industry: string }
): HiringSignal[] {
  const signals: HiringSignal[] = []

  if (scrapedJobs.length > 0) {
    signals.push({ type: 'explicit_job', source: careersUrl || 'website',
      text: `${scrapedJobs.length} active job listing${scrapedJobs.length !== 1 ? 's' : ''} found`, confidence: 1.0 })
  }
  if (careersUrl) {
    signals.push({ type: 'hiring_signal', source: 'website', text: 'Careers page detected', confidence: 0.9 })
  }

  // ATS detection
  const atsPatterns: [RegExp, string][] = [
    [/greenhouse\.io/i, 'Greenhouse ATS integration detected'],
    [/lever\.co/i, 'Lever ATS integration detected'],
    [/smartrecruiters\.com/i, 'SmartRecruiters ATS integration detected'],
    [/myworkdayjobs\.com/i, 'Workday ATS integration detected'],
    [/bamboohr\.com/i, 'BambooHR ATS integration detected'],
    [/taleo\.net/i, 'Taleo ATS integration detected'],
    [/jobvite\.com/i, 'Jobvite ATS integration detected'],
  ]
  for (const [re, text] of atsPatterns) {
    if (re.test(html)) signals.push({ type: 'hiring_signal', source: 'website', text, confidence: 0.95 })
  }

  // Hiring language patterns
  const hiringPhrases: [RegExp, string, number][] = [
    [/we'?re\s+hiring/i, '"We\'re hiring" mentioned on site', 0.9],
    [/now\s+hiring/i, '"Now hiring" language found', 0.9],
    [/join\s+our\s+team/i, '"Join our team" call-to-action', 0.75],
    [/open\s+positions?/i, 'Open positions referenced', 0.8],
    [/job\s+openings?/i, 'Job openings referenced', 0.8],
    [/current\s+vacancies/i, 'Current vacancies page found', 0.85],
    [/apply\s+now/i, '"Apply now" button/link detected', 0.75],
    [/submit\s+(?:your\s+)?(?:resume|cv|application)/i, 'Application submission page detected', 0.8],
    [/send\s+us\s+your\s+(?:resume|cv)/i, 'Speculative CV submission encouraged', 0.7],
  ]
  for (const [re, text, conf] of hiringPhrases) {
    if (re.test(html)) signals.push({ type: 'hiring_signal', source: 'website', text, confidence: conf })
  }

  // Growth signals
  const growthPhrases: [RegExp, string][] = [
    [/expan(?:d|ding|sion)/i, 'Expansion language on website'],
    [/growing\s+(?:team|company|business)/i, 'Growing team language detected'],
    [/new\s+(?:office|location|branch)/i, 'New office/location mentioned'],
    [/scaling\s+(?:up|our)/i, 'Scaling language detected'],
    [/doubl(?:e|ing)\s+(?:our|the)\s+team/i, 'Doubling team language found'],
  ]
  for (const [re, text] of growthPhrases) {
    if (re.test(html)) signals.push({ type: 'growth_signal', source: 'website', text, confidence: 0.65 })
  }

  // LinkedIn hiring signals
  if (linkedinContent?.description) {
    const li = linkedinContent.description.toLowerCase()
    if (/hiring|opportunities|join us|open roles|we('re| are) growing/.test(li)) {
      signals.push({ type: 'hiring_signal', source: 'linkedin', text: 'Hiring language in LinkedIn company description', confidence: 0.85 })
    }
  }

  return signals
}

function computeIntelligence(signals: HiringSignal[], scrapedJobs: any[]): HiringIntelligence {
  const explicit = signals.filter(s => s.type === 'explicit_job')
  const hiring   = signals.filter(s => s.type === 'hiring_signal')
  const growth   = signals.filter(s => s.type === 'growth_signal')

  const relevant = [...explicit, ...hiring]
  const confidence_score = relevant.length > 0
    ? Math.min(98, Math.round(relevant.reduce((s, x) => s + x.confidence, 0) / relevant.length * 100))
    : growth.length > 0 ? 28 : 10

  const hiring_status: HiringIntelligence['hiring_status'] =
    scrapedJobs.length > 0 ? 'active'
    : hiring.length >= 2   ? 'passive'
    : hiring.length >= 1 || growth.length >= 2 ? 'potential'
    : 'none'

  const hidden_jobs_count = scrapedJobs.length === 0 && (hiring.length + growth.length) > 0
    ? Math.min(hiring.length + growth.length, 6) : 0

  const top_signals = [...explicit, ...hiring, ...growth]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5).map(s => s.text)

  return { hiring_status, confidence_score, jobs_found_count: scrapedJobs.length, hidden_jobs_count, top_signals, raw_signals: signals }
}

interface ProfileResult {
  companyName: string
  demoEmail: string
  demoPass: string
  jobCount: number
  svcCount: number
  videoUrl: string | null
  claimToken: string | null
  intelligence: HiringIntelligence
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
  autoPublish?: boolean
  log: (msg: string) => void
  err: (msg: string) => void
}): Promise<ProfileResult> {
  const { supabase, openai, SUPABASE_URL, log, err } = opts
  const websiteUrl     = opts.websiteUrl
  const linkedinUrl    = opts.linkedinUrl    || ''
  const youtubeUrl     = opts.youtubeUrl     || ''
  const customSlug     = opts.customSlug     || ''
  const autoPublish    = opts.autoPublish    || false
  const targetLocation = opts.targetLocation || ''

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creerlio-biz-'))

  try {
    // ── Step 1: Research ─────────────────────────────────────────────────
    log('\n[1/12] Researching company...')
    if (targetLocation) log(`  Target location: ${targetLocation}`)
    const origin = new URL(websiteUrl).origin

    // Phase 2: Discover careers subdomain before main crawl
    log('  Checking for careers subdomain...')
    const careersSubdomain = await discoverCareersSubdomain(origin, log)

    // Phase 3: Fetch homepage first to extract dynamic link targets
    log('  Fetching homepage for link discovery...')
    const homepageHtml = await withTimeout(fetchWebsiteText(websiteUrl, 40000), 8000, '')
    const discoveredLinks = extractHighValueLinks(homepageHtml, origin)
    if (discoveredLinks.length > 0) log(`  ✓ Discovered ${discoveredLinks.length} high-value internal links`)

    // Add careers subdomain pages to extra URL list
    const extraUrls: string[] = [...discoveredLinks]
    if (careersSubdomain) {
      extraUrls.unshift(careersSubdomain, `${careersSubdomain}/benefits`, `${careersSubdomain}/life`, `${careersSubdomain}/culture`)
    }

    // Fetch all pages with priority ordering
    log('  Scanning website for social links and logo...')
    const { content: websiteHtml, sourcesUsed } = await fetchMultiplePages(websiteUrl, targetLocation, log, extraUrls)

    // Phase 4: Interactive extraction via Browserless (if configured)
    const domainName = origin.replace(/^https?:\/\/(?:www\.)?/, '').split('.')[0]
    let interactiveContent = ''
    if (process.env.BROWSERLESS_API_URL) {
      log('\n  [Phase 4] Interactive content extraction...')
      const careersPageForInteractive = careersSubdomain || `${origin}/careers`
      interactiveContent = await fetchInteractiveContent(careersPageForInteractive, log)
    } else {
      log('  [Phase 4] Browserless not configured — skipping interactive extraction')
      log('    To enable: set BROWSERLESS_API_URL + BROWSERLESS_TOKEN env vars')
    }

    // Phase 1: Secondary source scraping (parallel with logo discovery)
    log('\n  [Phase 1] Fetching secondary sources (Glassdoor, Indeed)...')
    const detectedSocial = extractSocialLinks(websiteHtml)
    const effectiveLinkedin = (detectedSocial.linkedin || linkedinUrl) || undefined

    const [logoCandidates, glassdoorContent, indeedContent] = await Promise.all([
      withTimeout(findBestLogoUrl(websiteHtml, origin, effectiveLinkedin), 10000, []),
      scrapeGlassdoor(domainName, domainName, log),
      scrapeIndeed(domainName, log),
    ])

    if (Object.keys(detectedSocial).length > 0) {
      log(`  ✓ Found social links: ${Object.keys(detectedSocial).join(', ')}`)
    }

    // Phase 5: Build MASTER_CONTEXT from all sources
    const secondaryContent = [
      glassdoorContent ? `=== GLASSDOOR ===\n${glassdoorContent}` : '',
      indeedContent    ? `=== INDEED ===\n${indeedContent}` : '',
      interactiveContent ? `=== INTERACTIVE CONTENT ===\n${interactiveContent}` : '',
    ].filter(Boolean).join('\n\n')

    const masterContext = [websiteHtml, secondaryContent].filter(Boolean).join('\n\n').slice(0, 65000)
    const allSourcesUsed = [
      ...sourcesUsed,
      glassdoorContent  ? 'glassdoor'   : '',
      indeedContent     ? 'indeed'      : '',
      interactiveContent ? 'browserless' : '',
    ].filter(Boolean)
    log(`  ✓ MASTER_CONTEXT: ${masterContext.length} chars from ${allSourcesUsed.length} sources`)

    // Detect ATS / careers URL and scrape real jobs before calling GPT
    log('\n  Scanning for real job listings...')
    const careersUrl = detectCareersUrl(websiteHtml, origin) || (careersSubdomain ? careersSubdomain : null)
    let scrapedJobs: any[] = []
    if (careersUrl) {
      log(`  Detected careers URL: ${careersUrl}`)
      scrapedJobs = await scrapeJobsFromATS(careersUrl, log)
    }

    // ZGE: SEEK search for more real jobs if ATS returned few
    if (scrapedJobs.length < 5) {
      log('  Searching SEEK for additional real job listings...')
      const seekJobs = await seekJobSearch(domainName, log)
      if (seekJobs.length > 0) {
        const existingTitles = new Set(scrapedJobs.map(j => j.title.toLowerCase()))
        const newJobs = seekJobs.filter(j => !existingTitles.has(j.title.toLowerCase()))
        scrapedJobs = [...scrapedJobs, ...newJobs]
        log(`  ✓ Total after SEEK merge: ${scrapedJobs.length} jobs`)
      }
    }
    // Fallback: GPT extraction from the plain HTML careers page (catches sites not using an ATS)
    if (scrapedJobs.length === 0 && careersUrl) {
      log('  Falling back to GPT HTML job extraction...')
      const htmlJobs = await scrapeJobsFromHTML(careersUrl, openai, log)
      if (htmlJobs.length > 0) scrapedJobs = htmlJobs
    }

    if (scrapedJobs.length > 0) {
      log(`  ✓ ${scrapedJobs.length} real jobs found — will be used verbatim`)
    } else {
      log('  No real jobs found — jobs array will be empty in profile')
    }

    // ZGE: resolve effective YouTube URL
    let effectiveYoutube = detectedSocial.youtube || youtubeUrl || ''
    if (!effectiveYoutube) {
      const discovered = await findYouTubeChannel(domainName, log)
      if (discovered) effectiveYoutube = discovered
    }

    // ZGE: scrape LinkedIn, YouTube, Instagram for verified source content
    log('\n[1b/12] Scraping social profiles for verified data...')
    const effectiveLinkedinUrl = detectedSocial.linkedin || linkedinUrl || ''
    const effectiveInstagramUrl = detectedSocial.instagram || ''

    const [linkedinContent, youtubeContent, instagramContent] = await Promise.all([
      effectiveLinkedinUrl ? scrapeLinkedInData(effectiveLinkedinUrl, log) : Promise.resolve({ description: '', employees: '', industry: '' }),
      effectiveYoutube     ? scrapeYouTubeData(effectiveYoutube, log)     : Promise.resolve({ description: '', channelName: '', featuredVideoUrl: '' }),
      effectiveInstagramUrl ? scrapeInstagramData(effectiveInstagramUrl, log) : Promise.resolve({ bio: '', followers: '' }),
    ])

    if (linkedinContent.description) allSourcesUsed.push('linkedin')
    if (youtubeContent.description)  allSourcesUsed.push('youtube')
    if (instagramContent.bio)        allSourcesUsed.push('instagram')

    // ── Hiring Intelligence ───────────────────────────────────────────────
    const hiringSignals = detectHiringSignals(masterContext, careersUrl, scrapedJobs, linkedinContent)
    const intelligence  = computeIntelligence(hiringSignals, scrapedJobs)
    log(`\n  ✦ Hiring status:    ${intelligence.hiring_status.toUpperCase()}`)
    log(`  ✦ Confidence:       ${intelligence.confidence_score}%`)
    log(`  ✦ Jobs found:       ${intelligence.jobs_found_count}`)
    if (intelligence.hidden_jobs_count > 0)
      log(`  ✦ Hidden signals:   ${intelligence.hidden_jobs_count} inferred opportunities`)
    for (const s of intelligence.top_signals) log(`    ↳ ${s}`)

    // Collect real job titles for GPT context
    const scrapedJobTitles = scrapedJobs.map(j => j.title).filter(Boolean)

    // Pass MASTER_CONTEXT (website + Glassdoor + Indeed + interactive) to GPT
    const data = await researchCompany(
      openai, websiteUrl, linkedinUrl, effectiveYoutube,
      detectedSocial, masterContext, targetLocation, log,
      scrapedJobTitles, effectiveYoutube || undefined,
      linkedinContent, youtubeContent, instagramContent
    )

    const companyName = data.business?.name || 'Company'
    const slug        = customSlug || slugify(companyName)
    const demoEmail   = data.credentials?.email || `demo.${slug}@creerlio.com`
    const demoPass    = data.credentials?.password || `Demo${companyName.replace(/\s/g, '')}2025!`

    log(`\n  ✓ Company: ${companyName}`)
    log(`  ✓ Slug:    ${slug}`)
    log(`  ✓ Email:   ${demoEmail}`)

    // Phase 8: Quality scoring (pre-enrichment baseline)
    const qualityScore = scoreProfileQuality(data, allSourcesUsed)
    log(`\n  ✦ Profile quality:  ${qualityScore.total}/100 (completeness: ${qualityScore.completeness}%, depth: ${qualityScore.depth}%)`)
    if (qualityScore.total < 50) log('  ⚠ Low quality score — profile may need manual review')

    // Phase 7: Structured benefits extraction from MASTER_CONTEXT
    log('\n[1b/12] Extracting structured benefits...')
    const structuredBenefits = await extractStructuredBenefits(openai, masterContext, companyName, log)

    // DIE: enrichment pass — fill empty service sub-sections with targeted GPT call
    if (Array.isArray(data.services) && data.services.length > 0) {
      log('\n[1c/12] Running service enrichment pass...')
      data.services = await enrichServiceSections(openai, data.services, companyName, data.profile?.industry || '', log)
    }

    // Employer branding pass — talent-facing profile
    log('\n[1d/12] Generating employer brand profile...')
    const talentProfile = await generateTalentProfile(openai, companyName, data, log)

    // Dynamic sections engine — research-grade talent-attracting profile
    log('\n[1e/12] Generating dynamic sections profile...')
    const dynamicSections = await generateDynamicSections(
      openai, companyName, masterContext, data, talentProfile, scrapedJobs, detectedSocial, log
    )

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

    // Try each logo candidate in priority order until one downloads successfully
    if (logoCandidates.length > 0) {
      log(`  Found ${logoCandidates.length} logo candidates — trying in priority order...`)
      for (const candidate of logoCandidates) {
        try {
          log(`  Trying: ${candidate.source} — ${candidate.url}`)
          const isSvg = /\.svg(\?|$)/i.test(candidate.url)
          const ext = isSvg ? 'svg' : /\.png(\?|$)/i.test(candidate.url) ? 'png' : 'jpg'
          const logoFilename = `${slug}-logo.${ext}`
          const logoTmpPath  = path.join(tmpDir, logoFilename)
          await downloadFile(candidate.url, logoTmpPath, origin)
          const logoSize = fs.statSync(logoTmpPath).size
          if (logoSize < 500) {
            log(`    Too small (${logoSize}B) — trying next`)
            try { fs.unlinkSync(logoTmpPath) } catch (_) {}
            continue
          }
          const storagePath = `${userId}/bank/${logoFilename}`
          const contentType = isSvg ? 'image/svg+xml'
            : ext === 'png' ? 'image/png'
            : /\.ico(\?|$)/i.test(candidate.url) ? 'image/x-icon'
            : 'image/jpeg'
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(
            storagePath, fs.readFileSync(logoTmpPath), { contentType, upsert: true }
          )
          if (upErr) {
            err(`    Upload failed: ${upErr.message} — trying next`)
            continue
          }
          imageResults['logo'] = {
            storagePath, tmpPath: logoTmpPath,
            fileUrl: publicStorageUrl(SUPABASE_URL, storagePath), size: logoSize,
          }
          log(`  ✓ Logo acquired via ${candidate.source} (${(logoSize/1024).toFixed(0)} KB, ${ext.toUpperCase()})`)
          break
        } catch (e: any) {
          log(`    Failed (${e.message}) — trying next candidate`)
        }
      }
      if (!imageResults['logo']) {
        log('  ⚠ All logo candidates exhausted — no logo will be generated')
      }
    } else {
      log('  No logo candidates found from website scan')
    }

    // Generate DALL-E images in parallel batches of 3 — logo is always excluded
    const pendingDalle = dalleImages.filter((img: any) => img.key !== 'logo')
    log(`  Generating ${pendingDalle.length} DALL-E images (logo excluded)...`)

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
      name: companyName,
      title: nfStr(data.profile?.tagline),
      bio: nfStr(data.profile?.about),
      avatar_path: imageResults.logo?.storagePath || null,
      banner_path: imageResults.hero?.storagePath || null,
      logoId: logoItem?.id || null, heroImageId: heroItem?.id || null,
      introVideoId: videoItem?.id || null, introVideoUrl: videoPublicUrl,
      attachmentIds,
      socialLinks: socialLinksArray,
      tagline: nfStr(data.profile?.tagline),
      businessType: nfStr(data.profile?.business_type),
      industry: nfStr(data.profile?.industry),
      specialisations: nfArr(data.specialisations),
      founded: nfNum(data.profile?.founded_year),
      size: nfStr(data.profile?.company_size),
      website: websiteUrl,
      skills: nfArr(data.skills),
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
      id: userId, name: companyName, industry: nfStr(data.profile?.industry),
    }, { onConflict: 'id' })
    if (bizErr) err('  businesses: ' + bizErr.message)
    else log('  ✓ businesses')

    const hqCity    = nfStr(data.profile?.hq_city)
    const hqState   = nfStr(data.profile?.hq_state)
    const hqCountry = nfStr(data.profile?.hq_country) || 'Australia'
    const locationStr = [hqCity, hqState, hqCountry].filter(Boolean).join(', ')

    // Auto-geocode with Mapbox if GPT didn't return coordinates
    if (!nfNum(data.profile?.latitude) || !nfNum(data.profile?.longitude)) {
      const geocodeStr = [nfStr(data.profile?.hq_address), hqCity, hqState, hqCountry].filter(Boolean).join(', ')
      if (geocodeStr) {
        log('  Geocoding address with Mapbox...')
        const coords = await mapboxGeocode(geocodeStr)
        if (coords) {
          data.profile = data.profile || {}
          data.profile.latitude = coords.lat
          data.profile.longitude = coords.lng
          log(`  ✓ Geocoded: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
        }
      }
    }

    const { error: bpErr } = await supabase.from('business_profiles').upsert({
      id: userId, user_id: userId, business_id: userId,
      name: companyName, business_name: companyName,
      description: nfStr(data.profile?.about).slice(0, 500),
      slug, industry: nfStr(data.profile?.industry),
      size: nfStr(data.profile?.company_size),
      location: locationStr,
      city: hqCity, state: hqState, country: hqCountry,
      latitude: nfNum(data.profile?.latitude), longitude: nfNum(data.profile?.longitude),
      website: websiteUrl, email: nfStr(data.business?.email),
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
      business_id: userId, slug, is_published: autoPublish, name: companyName,
      logo_url: logoUrl, hero_image_url: heroUrl,
      tagline: nfStr(data.profile?.tagline),
      mission: nfStr(data.content?.mission),
      value_prop_headline: nfStr(data.content?.value_prop_headline),
      value_prop_body: nfStr(data.content?.value_prop_body),
      impact_stats: nfArr(data.impact_stats),
      culture_values: nfArr(data.culture_values),
      business_areas: nfArr(data.business_areas),
      benefits: nfArr(data.benefits),
      programs: nfArr(data.programs),
      social_proof: nfArr(data.social_proof),
      live_roles_count: scrapedJobs.length, talent_community_enabled: true,
      portfolio_intake_enabled: true,
      hiring_interests: nfArr(data.hiring_interests),
      industries_served: nfArr(data.industries_served),
      contact_email: nfStr(data.business?.email), website_url: websiteUrl,
      linkedin_url: mergedLinkedin, youtube_url: mergedYoutube,
      facebook_url: mergedFacebook, instagram_url: mergedInstagram, twitter_url: mergedTwitter,
      enquiry_enabled: true,
      media_assets: { intro_video_url: videoPublicUrl, logo_url: logoUrl, hero_image_url: heroUrl },
      badges: nfArr(data.badges),
      acknowledgement_of_country: nfStr(data.content?.acknowledgement_of_country),
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
        name: `${companyName} — ${hqCity || 'HQ'}`,
        address: nfStr(data.profile?.hq_address),
        city: hqCity, state: hqState, country: hqCountry,
        lat: nfNum(data.profile?.latitude), lng: nfNum(data.profile?.longitude),
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

    // ZGE: real jobs take priority; GPT fills representative listings if none found
    const jobs = scrapedJobs.length > 0 ? scrapedJobs : nfArr(data.jobs)
    if (scrapedJobs.length > 0) log(`  Using ${jobs.length} real jobs from ATS/SEEK`)
    else if (jobs.length > 0) log(`  Using ${jobs.length} AI-representative jobs (no real listings found)`)
    else log('  No jobs data')
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

    // Store hiring intelligence as a bank item
    await supabase.from('business_bank_items').insert({
      user_id: userId, item_type: 'hiring_intelligence',
      title: `${companyName} — Hiring Intelligence`,
      metadata: {
        hiring_status: intelligence.hiring_status,
        confidence_score: intelligence.confidence_score,
        jobs_found_count: intelligence.jobs_found_count,
        hidden_jobs_count: intelligence.hidden_jobs_count,
        top_signals: intelligence.top_signals,
        raw_signals: intelligence.raw_signals,
        generated_at: new Date().toISOString(),
      },
      is_active: true,
    })

    // Store structured benefits as a bank item
    if (structuredBenefits) {
      await supabase.from('business_bank_items').insert({
        user_id: userId, item_type: 'structured_benefits',
        title: `${companyName} — Benefits & Perks`,
        metadata: { ...structuredBenefits, generated_at: new Date().toISOString() },
        is_active: true,
      })
    }

    // Store quality score as a bank item
    await supabase.from('business_bank_items').insert({
      user_id: userId, item_type: 'profile_quality_score',
      title: `${companyName} — Profile Quality`,
      metadata: { ...qualityScore, sources_used: allSourcesUsed, generated_at: new Date().toISOString() },
      is_active: true,
    })

    // Store dynamic sections as a bank item
    if (dynamicSections) {
      await supabase.from('business_bank_items').insert({
        user_id: userId, item_type: 'dynamic_sections',
        title: `${companyName} — Dynamic Profile`,
        metadata: { ...dynamicSections, generated_at: new Date().toISOString() },
        is_active: true,
      })
    }

    // Store talent/employer brand profile as a bank item
    if (talentProfile) {
      await supabase.from('business_bank_items').insert({
        user_id: userId, item_type: 'talent_profile',
        title: `${companyName} — Employer Brand Profile`,
        metadata: { ...talentProfile, generated_at: new Date().toISOString() },
        is_active: true,
      })
    }

    try { fs.rmSync(tmpDir, { recursive: true }) } catch (_) {}
    return { companyName, demoEmail, demoPass, jobCount, svcCount, videoUrl: videoPublicUrl, claimToken, intelligence }
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
    websiteUrl: rawWebsiteUrl, linkedinUrl = '', youtubeUrl = '', slug: customSlug = '',
    industry = '', location = '', maxResults = 5,
    companyName: rawCompanyName = '', autoPublish = false,
  } = body
  // Normalize URL: add https:// if no protocol present
  const rawNormalized = rawWebsiteUrl && !rawWebsiteUrl.startsWith('http')
    ? `https://${rawWebsiteUrl}`
    : rawWebsiteUrl
  const companyName = (rawCompanyName || '').trim()

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
        // If company name given but no URL, auto-discover the website
        let websiteUrl = rawNormalized || ''
        if (!websiteUrl && companyName && mode === 'single') {
          websiteUrl = (await discoverWebsiteFromName(openai, companyName, location, log)) || ''
          if (!websiteUrl) {
            err(`❌ Could not discover website for "${companyName}". Please provide the URL manually.`)
            controller.close()
            return
          }
        }

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
            autoPublish,
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
          send({ claimToken: result.claimToken, claimLink, intelligence: result.intelligence })
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
