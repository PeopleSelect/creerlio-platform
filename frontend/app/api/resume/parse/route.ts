import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type ParsedResume = {
  fields: {
    name?: string | null
    email?: string | null
    phone?: string | null
  }
  skills: string[]
  experience: Array<{
    company: string
    title: string
    startDate: string
    endDate: string
    description: string
  }>
  education: Array<{
    institution: string
    course?: string
    degree?: string
    field?: string
    year?: string
    notes?: string
  }>
}

function logToIngest(hypothesisId: string, message: string, data: any) {
  fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'run-resume-parse',
      hypothesisId,
      location: 'app/api/resume/parse/route.ts',
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
}

function normalizeText(t: string) {
  return t
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractEmail(text: string) {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return m?.[0] ?? null
}

function extractPhone(text: string) {
  // Very loose: keep only digits, allow +, spaces, hyphens; require 8-15 digits total.
  const candidates = text.match(/(\+?\d[\d ()-]{7,}\d)/g) ?? []
  for (const c of candidates) {
    const digits = c.replace(/[^\d]/g, '')
    if (digits.length >= 8 && digits.length <= 15) return c.trim()
  }
  return null
}

function extractName(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  for (const l of lines.slice(0, 8)) {
    if (l.length > 60) continue
    if (/@/.test(l)) continue
    if (/\d/.test(l)) continue
    const words = l.split(/\s+/)
    if (words.length >= 2 && words.length <= 4) return l
  }
  return null
}

function findSection(text: string, headings: string[]) {
  const lower = text.toLowerCase()
  const indexes = headings
    .map((h) => ({ h, i: lower.indexOf(h.toLowerCase()) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)
  if (!indexes.length) return null
  const start = indexes[0].i
  // end at next likely heading
  const nextHeadingMatch = lower.slice(start + 1).match(/\n\s*(experience|work experience|employment|education|skills|projects|certifications|licenses|summary|profile)\s*\n/i)
  const end = nextHeadingMatch ? start + 1 + (nextHeadingMatch.index ?? 0) : text.length
  return text.slice(start, end)
}

function parseSkills(text: string): string[] {
  const sec = findSection(text, ['skills', 'technical skills', 'key skills'])
  if (!sec) return []
  const lines = sec
    .split('\n')
    .map((l) => l.replace(/^[•\-\u2022]\s*/, '').trim())
    .filter((l) => l && !/^skills/i.test(l))
  const merged = lines.join(' • ')
  const parts = merged
    .split(/[•,|]/g)
    .map((s) => s.trim())
    .filter(Boolean)
  // de-dupe small set
  const out: string[] = []
  for (const p of parts) {
    if (!out.some((x) => x.toLowerCase() === p.toLowerCase())) out.push(p)
  }
  return out.slice(0, 40)
}

function parseExperience(text: string): ParsedResume['experience'] {
  const sec = findSection(text, ['work experience', 'experience', 'employment history', 'employment'])
  if (!sec) return []
  const lines = sec.split('\n').map((l) => l.trim()).filter(Boolean)
  const entries: ParsedResume['experience'] = []

  // Heuristic: start new entry on a line containing a date range
  const dateRe =
    /(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b\s+\d{4}|\b\d{4}\b)\s*(?:–|-|to)\s*(present|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b\s+\d{4}|\b\d{4}\b)/i

  let cur: any = null
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (/^(work experience|experience|employment)/i.test(l)) continue
    const dm = l.match(dateRe)
    if (dm) {
      if (cur) entries.push(cur)
      cur = {
        company: '',
        title: '',
        startDate: dm[1] ?? '',
        endDate: dm[2] ?? '',
        description: '',
      }
      // attempt to read previous/next lines for title/company
      const prev = lines[i - 1] ?? ''
      const next = lines[i + 1] ?? ''
      const pick = (s: string) => s && s.length <= 80 ? s : ''
      // Common formats: "Company — Title" or "Title — Company"
      const dashSplit = prev.split('—').map((x) => x.trim())
      if (dashSplit.length === 2) {
        cur.company = pick(dashSplit[0])
        cur.title = pick(dashSplit[1])
      } else {
        cur.title = pick(prev)
        cur.company = pick(next)
      }
      continue
    }
    if (!cur) continue
    cur.description += (cur.description ? '\n' : '') + l
  }
  if (cur) entries.push(cur)

  // Normalize & cap
  return entries
    .map((e) => ({
      company: e.company || 'Company',
      title: e.title || 'Role',
      startDate: e.startDate || '',
      endDate: e.endDate || '',
      description: (e.description || '').trim(),
    }))
    .filter((e) => e.description || e.company || e.title)
    .slice(0, 12)
}

function parseEducation(text: string): ParsedResume['education'] {
  const sec = findSection(text, ['education', 'qualifications'])
  if (!sec) return []
  const lines = sec.split('\n').map((l) => l.trim()).filter(Boolean)
  const entries: ParsedResume['education'] = []

  // Heuristic: each non-heading block is an entry; detect years
  const yearRe = /\b(19|20)\d{2}\b/
  let cur: any = null
  for (const l of lines) {
    if (/^(education|qualifications)/i.test(l)) continue
    if (!cur) cur = { institution: '', course: '', year: '', notes: '' }
    if (!cur.institution) {
      cur.institution = l
      continue
    }
    const ym = l.match(yearRe)
    if (ym && !cur.year) {
      cur.year = ym[0]
      continue
    }
    if (!cur.course) {
      cur.course = l
      continue
    }
    cur.notes += (cur.notes ? '\n' : '') + l
    // If notes gets long, finalize
    if (cur.notes.length > 200) {
      entries.push(cur)
      cur = null
    }
  }
  if (cur) entries.push(cur)
  return entries
    .map((e) => ({
      institution: e.institution || 'Institution',
      course: e.course || '',
      year: e.year || '',
      notes: (e.notes || '').trim() || undefined,
    }))
    .slice(0, 8)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const url = body?.url as string | undefined
    const fileType = (body?.fileType as string | undefined) ?? ''
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

    logToIngest('RP_1', 'parse start', { hasUrl: true, fileType })

    const res = await fetch(url)
    if (!res.ok) {
      logToIngest('RP_1', 'fetch failed', { status: res.status })
      return NextResponse.json({ error: `Failed to fetch file (${res.status})` }, { status: 400 })
    }

    const buf = Buffer.from(await res.arrayBuffer())
    let text = ''

    if (/pdf/i.test(fileType) || url.toLowerCase().includes('.pdf')) {
      const mod: any = await import('pdf-parse')
      const pdf = mod.default ?? mod
      const out = await pdf(buf)
      text = out?.text ?? ''
    } else if (/docx/i.test(fileType) || url.toLowerCase().includes('.docx')) {
      const mammoth: any = await import('mammoth')
      const out = await mammoth.extractRawText({ buffer: buf })
      text = out?.value ?? ''
    } else if (/text\/plain/i.test(fileType) || url.toLowerCase().includes('.txt')) {
      text = buf.toString('utf8')
    } else {
      return NextResponse.json({ error: 'Unsupported file type for parsing. Please use PDF or DOCX.' }, { status: 400 })
    }

    text = normalizeText(text)
    const parsed: ParsedResume = {
      fields: {
        name: extractName(text),
        email: extractEmail(text),
        phone: extractPhone(text),
      },
      skills: parseSkills(text),
      experience: parseExperience(text),
      education: parseEducation(text),
    }

    logToIngest('RP_2', 'parse ok', {
      textLen: text.length,
      hasName: !!parsed.fields.name,
      hasEmail: !!parsed.fields.email,
      hasPhone: !!parsed.fields.phone,
      skillsCount: parsed.skills.length,
      expCount: parsed.experience.length,
      eduCount: parsed.education.length,
    })

    // Do NOT return raw text (too large / potentially sensitive). Only structured fields.
    return NextResponse.json({ parsed })
  } catch (e: any) {
    logToIngest('RP_9', 'parse exception', { message: e?.message ?? String(e) })
    return NextResponse.json({ error: e?.message ?? 'Parse failed' }, { status: 500 })
  }
}


