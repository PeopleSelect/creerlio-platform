import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// GET /api/taxonomy/sectors?industry_id=<uuid>
// Public — returns all sectors for a given industry
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const industryId = (searchParams.get('industry_id') || '').trim()

  if (!industryId) {
    return NextResponse.json({ error: 'industry_id is required' }, { status: 400 })
  }

  const svc = supabaseServiceServer()

  const { data, error } = await svc
    .from('industry_sectors')
    .select('id, name, industry_id')
    .eq('industry_id', industryId)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sectors: data || [] })
}
