import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// GET /api/taxonomy/professions?sector_id=<uuid>
// Public — returns all professions for a given sector
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sectorId = (searchParams.get('sector_id') || '').trim()

  if (!sectorId) {
    return NextResponse.json({ error: 'sector_id is required' }, { status: 400 })
  }

  const svc = supabaseServiceServer()

  const { data, error } = await svc
    .from('sector_professions')
    .select('id, name, sector_id')
    .eq('sector_id', sectorId)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ professions: data || [] })
}
