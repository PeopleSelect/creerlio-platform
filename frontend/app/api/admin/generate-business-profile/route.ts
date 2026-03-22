import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'

export const runtime = 'nodejs'
export const maxDuration = 300

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

function isAdminUser(user: { email?: string | null; user_metadata?: Record<string, any> | null }) {
  const metadata = user.user_metadata || {}
  if (metadata.is_admin === true || metadata.admin === true) return true
  const email = (user.email || '').toLowerCase()
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  return !!email && adminEmails.includes(email)
}

export async function POST(req: NextRequest) {
  // Validate admin
  const authz = req.headers.get('authorization') || ''
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : ''
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdminClient()
  const { data: { user: authedUser } } = await admin.auth.getUser(token)
  if (!authedUser?.id || !isAdminUser(authedUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { websiteUrl, linkedinUrl, youtubeUrl, slug } = await req.json()
  if (!websiteUrl) return NextResponse.json({ error: 'websiteUrl is required' }, { status: 400 })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (_) {}
      }

      const args = ['scripts/create-business-profile.js', '--website', websiteUrl]
      if (linkedinUrl) args.push('--linkedin', linkedinUrl)
      if (youtubeUrl)  args.push('--youtube',  youtubeUrl)
      if (slug)        args.push('--slug',      slug)

      const proc = spawn('node', args, {
        cwd: process.cwd(),
        env: { ...process.env },
      })

      proc.stdout.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n')
        lines.forEach(line => {
          if (line.trim()) send({ log: line })
        })
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        const line = chunk.toString().trim()
        if (line) send({ log: line, isError: true })
      })

      proc.on('close', (code) => {
        if (code === 0) {
          send({ done: true })
        } else {
          send({ error: `Process exited with code ${code}` })
        }
        try { controller.close() } catch (_) {}
      })

      proc.on('error', (err) => {
        send({ error: err.message })
        try { controller.close() } catch (_) {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
