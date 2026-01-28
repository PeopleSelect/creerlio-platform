import { NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const keyword = (searchParams.get('keyword') || '').trim()
  const location = (searchParams.get('location') || '').trim()

  try {
    const supabase = supabaseServiceServer()

    let qb: any = supabase
      .from('jobs')
      .select(
        'id,title,description,location,city,state,country,employment_type,remote_allowed,salary_min,salary_max,salary_currency,required_skills,created_at,business_profile_id,status'
      )
      .limit(200)

    qb = qb.eq('status', 'published')
    if (keyword) qb = qb.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
    if (location) qb = qb.or(`location.ilike.%${location}%,city.ilike.%${location}%,state.ilike.%${location}%,country.ilike.%${location}%`)

    let res: any = await qb
    if (res.error) {
      qb = supabase
        .from('jobs')
        .select(
          'id,title,description,location,city,state,country,employment_type,remote_allowed,salary_min,salary_max,salary_currency,required_skills,created_at,business_profile_id'
        )
        .limit(200)
      if (keyword) qb = qb.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
      if (location) qb = qb.or(`location.ilike.%${location}%,city.ilike.%${location}%,state.ilike.%${location}%,country.ilike.%${location}%`)
      res = await qb
    }

    if (res.error) {
      return NextResponse.json(
        { ok: false, error: res.error.message || 'Jobs query failed', code: res.error.code || null },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, jobs: res.data || [] })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Jobs API failed' },
      { status: 500 }
    )
  }
}
