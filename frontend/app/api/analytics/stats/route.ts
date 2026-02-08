import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const isAdmin = user.user_metadata?.is_admin === true ||
                    user.user_metadata?.admin === true ||
                    process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()).includes(user.email?.toLowerCase() || '')

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get stats
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [totalRes, todayRes, weekRes, monthRes] = await Promise.all([
      supabase.from('page_views').select('id', { count: 'exact', head: true }),
      supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    ])

    // Get unique visitors (by session_id or user_id)
    const { data: uniqueToday } = await supabase
      .from('page_views')
      .select('session_id, user_id')
      .gte('created_at', today)

    const { data: uniqueWeek } = await supabase
      .from('page_views')
      .select('session_id, user_id')
      .gte('created_at', sevenDaysAgo)

    const countUnique = (data: any[]) => {
      const seen = new Set()
      data?.forEach(row => {
        const key = row.user_id || row.session_id
        if (key) seen.add(key)
      })
      return seen.size
    }

    return NextResponse.json({
      total_views: totalRes.count || 0,
      views_today: todayRes.count || 0,
      views_7d: weekRes.count || 0,
      views_30d: monthRes.count || 0,
      unique_visitors_today: countUnique(uniqueToday || []),
      unique_visitors_7d: countUnique(uniqueWeek || []),
    })
  } catch (error) {
    console.error('Error getting analytics stats:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
