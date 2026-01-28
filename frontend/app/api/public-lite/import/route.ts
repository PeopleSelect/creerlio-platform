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

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawUrl = String(body?.url || '').trim()
    const pastedText = String(body?.pastedText || '').trim()
    const industryHint = String(body?.industryHint || '').trim()
    const aiMode = String(body?.aiMode || 'safe').trim() || 'safe'
    const regenImagesOnly = body?.regenImagesOnly === true
    const currentProfile = body?.currentProfile || {}
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
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please add OPENAI_API_KEY.' },
        { status: 503 }
      )
    }

    const systemPrompt = `You are an autonomous AI import engine embedded inside a talent discovery platform.
Follow the ai_mode behavior rules:
- safe: conservative wording, realistic imagery, neutral tone, corporate-appropriate visuals.
- creative: warmer language, lifestyle-oriented imagery, more colour and personality.
- premium_brand: polished, minimal copy, high-end editorial imagery, brand-forward composition.

Output format (STRICT):
{
  "profile": {
    "business_name": "",
    "short_tagline": "",
    "short_summary": "",
    "what_the_business_does": "",
    "primary_industries": [],
    "company_size_range": "",
    "locations": [],
    "culture_and_values": "",
    "what_its_like_to_work_here": "",
    "typical_roles_hired": []
  },
  "ai_images": {
    "avatar_image_prompt": "",
    "banner_image_prompt": ""
  }
}`

    const userPrompt = `website_url: ${normalizedUrl || 'N/A'}
industry_hint: ${industryHint || 'N/A'}
pasted_text: ${pastedText || 'N/A'}
ai_mode: ${aiMode}
regen_images_only: ${regenImagesOnly ? 'true' : 'false'}
current_profile_json: ${JSON.stringify(currentProfile)}
extracted_name: ${meta?.name || 'N/A'}
extracted_description: ${meta?.description || 'N/A'}
extracted_industry: ${meta?.industry || 'N/A'}
extracted_locations: ${meta?.address?.full || 'N/A'}
extracted_services: ${Array.isArray(meta?.services) ? meta.services.join(', ') : 'N/A'}
brand_hint: ${meta?.siteName || 'N/A'}

Generate the Public Talent Profile (Lite) content and image prompts. If regen_images_only is true, do not change any text fields; return the same profile text as current_profile_json and only refresh ai_images.`

    const aiRes = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    }, 45000)

    if (!aiRes.ok) {
      const errorData = await aiRes.json().catch(() => ({ error: 'Unknown error' }))
      const rawMessage = String(errorData.error?.message || 'Failed to generate profile')
      const scrubbedMessage = rawMessage.replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-***')
      return NextResponse.json({ error: scrubbedMessage }, { status: aiRes.status })
    }

    const data = await aiRes.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || '{}'
    const parsed = JSON.parse(raw)

    const avatarPrompt = parsed?.ai_images?.avatar_image_prompt || null
    const bannerPrompt = parsed?.ai_images?.banner_image_prompt || null
    let logoUrl = meta?.logo || null
    let bannerUrl = meta?.banner || null

    if (avatarPrompt || bannerPrompt) {
      try {
        if (avatarPrompt) {
          const imgRes = await fetchWithTimeout('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
              prompt: avatarPrompt,
              size: '1024x1024',
              n: 1,
            }),
          }, 45000)
          if (imgRes.ok) {
            const imgData = await imgRes.json()
            logoUrl = imgData?.data?.[0]?.url || logoUrl
          } else {
            console.error('Avatar image generation failed:', await imgRes.text())
          }
        }
        if (bannerPrompt) {
          const bannerRes = await fetchWithTimeout('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
              prompt: bannerPrompt,
              size: '1792x1024',
              n: 1,
            }),
          }, 45000)
          if (bannerRes.ok) {
            const bannerData = await bannerRes.json()
            bannerUrl = bannerData?.data?.[0]?.url || bannerUrl
          } else {
            console.error('Banner image generation failed:', await bannerRes.text())
          }
        }
      } catch (imgError: any) {
        console.error('Image generation error:', imgError?.message || imgError)
        // If image generation fails, keep existing URLs/prompts and return text anyway.
      }
    }

    const resolvedProfile = regenImagesOnly
      ? currentProfile
      : {
          business_name: parsed?.profile?.business_name || meta?.name || null,
          short_tagline: parsed?.profile?.short_tagline || null,
          short_summary: parsed?.profile?.short_summary || null,
          what_the_business_does: parsed?.profile?.what_the_business_does || null,
          culture_and_values: parsed?.profile?.culture_and_values || null,
          what_its_like_to_work_here: parsed?.profile?.what_its_like_to_work_here || null,
          typical_roles_hired: parsed?.profile?.typical_roles_hired || null,
          primary_industries: parsed?.profile?.primary_industries || (industryHint ? [industryHint] : []),
          company_size_range: parsed?.profile?.company_size_range || null,
          locations: parsed?.profile?.locations || [],
        }

    return NextResponse.json({
      name: resolvedProfile.business_name || meta?.name || null,
      short_tagline: resolvedProfile.short_tagline || null,
      summary: resolvedProfile.short_summary || null,
      what_company_does: resolvedProfile.what_the_business_does || null,
      culture_values: resolvedProfile.culture_and_values || null,
      work_environment: resolvedProfile.what_its_like_to_work_here || null,
      typical_roles: Array.isArray(resolvedProfile.typical_roles_hired)
        ? resolvedProfile.typical_roles_hired.join(', ')
        : resolvedProfile.typical_roles_hired || null,
      industries: Array.isArray(resolvedProfile.primary_industries)
        ? resolvedProfile.primary_industries
        : (industryHint ? [industryHint] : []),
      company_size: resolvedProfile.company_size_range || null,
      locations: Array.isArray(resolvedProfile.locations) ? resolvedProfile.locations : [],
      website: meta?.website || normalizedUrl || null,
      logo_url: logoUrl,
      banner_url: bannerUrl,
      avatar_prompt: avatarPrompt,
      banner_prompt: bannerPrompt,
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
