import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const businessId = searchParams.get('business_id')

    if (!userId && !businessId) {
      return NextResponse.json({ error: 'user_id or business_id is required' }, { status: 400 })
    }

    // Use service role to bypass RLS and get business profile
    const svc = supabaseServiceServer()

    let query = svc.from('business_profiles').select('*')

    if (userId) {
      query = query.eq('user_id', userId)
    } else if (businessId) {
      query = query.eq('business_id', businessId)
    }

    const { data: profile, error } = await query.maybeSingle()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error loading business profile:', error)
      return NextResponse.json({ error: 'Failed to load business profile' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error in business profile API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}