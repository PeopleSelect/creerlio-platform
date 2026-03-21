/**
 * GET /api/jobs/cron
 *
 * Scheduled cron endpoint — syncs all businesses with a careers_page_url.
 * Called by Vercel Cron (or any external scheduler) every 30 minutes.
 *
 * Protected by CRON_SECRET env var (set in Vercel dashboard).
 * Vercel Cron sets the `authorization` header automatically when
 * CRON_SECRET is configured in vercel.json.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 300  // 5 min timeout (Vercel Pro / Enterprise)

import { NextRequest, NextResponse } from 'next/server'
import { syncAllBusinesses } from '@/services/jobSyncEngine'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  console.log('[cron/jobs] Starting scheduled sync for all businesses...')
  const result = await syncAllBusinesses()
  console.log(`[cron/jobs] Done — total:${result.total} ok:${result.succeeded} fail:${result.failed}`)

  return NextResponse.json({
    ...result,
    timestamp: new Date().toISOString(),
  })
}
