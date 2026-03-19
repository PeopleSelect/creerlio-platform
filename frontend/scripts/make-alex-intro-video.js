/**
 * Generates a professional intro video for Alex Hartley (demo.realestate@creerlio.com)
 * - OpenAI TTS narration
 * - DALL-E images already in storage used as slides
 * - ffmpeg-static composes slideshow + audio → MP4
 * - Uploaded to Supabase Storage + linked to portfolio as introVideoId
 *
 * Run from /frontend:  node scripts/make-alex-intro-video.js
 */

const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const { execSync } = require('child_process')
const ffmpegBin = require('ffmpeg-static')
const fs = require('fs')
const path = require('path')
const os = require('os')

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://empehaulljtwfyzjmvmn.supabase.co'
const SERVICE_ROLE_KEY =
  '' + process.env.SUPABASE_SERVICE_ROLE_KEY + ''
const OPENAI_API_KEY =
  '' + process.env.OPENAI_API_KEY + ''
const DEMO_EMAIL = 'demo.realestate@creerlio.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// ── Intro script (spoken by Alex) ────────────────────────────────────────────

const INTRO_SCRIPT = `
G'day — I'm Alex Hartley, Senior Sales Agent and Licensed Auctioneer with Ray White Eastern Suburbs.

Over the past 12 years, I've had the privilege of helping more than 600 Sydney families and investors buy and sell property across the Eastern Suburbs, Inner West, and Lower North Shore.
With over 1.2 billion dollars in settled transactions and three consecutive years as my office's top performer, I bring a proven track record — and a genuine passion for achieving outstanding results.

My approach is simple: I combine deep local market knowledge with transparent communication and a finely tuned negotiation strategy. Whether it's an off-market deal, a competitive auction campaign, or a first-home purchase, I treat every transaction with the same care and commitment.

I hold a Class 1 Real Estate Licence and an Auctioneer's Licence, and I've called over 300 on-site auctions — achieving an 81% clearance rate in 2024 against a Sydney-wide average of 68%.

If you're looking for a trusted agent who will fight for the best result — whether you're selling, buying, or investing — I'd love to have a conversation. You can connect with me through my profile, or visit alexhartley dot com dot au.

Thanks for watching — I look forward to working with you.
`.trim()

// ── Slide definitions (map to filenames from seed script) ────────────────────

