import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// GET /api/ai/recommendations
// Stub endpoint — returns lightweight business recommendations.
// In production this will call an embeddings/similarity model.
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ recommendations: [], source: 'stub' })

  const user = await getUserFromBearer(token)
  if (!user) return NextResponse.json({ recommendations: [], source: 'stub' })

  const svc = supabaseServiceServer()

  // Naive recommendation: return up to 5 businesses the user is NOT connected to
  const { data: connectedBizIds } = await svc
    .from('customer_connections')
    .select('business_id, customer_profiles!inner(user_id)')
    .eq('customer_profiles.user_id', user.id)

  const excludeIds = (connectedBizIds || []).map((c: any) => c.business_id).filter(Boolean)

  let query = svc
    .from('business_profiles')
    .select('id, name, business_name, industry, city, state')
    .eq('is_active', true)
    .limit(5)

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data: businesses } = await query

  return NextResponse.json({
    recommendations: (businesses || []).map(b => ({
      id:       b.id,
      name:     b.name || b.business_name,
      industry: b.industry,
      city:     b.city,
      state:    b.state,
      reason:   'New business in your network',
    })),
    source: 'basic',
  })
}
