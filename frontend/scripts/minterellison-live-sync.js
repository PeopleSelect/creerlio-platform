/**
 * MinterEllison Live Job Sync
 *
 * Scrapes the real MinterEllison careers portal (iCIMS ATS) at
 * https://careers.minterellison.com and syncs all live jobs into Creerlio.
 *
 * Run from /frontend: node scripts/minterellison-live-sync.js
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const https  = require('https')
const http   = require('http')
const crypto = require('crypto')

let cheerio
try { cheerio = require('cheerio') } catch { cheerio = null }

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ME_BIZ_ID   = '9ae96870-d022-4fd1-bdd9-60477af00665'
const CAREERS_URL = 'https://careers.minterellison.com/search/?createNewAlert=false&q=&optionsFacetsDD_location=&optionsFacetsDD_customfield3='

// ── fetch helper (follows redirects) ─────────────────────────────────────────

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/json,*/*',
        'Accept-Language': 'en-AU,en;q=0.9',
        ...headers,
      },
    }
    const req = mod.get(url, opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString()
        return fetchUrl(next, headers).then(resolve).catch(reject)
      }
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }))
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function hash(title, desc, loc) {
  return crypto.createHash('sha256')
    .update(`${title}|${desc}|${loc ?? ''}`).digest('hex').slice(0, 32)
}

function clean(s) { return (s || '').replace(/\s+/g, ' ').trim() }

// ── Strategy 1: iCIMS JSON API ────────────────────────────────────────────────

async function tryICIMSApi() {
  // iCIMS exposes a JSON API used by their search widget
  const apiUrl = 'https://careers.minterellison.com/api/apply/v2/jobs?domain=minterellison.com&start=0&num=100&sort=modifiedAt&descending=true&lang=en_US'
  console.log('  Trying iCIMS API:', apiUrl)
  try {
    const { status, body } = await fetchUrl(apiUrl, { 'Accept': 'application/json' })
    if (status !== 200) { console.log('  → HTTP', status); return [] }
    const data = JSON.parse(body)
    const jobs = data.jobs || data.results || data.data || []
    if (!Array.isArray(jobs) || jobs.length === 0) { console.log('  → Empty jobs array'); return [] }
    console.log(`  → Got ${jobs.length} jobs from iCIMS API`)
    return jobs.map(j => ({
      external_id:    j.id || j.jobId || null,
      title:          clean(j.title || j.jobTitle),
      description:    clean(j.description || j.jobDescription || j.summary || ''),
      location:       clean([j.city, j.state || j.region, j.country].filter(Boolean).join(', ')) || null,
      employment_type: clean(j.jobType || j.employmentType || j.contractType || ''),
      apply_url:      j.canonicalPositionUrl || j.applyUrl || j.url || null,
    })).filter(j => j.title)
  } catch (e) {
    console.log('  → API error:', e.message)
    return []
  }
}

// ── Strategy 2: iCIMS GraphQL / search endpoint ───────────────────────────────

async function tryICIMSSearch() {
  const searchUrl = 'https://careers.minterellison.com/search-jobs/results?ActiveFacetID=0&CurrentPage=1&RecordsPerPage=100&Distance=50&RadiusUnitType=0&Keywords=&Location=&ShowRadius=False&IsPagination=False&CustomFacetName=&FacetTerm=&FacetType=0&FacetFiltersOperatorType=2&SearchResultsModuleName=Search+Results&SearchFiltersModuleName=Search+Filters&SortCriteria=0&SortDirection=2&SearchType=6&PostalCode=&ResultsType=0&fc=&fl=&fcf=&afc=&afl=&afcf='
  console.log('  Trying iCIMS search results endpoint...')
  try {
    const { status, body } = await fetchUrl(searchUrl, { 'Accept': 'application/json, text/javascript' })
    if (status !== 200) { console.log('  → HTTP', status); return [] }
    const data = JSON.parse(body)
    const jobs = data.jobs || data.Jobs || []
    if (!Array.isArray(jobs) || jobs.length === 0) { console.log('  → Empty'); return [] }
    console.log(`  → Got ${jobs.length} jobs from search endpoint`)
    return jobs.map(j => ({
      external_id:    String(j.JobId || j.id || ''),
      title:          clean(j.Title || j.title),
      description:    clean(j.Description || j.description || j.Category || ''),
      location:       clean(j.Location || j.location || [j.City, j.State, j.Country].filter(Boolean).join(', ')) || null,
      employment_type: clean(j.JobType || j.EmploymentType || ''),
      apply_url:      j.JobPath ? `https://careers.minterellison.com${j.JobPath}` : null,
    })).filter(j => j.title)
  } catch (e) {
    console.log('  → Search endpoint error:', e.message)
    return []
  }
}

