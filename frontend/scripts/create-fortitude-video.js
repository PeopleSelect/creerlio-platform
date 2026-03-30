/**
 * Creates a Fortitude Legal intro video:
 *  1. Downloads the firm's DALL-E images from Supabase
 *  2. Generates TTS narration via OpenAI
 *  3. Assembles a slideshow MP4 using ffmpeg-static
 *  4. Uploads to Supabase business-bank bucket
 *  5. Updates business_bank_items + business_profile_pages records
 *
 * Run from /frontend:  node scripts/create-fortitude-video.js
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

const ffmpegPath = require('ffmpeg-static')

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('Missing env vars. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })

const FORTITUDE_USER_ID = '3d44f9d3-8ee2-4834-a048-ef31607f5d8d'
const BUCKET            = 'business-bank'
const VIDEO_FILENAME    = 'fortitude-intro-video.mp4'
const VIDEO_STORAGE_PATH = `${FORTITUDE_USER_ID}/bank/${VIDEO_FILENAME}`

// ── TTS narration script ──────────────────────────────────────────────────────

const NARRATION = `Welcome to Fortitude Legal.

We are Perth's leading boutique law firm — built on a foundation of integrity, expertise, and an unwavering commitment to our clients.

At Fortitude Legal, we specialise in corporate and commercial law, property transactions, and employment matters. Whether you're a growing business navigating complex agreements, an individual protecting your property rights, or an organisation managing workplace relations — our team delivers clear strategy and exceptional outcomes.

Our solicitors bring decades of combined experience and a genuine passion for the law. We believe legal excellence goes hand in hand with human understanding.

We're always looking for talented legal professionals who share our values. If you're ready to make a real impact at a firm that invests in your growth, we want to hear from you.

Fortitude Legal — precision, principle, and purpose.`

// ── Helpers ───────────────────────────────────────────────────────────────────

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    const proto = url.startsWith('https') ? https : http
    proto.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', reject)
  })
}

function publicUrl(storagePath) {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encoded}`
}

async function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortitude-video-'))
  console.log('Temp dir:', tmpDir)

  // ── 1. Fetch Fortitude Legal image bank items ───────────────────────────────
  console.log('\n[1/6] Fetching image bank items from Supabase...')

  const { data: items, error: itemsErr } = await supabase
    .from('business_bank_items')
    .select('id, item_type, title, file_path, file_url')
    .eq('user_id', FORTITUDE_USER_ID)
    .in('item_type', ['image', 'logo'])
    .order('id', { ascending: true })

  if (itemsErr) throw new Error('Fetching items: ' + itemsErr.message)
  console.log(`Found ${items.length} image/logo items`)

  // Build public URLs for images
  const imageUrls = items.map(item => {
    if (item.file_url) return item.file_url
    if (item.file_path) return publicUrl(item.file_path)
    return null
  }).filter(Boolean)

  console.log('Image URLs:', imageUrls.length)

  // Download images to temp dir
  const imagePaths = []
  for (let i = 0; i < imageUrls.length; i++) {
    const imgPath = path.join(tmpDir, `frame_${String(i).padStart(3, '0')}.jpg`)
    console.log(`  Downloading image ${i + 1}/${imageUrls.length}...`)
    try {
      await downloadFile(imageUrls[i], imgPath)
      imagePaths.push(imgPath)
    } catch (e) {
      console.warn(`  Warning: could not download image ${i + 1}: ${e.message}`)
    }
  }

  if (imagePaths.length === 0) {
    throw new Error('No images downloaded — cannot create video')
  }
  console.log(`Downloaded ${imagePaths.length} images`)

  // ── 2. Generate TTS audio ───────────────────────────────────────────────────
  console.log('\n[2/6] Generating TTS narration with OpenAI...')
  const audioPath = path.join(tmpDir, 'narration.mp3')

  const mp3Response = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'onyx',          // deep, authoritative — good for law firm
    input: NARRATION,
    speed: 0.9,             // slightly slower for gravitas
  })

  const audioBuffer = Buffer.from(await mp3Response.arrayBuffer())
  fs.writeFileSync(audioPath, audioBuffer)
  console.log(`TTS audio saved: ${audioPath} (${audioBuffer.length} bytes)`)

  // ── 3. Get audio duration ────────────────────────────────────────────────────
  console.log('\n[3/6] Probing audio duration...')
  let audioDuration = 45  // fallback
  try {
    const probeOut = execFileSync(ffmpegPath, [
      '-i', audioPath,
      '-f', 'null', '-'
    ], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
    // ffmpeg outputs to stderr
    const match = probeOut.match(/Duration:\s*(\d+):(\d+):([\d.]+)/)
    if (match) {
      audioDuration = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
    }
  } catch (e) {
    // ffmpeg exits non-zero when -f null and piping, parse stderr from error
    const stderr = e.stderr ? e.stderr.toString() : ''
    const match = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/)
    if (match) {
      audioDuration = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
    }
  }
  console.log(`Audio duration: ${audioDuration.toFixed(2)}s`)

  // ── 4. Build slideshow video ─────────────────────────────────────────────────
  console.log('\n[4/6] Building slideshow video with ffmpeg...')

  const videoPath = path.join(tmpDir, VIDEO_FILENAME)

  // Calculate how long each image should show
  // Use all images, distribute evenly across audio duration
  // Add a small crossfade or just cut for simplicity
  const numImages   = imagePaths.length
  const secsPerImg  = audioDuration / numImages

  // Write a concat file with durations for each image
  const concatFile = path.join(tmpDir, 'concat.txt')
  const concatLines = imagePaths.map(p => `file '${p.replace(/\\/g, '/')}'\nduration ${secsPerImg.toFixed(3)}`).join('\n')
  // Add last image once more (ffmpeg concat demuxer needs final entry without duration)
  const lastImg = imagePaths[imagePaths.length - 1]
  fs.writeFileSync(concatFile, concatLines + `\nfile '${lastImg.replace(/\\/g, '/')}'`)

  // ffmpeg command:
  // - concat image slideshow at 1 fps (scaled to 1280x720)
  // - add mp3 audio
  // - encode h264 + aac
  // - stop at audio end
  const ffmpegArgs = [
    '-y',
    '-f',      'concat',
    '-safe',   '0',
    '-i',      concatFile,
    '-i',      audioPath,
    '-vf',     'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p',
    '-c:v',    'libx264',
    '-preset', 'medium',
    '-crf',    '23',
    '-c:a',    'aac',
    '-b:a',    '128k',
    '-shortest',
    '-movflags', '+faststart',
    videoPath,
  ]

  console.log('Running ffmpeg...')
  try {
    execFileSync(ffmpegPath, ffmpegArgs, { stdio: 'pipe', timeout: 300_000 })
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString() : e.message
    console.error('ffmpeg stderr (last 2000 chars):', stderr.slice(-2000))
    throw new Error('ffmpeg failed')
  }

  const videoSize = fs.statSync(videoPath).size
  console.log(`Video created: ${videoPath} (${(videoSize / 1_000_000).toFixed(2)} MB)`)

  // ── 5. Upload to Supabase ────────────────────────────────────────────────────
  console.log('\n[5/6] Uploading video to Supabase storage...')

  const videoBuffer = fs.readFileSync(videoPath)

  // Remove old video at same path if it exists
  await supabase.storage.from(BUCKET).remove([VIDEO_STORAGE_PATH])

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(VIDEO_STORAGE_PATH, videoBuffer, {
      contentType: 'video/mp4',
      upsert: true,
    })

  if (uploadErr) throw new Error('Upload failed: ' + uploadErr.message)

  const videoPublicUrl = publicUrl(VIDEO_STORAGE_PATH)
  console.log('Video uploaded:', videoPublicUrl)

  // ── 6. Update DB records ─────────────────────────────────────────────────────
  console.log('\n[6/6] Updating database records...')

  // 6a. Update the business_bank_items intro video row
  const { data: videoItem, error: findErr } = await supabase
    .from('business_bank_items')
    .select('id')
    .eq('user_id', FORTITUDE_USER_ID)
    .eq('item_type', 'video')
    .single()

  if (findErr) {
    console.warn('Could not find existing video item:', findErr.message)
  } else {
    const { error: updateErr } = await supabase
      .from('business_bank_items')
      .update({
        title:     'Fortitude Legal — Firm Introduction Video',
        file_path: VIDEO_STORAGE_PATH,
        file_url:  videoPublicUrl,
        file_type: 'video/mp4',
        file_size: videoSize,
        metadata: {
          duration:    Math.round(audioDuration),
          description: 'Official Fortitude Legal introduction video — TTS narration over law firm imagery.',
        },
      })
      .eq('id', videoItem.id)

    if (updateErr) console.warn('Update bank item error:', updateErr.message)
    else console.log('Updated business_bank_items row id:', videoItem.id)
  }

  // 6b. Update business_profile_pages media_assets
  const { data: bppRow, error: bppErr } = await supabase
    .from('business_profile_pages')
    .select('id, media_assets')
    .eq('user_id', FORTITUDE_USER_ID)
    .single()

  if (bppErr) {
    console.warn('Could not find business_profile_pages:', bppErr.message)
  } else {
    const existingAssets = bppRow.media_assets || {}
    const updatedAssets  = { ...existingAssets, intro_video_url: videoPublicUrl }

    const { error: bppUpdateErr } = await supabase
      .from('business_profile_pages')
      .update({ media_assets: updatedAssets })
      .eq('id', bppRow.id)

    if (bppUpdateErr) console.warn('Update business_profile_pages error:', bppUpdateErr.message)
    else console.log('Updated business_profile_pages id:', bppRow.id, '→ intro_video_url set')
  }

  // 6c. Update the profile metadata bank item (introVideoId / introVideoUrl)
  const { data: metaItem, error: metaFindErr } = await supabase
    .from('business_bank_items')
    .select('id, metadata')
    .eq('user_id', FORTITUDE_USER_ID)
    .eq('item_type', 'profile')
    .single()

  if (metaFindErr) {
    console.warn('Could not find profile metadata item:', metaFindErr.message)
  } else {
    const meta = metaItem.metadata || {}
    if (meta.introVideoId) {
      // Already has an introVideoId — also patch introVideoUrl
      meta.introVideoUrl = videoPublicUrl
    } else {
      // Set it from the video item id we just updated
      if (videoItem) meta.introVideoId = videoItem.id
      meta.introVideoUrl = videoPublicUrl
    }

    const { error: metaUpdateErr } = await supabase
      .from('business_bank_items')
      .update({ metadata: meta })
      .eq('id', metaItem.id)

    if (metaUpdateErr) console.warn('Update profile metadata error:', metaUpdateErr.message)
    else console.log('Updated profile metadata item id:', metaItem.id, '→ introVideoUrl set')
  }

  // ── Done ──────────────────────────────────────────────────────────────────────
  console.log('\n✅  Fortitude Legal intro video created and deployed!')
  console.log('    Public URL:', videoPublicUrl)
  console.log('    Duration:  ', audioDuration.toFixed(1) + 's')
  console.log('    Size:      ', (videoSize / 1_000_000).toFixed(2) + ' MB')

  // Cleanup temp dir
  try { fs.rmSync(tmpDir, { recursive: true }) } catch (_) {}
}

run().catch(err => {
  console.error('\n❌  Error:', err.message || err)
  process.exit(1)
})
