require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const BIZ = '3d44f9d3-8ee2-4834-a048-ef31607f5d8d'
const USER = '3d44f9d3-8ee2-4834-a048-ef31607f5d8d'

const modelCandidates = ['B2B', 'B2C', 'B2B_B2C', 'SaaS', 'Marketplace', 'Professional_Services', 'Services', 'Fee_for_Service', 'Consulting', 'Platform']

async function run() {
  for (const m of modelCandidates) {
    const r = await sb.from('business_products_services_overview')
      .insert({ business_id: BIZ, user_id: USER, short_headline: 'test', business_model: m })
      .select('business_model')
    if (!r.error) {
      console.log('VALID model:', m, '→ data:', JSON.stringify(r.data))
      await sb.from('business_products_services_overview').delete().eq('business_id', BIZ)
    } else {
      console.log('invalid model:', m, '→', r.error.message.slice(0, 80))
    }
  }
}
run()
