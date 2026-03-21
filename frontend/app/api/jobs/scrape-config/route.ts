/**
 * GET  /api/jobs/scrape-config?business_id=
 *   → returns { careers_page_url }
 *
 * POST /api/jobs/scrape-config
 *   body: { business_id, careers_page_url }
 *   → saves URL, triggers immediate background sync
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

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  const user  = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const business_id = req.nextUrl.searchParams.get('business_id')
  if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400 })

  const sb = supabaseServiceServer()

  if (!(await assertOwner(sb, business_id, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: biz } = await sb
    .from('businesses')
    .select('careers_page_url')
    .eq('id', business_id)
    .maybeSingle()

  return NextResponse.json({ careers_page_url: biz?.careers_page_url ?? null })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  const user  = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { business_id?: string; careers_page_url?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { business_id, careers_page_url } = body
  if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400 })

  if (careers_page_url) {
    try {
      const u = new URL(careers_page_url)
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error()
    } catch {
      return NextResponse.json({ error: 'careers_page_url must be a valid http/https URL' }, { status: 422 })
    }
  }

  const sb = supabaseServiceServer()

  if (!(await assertOwner(sb, business_id, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error: upErr } = await sb
    .from('businesses')
    .update({ careers_page_url: careers_page_url ?? null })
    .eq('id', business_id)

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  if (careers_page_url) {
    syncJobs(business_id, careers_page_url).catch(err =>
      console.error('[scrape-config] Background sync error:', err)
    )
  }

  return NextResponse.json({ ok: true, careers_page_url: careers_page_url ?? null })
}
