'use server'

import { NextRequest, NextResponse } from 'next/server'

const SOCIAL_HOSTS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'x.com',
  'twitter.com',
  'youtube.com',
  'tiktok.com',
]

type Address = {
  full?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  street?: string
}

const extractLinkRel = (html: string, rel: string) => {
  const regex = new RegExp(`<link[^>]+rel=["'][^"']*${rel}[^"']*["'][^>]*>`, 'i')
  const match = html.match(regex)
  if (!match) return null
  const hrefMatch = match[0].match(/href=["']([^"']+)["']/i)
  return hrefMatch?.[1]?.trim() || null
}

const extractMeta = (html: string, key: string) => {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`,
    'i'
  )
  const match = html.match(regex)
  if (!match) return null
  const contentMatch = match[0].match(/content=["']([^"']+)["']/i)
  return contentMatch?.[1]?.trim() || null
}

const extractTitle = (html: string) => {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match?.[1]?.trim() || null
}

const extractJsonLd = (html: string) => {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)
  if (!scripts) return []
  return scripts
    .map((script) => {
      const jsonMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i)
      const raw = jsonMatch?.[1]?.trim()
      if (!raw) return null
      try {
        return JSON.parse(raw)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

const normalizeJsonLd = (raw: any): any[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object' && Array.isArray(raw['@graph'])) return raw['@graph']
  return [raw]
}

const pickBusinessNode = (nodes: any[]) => {
  const preferred = nodes.find((node) => {
    const type = node?.['@type']
    if (!type) return false
    const types = Array.isArray(type) ? type : [type]
    return types.some((t) =>
      String(t).toLowerCase().includes('business') ||
      String(t).toLowerCase().includes('restaurant') ||
      String(t).toLowerCase().includes('organization')
    )
  })
  return preferred || nodes[0] || null
}

const extractImageUrl = (value: any) => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = extractImageUrl(item)
      if (url) return url
    }
  }
  if (typeof value === 'object') {
    return value.url || value['@id'] || null
  }
  return null
}

const extractServices = (node: any) => {
  const services: string[] = []
  const offers = node?.makesOffer || node?.offers
  const catalog = node?.hasOfferCatalog
  const pushName = (val: any) => {
    const name = String(val?.name || val || '').trim()
    if (name) services.push(name)
  }
  if (Array.isArray(offers)) offers.forEach(pushName)
  if (offers && !Array.isArray(offers)) pushName(offers)
  const catalogItems = catalog?.itemListElement || catalog?.itemList || catalog
  if (Array.isArray(catalogItems)) catalogItems.forEach(pushName)
  return Array.from(new Set(services))
}

const buildAddress = (addr: any): Address => {
  if (!addr) return {}
  const street = addr.streetAddress || addr.addressLine || ''
  const city = addr.addressLocality || ''
  const state = addr.addressRegion || ''
  const postalCode = addr.postalCode || ''
  const country = addr.addressCountry || ''
  const parts = [street, city, state, postalCode, country].filter(Boolean)
  return {
    full: parts.join(', '),
    street: street || undefined,
    city: city || undefined,
    state: state || undefined,
    postalCode: postalCode || undefined,
    country: country || undefined,
  }
}

const extractSocials = (html: string) => {
  const links = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map((m) => m[1])
  const socials = new Set<string>()
  links.forEach((link) => {
    const lower = link.toLowerCase()
    if (SOCIAL_HOSTS.some((host) => lower.includes(host))) {
      socials.add(link)
    }
  })
  return Array.from(socials)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawUrl = String(body?.url || '').trim()
    if (!rawUrl) {
      return NextResponse.json({ error: 'Website URL is required.' }, { status: 400 })
    }

    const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
    const res = await fetch(normalizedUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'CreerlioBot/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch website (${res.status}).` }, { status: 400 })
    }

    const html = await res.text()
    const title = extractMeta(html, 'og:title') || extractTitle(html)
    const description =
      extractMeta(html, 'og:description') ||
      extractMeta(html, 'description') ||
      extractMeta(html, 'twitter:description')
    const image = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image')
    const siteName = extractMeta(html, 'og:site_name')
    const icon = extractLinkRel(html, 'icon') || extractLinkRel(html, 'apple-touch-icon')

    const jsonLd = extractJsonLd(html).flatMap(normalizeJsonLd)
    const businessNode = pickBusinessNode(jsonLd)
    const address = buildAddress(businessNode?.address)
    const logo = extractImageUrl(businessNode?.logo) || extractImageUrl(businessNode?.image) || icon || null
    const services = extractServices(businessNode)

    const name =
      businessNode?.name ||
      title ||
      siteName ||
      null
    const phone = businessNode?.telephone || null
    const email = businessNode?.email || null
    const industry =
      businessNode?.industry ||
      businessNode?.servesCuisine ||
      businessNode?.category ||
      null
    const website = businessNode?.url || res.url || normalizedUrl

    const socialLinks = extractSocials(html)

    return NextResponse.json({
      url: normalizedUrl,
      fetchedUrl: res.url,
      name,
      description,
      image,
      logo,
      banner: image,
      phone,
      email,
      industry,
      services,
      website,
      address,
      socialLinks,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to import website.' }, { status: 500 })
  }
}
