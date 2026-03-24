/**
 * POST /api/video/project
 * Creates a video project, generates the script + scene prompts via GPT-4o,
 * saves to DB, and returns the project ID.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { generateVideoScript } from '../_lib/generator'
import type { CreateProjectRequest, VideoStyle, AspectRatio } from '../_lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^bearer /i, '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = adminClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: CreateProjectRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { title, description, style = 'corporate', aspect_ratio = '16:9', duration_secs = 60, business_id, brief } = body

  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  // ── Optionally fetch business context ─────────────────────────────────────
  let companyName: string | undefined
  let industry: string | undefined

  if (business_id) {
    const { data: biz } = await supabase
      .from('business_profiles')
      .select('company_name, industry')
      .eq('id', business_id)
      .single()
    companyName = biz?.company_name ?? undefined
    industry = biz?.industry ?? undefined
  }

  // ── Generate script ───────────────────────────────────────────────────────
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  let script: Awaited<ReturnType<typeof generateVideoScript>>
  try {
    script = await generateVideoScript(openai, {
      title,
      description,
      style: style as VideoStyle,
      duration_secs,
      brief,
      companyName,
      industry,
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Script generation failed: ${err.message}` }, { status: 500 })
  }

  // ── Insert project ────────────────────────────────────────────────────────
  const { data: project, error: projectErr } = await supabase
    .from('video_projects')
    .insert({
      user_id: user.id,
      business_id: business_id ?? null,
      title: title.trim(),
      description: description ?? null,
      style,
      aspect_ratio,
      duration_secs,
      script: script.full_narration,
      status: 'draft',
      metadata: { companyName, industry },
    })
    .select('id')
    .single()

  if (projectErr || !project) {
    return NextResponse.json({ error: projectErr?.message ?? 'DB insert failed' }, { status: 500 })
  }

  // ── Insert scenes ─────────────────────────────────────────────────────────
  const sceneRows = script.scenes.map((s, i) => ({
    project_id: project.id,
    scene_order: i,
    title: s.title,
    prompt: s.prompt,
    narration: s.narration,
    duration_secs: s.duration_secs,
    status: 'pending',
  }))

  const { error: scenesErr } = await supabase.from('video_scenes').insert(sceneRows)

  if (scenesErr) {
    // Roll back project
    await supabase.from('video_projects').delete().eq('id', project.id)
    return NextResponse.json({ error: scenesErr.message }, { status: 500 })
  }

  return NextResponse.json({
    project_id: project.id,
    status: 'draft',
    scene_count: script.scenes.length,
  })
}