// ── Strategy 3: scrape the HTML search page ───────────────────────────────────

async function scrapeHtml() {
  console.log('  Scraping HTML from careers page...')
  const { status, body } = await fetchUrl(CAREERS_URL)
  if (status !== 200) throw new Error(`HTTP ${status}`)
  console.log(`  Got ${body.length} bytes of HTML`)

  // Try to find embedded JSON in page
  const jsonMatch = body.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});?\s*<\/script>/s)
    || body.match(/window\.initialData\s*=\s*({.+?});?\s*<\/script>/s)
    || body.match(/"jobs"\s*:\s*(\[.+?\])/s)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      const jobs = parsed.jobs || parsed
      if (Array.isArray(jobs) && jobs.length > 0) {
        console.log(`  → Found ${jobs.length} jobs in page JSON`)
        return jobs.map(j => ({
          external_id:    String(j.id || j.jobId || ''),
          title:          clean(j.title || j.jobTitle || ''),
          description:    clean(j.description || j.summary || ''),
          location:       clean(j.location || [j.city, j.country].filter(Boolean).join(', ')) || null,
          employment_type: clean(j.jobType || j.contractType || ''),
          apply_url:      j.url || j.applyUrl || null,
        })).filter(j => j.title)
      }
    } catch { /* continue */ }
  }

  if (!cheerio) { console.log('  cheerio not available'); return [] }

  const $ = cheerio.load(body)
  const jobs = []

  // iCIMS table rows
  $('tr.data-row, tr[id*="job"], .job-result, .iCIMS_JobsTable tr').each((_, el) => {
    const $el  = $(el)
    const $link = $el.find('a').first()
    const title = clean($link.text() || $el.find('td').first().text())
    if (!title) return

    const cells = $el.find('td').map((_, td) => clean($(td).text())).get()
    const href  = $link.attr('href')

    jobs.push({
      external_id:    $el.attr('data-id') || $el.attr('id') || null,
      title,
      description:    cells[3] || cells[2] || '',   // Business Unit
      location:       cells[1] || null,
      employment_type: cells[2] || null,
      apply_url:      href ? (href.startsWith('http') ? href : `https://careers.minterellison.com${href}`) : null,
    })
  })

  // Generic link fallback
  if (jobs.length === 0) {
    $('a[href*="/job/"], a[href*="/jobs/"], a[href*="position"]').each((_, el) => {
      const title = clean($(el).text())
      if (!title || title.length < 5) return
      const href = $(el).attr('href')
      jobs.push({
        external_id: null,
        title,
        description: '',
        location: null,
        employment_type: null,
        apply_url: href ? (href.startsWith('http') ? href : `https://careers.minterellison.com${href}`) : null,
      })
    })
  }

  console.log(`  → Found ${jobs.length} jobs via HTML scraping`)
  return jobs
}

