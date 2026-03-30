require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const MERIDIAN  = '63e4d2c8-b9dd-4884-bb6b-eba49bfdccce'
const FORTITUDE = '3d44f9d3-8ee2-4834-a048-ef31607f5d8d'

async function run() {
  // First get column names
  const { data: sample, error: sErr } = await sb.from('jobs').select('*').limit(1)
  if (sErr) { console.error('jobs error:', sErr.message); return }
  console.log('jobs columns:', sample && sample[0] ? Object.keys(sample[0]) : 'empty table')

  const { data, error } = await sb.from('jobs').select('*').order('id')
  if (error) { console.error(error.message); return }
  console.log('\nAll jobs (' + data.length + '):')
  data.forEach(j => console.log(JSON.stringify(j)))
}
run()
