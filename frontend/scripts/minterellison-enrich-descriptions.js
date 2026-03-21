/**
 * Enriches MinterEllison auto-synced job descriptions by fetching each
 * individual job detail page from careers.minterellison.com and storing
 * clean, sanitized HTML. Strips generic boilerplate — keeps only the
 * job-specific sections (Team, Role, Responsibilities, Requirements, etc.)
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

// Paragraphs that are generic MinterEllison boilerplate across all jobs
const BOILERPLATE_PATTERNS = [
  /MinterEllison is one of Australia.s largest independent law/i,
  /heritage of almost 200 years/i,
  /nearly 200 years building something exceptional/i,
  /authentic and enduring relationships/i,
  /Clients seek out MinterEllison to help them solve/i,
  /full-service legal offering and complementary consulting/i,
  /Best Employer|Employer of Choice/i,
  /leading the way with AI and other emerging technologies/i,
  /sustainable ways of working.*social.*financial.*health benefits/i,
  /We use cookies/i,
  /cookie preferences/i,
  /defined not just by its legal expertise, but by its people/i,
  /High-performing, collaborative, and driven by curiosity/i,
  /For you, this means the opportunity to work on industry-leading/i,
  /We offer opportunities to work on industry-leading mandates/i,
  /opportunity to work on industry-leading matters for top-tier clients/i,
  /we have spent nearly/i,
]

function isBoilerplate(text) {
  return BOILERPLATE_PATTERNS.some(p => p.test(text))
}

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
    // Clean up &nbsp; to spaces
    .replace(/&nbsp;/g, ' ')
    // Remove trailing whitespace
    .trim()
}

/**
 * Fetch iCIMS job detail page, extract description, strip boilerplate.
 * Returns sanitized HTML with only job-specific content.
 */
async function fetchJobHtml(url) {
  if (!url || !url.startsWith('http')) return null
  if (!cheerio) return null

  try {
    const { status, body } = await fetchUrl(url)
    if (status !== 200) return null

    const $ = cheerio.load(body)

    // iCIMS job content is in span.jobdescription
    const container = $('span.jobdescription, .jobdescription').first()
    if (!container.length) return null

    // Strategy: find the first "section heading" paragraph (a <p> whose only
    // substantive content is a <strong> tag, e.g. "The Team", "The Role").
    // Include only that paragraph and everything after it.
    const children = container.children().toArray()
    let startIdx = -1

    for (let i = 0; i < children.length; i++) {
      const $el = $(children[i])
      const text = $el.text().replace(/\s+/g, ' ').trim()
      if (!text) continue

      // A heading paragraph contains a <strong> whose text is short (< 60 chars)
      // and the paragraph text itself is mostly just that heading
      const $strong = $el.find('strong')
      if ($strong.length > 0) {
        const strongText = $strong.first().text().trim()
        if (strongText.length > 0 && strongText.length < 60 && text.length < 80) {
          startIdx = i
          break
        }
      }
    }

    // If no heading found, find the first non-boilerplate, non-metadata paragraph
    if (startIdx < 0) {
      for (let i = 0; i < children.length; i++) {
        const $el = $(children[i])
        const text = $el.text().replace(/\s+/g, ' ').trim()
        if (!text) continue
        if (/^(Location|Contract Type|Job Type|Department|Requisition)\s*:/i.test(text)) continue
        if (isBoilerplate(text)) continue
        startIdx = i
        break
      }
    }

    const effectiveStart = startIdx >= 0 ? startIdx : 0

    const resultParts = []
    for (let i = effectiveStart; i < children.length; i++) {
      const $el = $(children[i])
      const text = $el.text().replace(/\s+/g, ' ').trim()
      if (!text) continue
      if (isBoilerplate(text)) continue
      if (/^(Location|Contract Type|Job Type|Department|Requisition)\s*:/i.test(text)) continue
      resultParts.push(sanitizeHtml($.html($el)))
    }

    const html = resultParts.join('\n')
    const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    if (plainText.length < 80) return null
    return html
  } catch (e) {
    return null
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

async function run() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(' MinterEllison Description Enrichment (job-specific HTML)')
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
    if (!job.application_url || !job.application_url.startsWith('http')) {
      process.stdout.write('✗'); failed++; continue
    }
    if (i > 0) await delay(600)

    const html = await fetchJobHtml(job.application_url)
    if (!html) {
      process.stdout.write('?')
      console.log(`\n  No content: ${job.title}`)
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
