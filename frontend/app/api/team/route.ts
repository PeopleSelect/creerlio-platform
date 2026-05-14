import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')

    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }

    // Use service role to bypass RLS and get team members
    const svc = supabaseServiceServer()

    const { data: teamRows, error: teamErr } = await svc
      .from('user_business_roles')
      .select('user_id, role, users(id, email, full_name)')
      .eq('business_id', businessId)

    if (teamErr) {
      console.error('Error loading team members:', teamErr)
      return NextResponse.json({ error: 'Failed to load team members' }, { status: 500 })
    }

    // Get location roles for each user
    const userIds = teamRows?.map(row => row.user_id) || []
    let locationRoles: any[] = []

    if (userIds.length > 0) {
      // Get locations for this business
      const { data: locations } = await svc
        .from('locations')
        .select('id, business_id')
        .eq('business_id', businessId)

      if (locations && locations.length > 0) {
        const locationIds = locations.map(loc => loc.id)
        const { data: locRoles } = await svc
          .from('user_location_roles')
          .select('user_id, location_id, role')
          .in('location_id', locationIds)

        locationRoles = locRoles || []
      }
    }

    // Group location roles by user
    const locRolesByUser = new Map<string, any[]>()
    locationRoles.forEach((role: any) => {
      const userId = String(role.user_id)
      const entry = locRolesByUser.get(userId) || []
      entry.push({ location_id: role.location_id, role: role.role })
      locRolesByUser.set(userId, entry)
    })

    // Format response
    const members = (teamRows || []).map((row: any) => {
      const userInfo = row.users || {}
      return {
        user_id: String(row.user_id),
        email: userInfo.email || 'Unknown',
        full_name: userInfo.full_name || userInfo.email || null,
        business_role: row.role || 'viewer',
        location_roles: locRolesByUser.get(String(row.user_id)) || [],
      }
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error in team API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}