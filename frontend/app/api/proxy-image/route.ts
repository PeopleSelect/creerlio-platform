import { NextRequest, NextResponse } from 'next/server'

// GET /api/proxy-image?url=... — server-side image proxy to bypass CORS on external URLs (e.g. DALL-E)
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })

    const blob = await res.blob()
    const contentType = res.headers.get('content-type') || 'image/png'

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Proxy error' }, { status: 500 })
  }
}
