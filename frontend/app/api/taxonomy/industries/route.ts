import { NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// GET /api/taxonomy/industries
// Public — returns all 29 top-level industries sorted by name
export async function GET() {
  const svc = supabaseServiceServer()

  const { data, error } = await svc
    .from('industries')
    .select('id, name, slug')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ industries: data || [] })
}
