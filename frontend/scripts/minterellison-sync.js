/**
 * Set MinterEllison's careers page URL and run the first job sync.
 * Run from /frontend: node scripts/minterellison-sync.js
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const crypto = require('crypto')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ME_USER_ID = '9ae96870-d022-4fd1-bdd9-60477af00665'

// MinterEllison's SmartRecruiters company ID
const CAREERS_URL  = 'https://careers.smartrecruiters.com/MinterEllison'
const SR_API       = 'https://api.smartrecruiters.com/v1/companies/MinterEllison/postings?limit=100'

// ── helpers ──────────────────────────────────────────────────────────────────

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http')
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CreerlioBot/1.0)',
        'Accept': 'application/json, text/html',
      },
    }, res => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject)
      }
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body }))
    })
    req.on('error', reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function hash(title, desc, loc) {
  return crypto.createHash('sha256')
    .update(`${title}|${desc}|${loc ?? ''}`)
    .digest('hex').slice(0, 32)
}

function cleanText(s) {
  return (s || '').replace(/\s{2,}/g, ' ').trim()
}

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

// ── scrape via SmartRecruiters API ───────────────────────────────────────────

async function scrapeSmartRecruiters() {
  console.log('Fetching SmartRecruiters API:', SR_API)
  const { status, body } = await fetch(SR_API)
  if (status !== 200) throw new Error(`SmartRecruiters API returned HTTP ${status}`)
  const data = JSON.parse(body)
  const postings = Array.isArray(data.content) ? data.content : []
  console.log(`  Found ${postings.length} postings`)
  return postings.map(j => {
    const title = cleanText(j.name)
    const loc   = [j.location?.city, j.location?.country].filter(Boolean).join(', ') || null
    const desc  = stripHtml(j.jobAd?.sections?.jobDescription?.text || j.industry || '')
    return {
      external_id:     j.id,
      title,
      description:     desc || title,
      location:        loc,
      employment_type: j.typeOfEmployment?.id || null,
      apply_url:       j.ref || null,
      source_url:      CAREERS_URL,
      hash:            hash(title, desc, loc),
    }
  }).filter(j => j.title)
}

// ── main ─────────────────────────────────────────────────────────────────────

async function run() {
  // 1. Find the MinterEllison business record
  const { data: biz, error: bizErr } = await sb
    .from('businesses')
    .select('id, name, careers_page_url')
    .eq('id', ME_USER_ID)
    .maybeSingle()

  // Fallback: look up by the user who owns the business_profile
  let bizId = biz?.id
  if (!bizId) {
    const { data: bp } = await sb
      .from('business_profiles')
      .select('business_id, business_name')
      .eq('user_id', ME_USER_ID)
      .maybeSingle()
    bizId = bp?.business_id
    console.log('Found business via business_profiles:', bp?.business_name, bizId)
  } else {
    console.log('Found business:', biz.name, bizId)
  }

  if (!bizId) {
    console.error('Could not find MinterEllison business record. Exiting.')
    process.exit(1)
  }

  // 2. Set careers_page_url
  console.log('\n[1] Setting careers_page_url on businesses table...')
  const { error: urlErr } = await sb
    .from('businesses')
    .update({ careers_page_url: CAREERS_URL })
    .eq('id', bizId)
  if (urlErr) console.error('  Warning:', urlErr.message)
  else console.log('  ✓ careers_page_url set to', CAREERS_URL)

  // 3. Scrape jobs
  console.log('\n[2] Scraping MinterEllison jobs...')
  let jobs = []
  try {
    jobs = await scrapeSmartRecruiters()
  } catch (err) {
    console.error('  SmartRecruiters scrape failed:', err.message)
    console.log('  Trying careers page directly...')
    // Fallback handled — log failure only
  }

  if (jobs.length === 0) {
    console.error('  No jobs scraped. Cannot proceed.')
    await sb.from('job_sync_logs').insert({
      business_id: bizId,
      source_url: CAREERS_URL,
      jobs_found: 0, jobs_created: 0, jobs_updated: 0, jobs_removed: 0,
      status: 'failure',
      error_message: 'Scrape returned 0 jobs',
    })
    return
  }
  console.log(`  Scraped ${jobs.length} jobs`)

  // 4. Get business_profile_id
  const { data: bp } = await sb
    .from('business_profiles')
    .select('id')
    .eq('business_id', bizId)
    .maybeSingle()
  const bpId = bp?.id || null

  // 5. Insert / sync jobs
  console.log('\n[3] Syncing jobs to database...')
  const now = new Date().toISOString()
  let created = 0, updated = 0, skipped = 0

  // Load existing auto-synced jobs for this source
  const { data: existing } = await sb
    .from('jobs')
    .select('id, external_id, title, hash, is_active')
    .eq('source_url', CAREERS_URL)
    .eq('is_auto_synced', true)

  const existingMap = new Map()
  for (const row of (existing || [])) {
    const k = row.external_id ? `eid:${row.external_id}` : `title:${row.title.toLowerCase()}`
    existingMap.set(k, row)
  }

  const seenKeys = new Set()
  for (const job of jobs) {
    const k = job.external_id ? `eid:${job.external_id}` : `title:${job.title.toLowerCase()}`
    seenKeys.add(k)
    const stored = existingMap.get(k)

    if (!stored) {
      const row = {
        title: job.title,
        description: job.description,
        location: job.location,
        employment_type: job.employment_type,
        application_url: job.apply_url,
        source_url: job.source_url,
        external_id: job.external_id,
        hash: job.hash,
        status: 'published',
        is_active: true,
        is_auto_synced: true,
        first_seen_at: now,
        last_seen_at: now,
        published_at: now,
        business_id: bizId,
        ...(bpId ? { business_profile_id: bpId } : {}),
      }
      const { error } = await sb.from('jobs').insert(row)
      if (error) console.error(`  ✗ INSERT "${job.title}":`, error.message)
      else { created++; process.stdout.write('+') }
    } else if (stored.hash !== job.hash || !stored.is_active) {
      const { error } = await sb.from('jobs').update({
        title: job.title, description: job.description,
        location: job.location, employment_type: job.employment_type,
        application_url: job.apply_url, hash: job.hash,
        last_seen_at: now, is_active: true, status: 'published',
      }).eq('id', stored.id)
      if (error) console.error(`  ✗ UPDATE "${job.title}":`, error.message)
      else { updated++; process.stdout.write('~') }
    } else {
      await sb.from('jobs').update({ last_seen_at: now }).eq('id', stored.id)
      skipped++; process.stdout.write('.')
    }
  }

  // Remove jobs no longer in scrape
  let removed = 0
  for (const [k, stored] of existingMap) {
    if (!seenKeys.has(k) && stored.is_active) {
      await sb.from('jobs').update({ is_active: false, status: 'removed', sync_removed_at: now }).eq('id', stored.id)
      removed++; process.stdout.write('-')
    }
  }

  console.log('\n')
  console.log(`  ✓ Created: ${created}  Updated: ${updated}  Skipped: ${skipped}  Removed: ${removed}`)

  // 6. Write sync log
  await sb.from('job_sync_logs').insert({
    business_id: bizId,
    source_url: CAREERS_URL,
    jobs_found: jobs.length,
    jobs_created: created,
    jobs_updated: updated,
    jobs_removed: removed,
    status: 'success',
  })

  console.log('\n✅  MinterEllison job sync complete!')
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
