/**
 * Enriches MinterEllison auto-synced job descriptions by fetching each
 * individual job detail page from careers.minterellison.com.
 *
 * Run from /frontend: node scripts/minterellison-enrich-descriptions.js
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

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
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
      res.on('end', () => resolve({ status: res.statusCode, body }))
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function clean(s) {
  return (s || '')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim()
}

function hash(title, desc, loc) {
  return crypto.createHash('sha256')
    .update(`${title}|${desc}|${loc ?? ''}`).digest('hex').slice(0, 32)
}

/**
 * Fetch a single iCIMS job detail page and extract the full description.
 */
async function fetchJobDescription(url) {
  if (!url || !url.startsWith('http')) return null
  if (!cheerio) return null

  try {
    const { status, body } = await fetchUrl(url)
    if (status !== 200) return null

    const $ = cheerio.load(body)

    // Try iCIMS-specific selectors in order of specificity
    const selectors = [
      '.iCIMS_JobContent',
      '#iCIMS_Content',
      '.iCIMS_InfoPanel',
      '.iCIMS_JobDetailHeader + div',
      '.job-content',
      '#job-description',
      '.jobdescription',
      '[class*="jobDescription"]',
      '[class*="JobDescription"]',
      '[id*="jobDescription"]',
      '[id*="job-description"]',
      'div[data-automation="jobDescription"]',
      '.description',
      'main article',
      'main .content',
    ]

    for (const sel of selectors) {
      const el = $(sel)
      if (el.length > 0) {
        const text = clean(el.text())
        if (text.length > 100) return text
      }
    }

    // Fallback: grab all paragraph text from main content
    const paragraphs = $('p').map((_, el) => clean($(el).text())).get()
      .filter(t => t.length > 40)
    if (paragraphs.length > 2) {
      return paragraphs.join('\n\n')
    }

    return null
  } catch (e) {
    return null
  }
}

// Delay to avoid hammering the server
function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

async function run() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(' MinterEllison Description Enrichment')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (!cheerio) {
    console.error('✗ cheerio is required. Run: npm install cheerio')
    process.exit(1)
  }

  // Load all auto-synced ME jobs
  const { data: jobs, error } = await sb
    .from('jobs')
    .select('id, title, description, location, application_url, hash')
    .eq('business_id', ME_BIZ_ID)
    .eq('is_auto_synced', true)
    .eq('is_active', true)

  if (error) { console.error('DB error:', error.message); process.exit(1) }
  console.log(`Found ${jobs.length} auto-synced jobs to enrich\n`)

  // Also remove the 4 old manually-created jobs (not auto-synced) to clean up
  console.log('[0] Removing old manually-created placeholder jobs...')
  const { data: manualJobs } = await sb
    .from('jobs')
    .select('id, title')
    .eq('business_id', ME_BIZ_ID)
    .eq('is_auto_synced', false)
    .eq('is_active', true)

  if (manualJobs && manualJobs.length > 0) {
    for (const j of manualJobs) {
      await sb.from('jobs').update({ is_active: false, status: 'removed' }).eq('id', j.id)
      console.log(`  - Removed manual job: ${j.title}`)
    }
  } else {
    console.log('  No manual jobs to remove.')
  }
  console.log()

  let enriched = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]
    const applyUrl = job.application_url

    // Skip if description is already substantial (not just a business unit name)
    const isShallow = !job.description || job.description.length < 100
    if (!isShallow) {
      skipped++
      process.stdout.write('.')
      continue
    }

    if (!applyUrl || !applyUrl.startsWith('http')) {
      failed++
      process.stdout.write('✗')
      continue
    }

    // Rate limit: 1 request per 500ms
    if (i > 0) await delay(500)

    const desc = await fetchJobDescription(applyUrl)
    if (!desc || desc.length < 50) {
      process.stdout.write('?')
      failed++
      continue
    }

    // Update DB
    const newHash = hash(job.title, desc, job.location || '')
    const { error: updErr } = await sb
      .from('jobs')
      .update({ description: desc, hash: newHash })
      .eq('id', job.id)

    if (updErr) {
      process.stdout.write('E')
      failed++
    } else {
      process.stdout.write('+')
      enriched++
    }
  }

  console.log('\n')
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(` Done — Enriched:${enriched}  Skipped:${skipped}  Failed:${failed}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