// ── main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(' MinterEllison Live Job Sync')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Source:', CAREERS_URL)
  console.log()

  // Update careers URL
  await sb.from('businesses').update({ careers_page_url: CAREERS_URL }).eq('id', ME_BIZ_ID)

  // Try scraping strategies in order
  let scraped = []
  console.log('[1] Trying iCIMS JSON API...')
  scraped = await tryICIMSApi()

  if (scraped.length === 0) {
    console.log('[2] Trying iCIMS search endpoint...')
    scraped = await tryICIMSSearch()
  }

  if (scraped.length === 0) {
    console.log('[3] Falling back to HTML scraping...')
    scraped = await scrapeHtml()
  }

  if (scraped.length === 0) {
    console.error('\n✗ No jobs found via any strategy.')
    console.log('\nDebug: fetching raw HTML snippet...')
    const { body } = await fetchUrl(CAREERS_URL)
    console.log('First 3000 chars of page:')
    console.log(body.substring(0, 3000))
    return
  }

  console.log(`\n✓ Scraped ${scraped.length} jobs\n`)

  // Get business_profile_id
  const { data: bp } = await sb
    .from('business_profiles').select('id').eq('business_id', ME_BIZ_ID).maybeSingle()
  const bpId = bp?.id || null

  // Load existing auto-synced jobs
  const { data: existing } = await sb
    .from('jobs').select('id, external_id, title, hash, is_active')
    .eq('source_url', CAREERS_URL).eq('is_auto_synced', true)

  const existingMap = new Map()
  for (const row of (existing || [])) {
    const k = row.external_id ? `eid:${row.external_id}` : `title:${row.title.toLowerCase().trim()}`
    existingMap.set(k, row)
  }

  const now = new Date().toISOString()
  const seenKeys = new Set()
  let created = 0, updated = 0, unchanged = 0

  for (const job of scraped) {
    const title = clean(job.title)
    if (!title) continue
    const desc  = clean(job.description || title)
    const loc   = clean(job.location || '')
    const h     = hash(title, desc, loc || null)
    const k     = job.external_id ? `eid:${job.external_id}` : `title:${title.toLowerCase()}`
    seenKeys.add(k)

    const stored = existingMap.get(k)
    if (!stored) {
      const row = {
        title, description: desc, location: loc || null,
        employment_type: clean(job.employment_type || '') || null,
        application_url: job.apply_url || CAREERS_URL,
        source_url: CAREERS_URL,
        external_id: job.external_id || null,
        hash: h,
        status: 'published', is_active: true, is_auto_synced: true,
        first_seen_at: now, last_seen_at: now,
        business_id: ME_BIZ_ID,
        ...(bpId ? { business_profile_id: bpId } : {}),
      }
      const { error } = await sb.from('jobs').insert(row)
      if (error) console.error(`  ✗ INSERT "${title}":`, error.message)
      else { created++; console.log(`  + ${title}${loc ? ` — ${loc}` : ''}`) }
    } else if (stored.hash !== h || !stored.is_active) {
      await sb.from('jobs').update({
        title, description: desc, location: loc || null,
        employment_type: clean(job.employment_type || '') || null,
        application_url: job.apply_url || CAREERS_URL,
        hash: h, last_seen_at: now, is_active: true, status: 'published',
      }).eq('id', stored.id)
      updated++; console.log(`  ~ ${title}`)
    } else {
      await sb.from('jobs').update({ last_seen_at: now }).eq('id', stored.id)
      unchanged++
    }
  }

  // Remove jobs no longer live
  let removed = 0
  for (const [k, stored] of existingMap) {
    if (!seenKeys.has(k) && stored.is_active) {
      await sb.from('jobs').update({ is_active: false, status: 'removed', sync_removed_at: now }).eq('id', stored.id)
      removed++; console.log(`  - Removed: ${stored.title}`)
    }
  }

  // Write sync log
  await sb.from('job_sync_logs').insert({
    business_id: ME_BIZ_ID, source_url: CAREERS_URL,
    jobs_found: scraped.length, jobs_created: created,
    jobs_updated: updated, jobs_removed: removed,
    status: 'success',
  })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(` Done — Found:${scraped.length}  Added:${created}  Updated:${updated}  Unchanged:${unchanged}  Removed:${removed}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
