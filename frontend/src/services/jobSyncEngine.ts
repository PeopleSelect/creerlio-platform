/**
 * Job Sync Engine
 *
 * Core function: syncJobs(business_id, source_url)
 *
 * 1. Fetch current auto-synced jobs from DB
 * 2. Scrape latest jobs from source_url
 * 3. Diff: insert new, update changed, deactivate removed
 * 4. Emit events for each change
 * 5. Write summary to job_sync_logs
 */

import { scrapeJobs, type RawJob } from './jobScraper'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncResult {
  jobs_found:   number
  jobs_created: number
  jobs_updated: number
  jobs_removed: number
  status:       'success' | 'failure'
  error?:       string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a unique identity key for matching scraped ↔ stored jobs.
 * Prefer external_id; fall back to title normalised.
 */
function jobKey(external_id: string | null, title: string): string {
  if (external_id) return `eid:${external_id}`
  return `title:${title.toLowerCase().trim()}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Emit event helper
// ─────────────────────────────────────────────────────────────────────────────

async function emitEvent(
  sb: ReturnType<typeof supabaseServiceServer>,
  business_id: string,
  job_id: string,
  event_type: 'job_added' | 'job_updated' | 'job_removed',
  payload: Record<string, unknown>
) {
  await sb.from('job_sync_events').insert({ business_id, job_id, event_type, payload })
}

// ─────────────────────────────────────────────────────────────────────────────
// Core sync function
// ─────────────────────────────────────────────────────────────────────────────

export async function syncJobs(
  business_id: string,
  source_url:  string
): Promise<SyncResult> {
  const sb        = supabaseServiceServer()
  const now       = new Date().toISOString()
  let jobs_created = 0
  let jobs_updated = 0
  let jobs_removed = 0
  let jobs_found   = 0

  try {
    // ── 1. Resolve business_profile_id (needed for the jobs FK) ──────────────
    //    The jobs table requires business_profile_id (BIGINT).
    //    We look it up via business_profiles joined to businesses.
    const { data: bp } = await sb
      .from('business_profiles')
      .select('id')
      .eq('business_id', business_id)
      .maybeSingle()
    const business_profile_id: number | null = bp?.id ?? null

    // ── 2. Load existing auto-synced jobs for this source_url ────────────────
    const { data: existing, error: dbErr } = await sb
      .from('jobs')
      .select('id, external_id, title, hash, is_active')
      .eq('source_url', source_url)
      .eq('is_auto_synced', true)

    if (dbErr) throw new Error(`DB read error: ${dbErr.message}`)

    const existingMap = new Map<string, { id: string; hash: string; is_active: boolean }>()
    for (const row of (existing ?? [])) {
      const k = jobKey(row.external_id, row.title)
      existingMap.set(k, { id: String(row.id), hash: row.hash, is_active: row.is_active })
    }

    // ── 3. Scrape latest jobs ────────────────────────────────────────────────
    const scraped: RawJob[] = await scrapeJobs(source_url)
    jobs_found = scraped.length

    // Guard: if scrape returned nothing, do not mass-remove (scrape may have
    // failed or the page was temporarily empty). Just log with 0 removals.
    if (scraped.length === 0) {
      await writeSyncLog(sb, { business_id, source_url, jobs_found: 0, jobs_created: 0, jobs_updated: 0, jobs_removed: 0, status: 'success' })
      return { jobs_found: 0, jobs_created: 0, jobs_updated: 0, jobs_removed: 0, status: 'success' }
    }

    const scrapedKeys = new Set<string>()

    // ── 4. Insert / Update ───────────────────────────────────────────────────
    for (const job of scraped) {
      const k = jobKey(job.external_id, job.title)
      scrapedKeys.add(k)

      const stored = existingMap.get(k)

      if (!stored) {
        // INSERT new job
        const row: Record<string, unknown> = {
          title:             job.title,
          description:       job.description,
          location:          job.location,
          employment_type:   job.employment_type,
          application_url:   job.apply_url,
          source_url:        job.source_url,
          external_id:       job.external_id,
          hash:              job.hash,
          status:            'published',
          is_active:         true,
          is_auto_synced:    true,
          first_seen_at:     now,
          last_seen_at:      now,
          published_at:      now,
          // FK columns
          business_id:       business_id,
          ...(business_profile_id ? { business_profile_id } : {}),
        }

        const { data: inserted, error: insErr } = await sb
          .from('jobs')
          .insert(row)
          .select('id')
          .single()

        if (insErr) {
          console.error(`[syncJobs] INSERT error for "${job.title}":`, insErr.message)
          continue
        }

        jobs_created++
        await emitEvent(sb, business_id, String(inserted.id), 'job_added', {
          title:    job.title,
          location: job.location,
          hash:     job.hash,
        })
      } else if (stored.hash !== job.hash || !stored.is_active) {
        // UPDATE changed or re-activate
        const { error: updErr } = await sb
          .from('jobs')
          .update({
            title:           job.title,
            description:     job.description,
            location:        job.location,
            employment_type: job.employment_type,
            application_url: job.apply_url,
            hash:            job.hash,
            last_seen_at:    now,
            is_active:       true,
            status:          'published',
            sync_removed_at: null,
          })
          .eq('id', stored.id)

        if (updErr) {
          console.error(`[syncJobs] UPDATE error for "${job.title}":`, updErr.message)
          continue
        }

        jobs_updated++
        await emitEvent(sb, business_id, stored.id, 'job_updated', {
          title:    job.title,
          old_hash: stored.hash,
          new_hash: job.hash,
        })
      } else {
        // Unchanged — just bump last_seen_at
        await sb.from('jobs').update({ last_seen_at: now }).eq('id', stored.id)
      }
    }

    // ── 5. Remove jobs no longer in scrape ──────────────────────────────────
    for (const [k, stored] of existingMap) {
      if (!scrapedKeys.has(k) && stored.is_active) {
        const { error: remErr } = await sb
          .from('jobs')
          .update({
            is_active:       false,
            status:          'removed',
            sync_removed_at: now,
          })
          .eq('id', stored.id)

        if (remErr) {
          console.error(`[syncJobs] REMOVE error for id ${stored.id}:`, remErr.message)
          continue
        }

        jobs_removed++
        await emitEvent(sb, business_id, stored.id, 'job_removed', { removed_at: now })
      }
    }

    // ── 6. Write sync log ────────────────────────────────────────────────────
    await writeSyncLog(sb, { business_id, source_url, jobs_found, jobs_created, jobs_updated, jobs_removed, status: 'success' })

    return { jobs_found, jobs_created, jobs_updated, jobs_removed, status: 'success' }

  } catch (err: any) {
    console.error('[syncJobs] Fatal error:', err)
    await writeSyncLog(sb, { business_id, source_url, jobs_found, jobs_created, jobs_updated, jobs_removed, status: 'failure', error_message: err.message })
    return { jobs_found, jobs_created, jobs_updated, jobs_removed, status: 'failure', error: err.message }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Write sync log row
// ─────────────────────────────────────────────────────────────────────────────

async function writeSyncLog(
  sb: ReturnType<typeof supabaseServiceServer>,
  data: {
    business_id:  string
    source_url:   string
    jobs_found:   number
    jobs_created: number
    jobs_updated: number
    jobs_removed: number
    status:       'success' | 'failure'
    error_message?: string
  }
) {
  const { error } = await sb.from('job_sync_logs').insert(data)
  if (error) console.error('[syncJobs] Failed to write sync log:', error.message)
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduler helper — sync all businesses that have a careers_page_url
// ─────────────────────────────────────────────────────────────────────────────

export async function syncAllBusinesses(): Promise<{ total: number; succeeded: number; failed: number }> {
  const sb = supabaseServiceServer()

  const { data: businesses, error } = await sb
    .from('businesses')
    .select('id, careers_page_url')
    .not('careers_page_url', 'is', null)
    .neq('careers_page_url', '')

  if (error || !businesses) {
    console.error('[syncAllBusinesses] DB error:', error?.message)
    return { total: 0, succeeded: 0, failed: 0 }
  }

  let succeeded = 0
  let failed    = 0

  // Process sequentially to avoid hammering scrape targets
  for (const biz of businesses) {
    const result = await syncJobs(String(biz.id), String(biz.careers_page_url))
    if (result.status === 'success') succeeded++
    else failed++
  }

  return { total: businesses.length, succeeded, failed }
}
