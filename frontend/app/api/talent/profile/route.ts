import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Use service role to bypass RLS and get talent profile
    const svc = supabaseServiceServer()

    const { data: profile, error } = await svc
      .from('talent_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error loading talent profile:', error)
      return NextResponse.json({ error: 'Failed to load talent profile' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error in talent profile API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}