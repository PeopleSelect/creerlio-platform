require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TABLES = [
  // Core tables
  'talent_profiles',
  'business_profiles',
  'business_profile_pages',
  'jobs',
  'applications',
  // Feature tables
  'talent_connection_requests',
  'business_outreach_requests',
  'public_talent_profiles',
  'onboarding_sessions',
  // Supporting tables
  'talent_notifications',
  'business_notifications',
  'page_views',
]

const POLICIES = [
  { table: 'business_outreach_requests', policy: 'bor_business_all' },
  { table: 'business_outreach_requests', policy: 'bor_talent_select' },
  { table: 'business_outreach_requests', policy: 'bor_talent_update' },
  { table: 'onboarding_sessions',        policy: 'os_own_all' },
  { table: 'talent_connection_requests', policy: 'tcr_talent_insert_own' },
  { table: 'public_talent_profiles',     policy: 'ptp_public_select' },
]

async function checkTable(name) {
  const { data, error } = await sb.from(name).select('*').limit(1)
  if (error) {
    if (error.code === '42P01') return { status: 'MISSING', detail: 'Table does not exist' }
    return { status: 'ERROR', detail: error.message }
  }
  return { status: 'OK', detail: `accessible (${data?.length ?? 0} rows in sample)` }
}

async function checkPolicy(table, policy) {
  const { data, error } = await sb
    .from('pg_policies')
    .select('policyname')
    .eq('schemaname', 'public')
    .eq('tablename', table)
    .eq('policyname', policy)
    .maybeSingle()

  // pg_policies may not be accessible via PostgREST — use raw SQL fallback
  if (error) return { status: 'UNKNOWN', detail: 'pg_policies not queryable via API (normal)' }
  return data
    ? { status: 'OK', detail: 'policy exists' }
    : { status: 'MISSING', detail: 'policy not found' }
}

async function checkRowCounts() {
  const counts = {}
  for (const t of ['business_profile_pages', 'public_talent_profiles', 'jobs', 'talent_profiles']) {
    const { count } = await sb.from(t).select('*', { count: 'exact', head: true })
    counts[t] = count ?? '?'
  }
  return counts
}

async function run() {
  console.log('\n═══════════════════════════════════════════')
  console.log('  Creerlio — SQL Migration Check')
  console.log('═══════════════════════════════════════════\n')

  // 1. Table existence
  console.log('── Tables ──────────────────────────────────')
  const results = {}
  for (const t of TABLES) {
    const r = await checkTable(t)
    results[t] = r
    const icon = r.status === 'OK' ? '✓' : r.status === 'MISSING' ? '✗' : '?'
    console.log(`  ${icon} ${t.padEnd(35)} ${r.status.padEnd(8)} ${r.detail}`)
  }

  // 2. Row counts for key tables
  console.log('\n── Row counts (key tables) ─────────────────')
  const counts = await checkRowCounts()
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  · ${t.padEnd(35)} ${c} rows`)
  }

  // 3. Policies (best-effort via PostgREST)
  console.log('\n── RLS Policies (best-effort check) ────────')
  for (const { table, policy } of POLICIES) {
    const r = await checkPolicy(table, policy)
    const icon = r.status === 'OK' ? '✓' : r.status === 'MISSING' ? '✗' : '·'
    console.log(`  ${icon} ${table}.${policy}`)
    if (r.status !== 'OK') console.log(`      → ${r.detail}`)
  }

  // 4. Summary
  const missing = Object.entries(results).filter(([, r]) => r.status === 'MISSING').map(([t]) => t)
  const errors  = Object.entries(results).filter(([, r]) => r.status === 'ERROR').map(([t]) => t)

  console.log('\n── Summary ─────────────────────────────────')
  if (missing.length === 0 && errors.length === 0) {
    console.log('  ✓ All tables present and accessible\n')
  } else {
    if (missing.length > 0) console.log(`  ✗ Missing tables: ${missing.join(', ')}`)
    if (errors.length > 0)  console.log(`  ! Errors:         ${errors.join(', ')}`)
    console.log()
    console.log('  Run the corresponding migration SQL in Supabase:')
    if (missing.includes('business_outreach_requests'))
      console.log('    → supabase/migrations/20260328_business_outreach_requests.sql')
    if (missing.includes('onboarding_sessions'))
      console.log('    → supabase/migrations/20260328_onboarding_sessions.sql')
    if (missing.includes('public_talent_profiles'))
      console.log('    → supabase/migrations/20260317_public_business_discovery.sql (or run INSERT seed)')
    console.log()
  }
}

run().catch(err => { console.error('Script error:', err.message); process.exit(1) })