// Duration in seconds each slide stays on screen
const SLIDES = [
  { filename: 'alex-hartley-headshot',    duration: 5,  label: 'Alex Hartley\nSenior Sales Agent & Auctioneer' },
  { filename: 'eastern-suburbs-banner',   duration: 4,  label: 'Ray White Eastern Suburbs\nSydney, NSW' },
  { filename: 'ocean-avenue-double-bay',  duration: 4,  label: '42 Ocean Avenue, Double Bay\nSold $4.275M' },
  { filename: 'bronte-road-apartment',    duration: 4,  label: '7/14 Bronte Road, Bronte\nSold at Auction $1.92M' },
  { filename: 'victoria-street-paddington', duration: 4, label: '23 Victoria Street, Paddington\nSold $3.15M — Off Market' },
  { filename: 'auction-in-action',        duration: 5,  label: '63 Auctions in 2024\n81% Clearance Rate' },
  { filename: 'eastern-suburbs-business-awards', duration: 4, label: 'Community & Industry Leader' },
  { filename: 'alex-hartley-headshot',    duration: 5,  label: 'Connect with Alex\nalexhartley.com.au' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function run(cmd, label) {
  console.log(`  ▶  ${label}`)
  try {
    execSync(cmd, { stdio: 'pipe' })
    console.log(`  ✅  ${label} done`)
  } catch (err) {
    console.error(`  ❌  ${label} failed:`)
    console.error(err.stderr?.toString() || err.message)
    throw err
  }
}

async function downloadStorageFile(storagePath, localPath) {
  // Direct external URL (avatar_url / banner_url stored as full URLs)
  if (storagePath.startsWith('url:')) {
    const url = storagePath.slice(4)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Direct URL download failed: ${res.status} — ${url}`)
    fs.writeFileSync(localPath, Buffer.from(await res.arrayBuffer()))
    return
  }
  // Supabase storage path — try public URL first, then signed URL
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/talent-bank/${storagePath}`
  const res = await fetch(publicUrl)
  if (!res.ok) {
    const { data } = await supabase.storage.from('talent-bank').createSignedUrl(storagePath, 3600)
    if (!data?.signedUrl) throw new Error(`Cannot get URL for ${storagePath}`)
    const res2 = await fetch(data.signedUrl)
    if (!res2.ok) throw new Error(`Download failed: ${res2.status}`)
    fs.writeFileSync(localPath, Buffer.from(await res2.arrayBuffer()))
    return
  }
  fs.writeFileSync(localPath, Buffer.from(await res.arrayBuffer()))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎬  Creating intro video for Alex Hartley...\n')

  // ── Get user ──────────────────────────────────────────────────────────────
  const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 500 })
  const user = userList?.users?.find(u => u.email === DEMO_EMAIL)
  if (!user) { console.error('❌  User not found. Run seed-demo-realestate.js first.'); process.exit(1) }
  const userId = user.id
  console.log(`✅  User: ${userId}`)

  // ── Get uploaded image bank items ─────────────────────────────────────────
  const { data: bankImages } = await supabase
    .from('talent_bank_items')
    .select('id, title, file_path')
    .eq('user_id', userId)
    .eq('item_type', 'image')
    .order('id', { ascending: true })

  if (!bankImages?.length) { console.error('❌  No images found. Run seed-demo-realestate.js first.'); process.exit(1) }
  console.log(`✅  Found ${bankImages.length} image bank items\n`)

  // Map filenames → storage paths
  const pathByFilename = {}
  for (const img of bankImages) {
    if (img.file_path) {
      const base = path.basename(img.file_path)
      const key = base
        .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, '')
        .replace('.jpg', '')
      pathByFilename[key] = img.file_path
    }
  }

  // Also pull avatar_url / banner_url from talent_profiles (stored as full public URLs)
  const { data: profileRow } = await supabase
    .from('talent_profiles')
    .select('avatar_url, banner_url')
    .eq('user_id', userId)
    .single()

  // Store as special 'url:' prefix so downloader uses full URL directly
  if (profileRow?.avatar_url) pathByFilename['alex-hartley-headshot'] = 'url:' + profileRow.avatar_url
  if (profileRow?.banner_url)  pathByFilename['eastern-suburbs-banner']  = 'url:' + profileRow.banner_url

  console.log('  Image keys:', Object.keys(pathByFilename).join(', '))

  // ── Temp directory ─────────────────────────────────────────────────────────
  const tmpDir = path.join(os.tmpdir(), `alex-intro-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  console.log(`📁  Temp dir: ${tmpDir}\n`)

  // ── Step 1: Download images ───────────────────────────────────────────────
  console.log('📥  Downloading images from Supabase storage...')
  const localSlides = []

  for (let i = 0; i < SLIDES.length; i++) {
    const slide = SLIDES[i]
    const storagePath = pathByFilename[slide.filename]
    if (!storagePath) {
      console.warn(`  ⚠️  Image not found for key "${slide.filename}" — skipping slide`)
      continue
    }
    const localPath = path.join(tmpDir, `slide-${String(i).padStart(2, '0')}-raw.jpg`)
    await downloadStorageFile(storagePath, localPath)
    console.log(`  ✅  Downloaded: ${slide.filename}`)
    localSlides.push({ ...slide, rawPath: localPath, index: i })
  }
  console.log()

  // ── Step 2: Resize & overlay text on each slide ───────────────────────────
  console.log('🖼️   Processing slides with text overlays...')
  const processedSlides = []

  // ffmpeg drawtext requires forward slashes and escaped colons on Windows
  const ff = ffmpegBin.replace(/\\/g, '/')

  for (const slide of localSlides) {
    const outPath = path.join(tmpDir, `slide-${String(slide.index).padStart(2, '0')}.mp4`)
    const lines = slide.label.split('\n')
    const line1 = lines[0].replace(/'/g, "\\'").replace(/:/g, '\\:')
    const line2 = (lines[1] || '').replace(/'/g, "\\'").replace(/:/g, '\\:')

    // Build drawtext filters — main title line + subtitle line
    const drawLine1 = line1
      ? `drawtext=text='${line1}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=h-200:box=1:boxcolor=black@0.55:boxborderw=16`
      : ''
    const drawLine2 = line2
      ? `drawtext=text='${line2}':fontsize=34:fontcolor=white@0.9:x=(w-text_w)/2:y=h-130:box=1:boxcolor=black@0.45:boxborderw=12`
      : ''

    const filters = [
      `scale=1920:1080:force_original_aspect_ratio=decrease`,
      `pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black`,
      `zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${slide.duration * 25}:s=1920x1080:fps=25`,
      drawLine1,
      drawLine2,
    ].filter(Boolean).join(',')

    const rawWin = slide.rawPath.replace(/\\/g, '/')
    const outWin = outPath.replace(/\\/g, '/')

    const cmd = `"${ff}" -y -loop 1 -i "${rawWin}" -vf "${filters}" -t ${slide.duration} -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 "${outWin}"`
    run(cmd, `Slide ${slide.index + 1}: ${lines[0]}`)
    processedSlides.push({ ...slide, outPath })
  }
  console.log()

  // ── Step 3: Generate TTS narration ───────────────────────────────────────
  console.log('🎤  Generating OpenAI TTS narration...')
  const audioPath = path.join(tmpDir, 'narration.mp3')

  const ttsResponse = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'onyx',          // Deep, professional male voice
    input: INTRO_SCRIPT,
    speed: 0.95,
  })
  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
  fs.writeFileSync(audioPath, audioBuffer)
  console.log(`  ✅  TTS audio written: ${audioPath} (${(audioBuffer.length / 1024).toFixed(0)} KB)\n`)

  // ── Step 4: Concatenate slide videos ────────────────────────────────────
  console.log('🎞️   Concatenating slides...')
  const concatList = path.join(tmpDir, 'concat.txt')
  const concatContent = processedSlides.map(s => `file '${s.outPath.replace(/\\/g, '/')}'`).join('\n')
  fs.writeFileSync(concatList, concatContent)

  const silentVideoPath = path.join(tmpDir, 'silent-video.mp4')
  run(
    `"${ff}" -y -f concat -safe 0 -i "${concatList.replace(/\\/g, '/')}" -c copy "${silentVideoPath.replace(/\\/g, '/')}"`,
    'Concatenating slides'
  )
  console.log()

  // ── Step 5: Mix audio + video (with fade in/out) ──────────────────────────
  console.log('🎚️   Mixing narration with video...')
  const finalPath = path.join(tmpDir, 'alex-hartley-intro.mp4')
  const totalDuration = processedSlides.reduce((sum, s) => sum + s.duration, 0)

  // Audio: pad if video is longer, trim if audio is longer; fade out last 1.5s
  const audioFilter = `afade=t=in:ss=0:d=0.8,afade=t=out:st=${Math.max(totalDuration - 1.5, totalDuration * 0.9)}:d=1.5`

  run(
    `"${ff}" -y -i "${silentVideoPath.replace(/\\/g, '/')}" -i "${audioPath.replace(/\\/g, '/')}" -filter_complex "[1:a]${audioFilter}[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "${finalPath.replace(/\\/g, '/')}"`,
    'Mixing audio + video'
  )
  console.log()

  // ── Step 6: Upload video to Supabase storage ──────────────────────────────
  console.log('☁️   Uploading video to Supabase storage...')
  const videoBuffer = fs.readFileSync(finalPath)
  const storagePath = `${userId}/video/alex-hartley-intro.mp4`

  // Remove existing
  await supabase.storage.from('talent-bank').remove([storagePath])

  const { error: uploadErr } = await supabase.storage
    .from('talent-bank')
    .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true })

  if (uploadErr) { console.error('❌  Upload failed:', uploadErr.message); process.exit(1) }
  console.log(`  ✅  Uploaded: ${storagePath}`)

  const fileSizeMB = (videoBuffer.length / 1024 / 1024).toFixed(1)
  console.log(`  ✅  File size: ${fileSizeMB} MB\n`)

  // ── Step 7: Create bank item for the video ────────────────────────────────
  console.log('💾  Creating talent_bank_items record...')

  // Remove any existing intro video items
  await supabase.from('talent_bank_items').delete().eq('user_id', userId).eq('item_type', 'video')

  const { data: videoItem, error: videoErr } = await supabase
    .from('talent_bank_items')
    .insert({
      user_id: userId,
      item_type: 'video',
      title: 'Alex Hartley — Professional Introduction',
      description: 'Professional introduction video: career overview, notable sales, and expertise summary.',
      file_path: storagePath,
      file_type: 'video/mp4',
      file_size: videoBuffer.length,
      metadata: { duration_seconds: totalDuration, voice: 'onyx', resolution: '1920x1080' },
    })
    .select('id')
    .single()

  if (videoErr) { console.error('❌  Bank item error:', videoErr.message); process.exit(1) }
  const videoItemId = videoItem.id
  console.log(`  ✅  Video bank item created (id: ${videoItemId})\n`)

  // ── Step 8: Update portfolio to set introVideoId ──────────────────────────
  console.log('📋  Linking video to portfolio...')

  const { data: portfolioItem } = await supabase
    .from('talent_bank_items')
    .select('id, metadata')
    .eq('user_id', userId)
    .eq('item_type', 'portfolio')
    .order('id', { ascending: false })
    .limit(1)
    .single()

  if (!portfolioItem) { console.error('❌  Portfolio item not found.'); process.exit(1) }

  const updatedMeta = { ...portfolioItem.metadata, introVideoId: videoItemId }
  const { error: updateErr } = await supabase
    .from('talent_bank_items')
    .update({ metadata: updatedMeta })
    .eq('id', portfolioItem.id)

  if (updateErr) { console.error('❌  Portfolio update failed:', updateErr.message); process.exit(1) }
  console.log(`  ✅  Portfolio introVideoId set to ${videoItemId}\n`)

  // ── Cleanup ───────────────────────────────────────────────────────────────
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}

  console.log('🎉  Intro video complete!\n')
  console.log(`  Duration:     ~${totalDuration} seconds`)
  console.log(`  Resolution:   1920 × 1080 (1080p)`)
  console.log(`  Audio:        OpenAI TTS "onyx" voice`)
  console.log(`  Slides:       ${processedSlides.length} property & lifestyle shots`)
  console.log(`  Storage path: ${storagePath}`)
  console.log(`  Bank item id: ${videoItemId}`)
  console.log('\n  Sign in at /login/talent → Portfolio to preview.')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
