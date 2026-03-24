// ─── Runway ML API client ─────────────────────────────────────────────────────
// API docs: https://docs.runwayml.com/reference/text-to-video
//
// Runway Gen-3 Alpha Turbo — text_to_video endpoint
// POST /v1/text_to_video  →  { id: taskId }
// GET  /v1/tasks/{id}     →  { status, output[], progress }

import type { RunwayPollResult } from './types'

const RUNWAY_BASE = 'https://api.runwayml.com/v1'
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY || ''

function runwayHeaders() {
  return {
    'Authorization': `Bearer ${RUNWAY_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Runway-Version': '2024-11-06',
  }
}

/** Submit a text-to-video generation job. Returns the Runway task ID. */
export async function submitRunwayTask(
  prompt: string,
  options: {
    duration?: 5 | 10
    ratio?: '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960' | '1584:672'
    seed?: number
  } = {}
): Promise<string> {
  if (!RUNWAY_API_KEY) throw new Error('RUNWAY_API_KEY not configured')

  const body = {
    model: 'gen3a_turbo',
    promptText: prompt,
    duration: options.duration ?? 5,
    ratio: options.ratio ?? '1280:720',
    ...(options.seed !== undefined ? { seed: options.seed } : {}),
  }

  const res = await fetch(`${RUNWAY_BASE}/text_to_video`, {
    method: 'POST',
    headers: runwayHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Runway submit failed ${res.status}: ${text}`)
  }

  const json = await res.json()
  if (!json.id) throw new Error(`Runway returned no task id: ${JSON.stringify(json)}`)
  return json.id as string
}

/** Poll a Runway task until terminal status (SUCCEEDED/FAILED) or timeout. */
export async function pollRunwayTask(
  taskId: string,
  opts: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<RunwayPollResult> {
  const timeout = opts.timeoutMs ?? 5 * 60 * 1000       // 5 min
  const interval = opts.pollIntervalMs ?? 8_000
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    const res = await fetch(`${RUNWAY_BASE}/tasks/${taskId}`, {
      headers: runwayHeaders(),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Runway poll failed ${res.status}: ${text}`)
    }

    const json = await res.json()
    const status: RunwayPollResult['status'] = json.status

    if (status === 'SUCCEEDED') {
      return { status, output: json.output ?? [], progress: 100 }
    }
    if (status === 'FAILED') {
      return { status, error: json.error ?? 'Runway generation failed' }
    }

    // Still running — wait then retry
    await new Promise((r) => setTimeout(r, interval))
  }

  return { status: 'FAILED', error: 'Runway polling timed out' }
}

/** Map our AspectRatio to the nearest Runway supported ratio */
export function toRunwayRatio(
  aspect: '16:9' | '9:16' | '1:1'
): '1280:720' | '720:1280' | '960:960' {
  if (aspect === '9:16') return '720:1280'
  if (aspect === '1:1') return '960:960'
  return '1280:720'
}
