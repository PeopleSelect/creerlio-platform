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
      console.error('[geocode] No Mapbox token configured (MAPBOX_TOKEN / NEXT_PUBLIC_MAPBOX_TOKEN)')
      return NextResponse.json({ features: [], error: 'token_missing' }, { status: 200 })
    }

    const types = searchParams.get('types') || 'place,locality,neighborhood,postcode,region'
    const country = searchParams.get('country') || 'AU'
    const limit = searchParams.get('limit') || '6'

    const u = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`)
    u.searchParams.set('access_token', token)
    u.searchParams.set('limit', limit)
    u.searchParams.set('types', types)
    if (country) u.searchParams.set('country', country)

    const res = await fetch(u.toString(), { cache: 'no-store' })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[geocode] Mapbox returned ${res.status}: ${body.slice(0, 200)}`)
      return NextResponse.json({ features: [], error: `mapbox_${res.status}` }, { status: 200 })
    }
    const json = await res.json().catch(() => null)
    const features = Array.isArray(json?.features) ? json.features : []
    return NextResponse.json({ features }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ features: [] }, { status: 200 })
  }
}
