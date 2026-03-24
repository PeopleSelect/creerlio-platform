/**
 * GET /api/video/project/[id]
 * Returns project + scenes status.
 *
 * DELETE /api/video/project/[id]
 * Deletes project and all related assets.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function getUser(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace(/^bearer /i, '').trim()
  if (!token) return null
  const supabase = adminClient()
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = adminClient()

  const { data: project, error } = await supabase
    .from('video_projects')
    .select(`
      *,
      scenes:video_scenes(*)
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Sort scenes by order
  if (Array.isArray(project.scenes)) {
    project.scenes.sort((a: any, b: any) => a.scene_order - b.scene_order)
  }

  return NextResponse.json(project)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = adminClient()

  // Verify ownership
  const { data: project } = await supabase
    .from('video_projects')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('video_projects').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
