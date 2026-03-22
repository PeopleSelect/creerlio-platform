import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function isAdminUser(user: { email?: string | null; user_metadata?: Record<string, any> | null }) {
  const metadata = user.user_metadata || {}
  if (metadata.is_admin === true || metadata.admin === true) return true
  const email = (user.email || '').toLowerCase()
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  return !!email && adminEmails.includes(email)
}

export async function GET(req: NextRequest) {
  try {
    const authz = req.headers.get('authorization') || ''
    const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : ''
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()

    const { data: { user: authedUser } } = await admin.auth.getUser(token)
    if (!authedUser?.id || !isAdminUser(authedUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('talent_bank_items')
      .select('id, metadata, created_at, item_type')
      .eq('user_id', userId)
      .eq('item_type', 'portfolio')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const row = data?.[0] ?? null
    return NextResponse.json({ row })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed' }, { status: 500 })
  }
}
