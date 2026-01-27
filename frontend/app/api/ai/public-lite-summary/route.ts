import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payload = body?.payload || {}

    const name = String(payload.name || '').trim()
    const what = String(payload.what_company_does || '').trim()
    const culture = String(payload.culture_values || '').trim()
    const environment = String(payload.work_environment || '').trim()
    const roles = String(payload.typical_roles || '').trim()
    const industries = Array.isArray(payload.industries) ? payload.industries : []
    const locations = Array.isArray(payload.locations) ? payload.locations : []

    if (!name) {
      return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
    }

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please add OPENAI_API_KEY.' },
        { status: 503 }
      )
    }

    const systemPrompt = `You write short, talent-friendly company summaries.
Requirements:
- 2 to 4 sentences
- Neutral, clear tone (no marketing fluff)
- Explain what the company does and its work environment
- Mention industries and location if provided
- Do not invent facts`

    const userPrompt = `Business name: ${name}
Industries: ${industries.join(', ') || 'N/A'}
Locations: ${locations.join(', ') || 'N/A'}
What the company does: ${what || 'N/A'}
Culture & values: ${culture || 'N/A'}
Work environment: ${environment || 'N/A'}
Typical roles: ${roles || 'N/A'}

Write the short summary.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        max_tokens: 220,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      const rawMessage = String(errorData.error?.message || 'Failed to generate summary')
      const scrubbedMessage = rawMessage.replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-***')
      return NextResponse.json({ error: scrubbedMessage }, { status: response.status })
    }

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content?.trim()
    if (!summary) {
      return NextResponse.json({ error: 'No summary returned from AI.' }, { status: 500 })
    }

    return NextResponse.json({ summary })
  } catch (error: any) {
    const safeMessage = String(error?.message || 'Failed to generate summary').replace(
      /sk-[a-zA-Z0-9_-]+/g,
      'sk-***'
    )
    return NextResponse.json({ error: safeMessage }, { status: 500 })
  }
}
