/**
 * Enriches MinterEllison auto-synced job descriptions by fetching each
 * individual job detail page from careers.minterellison.com and storing
 * clean, sanitized HTML for rich rendering.
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

const ME_BIZ_ID = '9ae96870-d022-4fd1-bdd9-60477af00665'

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

function hash(title, desc, loc) {
  return crypto.createHash('sha256')
    .update(`${title}|${desc}|${loc ?? ''}`).digest('hex').slice(0, 32)
}

function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    .replace(/href="javascript:[^"]*"/gi, '')
    .trim()
}

/**
 * Fetch iCIMS job detail page and extract the job description HTML.
 * The description is in span.jobdescription; we strip the Location/Contract
 * header paragraphs at the top.
 */
async function fetchJobHtml(url) {
  if (!url || !url.startsWith('http')) return null
  if (!cheerio) return null

  try {
    const { status, body } = await fetchUrl(url)
    if (status !== 200) return null

    const $ = cheerio.load(body)

    // iCIMS uses span.jobdescription for the full job content
    const container = $('span.jobdescription, .jobdescription').first()
    if (!container.length) return null

    // Remove leading empty/metadata paragraphs (Location, Contract Type, etc.)
    container.find('p').each((_, el) => {
      const text = $(el).text().trim()
      if (!text || /^(Location|Contract Type|Job Type|Department|Requisition)/i.test(text)) {
        $(el).remove()
      }
    })

    const html = sanitizeHtml(container.html() || '')
    const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    if (plainText.length < 100) return null
    return html
  } catch (e) {
    return null
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

async function run() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(' MinterEllison Description Enrichment (HTML)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (!cheerio) {
    console.error('✗ cheerio is required. Run: npm install cheerio')
    process.exit(1)
  }

  const { data: jobs, error } = await sb
    .from('jobs')
    .select('id, title, description, location, application_url, hash')
    .eq('business_id', ME_BIZ_ID)
    .eq('is_auto_synced', true)
    .eq('is_active', true)

  if (error) { console.error('DB error:', error.message); process.exit(1) }
  console.log(`Found ${jobs.length} auto-synced jobs to enrich\n`)

  let enriched = 0, failed = 0

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]
    if (!job.application_url?.startsWith('http')) { process.stdout.write('✗'); failed++; continue }
    if (i > 0) await delay(600)

    const html = await fetchJobHtml(job.application_url)
    if (!html) {
      process.stdout.write('?')
      console.log(`\n  No description found: ${job.title}`)
      failed++
      continue
    }

    const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const newHash = hash(job.title, plainText, job.location || '')

    const { error: updErr } = await sb
      .from('jobs')
      .update({ description: html, hash: newHash })
      .eq('id', job.id)

    if (updErr) { process.stdout.write('E'); failed++ }
    else { process.stdout.write('+'); enriched++ }
  }

  console.log('\n')
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(` Done — Enriched:${enriched}  Failed:${failed}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
