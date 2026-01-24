export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = (searchParams.get('q') || '').trim()
    if (!q || q.length < 1) {
      return NextResponse.json({ features: [] }, { status: 200 })
    }

    const token = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      return NextResponse.json({ features: [] }, { status: 200 })
    }

    const u = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`)
    u.searchParams.set('access_token', token)
    u.searchParams.set('limit', '6')
    u.searchParams.set('types', 'place,locality,neighborhood,postcode,region')
    u.searchParams.set('country', 'AU')

    const res = await fetch(u.toString(), { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json({ features: [] }, { status: 200 })
    }
    const json = await res.json().catch(() => null)
    const features = Array.isArray(json?.features) ? json.features : []
    return NextResponse.json({ features }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ features: [] }, { status: 200 })
  }
}
