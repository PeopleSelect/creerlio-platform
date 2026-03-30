/**
 * Recreates the Fortitude Legal intro video with a NEW filename (cache-busting).
 * Run from /frontend: node scripts/fortitude-video-v2.js
 */
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const OpenAI           = require('openai')
const fs               = require('fs')
const path             = require('path')
const os               = require('os')
const { execFileSync } = require('child_process')
const https            = require('https')
const http             = require('http')
const ffmpegPath       = require('ffmpeg-static')

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })

const FORTITUDE_USER_ID = '3d44f9d3-8ee2-4834-a048-ef31607f5d8d'
const BUCKET            = 'business-bank'
const NEW_FILENAME      = 'fortitude-intro-v2.mp4'
const NEW_STORAGE_PATH  = `${FORTITUDE_USER_ID}/bank/${NEW_FILENAME}`

const NARRATION = [
  'Welcome to Fortitude Legal.',
  "We are Perth's leading boutique law firm — built on a foundation of integrity, expertise, and an unwavering commitment to our clients.",
  'At Fortitude Legal, we specialise in corporate and commercial law, property transactions, and employment matters.',
  "Whether you're a growing business navigating complex agreements, an individual protecting your property rights, or an organisation managing workplace relations — our team delivers clear strategy and exceptional outcomes.",
  'Our solicitors bring decades of combined experience and a genuine passion for the law.',
  'We believe legal excellence goes hand in hand with human understanding.',
  "We're always looking for talented legal professionals who share our values.",
  "If you're ready to make a real impact at a firm that invests in your growth, we want to hear from you.",
  'Fortitude Legal — precision, principle, and purpose.',
].join(' ')

function publicUrl(storagePath) {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  return `${SUPABASE_URL}/storage/v1/object/public/business-bank/${encoded}`
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file  = fs.createWriteStream(destPath)
    const proto = url.startsWith('https') ? https : http
    proto.get(url, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', reject)
  })
}

async function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fl-vid2-'))
  console.log('Temp dir:', tmpDir)

  // 1. Download images
  console.log('\n[1] Fetching images...')
  const { data: items } = await supabase
    .from('business_bank_items')
    .select('id,item_type,file_url,file_path')
    .eq('user_id', FORTITUDE_USER_ID)
    .in('item_type', ['image', 'logo'])
    .order('id', { ascending: true })

  const imgUrls = items.map(i => i.file_url || (i.file_path ? publicUrl(i.file_path) : null)).filter(Boolean)
  console.log(`  ${imgUrls.length} images found`)

  const imgPaths = []
  for (let i = 0; i < imgUrls.length; i++) {
    const p = path.join(tmpDir, `img_${String(i).padStart(3, '0')}.jpg`)
    await downloadFile(imgUrls[i], p)
    imgPaths.push(p)
    process.stdout.write(`\r  Downloaded ${i + 1}/${imgUrls.length}`)
  }
  console.log()

  // 2. TTS
  console.log('\n[2] Generating TTS narration...')
  const mp3 = await openai.audio.speech.create({ model: 'tts-1-hd', voice: 'onyx', input: NARRATION, speed: 0.9 })
  const audioPath = path.join(tmpDir, 'narration.mp3')
  fs.writeFileSync(audioPath, Buffer.from(await mp3.arrayBuffer()))
  console.log('  TTS done')

  // 3. Probe duration
  let dur = 45
  try {
    execFileSync(ffmpegPath, ['-i', audioPath, '-f', 'null', '-'], { stdio: ['pipe', 'pipe', 'pipe'] })
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString() : ''
    const m = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/)
    if (m) dur = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3])
  }
  console.log(`  Audio duration: ${dur.toFixed(1)}s`)

  // 4. Build ffmpeg concat file
  const spi = dur / imgPaths.length
  const concatLines = imgPaths.map(p => {
    const fwd = p.replace(/\\/g, '/')
    return `file '${fwd}'\nduration ${spi.toFixed(3)}`
  }).join('\n')
  const lastFwd = imgPaths[imgPaths.length - 1].replace(/\\/g, '/')
  const concatFile = path.join(tmpDir, 'concat.txt')
  fs.writeFileSync(concatFile, concatLines + `\nfile '${lastFwd}'`)

  // 5. Encode video
  console.log('\n[3] Encoding video with ffmpeg...')
  const videoPath = path.join(tmpDir, NEW_FILENAME)
  try {
    execFileSync(ffmpegPath, [
      '-y',
      '-f', 'concat', '-safe', '0', '-i', concatFile,
      '-i', audioPath,
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-shortest', '-movflags', '+faststart',
      videoPath,
    ], { stdio: 'pipe', timeout: 300000 })
  } catch (e) {
    console.error(e.stderr ? e.stderr.toString().slice(-2000) : e.message)
    throw new Error('ffmpeg failed')
  }

  const sz = fs.statSync(videoPath).size
  console.log(`  Video: ${(sz / 1e6).toFixed(2)} MB`)

  // 6. Upload with NEW filename (busts CDN cache)
  console.log('\n[4] Uploading to Supabase storage...')
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(NEW_STORAGE_PATH, fs.readFileSync(videoPath), { contentType: 'video/mp4', upsert: true })
  if (upErr) throw new Error('Upload: ' + upErr.message)

  const vidUrl = publicUrl(NEW_STORAGE_PATH)
  console.log('  URL:', vidUrl)

  // 7. Update DB
  console.log('\n[5] Updating DB records...')

  // bank item 80
  const { error: e1 } = await supabase
    .from('business_bank_items')
    .update({ file_path: NEW_STORAGE_PATH, file_url: vidUrl, file_size: sz, metadata: { duration: Math.round(dur) } })
    .eq('id', 80)
  console.log('  item 80:', e1 ? 'ERROR: ' + e1.message : 'OK')

  // business_profile_pages
  const { data: bpp } = await supabase.from('business_profile_pages').select('media_assets').eq('business_id', FORTITUDE_USER_ID)
  const ma = Object.assign({}, bpp && bpp[0] ? bpp[0].media_assets : {}, { intro_video_url: vidUrl })
  const { error: e2 } = await supabase.from('business_profile_pages').update({ media_assets: ma }).eq('business_id', FORTITUDE_USER_ID)
  console.log('  business_profile_pages:', e2 ? 'ERROR: ' + e2.message : 'OK')

  // profile metadata
  const { data: pm } = await supabase.from('business_bank_items').select('id,metadata').eq('user_id', FORTITUDE_USER_ID).eq('item_type', 'profile').maybeSingle()
  if (pm) {
    const meta = Object.assign({}, pm.metadata, { introVideoUrl: vidUrl })
    const { error: e3 } = await supabase.from('business_bank_items').update({ metadata: meta }).eq('id', pm.id)
    console.log('  profile metadata:', e3 ? 'ERROR: ' + e3.message : 'OK')
  }

  console.log('\nDone! Fortitude Legal intro video (v2):', vidUrl)
  try { fs.rmSync(tmpDir, { recursive: true }) } catch (_) {}
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
