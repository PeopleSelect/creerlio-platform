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

    // Use service role to bypass RLS and get user business roles
    const svc = supabaseServiceServer()

    let query = svc.from('user_business_roles').select('*')

    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (businessId) {
      query = query.eq('business_id', businessId)
    }

    const { data: roles, error } = await query

    if (error) {
      console.error('Error loading user business roles:', error)
      return NextResponse.json({ error: 'Failed to load user business roles' }, { status: 500 })
    }

    return NextResponse.json({ roles })
  } catch (error) {
    console.error('Error in user business roles API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}