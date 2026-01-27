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

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (openaiApiKey) {
      const systemPrompt = `You are an AI profile-builder for a talent discovery platform.
Your task is to analyse a company’s public website and generate a Public Talent Profile (Lite) that is clear, neutral, and attractive to jobseekers.

OUTPUT FORMAT (STRICT)
Return a single JSON object:
{
  "profile": {
    "company_name": "",
    "short_summary": "",
    "what_they_do": "",
    "primary_industries": [],
    "locations": [],
    "company_size_range": "",
    "culture_and_values": "",
    "what_its_like_to_work_here": "",
    "typical_roles_hired": []
  },
  "images": {
    "avatar_image_prompt": "",
    "banner_image_prompt": ""
  }
}`

      const userPrompt = `website_url: ${normalizedUrl || 'N/A'}
optional_text: ${pastedText || 'N/A'}
extracted_name: ${meta?.name || 'N/A'}
extracted_description: ${meta?.description || 'N/A'}
extracted_industry: ${meta?.industry || 'N/A'}
extracted_locations: ${meta?.address?.full || 'N/A'}
extracted_services: ${Array.isArray(meta?.services) ? meta.services.join(', ') : 'N/A'}
brand_hint: ${meta?.siteName || 'N/A'}

Generate the Public Talent Profile (Lite) content and image prompts.`

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 900,
          response_format: { type: 'json_object' },
        }),
      })

      if (aiRes.ok) {
        const data = await aiRes.json()
        const raw = data.choices?.[0]?.message?.content?.trim() || '{}'
        const parsed = JSON.parse(raw)
        return NextResponse.json({
          name: parsed?.profile?.company_name || meta?.name || null,
          summary: parsed?.profile?.short_summary || null,
          what_company_does: parsed?.profile?.what_they_do || null,
          culture_values: parsed?.profile?.culture_and_values || null,
          work_environment: parsed?.profile?.what_its_like_to_work_here || null,
          typical_roles: Array.isArray(parsed?.profile?.typical_roles_hired)
            ? parsed.profile.typical_roles_hired.join(', ')
            : parsed?.profile?.typical_roles_hired || null,
          industries: Array.isArray(parsed?.profile?.primary_industries)
            ? parsed.profile.primary_industries
            : [],
          company_size: parsed?.profile?.company_size_range || null,
          locations: Array.isArray(parsed?.profile?.locations) ? parsed.profile.locations : [],
          website: meta?.website || normalizedUrl || null,
          logo_url: meta?.logo || null,
          banner_url: meta?.banner || null,
          avatar_prompt: parsed?.images?.avatar_image_prompt || null,
          banner_prompt: parsed?.images?.banner_image_prompt || null,
          source_url: normalizedUrl || null,
          source_text: pastedText || null,
          services: meta?.services || [],
        })
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
      avatar_prompt: null,
      banner_prompt: null,
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
