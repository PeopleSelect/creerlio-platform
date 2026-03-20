/**
 * Generates a professional intro video for Jordan Riley (demo.talent@creerlio.com)
 * - OpenAI TTS narration (nova voice — warm professional female)
 * - DALL-E images from storage + Unsplash avatar/banner used as slides
 * - ffmpeg-static composes slideshow + audio → MP4
 * - Uploaded to Supabase Storage + linked to portfolio as introVideoId
 *
 * Run from /frontend:  node scripts/make-jordan-intro-video.js
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const { execSync } = require('child_process')
const ffmpegBin = require('ffmpeg-static')
const fs = require('fs')
const path = require('path')
const os = require('os')

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://empehaulljtwfyzjmvmn.supabase.co'
const SERVICE_ROLE_KEY = '' + process.env.SUPABASE_SERVICE_ROLE_KEY + ''
const OPENAI_API_KEY   = '' + process.env.OPENAI_API_KEY + ''
const DEMO_EMAIL       = 'demo.talent@creerlio.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// ── Intro script (spoken by Jordan) ──────────────────────────────────────────

const INTRO_SCRIPT = `
Hi, I'm Jordan Riley — a Senior Event and Hospitality Manager with over eight years of experience creating exceptional guest experiences across luxury hotels, corporate events, and large-scale festival productions.

Throughout my career I've had the privilege of leading end-to-end delivery for more than 80 events per year — from intimate black-tie galas to multi-day conferences for clients including Deloitte, Atlassian, and the New South Wales Government.

I thrive on turning ambitious visions into flawlessly executed realities. Whether I'm managing a 600-delegate conference at the International Convention Centre, designing a bespoke gala dinner series, or coaching a front-of-house team to deliver world-class service, I bring calm under pressure, sharp organisation, and a genuine passion for people-first hospitality.

My approach is grounded in strong supplier relationships, tight budget discipline, and a commitment to continuous improvement. At my current role with Ovation Group Events, I reduced average event cost overruns from 18 percent to just 4 percent — while consistently achieving Net Promoter Scores above 90.

I hold a Bachelor of Event Management from William Blue College and multiple industry accreditations, and I'm currently open to senior roles in events management, hotel operations, or guest experience with innovative hospitality brands in Sydney or nationally.

If you're looking for a hospitality leader who delivers results with warmth and precision, I'd love to connect.
`.trim()

// ── Slide definitions ─────────────────────────────────────────────────────────

const SLIDES = [
  { filename: 'jordan-headshot',            duration: 5, label: 'Jordan Riley\nSenior Event & Hospitality Manager' },
  { filename: 'events-banner',              duration: 4, label: '8+ Years in Events & Hospitality\nSydney, NSW' },
  { filename: 'gala-dinner-setup',          duration: 4, label: 'Gala Dinner Series — Ovation Group\n$2.1M Revenue • Featured in Spice Magazine' },
  { filename: 'fintech-summit-2023',        duration: 5, label: 'Sydney Fintech Summit 2023\n600 Delegates • Delivered Under Budget • 4.8/5 Rating' },
  { filename: 'community-leadership-forum', duration: 4, label: 'Community & Industry Leadership' },
  { filename: 'community-food-drive',       duration: 4, label: 'Passionate About People\nVolunteer & Community Work' },
  { filename: 'event-management-cert',      duration: 4, label: 'Bachelor of Event Management\nWilliam Blue College — Distinction' },
  { filename: 'jordan-headshot',            duration: 5, label: 'Open to New Opportunities\nSydney • National Travel Considered' },
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
  if (storagePath.startsWith('url:')) {
    const url = storagePath.slice(4)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Direct URL download failed: ${res.status} — ${url}`)
    fs.writeFileSync(localPath, Buffer.from(await res.arrayBuffer()))
    return
  }
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
  console.log('🎬  Creating intro video for Jordan Riley...\n')

  // ── Get user ──────────────────────────────────────────────────────────────
  const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 500 })
  const user = userList?.users?.find(u => u.email === DEMO_EMAIL)
  if (!user) { console.error('❌  User not found. Run seed-demo-talent.js first.'); process.exit(1) }
  const userId = user.id
  console.log(`✅  User: ${userId}`)

  // ── Get uploaded image bank items ─────────────────────────────────────────
  const { data: bankImages } = await supabase
    .from('talent_bank_items')
    .select('id, title, file_path')
    .eq('user_id', userId)
    .eq('item_type', 'image')
    .order('id', { ascending: true })

  if (!bankImages?.length) { console.error('❌  No images found. Run seed-demo-portfolio.js first.'); process.exit(1) }
  console.log(`✅  Found ${bankImages.length} image bank items`)

  // Map filenames → storage paths (strip UUID prefix)
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

  // Pull avatar_url / banner_url from talent_profiles (Unsplash external URLs)
  const { data: profileRow } = await supabase
    .from('talent_profiles')
    .select('avatar_url, banner_url')
    .eq('user_id', userId)
    .single()

  if (profileRow?.avatar_url) pathByFilename['jordan-headshot'] = 'url:' + profileRow.avatar_url
  if (profileRow?.banner_url) pathByFilename['events-banner']   = 'url:' + profileRow.banner_url

  console.log('  Image keys:', Object.keys(pathByFilename).join(', '))

  // ── Temp directory ─────────────────────────────────────────────────────────
  const tmpDir = path.join(os.tmpdir(), `jordan-intro-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  console.log(`📁  Temp dir: ${tmpDir}\n`)

  // ── Step 1: Download images ───────────────────────────────────────────────
  console.log('📥  Downloading images from storage...')
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
  const ff = ffmpegBin.replace(/\\/g, '/')

  for (const slide of localSlides) {
    const outPath = path.join(tmpDir, `slide-${String(slide.index).padStart(2, '0')}.mp4`)
    const lines = slide.label.split('\n')
    const line1 = lines[0].replace(/'/g, "\\'").replace(/:/g, '\\:')
    const line2 = (lines[1] || '').replace(/'/g, "\\'").replace(/:/g, '\\:')

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
  console.log('🎤  Generating OpenAI TTS narration (nova — warm professional female)...')
  const audioPath = path.join(tmpDir, 'narration.mp3')

  const ttsResponse = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'nova',      // Warm, clear professional female voice
    input: INTRO_SCRIPT,
    speed: 0.95,
  })
  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
  fs.writeFileSync(audioPath, audioBuffer)
  console.log(`  ✅  TTS audio written (${(audioBuffer.length / 1024).toFixed(0)} KB)\n`)

  // ── Step 4: Concatenate slide videos ─────────────────────────────────────
  console.log('🎞️   Concatenating slides...')
  const concatList = path.join(tmpDir, 'concat.txt')
  fs.writeFileSync(concatList, processedSlides.map(s => `file '${s.outPath.replace(/\\/g, '/')}'`).join('\n'))

  const silentVideoPath = path.join(tmpDir, 'silent-video.mp4')
  run(
    `"${ff}" -y -f concat -safe 0 -i "${concatList.replace(/\\/g, '/')}" -c copy "${silentVideoPath.replace(/\\/g, '/')}"`,
    'Concatenating slides'
  )
  console.log()

  // ── Step 5: Mix audio + video ─────────────────────────────────────────────
  console.log('🎚️   Mixing narration with video...')
  const finalPath = path.join(tmpDir, 'jordan-riley-intro.mp4')
  const totalDuration = processedSlides.reduce((sum, s) => sum + s.duration, 0)
  const audioFilter = `afade=t=in:ss=0:d=0.8,afade=t=out:st=${Math.max(totalDuration - 1.5, totalDuration * 0.9)}:d=1.5`

  run(
    `"${ff}" -y -i "${silentVideoPath.replace(/\\/g, '/')}" -i "${audioPath.replace(/\\/g, '/')}" -filter_complex "[1:a]${audioFilter}[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "${finalPath.replace(/\\/g, '/')}"`,
    'Mixing audio + video'
  )
  console.log()

  // ── Step 6: Upload to Supabase storage ────────────────────────────────────
  console.log('☁️   Uploading to Supabase storage...')
  const videoBuffer = fs.readFileSync(finalPath)
  const storagePath = `${userId}/video/jordan-riley-intro.mp4`

  await supabase.storage.from('talent-bank').remove([storagePath])
  const { error: uploadErr } = await supabase.storage
    .from('talent-bank')
    .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true })

  if (uploadErr) { console.error('❌  Upload failed:', uploadErr.message); process.exit(1) }
  console.log(`  ✅  Uploaded: ${storagePath} (${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB)\n`)

  // ── Step 7: Create bank item ──────────────────────────────────────────────
  console.log('💾  Creating talent_bank_items record...')
  await supabase.from('talent_bank_items').delete().eq('user_id', userId).eq('item_type', 'video')

  const { data: videoItem, error: videoErr } = await supabase
    .from('talent_bank_items')
    .insert({
      user_id: userId,
      item_type: 'video',
      title: 'Jordan Riley — Professional Introduction',
      description: 'Professional intro video: career highlights, event highlights, and expertise in hospitality & events management.',
      file_path: storagePath,
      file_type: 'video/mp4',
      file_size: videoBuffer.length,
      metadata: { duration_seconds: totalDuration, voice: 'nova', resolution: '1920x1080' },
    })
    .select('id')
    .single()

  if (videoErr) { console.error('❌  Bank item error:', videoErr.message); process.exit(1) }
  const videoItemId = videoItem.id
  console.log(`  ✅  Video bank item created (id: ${videoItemId})\n`)

  // ── Step 8: Link to portfolio ─────────────────────────────────────────────
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

  const { error: updateErr } = await supabase
    .from('talent_bank_items')
    .update({ metadata: { ...portfolioItem.metadata, introVideoId: videoItemId } })
    .eq('id', portfolioItem.id)

  if (updateErr) { console.error('❌  Portfolio update failed:', updateErr.message); process.exit(1) }
  console.log(`  ✅  Portfolio introVideoId set to ${videoItemId}\n`)

  // ── Cleanup ───────────────────────────────────────────────────────────────
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}

  console.log('🎉  Intro video complete!\n')
  console.log(`  Duration:     ~${totalDuration} seconds`)
  console.log(`  Resolution:   1920 × 1080 (1080p)`)
  console.log(`  Audio:        OpenAI TTS "nova" voice`)
  console.log(`  Slides:       ${processedSlides.length} event & lifestyle shots`)
  console.log(`  Storage path: ${storagePath}`)
  console.log(`  Bank item id: ${videoItemId}`)
  console.log('\n  Sign in at /login/talent → Portfolio to preview.')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
