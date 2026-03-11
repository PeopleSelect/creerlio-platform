import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// Derives the same anonymous ID the DB function would produce.
function anonId(uuid: string) {
  return 'CAN-' + uuid.replace(/-/g, '').slice(0, 5).toUpperCase()
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const skills    = searchParams.get('skills')?.trim() || ''
    const industry  = searchParams.get('industry')?.trim() || ''
    const location  = searchParams.get('location')?.trim() || ''
    const minYears  = parseInt(searchParams.get('min_years') || '0', 10)
    const maxYears  = parseInt(searchParams.get('max_years') || '99', 10)
    const page      = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit     = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const offset    = (page - 1) * limit

    const supabase = supabaseServiceServer()

    // Build query against the safe view (no talent_id, no PII)
    let query = supabase
      .from('anonymous_snapshots')
      .select('*', { count: 'exact' })
      .gte('experience_years', isNaN(minYears) ? 0 : minYears)
      .lte('experience_years', isNaN(maxYears) ? 99 : maxYears)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Location filter (case-insensitive partial match)
    if (location) {
      query = query.ilike('location', `%${location}%`)
    }

    // Skills filter — check if any supplied skill appears in skills_json array
    if (skills) {
      const skillList = skills.split(',').map((s) => s.trim()).filter(Boolean)
      if (skillList.length > 0) {
        // skills_json is a jsonb array of strings; use @> with an OR approach
        // Supabase doesn't support OR on jsonb contains directly, so filter per skill
        // We use a contains-any pattern: skills_json ?| array[...]
        query = query.or(
          skillList.map((s) => `skills_json.cs.["${s}"]`).join(',')
        )
      }
    }

    // Industry filter — array overlap
    if (industry) {
      const tags = industry.split(',').map((s) => s.trim()).filter(Boolean)
      if (tags.length > 0) {
        query = query.overlaps('industry_tags', tags)
      }
    }

    const { data, error, count } = await query

    if (error) {
      console.error('snapshot search error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Increment search_appearance_count for returned snapshots (fire-and-forget)
    if (data && data.length > 0) {
      const ids = data.map((s: any) => s.id)
      supabaseServiceServer()
        .rpc('increment_snapshot_appearance', { snapshot_ids: ids })
        .then(() => {}) // best-effort
    }

    // Strip any accidental PII before returning
    const safe = (data || []).map((s: any) => ({
      id: s.id,
      anon_id: s.anon_id || anonId(s.id),
      headline: s.headline,
      experience_years: s.experience_years,
      location: s.location,
      skills: Array.isArray(s.skills_json) ? s.skills_json : [],
      industry_tags: s.industry_tags || [],
      summary: s.summary,
      view_count: s.view_count,
      created_at: s.created_at,
    }))

    return NextResponse.json({
      results: safe,
      total: count ?? safe.length,
      page,
      limit,
    })
  } catch (e: any) {
    console.error('snapshot search unexpected error:', e)
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
