export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('business_id')

    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }

    // Fetch all published jobs for this business
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, description, location, city, state, country, employment_type, status, business_profile_id')
      .eq('business_profile_id', businessId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API /jobs/by-business] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch business name
    let businessName = 'Unknown Company'
    if (data && data.length > 0) {
      const { data: business } = await supabase
        .from('business_profiles')
        .select('name, business_name')
        .eq('id', businessId)
        .maybeSingle()
      
      if (business) {
        businessName = (business.business_name && String(business.business_name).trim()) || 
                      (business.name && String(business.name).trim()) || 
                      'Unknown Company'
      }
    }

    // Add business name to each job
    const jobs = (data || []).map((job: any) => ({
      ...job,
      business_name: businessName
    }))

    return NextResponse.json({ jobs, business_name: businessName }, { status: 200 })
  } catch (err: any) {
    console.error('[API /jobs/by-business] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
