import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getEnv(name: string) {
  const v = process.env[name]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? getEnv('SUPABASE_URL')
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Admin promotion is not configured. Set SUPABASE_SERVICE_ROLE_KEY (server-side) and NEXT_PUBLIC_SUPABASE_URL.',
        },
        { status: 503 }
      )
    }

    const authz = req.headers.get('authorization') || ''
    const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : ''
    if (!token) {
      return NextResponse.json({ success: false, message: 'Missing Authorization bearer token.' }, { status: 401 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const who = await admin.auth.getUser(token)
    const authedUser = who.data?.user
    if (!authedUser?.id) {
      return NextResponse.json({ success: false, message: 'Invalid session.' }, { status: 401 })
    }

    const email = (authedUser.email || '').toLowerCase()
    const adminEmails = (getEnv('ADMIN_EMAILS') || getEnv('NEXT_PUBLIC_ADMIN_EMAILS') || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    if (!email || !adminEmails.includes(email)) {
      return NextResponse.json({ success: false, message: 'Forbidden.' }, { status: 403 })
    }

    const currentMeta = authedUser.user_metadata || {}
    const nextMeta = { ...currentMeta, is_admin: true }
    const updateRes = await admin.auth.admin.updateUserById(authedUser.id, {
      user_metadata: nextMeta,
    })
    if (updateRes.error) {
      return NextResponse.json(
        { success: false, message: updateRes.error.message ?? 'Failed to update user.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'User promoted to admin.' })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message ?? 'Promotion failed.' }, { status: 500 })
  }
}
