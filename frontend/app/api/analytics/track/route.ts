import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { page_path, session_id, referrer, user_agent } = body

    if (!page_path) {
      return NextResponse.json({ error: 'page_path is required' }, { status: 400 })
    }

    // Use service role key to bypass RLS for insert
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user ID from auth header if present
    let user_id = null
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user } } = await supabase.auth.getUser(token)
      user_id = user?.id || null
    }

    const { error } = await supabase.from('page_views').insert({
      page_path,
      user_id,
      session_id,
      referrer,
      user_agent,
    })

    if (error) {
      console.error('Error tracking page view:', error)
      return NextResponse.json({ error: 'Failed to track' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in track endpoint:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
