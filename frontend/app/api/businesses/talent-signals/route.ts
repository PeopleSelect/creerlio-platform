import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

// GET /api/businesses/talent-signals?business_id=...
// Returns ANONYMOUS aggregated talent interest signals for a business.
// Only accessible to authenticated business admins — never exposed publicly.
// No individual talent identities are returned.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business_id')
  if (!businessId) return NextResponse.json({ error: 'Missing business_id' }, { status: 400 })

  const svc = supabaseServiceServer()

  // Verify caller is an admin of the business
  const { data: { user }, error: authErr } = await svc.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleRow } = await svc
    .from('user_business_roles')
    .select('role')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!roleRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Aggregate anonymous signals: count of talent who have granted access,
  // grouped by talent role/title (no names, no IDs returned)
  const { data: grants, error } = await svc
    .from('talent_access_grants')
    .select('talent_id, talent_profiles!inner ( title )')
    .eq('business_id', businessId)
    .is('revoked_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate by role category
  const counts: Record<string, number> = {}
  for (const g of grants || []) {
    const title = (g as any).talent_profiles?.title || 'Professional'
    counts[title] = (counts[title] || 0) + 1
  }

  const signals = Object.entries(counts)
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    business_id: businessId,
    total_interested: (grants || []).length,
    signals,  // [{ role: "Corporate Lawyer", count: 3 }, ...]
  })
}
