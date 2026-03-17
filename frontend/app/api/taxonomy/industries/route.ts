import { NextResponse } from 'next/server'
import { supabaseAnonServer } from '@/lib/supabaseServer'

// GET /api/taxonomy/industries
// Public — returns all 29 top-level industries sorted by name
export async function GET() {
  const svc = supabaseAnonServer()

  const { data, error } = await svc
    .from('industries')
    .select('id, name')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ industries: data || [] })
}
