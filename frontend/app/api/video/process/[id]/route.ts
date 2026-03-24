/**
 * POST /api/video/process/[id]
 * Streams SSE progress while:
 *   1. Generating each scene via Runway text-to-video
 *   2. Generating voice-over via ElevenLabs
 *   3. Stitching clips + audio via FFmpeg
 *   4. Uploading final MP4 + thumbnail to Supabase Storage
 *   5. Updating video_projects status → completed
 */
import { NextRequest } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import https from 'https'
import http from 'http'
import { submitRunwayTask, pollRunwayTask, toRunwayRatio } from '../../_lib/runway'
import { textToSpeech } from '../../_lib/elevenlabs'
import { stitchVideo, extractThumbnail } from '../../_lib/stitcher'
import type { ProcessProgressEvent } from '../../_lib/types'

export const runtime = 'nodejs'
export const maxDuration = 300

const BUCKET = 'video-projects'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

function sse(event: ProcessProgressEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

/** Download a URL to a local file */
async function downloadToFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(destPath)

    proto.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        fs.unlinkSync(destPath)
        return downloadToFile(res.headers.location, destPath).then(resolve).catch(reject)
      }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
    }).on('error', (err) => {
      file.close()
      try { fs.unlinkSync(destPath) } catch {}
      reject(err)
    })
  })
}

