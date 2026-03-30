/**
 * Sets a simple shared password for all demo/dev accounts.
 * Run from /frontend: node scripts/set-dev-passwords.js
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const DEV_PASSWORD = 'creerlio123'

const EMAILS = [
  'demo.minterellison@creerlio.com',
  'enquiries@fortitudelegal.com.au',
  'hello@meridianproperty.com.au',
  'demo.realestate@creerlio.com',
  'demo.talent@creerlio.com',
  'simon060965@gmail.com',
]

async function run() {
  console.log(`Setting password "${DEV_PASSWORD}" for all dev accounts...\n`)

  for (const email of EMAILS) {
    // Look up user by email
    const { data: list, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 })
    if (listErr) { console.error('listUsers error:', listErr.message); break }

    const user = list.users.find(u => u.email === email)
    if (!user) {
      console.log(`  ✗ Not found: ${email}`)
      continue
    }

    const { error } = await sb.auth.admin.updateUserById(user.id, { password: DEV_PASSWORD })
    if (error) {
      console.error(`  ✗ ${email}: ${error.message}`)
    } else {
      console.log(`  ✓ ${email}`)
    }
  }

  console.log(`\nDone. All accounts can now log in with password: ${DEV_PASSWORD}`)
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
