import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

const MAX_SNAPSHOTS_PER_TALENT = 10

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const user = await getUserFromBearer(token)

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const {
      snapshot_title,
      headline,
      experience_years,
      location,
      skills,
      industry_tags,
      summary,
      is_active,
      snapshot_id, // if provided, this is an UPDATE
    } = body

    // Validation
    if (!headline || typeof headline !== 'string' || !headline.trim()) {
      return NextResponse.json({ error: 'Headline is required' }, { status: 400 })
    }
    if (headline.trim().length > 200) {
      return NextResponse.json({ error: 'Headline must be 200 characters or less' }, { status: 400 })
    }
    if (summary && summary.length > 1500) {
      return NextResponse.json({ error: 'Summary must be 1500 characters or less' }, { status: 400 })
    }
    if (experience_years !== undefined && experience_years !== null) {
      const yrs = Number(experience_years)
      if (isNaN(yrs) || yrs < 0 || yrs > 60) {
        return NextResponse.json({ error: 'experience_years must be between 0 and 60' }, { status: 400 })
      }
    }

    // Parse skills into a JSON array
    let skillsArray: string[] = []
    if (Array.isArray(skills)) {
      skillsArray = skills.filter((s: any) => typeof s === 'string' && s.trim()).map((s: string) => s.trim())
    } else if (typeof skills === 'string' && skills.trim()) {
      skillsArray = skills.split(',').map((s) => s.trim()).filter(Boolean)
    }

    // Parse industry tags
    let tagsArray: string[] = []
    if (Array.isArray(industry_tags)) {
      tagsArray = industry_tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim())
    } else if (typeof industry_tags === 'string' && industry_tags.trim()) {
      tagsArray = industry_tags.split(',').map((t) => t.trim()).filter(Boolean)
    }

    const supabase = supabaseServiceServer()

    // Resolve talent_profile id for this user
    const { data: profile, error: profileErr } = await supabase
      .from('talent_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 })
    }

    const talentId = profile.id

    // -- UPDATE path --
    if (snapshot_id) {
      const { data: existing, error: fetchErr } = await supabase
        .from('talent_snapshots')
        .select('id, talent_id')
        .eq('id', snapshot_id)
        .maybeSingle()

      if (fetchErr || !existing) {
        return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
      }
      if (existing.talent_id !== talentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: updated, error: updateErr } = await supabase
        .from('talent_snapshots')
        .update({
          snapshot_title: snapshot_title?.trim() || 'My Snapshot',
          headline: headline.trim(),
          experience_years: experience_years != null ? Number(experience_years) : null,
          location: location?.trim() || null,
          skills_json: skillsArray,
          industry_tags: tagsArray,
          summary: summary?.trim() || null,
          is_active: typeof is_active === 'boolean' ? is_active : existing.is_active ?? false,
        })
        .eq('id', snapshot_id)
        .select('id, snapshot_title, headline, is_active, created_at, updated_at')
        .single()

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, snapshot: updated })
    }

    // -- CREATE path --
    // Enforce per-talent snapshot cap
    const { count } = await supabase
      .from('talent_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('talent_id', talentId)

    if ((count ?? 0) >= MAX_SNAPSHOTS_PER_TALENT) {
      return NextResponse.json({
        error: `You can have at most ${MAX_SNAPSHOTS_PER_TALENT} snapshots. Delete one to create a new one.`,
      }, { status: 422 })
    }

    const { data: snapshot, error: insertErr } = await supabase
      .from('talent_snapshots')
      .insert({
        talent_id: talentId,
        snapshot_title: snapshot_title?.trim() || 'My Snapshot',
        headline: headline.trim(),
        experience_years: experience_years != null ? Number(experience_years) : null,
        location: location?.trim() || null,
        skills_json: skillsArray,
        industry_tags: tagsArray,
        summary: summary?.trim() || null,
        is_active: typeof is_active === 'boolean' ? is_active : false,
      })
      .select('id, snapshot_title, headline, is_active, created_at')
      .single()

    if (insertErr) {
      console.error('snapshot create error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, snapshot }, { status: 201 })
  } catch (e: any) {
    console.error('snapshot create unexpected error:', e)
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const user = await getUserFromBearer(token)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { snapshot_id } = await req.json()
    if (!snapshot_id) return NextResponse.json({ error: 'snapshot_id required' }, { status: 400 })

    const supabase = supabaseServiceServer()

    const { data: profile } = await supabase
      .from('talent_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { error } = await supabase
      .from('talent_snapshots')
      .delete()
      .eq('id', snapshot_id)
      .eq('talent_id', profile.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
