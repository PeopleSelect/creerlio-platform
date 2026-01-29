import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getEnv(name: string) {
  const v = process.env[name]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function isAdminUser(user: { email?: string | null; user_metadata?: Record<string, any> | null }) {
  const metadata = user.user_metadata || {}
  if (metadata.is_admin === true || metadata.admin === true) return true

  const email = (user.email || '').toLowerCase()
  const adminEmails = (getEnv('ADMIN_EMAILS') || getEnv('NEXT_PUBLIC_ADMIN_EMAILS') || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return !!email && adminEmails.includes(email)
}

export async function GET() {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? getEnv('SUPABASE_URL')
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        message: 'Delete is not configured.',
      },
      { status: 503 }
    )
  }

  return NextResponse.json({ success: true, configured: true })
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
            'Delete is not configured. Set SUPABASE_SERVICE_ROLE_KEY (server-side) and NEXT_PUBLIC_SUPABASE_URL.',
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

    if (!isAdminUser(authedUser)) {
      return NextResponse.json({ success: false, message: 'Forbidden.' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Missing userId.' }, { status: 400 })
    }

    const deleteErrors: string[] = []

    const { error: talentError } = await admin.from('talent_profiles').delete().eq('user_id', userId)
    if (talentError) deleteErrors.push(`talent_profiles: ${talentError.message}`)

    const { error: businessError } = await admin.from('business_profiles').delete().eq('user_id', userId)
    if (businessError) deleteErrors.push(`business_profiles: ${businessError.message}`)

    const { error: publicLiteError } = await admin
      .from('public_lite_business_profiles')
      .delete()
      .eq('user_id', userId)
    if (publicLiteError) deleteErrors.push(`public_lite_business_profiles: ${publicLiteError.message}`)

    const { error: usersError } = await admin.from('users').delete().eq('id', userId)
    if (usersError) deleteErrors.push(`users: ${usersError.message}`)

    const authDelete = await admin.auth.admin.deleteUser(userId)
    if (authDelete.error) {
      deleteErrors.push(`auth.users: ${authDelete.error.message}`)
    }

    if (deleteErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Delete completed with errors: ${deleteErrors.join('; ')}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'User deleted (auth + profiles).' })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message ?? 'Delete failed.' }, { status: 500 })
  }
}
