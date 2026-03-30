require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const VIDEO_URL = 'https://empehaulljtwfyzjmvmn.supabase.co/storage/v1/object/public/business-bank/3d44f9d3-8ee2-4834-a048-ef31607f5d8d/bank/fortitude-intro-video.mp4'
const BIZ_ID   = '3d44f9d3-8ee2-4834-a048-ef31607f5d8d'

async function run() {
  const { data: bpp, error: fetchErr } = await sb
    .from('business_profile_pages')
    .select('business_id, media_assets')
    .eq('business_id', BIZ_ID)

  if (fetchErr) { console.error('Fetch error:', fetchErr.message); return }
  console.log('BPP rows:', JSON.stringify(bpp))

  if (!bpp || bpp.length === 0) {
    console.log('No BPP row found for Fortitude Legal')
    return
  }

  const existing = (bpp[0] && bpp[0].media_assets) || {}
  const updated  = Object.assign({}, existing, { intro_video_url: VIDEO_URL })

  const { error: updateErr } = await sb
    .from('business_profile_pages')
    .update({ media_assets: updated })
    .eq('business_id', BIZ_ID)

  if (updateErr) {
    console.error('Update error:', updateErr.message)
  } else {
    console.log('business_profile_pages.media_assets updated - intro_video_url set to:', VIDEO_URL)
  }
}

run()
