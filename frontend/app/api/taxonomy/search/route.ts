import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// GET /api/taxonomy/search?q=<string>&limit=20
// Public — full-text search across all professions with their sector + industry context
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q     = (searchParams.get('q') || '').trim()
  const limit = Math.min(Number(searchParams.get('limit') || 20), 50)

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const svc = supabaseServiceServer()

  // Use ilike for broad partial match; GIN index on name column accelerates this
  const { data, error } = await svc
    .from('sector_professions')
    .select(`
      id,
      name,
      sector_id,
      industry_sectors!inner (
        id,
        name,
        industry_id,
        industries!inner (
          id,
          name
        )
      )
    `)
    .ilike('name', `%${q}%`)
    .limit(limit)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = (data || []).map((p: any) => ({
    profession_id:   p.id,
    profession_name: p.name,
    sector_id:       p.sector_id,
    sector_name:     p.industry_sectors?.name ?? null,
    industry_id:     p.industry_sectors?.industry_id ?? null,
    industry_name:   p.industry_sectors?.industries?.name ?? null,
  }))

  return NextResponse.json({ results })
}
