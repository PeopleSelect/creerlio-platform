/**
 * Geocodes all published jobs that are missing lat/lng and stores coordinates.
 * Run from /frontend: node scripts/geocode-jobs.js
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const https = require('https')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

function geocode(address) {
  return new Promise((resolve) => {
    if (!address || !MAPBOX_TOKEN) return resolve(null)
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=AU`
    const req = https.get(url, res => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => {
        try {
          const data = JSON.parse(body)
          const feat = data.features && data.features[0]
          if (feat) resolve({ lng: feat.center[0], lat: feat.center[1] })
          else resolve(null)
        } catch { resolve(null) }
      })
    })
    req.on('error', () => resolve(null))
    req.setTimeout(10000, () => { req.destroy(); resolve(null) })
  })
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

// Clean location string — strip "+N more" suffixes
function cleanLocation(loc) {
  return (loc || '').replace(/\s*\+\d+\s*more[….]?/i, '').trim()
}

async function run() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(' Geocode Jobs — store lat/lng in database')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (!MAPBOX_TOKEN) {
    console.error('✗ NEXT_PUBLIC_MAPBOX_TOKEN not set in .env.local')
    process.exit(1)
  }

  // Fetch all published jobs missing coordinates
  const { data: jobs, error } = await sb
    .from('jobs')
    .select('id, title, location, city, state, country, latitude, longitude')
    .eq('is_active', true)
    .ilike('status', 'published%')
    .is('latitude', null)

  if (error) { console.error('DB error:', error.message); process.exit(1) }
  console.log(`Found ${jobs.length} jobs missing coordinates\n`)

  let geocoded = 0, failed = 0

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]

    // Build the best address string
    const loc = cleanLocation(job.location)
    const parts = [loc, job.city, job.state, job.country].filter(Boolean)
    // Deduplicate (location often contains city already)
    const unique = []
    for (const p of parts) {
      if (!unique.some(u => u.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(u.toLowerCase()))) {
        unique.push(p)
      }
    }
    const address = unique.join(', ')

    if (!address) { process.stdout.write('_'); failed++; continue }

    if (i > 0) await delay(200) // 5 req/sec max

    const coords = await geocode(address)
    if (!coords) {
      process.stdout.write('?')
      failed++
      continue
    }

    const { error: updErr } = await sb
      .from('jobs')
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq('id', job.id)

    if (updErr) { process.stdout.write('E'); failed++ }
    else { process.stdout.write('+'); geocoded++ }
  }

  console.log('\n')
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(` Done — Geocoded:${geocoded}  Failed:${failed}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
