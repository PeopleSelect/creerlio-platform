/**
 * POST /api/video/scene/[id]/regenerate
 * Re-runs Runway generation for a single scene and updates stored_url.
 * Body: { prompt?: string }  — optional replacement prompt
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import https from 'https'
import http from 'http'
import { submitRunwayTask, pollRunwayTask, toRunwayRatio } from '../../../_lib/runway'

export const runtime = 'nodejs'
export const maxDuration = 300

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(destPath)
    proto.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close(); fs.unlinkSync(destPath)
        return downloadToFile(res.headers.location, destPath).then(resolve).catch(reject)
      }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
    }).on('error', (err) => { file.close(); try { fs.unlinkSync(destPath) } catch {}; reject(err) })
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = (req.headers.get('authorization') ?? '').replace(/^bearer /i, '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = adminClient()
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load scene + verify ownership via project
  const { data: scene } = await supabase
    .from('video_scenes')
    .select('*, project:video_projects!inner(id, user_id, aspect_ratio)')
    .eq('id', params.id)
    .single()

  if (!scene) return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
  if ((scene.project as any).user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const prompt = body.prompt ?? scene.prompt
  const projectId = (scene.project as any).id
  const aspectRatio = (scene.project as any).aspect_ratio ?? '16:9'
  const ratio = toRunwayRatio(aspectRatio)

  // Update prompt if changed
  if (body.prompt && body.prompt !== scene.prompt) {
    await supabase.from('video_scenes').update({ prompt }).eq('id', params.id)
  }

  await supabase.from('video_scenes').update({
    status: 'generating',
    attempts: (scene.attempts ?? 0) + 1,
    error_message: null,
  }).eq('id', params.id)

  try {
    const taskId = await submitRunwayTask(prompt, {
      duration: scene.duration_secs >= 8 ? 10 : 5,
      ratio,
    })

    await supabase.from('video_scenes').update({ runway_task_id: taskId }).eq('id', params.id)

    const result = await pollRunwayTask(taskId, { timeoutMs: 4 * 60 * 1000 })

    if (result.status !== 'SUCCEEDED' || !result.output?.[0]) {
      throw new Error(result.error ?? 'No output')
    }

    const runwayUrl = result.output[0]
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `scene-regen-`))

    try {
      const localPath = path.join(tmpDir, 'scene.mp4')
      await downloadToFile(runwayUrl, localPath)

      const storagePath = `${user.id}/${projectId}/scenes/scene_${scene.scene_order}_v${scene.attempts + 1}.mp4`
      const buffer = fs.readFileSync(localPath)

      const { error: upErr } = await supabase.storage
        .from('video-projects')
        .upload(storagePath, buffer, { contentType: 'video/mp4', upsert: true })

      if (upErr) throw new Error(upErr.message)

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/video-projects/${storagePath}`

      await supabase.from('video_scenes').update({
        status: 'completed',
        video_url: runwayUrl,
        stored_url: publicUrl,
        prompt,
      }).eq('id', params.id)

      return NextResponse.json({ success: true, stored_url: publicUrl })

    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
    }

  } catch (err: any) {
    await supabase.from('video_scenes').update({
      status: 'failed',
      error_message: err.message,
    }).eq('id', params.id)

    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
