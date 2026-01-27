import { NextRequest, NextResponse } from 'next/server'

const SENTENCE_SPLIT = /(?<=[.!?])\s+/
const NOISE_WORDS = [
  'order',
  'buy',
  'sale',
  'discount',
  'subscribe',
  'newsletter',
  'limited time',
  'promo',
  'menu',
  'cart',
]

const summarizeText = (text: string, maxSentences = 4) => {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const sentences = cleaned.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean)
  const filtered = sentences.filter((s) => !NOISE_WORDS.some((w) => s.toLowerCase().includes(w)))
  const pick = (filtered.length ? filtered : sentences).slice(0, maxSentences)
  return pick.join(' ')
}

const extractKeywordLines = (text: string, keywords: string[]) => {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  return lines.filter((line) => keywords.some((k) => line.toLowerCase().includes(k)))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawUrl = String(body?.url || '').trim()
    const pastedText = String(body?.pastedText || '').trim()
    const normalizedUrl = rawUrl ? (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`) : ''

    let meta: any = null
    if (normalizedUrl) {
      const origin = request.nextUrl.origin
      const res = await fetch(`${origin}/api/website/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      })
      if (res.ok) {
        meta = await res.json()
      }
    }

    const baseText = pastedText || meta?.description || ''
    const summary = summarizeText(baseText, 4)
    const whatCompanyDoes = summarizeText(baseText, 2)

    const cultureLines = extractKeywordLines(pastedText || '', ['culture', 'values', 'mission'])
    const rolesLines = extractKeywordLines(pastedText || '', ['role', 'hiring', 'careers', 'positions'])
    const workLines = extractKeywordLines(pastedText || '', ['work', 'team', 'environment'])

    return NextResponse.json({
      name: meta?.name || null,
      summary,
      what_company_does: whatCompanyDoes,
      culture_values: cultureLines.slice(0, 4).join('\n') || null,
      work_environment: workLines.slice(0, 3).join('\n') || null,
      typical_roles: rolesLines.slice(0, 4).join('\n') || null,
      industries: meta?.industry ? [meta.industry] : [],
      company_size: null,
      locations: meta?.address?.full ? [meta.address.full] : [],
      website: meta?.website || normalizedUrl || null,
      logo_url: meta?.logo || null,
      banner_url: meta?.banner || null,
      source_url: normalizedUrl || null,
      source_text: pastedText || null,
      services: meta?.services || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to import website.' },
      { status: 500 }
    )
  }
}
