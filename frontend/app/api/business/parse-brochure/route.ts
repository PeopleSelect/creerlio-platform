import { NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'

export const runtime = 'nodejs'

type ParsedBrochure = {
  summary: string
  highlights: string[]
  rawText?: string
}

function env(name: string) {
  const v = process.env[name]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function clipText(text: string) {
  const max = 22000
  if (text.length <= max) return text
  const head = text.slice(0, 14000)
  const tail = text.slice(-6000)
  return `${head}\n\n--- SNIP ---\n\n${tail}`
}

async function summarizeWithOpenAI(rawText: string): Promise<ParsedBrochure | null> {
  const apiKey = env('OPENAI_API_KEY')
  if (!apiKey) return null

  const model = env('OPENAI_MODEL') || 'gpt-4o-mini'
  const text = clipText(rawText)
  const prompt = [
    'You are extracting business brochure details for a Business Bank.',
    'Return ONLY valid JSON in this shape:',
    JSON.stringify(
      {
        summary: 'string',
        highlights: ['string'],
      },
      null,
      2
    ),
    'Rules:',
    '- summary should be 3-6 sentences.',
    '- highlights should be short bullets (max 8).',
    '- Use only the provided brochure text.',
  ].join('\n')

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: text },
      ],
    }),
  })

  if (!resp.ok) return null
  const data = await resp.json()
  const raw = data?.choices?.[0]?.message?.content
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const summary = String(parsed?.summary || '').trim()
    const highlights = Array.isArray(parsed?.highlights)
      ? parsed.highlights.map((h: any) => String(h || '').trim()).filter(Boolean).slice(0, 8)
      : []
    if (!summary) return null
    return { summary, highlights }
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Brochure file is required.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const pdf = await pdfParse(buffer)
    const rawText = String(pdf.text || '').trim()

    if (!rawText) {
      return NextResponse.json({ error: 'No text found in brochure.' }, { status: 400 })
    }

    const ai = await summarizeWithOpenAI(rawText)
    if (ai) {
      return NextResponse.json({ ...ai, rawText })
    }

    const summary = rawText.slice(0, 1200)
    const highlights = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 24)
      .slice(0, 6)

    const fallback: ParsedBrochure = {
      summary,
      highlights,
      rawText,
    }

    return NextResponse.json(fallback)
  } catch (err: any) {
    console.error('Brochure parse error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to parse brochure.' }, { status: 500 })
  }
}
