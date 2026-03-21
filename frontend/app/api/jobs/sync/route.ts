/**
 * POST /api/jobs/sync
 *
 * Manually trigger a job sync for the authenticated business owner.
 * Body: { business_id: string }
 *
 * GET /api/jobs/sync?business_id=
 * Returns the careers_page_url + last 10 sync logs.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromBearer, supabaseServiceServer } from '@/lib/supabaseServer'
import { syncJobs } from '@/services/jobSyncEngine'

/** Verify the authenticated user owns the given business_id via business_profiles. */
async function assertOwner(sb: ReturnType<typeof supabaseServiceServer>, business_id: string, user_id: string) {
  const { data } = await sb
    .from('business_profiles')
    .select('id')
    .eq('business_id', business_id)
    .eq('user_id', user_id)
    .maybeSingle()
  return !!data
}

// ── POST — trigger manual sync ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  const user  = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { business_id?: string }
  try { body = await req.json() } catch { body = {} }

  const business_id = body.business_id
  if (!business_id) return NextResponse.json({ error: 'business_id is required' }, { status: 400 })

  const sb = supabaseServiceServer()

  if (!(await assertOwner(sb, business_id, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: biz } = await sb
    .from('businesses')
    .select('careers_page_url')
    .eq('id', business_id)
    .maybeSingle()

  const source_url = biz?.careers_page_url
  if (!source_url) {
    return NextResponse.json({ error: 'No careers page URL configured for this business.' }, { status: 422 })
  }

  const result = await syncJobs(business_id, source_url)
  return NextResponse.json(result, { status: result.status === 'success' ? 200 : 500 })
}

// ── GET — careers URL + recent sync logs ──────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  const user  = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const business_id = req.nextUrl.searchParams.get('business_id')
  if (!business_id) return NextResponse.json({ error: 'business_id is required' }, { status: 400 })

  const sb = supabaseServiceServer()

  if (!(await assertOwner(sb, business_id, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [{ data: biz }, { data: logs }] = await Promise.all([
    sb.from('businesses').select('careers_page_url').eq('id', business_id).maybeSingle(),
    sb.from('job_sync_logs').select('*').eq('business_id', business_id).order('run_at', { ascending: false }).limit(10),
  ])

  return NextResponse.json({
    careers_page_url: biz?.careers_page_url ?? null,
    logs: logs ?? [],
  })
}
