/**
 * Job Scraper Service
 *
 * Fetches and extracts job listings from a public careers page.
 *
 * Strategy (in order):
 *  1. JSON-LD structured data (schema.org JobPosting) — most reliable
 *  2. Known job-board iframe/embed detection (Greenhouse, Lever, Workable, SmartRecruiters)
 *  3. Generic HTML heuristics (article/li/div elements that look like job rows)
 */

import * as cheerio from 'cheerio'
import crypto from 'crypto'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RawJob {
  external_id:      string | null
  title:            string
  description:      string
  location:         string | null
  employment_type:  string | null
  apply_url:        string | null
  source_url:       string
  hash:             string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function cleanText(s: string | null | undefined): string {
  if (!s) return ''
  return String(s).replace(/\s{2,}/g, ' ').trim()
}

/** Generate a stable content hash for change detection. */
export function hashJob(title: string, description: string, location: string | null): string {
  const input = `${title}|${description}|${location ?? ''}`
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 32)
}

/** Resolve a possibly-relative URL against the page origin. */
function resolveUrl(href: string | null | undefined, base: string): string | null {
  if (!href) return null
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

/** Normalise a job object so all fields are clean and hash is set. */
export function normalizeJob(raw: Partial<RawJob> & { source_url: string }): RawJob {
  const title       = cleanText(raw.title)
  const description = cleanText(raw.description)
  const location    = cleanText(raw.location) || null
  return {
    external_id:     raw.external_id ?? null,
    title,
    description:     description || title,   // never blank
    location,
    employment_type: cleanText(raw.employment_type) || null,
    apply_url:       raw.apply_url ?? null,
    source_url:      raw.source_url,
    hash:            hashJob(title, description, location),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. JSON-LD extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractJsonLd(html: string, sourceUrl: string): RawJob[] {
  const jobs: RawJob[] = []
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    try {
      const raw = JSON.parse(match[1])
      const items: any[] = Array.isArray(raw)
        ? raw
        : raw['@graph']
          ? raw['@graph']
          : [raw]

      for (const item of items) {
        if (item['@type'] !== 'JobPosting') continue

        const title       = cleanText(item.title)
        const description = stripHtml(cleanText(item.description))
        const location    = cleanText(
          item.jobLocation?.address?.addressLocality ||
          item.jobLocation?.address?.addressRegion  ||
          item.jobLocation?.address?.addressCountry ||
          (typeof item.jobLocation === 'string' ? item.jobLocation : null)
        ) || null
        const applyUrl    = resolveUrl(item.url || item.hiringOrganization?.sameAs, sourceUrl)
        const extId       = cleanText(item.identifier?.value || item['@id']) || null
        const empType     = Array.isArray(item.employmentType)
          ? item.employmentType.join(', ')
          : cleanText(item.employmentType) || null

        if (!title) continue

        jobs.push(normalizeJob({ external_id: extId, title, description, location, employment_type: empType, apply_url: applyUrl, source_url: sourceUrl }))
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return jobs
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Known job-board platform detection
// ─────────────────────────────────────────────────────────────────────────────

interface BoardInfo {
  name:    string
  apiUrl:  string
  parseFn: (data: any, sourceUrl: string) => RawJob[]
}

function detectEmbeddedBoard(html: string, sourceUrl: string): BoardInfo | null {
  const origin = new URL(sourceUrl).origin

  // Greenhouse
  const gh = html.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/i)
  if (gh) return {
    name:   'greenhouse',
    apiUrl: `https://boards-api.greenhouse.io/v1/boards/${gh[1]}/jobs?content=true`,
    parseFn: parseGreenhouse,
  }

  // Lever
  const lv = html.match(/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/i)
  if (lv) return {
    name:   'lever',
    apiUrl: `https://api.lever.co/v0/postings/${lv[1]}?mode=json`,
    parseFn: parseLever,
  }

  // Workable
  const wk = html.match(/apply\.workable\.com\/([a-zA-Z0-9_-]+)/i)
  if (wk) return {
    name:   'workable',
    apiUrl: `https://apply.workable.com/api/v3/accounts/${wk[1]}/jobs`,
    parseFn: parseWorkable,
  }

  // SmartRecruiters
  const sr = html.match(/careers\.smartrecruiters\.com\/([a-zA-Z0-9_-]+)/i)
  if (sr) return {
    name:   'smartrecruiters',
    apiUrl: `https://api.smartrecruiters.com/v1/companies/${sr[1]}/postings`,
    parseFn: parseSmartRecruiters,
  }

  return null
}

function parseGreenhouse(data: any, sourceUrl: string): RawJob[] {
  const jobs = Array.isArray(data.jobs) ? data.jobs : []
  return jobs.map((j: any) => normalizeJob({
    external_id:    String(j.id),
    title:          j.title,
    description:    stripHtml(j.content || ''),
    location:       j.location?.name || null,
    employment_type: null,
    apply_url:      j.absolute_url || null,
    source_url:     sourceUrl,
  })).filter((j: RawJob) => j.title)
}

function parseLever(data: any, sourceUrl: string): RawJob[] {
  const postings = Array.isArray(data) ? data : []
  return postings.map((j: any) => normalizeJob({
    external_id:    j.id,
    title:          j.text,
    description:    stripHtml(j.descriptionPlain || j.description || ''),
    location:       j.categories?.location || j.tags?.join(', ') || null,
    employment_type: j.categories?.commitment || null,
    apply_url:      j.hostedUrl || null,
    source_url:     sourceUrl,
  })).filter((j: RawJob) => j.title)
}

function parseWorkable(data: any, sourceUrl: string): RawJob[] {
  const jobs = Array.isArray(data.results) ? data.results : []
  return jobs.map((j: any) => normalizeJob({
    external_id:    j.shortcode || j.id,
    title:          j.title,
    description:    stripHtml(j.description || ''),
    location:       [j.city, j.country].filter(Boolean).join(', ') || null,
    employment_type: j.employment_type || null,
    apply_url:      j.url || null,
    source_url:     sourceUrl,
  })).filter((j: RawJob) => j.title)
}

function parseSmartRecruiters(data: any, sourceUrl: string): RawJob[] {
  const jobs = Array.isArray(data.content) ? data.content : []
  return jobs.map((j: any) => normalizeJob({
    external_id:    j.id,
    title:          j.name,
    description:    stripHtml(j.jobAd?.sections?.jobDescription?.text || ''),
    location:       [j.location?.city, j.location?.country].filter(Boolean).join(', ') || null,
    employment_type: j.typeOfEmployment?.id || null,
    apply_url:      j.ref || null,
    source_url:     sourceUrl,
  })).filter((j: RawJob) => j.title)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Generic HTML heuristics
// ─────────────────────────────────────────────────────────────────────────────

/** Keywords that suggest a container is a job listing. */
const JOB_KEYWORDS = /\b(engineer|developer|manager|analyst|designer|specialist|coordinator|director|associate|solicitor|consultant|accountant|recruiter|architect|scientist|officer|advisor|intern|graduate|head of|vp |lead |senior |junior )\b/i

function extractGenericHtml(html: string, sourceUrl: string): RawJob[] {
  const $ = cheerio.load(html)
  const jobs: RawJob[] = []
  const seen = new Set<string>()

  // Selectors that commonly wrap individual job listings
  const SELECTORS = [
    'li[class*="job"]', 'li[class*="position"]', 'li[class*="role"]', 'li[class*="vacancy"]',
    'article[class*="job"]', 'article[class*="position"]', 'article[class*="role"]',
    'div[class*="job-item"]', 'div[class*="job-card"]', 'div[class*="job-listing"]',
    'div[class*="job-post"]', 'div[class*="position-item"]', 'div[class*="opening"]',
    'tr[class*="job"]', 'tr[class*="position"]',
    '[data-job-id]', '[data-jobid]', '[data-position-id]',
  ]

  for (const sel of SELECTORS) {
    $(sel).each((_, el) => {
      const $el   = $(el)
      const text  = $el.text().trim()
      if (!text || !JOB_KEYWORDS.test(text)) return

      // Try to find a title (first heading or link text)
      const $heading = $el.find('h1,h2,h3,h4,h5,a').first()
      const title    = cleanText($heading.text() || text.split('\n')[0])
      if (!title || seen.has(title.toLowerCase())) return
      seen.add(title.toLowerCase())

      // Location: look for elements with location-related text
      const locEl   = $el.find('[class*="location"],[class*="city"],[class*="place"]').first()
      const location = cleanText(locEl.text()) || null

      // Apply link
      const $link    = $el.find('a[href]').first()
      const href     = $link.attr('href') || $el.find('a').attr('href') || null
      const applyUrl = resolveUrl(href, sourceUrl)

      // Description: everything else
      const description = cleanText(text.replace(title, '').replace(locEl.text(), '')) || title

      const extId = $el.attr('data-job-id') || $el.attr('data-jobid') || $el.attr('data-position-id') || null

      jobs.push(normalizeJob({ external_id: extId || null, title, description, location, employment_type: null, apply_url: applyUrl, source_url: sourceUrl }))
    })

    if (jobs.length > 0) break   // stop at first selector that yields results
  }

  return jobs
}

// ─────────────────────────────────────────────────────────────────────────────
// Public scraper entry point
// ─────────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 20_000

export async function scrapeJobs(sourceUrl: string): Promise<RawJob[]> {
  // Validate URL
  let url: URL
  try {
    url = new URL(sourceUrl)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Non-HTTP URL')
  } catch {
    throw new Error(`Invalid source URL: ${sourceUrl}`)
  }

  // Block private/internal addresses
  const hostname = url.hostname
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname)) {
    throw new Error('Private/internal URLs are not allowed')
  }

  // Fetch page HTML
  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let html: string
  try {
    const res = await fetch(sourceUrl, {
      signal:  controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CreerlioBot/1.0; +https://creerlio.com)',
        'Accept':     'text/html,application/xhtml+xml,*/*',
      },
      redirect: 'follow',
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (err: any) {
    clearTimeout(timer)
    throw new Error(`Failed to fetch careers page: ${err.message}`)
  }

  // Strategy 1: JSON-LD
  const ldJobs = extractJsonLd(html, sourceUrl)
  if (ldJobs.length > 0) return ldJobs

  // Strategy 2: Known job-board embed
  const board = detectEmbeddedBoard(html, sourceUrl)
  if (board) {
    try {
      const apiCtrl  = new AbortController()
      const apiTimer = setTimeout(() => apiCtrl.abort(), FETCH_TIMEOUT_MS)
      const apiRes   = await fetch(board.apiUrl, {
        signal:  apiCtrl.signal,
        headers: { 'Accept': 'application/json' },
      })
      clearTimeout(apiTimer)
      if (apiRes.ok) {
        const data = await apiRes.json()
        const boardJobs = board.parseFn(data, sourceUrl)
        if (boardJobs.length > 0) return boardJobs
      }
    } catch {
      // fall through to generic
    }
  }

  // Strategy 3: Generic HTML
  return extractGenericHtml(html, sourceUrl)
}