/** Upload a local file to Supabase Storage and return its public URL */
async function uploadToStorage(
  supabase: SupabaseClient,
  localPath: string,
  storagePath: string,
  contentType: string
): Promise<string> {
  const buffer = fs.readFileSync(localPath)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = (req.headers.get('authorization') ?? '').replace(/^bearer /i, '').trim()
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = adminClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return new Response('Unauthorized', { status: 401 })

  // ── Load project ──────────────────────────────────────────────────────────
  const { data: project } = await supabase
    .from('video_projects')
    .select('*, scenes:video_scenes(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) return new Response('Not found', { status: 404 })
  if (project.status === 'processing') {
    return new Response('Already processing', { status: 409 })
  }

  const scenes = (project.scenes ?? []).sort((a: any, b: any) => a.scene_order - b.scene_order)

  // Mark project as processing
  await supabase.from('video_projects').update({ status: 'processing' }).eq('id', params.id)

  // ── SSE stream ────────────────────────────────────────────────────────────
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (evt: ProcessProgressEvent) => {
        controller.enqueue(encoder.encode(sse(evt)))
      }

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `video-${params.id}-`))
      const scenePaths: string[] = []

      try {
        const ratio = toRunwayRatio(project.aspect_ratio ?? '16:9')

        // ── 1. Generate each scene via Runway ───────────────────────────────
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i]
          send({
            type: 'progress',
            message: `Generating scene ${i + 1}/${scenes.length}: ${scene.title ?? ''}`,
            scene_index: i,
            scene_count: scenes.length,
            progress_pct: Math.round((i / scenes.length) * 60),
          })

          await supabase.from('video_scenes')
            .update({ status: 'generating', attempts: (scene.attempts ?? 0) + 1 })
            .eq('id', scene.id)

          let runwayTaskId: string
          try {
            runwayTaskId = await submitRunwayTask(scene.prompt, {
              duration: scene.duration_secs >= 8 ? 10 : 5,
              ratio,
            })

            await supabase.from('video_scenes').update({ runway_task_id: runwayTaskId }).eq('id', scene.id)
          } catch (err: any) {
            await supabase.from('video_scenes')
              .update({ status: 'failed', error_message: err.message })
              .eq('id', scene.id)
            throw new Error(`Scene ${i + 1} Runway submit failed: ${err.message}`)
          }

          // Poll Runway
          const result = await pollRunwayTask(runwayTaskId, { timeoutMs: 4 * 60 * 1000 })

          if (result.status !== 'SUCCEEDED' || !result.output?.[0]) {
            const errMsg = result.error ?? 'No video output'
            await supabase.from('video_scenes')
              .update({ status: 'failed', error_message: errMsg })
              .eq('id', scene.id)
            throw new Error(`Scene ${i + 1} Runway failed: ${errMsg}`)
          }

          const runwayVideoUrl = result.output[0]

          // Download scene clip
          const sceneLocalPath = path.join(tmpDir, `scene_${i}.mp4`)
          await downloadToFile(runwayVideoUrl, sceneLocalPath)
          scenePaths.push(sceneLocalPath)

          // Upload to Storage
          const sceneStoragePath = `${user.id}/${params.id}/scenes/scene_${i}.mp4`
          const scenePublicUrl = await uploadToStorage(supabase, sceneLocalPath, sceneStoragePath, 'video/mp4')

          await supabase.from('video_scenes').update({
            status: 'completed',
            video_url: runwayVideoUrl,
            stored_url: scenePublicUrl,
          }).eq('id', scene.id)

          // Track asset
          await supabase.from('video_assets').insert({
            project_id: params.id,
            asset_type: 'scene_video',
            file_path: sceneStoragePath,
            public_url: scenePublicUrl,
            mime_type: 'video/mp4',
            size_bytes: fs.statSync(sceneLocalPath).size,
          })

          send({
            type: 'scene_complete',
            message: `Scene ${i + 1} complete`,
            scene_index: i,
            scene_count: scenes.length,
            progress_pct: Math.round(((i + 1) / scenes.length) * 60),
          })
        }

        // ── 2. Generate voice-over via ElevenLabs ───────────────────────────
        let audioPath: string | undefined

        const narrationText = scenes.map((s: any) => s.narration).filter(Boolean).join(' ')

        if (narrationText && process.env.ELEVENLABS_API_KEY) {
          send({ type: 'progress', message: 'Generating voice-over…', progress_pct: 65 })

          try {
            audioPath = path.join(tmpDir, 'narration.mp3')
            await textToSpeech(narrationText, audioPath)

            const audioStoragePath = `${user.id}/${params.id}/narration.mp3`
            const audioPublicUrl = await uploadToStorage(supabase, audioPath, audioStoragePath, 'audio/mpeg')

            await supabase.from('video_assets').insert({
              project_id: params.id,
              asset_type: 'voice_track',
              file_path: audioStoragePath,
              public_url: audioPublicUrl,
              mime_type: 'audio/mpeg',
              size_bytes: fs.statSync(audioPath).size,
            })

            send({ type: 'voice_complete', message: 'Voice-over generated', progress_pct: 70 })
          } catch (err: any) {
            // Voice failure is non-fatal — proceed without audio
            send({ type: 'progress', message: `Voice-over skipped: ${err.message}`, progress_pct: 70 })
            audioPath = undefined
          }
        }

        // ── 3. Stitch via FFmpeg ────────────────────────────────────────────
        send({ type: 'progress', message: 'Stitching final video…', progress_pct: 75 })

        const finalLocalPath = path.join(tmpDir, 'final.mp4')
        stitchVideo({
          scenePaths,
          audioPath,
          outputPath: finalLocalPath,
          aspectRatio: project.aspect_ratio ?? '16:9',
        })

        send({ type: 'stitch_complete', message: 'Stitch complete', progress_pct: 85 })

        // ── 4. Extract thumbnail ────────────────────────────────────────────
        let thumbnailUrl: string | undefined
        try {
          const thumbLocalPath = path.join(tmpDir, 'thumbnail.jpg')
          extractThumbnail(finalLocalPath, thumbLocalPath)
          const thumbStoragePath = `${user.id}/${params.id}/thumbnail.jpg`
          thumbnailUrl = await uploadToStorage(supabase, thumbLocalPath, thumbStoragePath, 'image/jpeg')

          await supabase.from('video_assets').insert({
            project_id: params.id,
            asset_type: 'thumbnail',
            file_path: thumbStoragePath,
            public_url: thumbnailUrl,
            mime_type: 'image/jpeg',
            size_bytes: fs.statSync(thumbLocalPath).size,
          })
        } catch {
          // Thumbnail is non-fatal
        }

        // ── 5. Upload final MP4 ─────────────────────────────────────────────
        send({ type: 'progress', message: 'Uploading final video…', progress_pct: 90 })

        const finalStoragePath = `${user.id}/${params.id}/final.mp4`
        const finalPublicUrl = await uploadToStorage(supabase, finalLocalPath, finalStoragePath, 'video/mp4')

        await supabase.from('video_assets').insert({
          project_id: params.id,
          asset_type: 'final_video',
          file_path: finalStoragePath,
          public_url: finalPublicUrl,
          mime_type: 'video/mp4',
          size_bytes: fs.statSync(finalLocalPath).size,
        })

        // ── 6. Update project status ────────────────────────────────────────
        await supabase.from('video_projects').update({
          status: 'completed',
          final_video_url: finalPublicUrl,
          thumbnail_url: thumbnailUrl ?? null,
        }).eq('id', params.id)

        send({ type: 'complete', message: 'Video ready!', video_url: finalPublicUrl, progress_pct: 100 })

      } catch (err: any) {
        await supabase.from('video_projects').update({
          status: 'failed',
          error_message: err.message,
        }).eq('id', params.id)

        send({ type: 'error', message: err.message, error: err.message })
      } finally {
        // Cleanup temp dir
        try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
