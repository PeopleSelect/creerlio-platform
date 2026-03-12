export const dynamic = 'force-dynamic'

/**
 * Admin talent management API — uses service role to bypass RLS.
 *
 * GET  /api/admin/talent?search=<query>&page=<n>
 *   Returns: { talent: TalentProfile[], total: number }
 *
 * PATCH /api/admin/talent
 *   Body: { talent_id: string, is_active: boolean }
 *   Returns: { success: true }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function verifyAdmin(request: NextRequest): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return { ok: false, error: 'Missing Authorization header' }

  const admin = getAdminClient()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user?.id) return { ok: false, error: 'Invalid session' }

  const email = (user.email || '').toLowerCase()
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  const hasAdminFlag = user.user_metadata?.is_admin === true || user.user_metadata?.admin === true

  if (!hasAdminFlag && !adminEmails.includes(email)) {
    return { ok: false, error: 'Forbidden' }
  }
  return { ok: true, userId: user.id }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Forbidden' ? 403 : 401 })

  const search = request.nextUrl.searchParams.get('search')?.trim() || ''
  const page = Math.max(0, parseInt(request.nextUrl.searchParams.get('page') || '0', 10))
  const pageSize = 50

  const supabase = getAdminClient()

  const { data, error, count } = await supabase
    .from('talent_profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let results = data || []
  if (search) {
    const q = search.toLowerCase()
    results = results.filter((r: any) => {
      const name = r.name || r.talent_name || r.full_name || r.display_name || ''
      const email = r.email || ''
      return name.toLowerCase().includes(q) || email.toLowerCase().includes(q)
    })
  }

  const total = results.length
  const paginated = results.slice(page * pageSize, (page + 1) * pageSize)

  return NextResponse.json({ talent: paginated, total })
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Forbidden' ? 403 : 401 })

  const body = await request.json()
  const talentId = String(body?.talent_id || '').trim()
  if (!talentId) return NextResponse.json({ error: 'talent_id is required' }, { status: 400 })

  const supabase = getAdminClient()
  const updates: Record<string, any> = {}
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('talent_profiles').update(updates).eq('id', talentId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
