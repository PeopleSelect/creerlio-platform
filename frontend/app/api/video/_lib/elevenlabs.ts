// ─── ElevenLabs TTS client ────────────────────────────────────────────────────
// POST /v1/text-to-speech/{voice_id}  →  audio/mpeg binary

import fs from 'fs'

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1'
const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY || ''

// Default voice — Rachel (en-US, neutral professional)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'

interface TTSOptions {
  voice_id?: string
  model_id?: string
  stability?: number
  similarity_boost?: number
  style?: number
  use_speaker_boost?: boolean
}

/** Generate speech for `text` and save MP3 to `destPath`. Returns path. */
export async function textToSpeech(
  text: string,
  destPath: string,
  options: TTSOptions = {}
): Promise<string> {
  if (!ELEVEN_API_KEY) throw new Error('ELEVENLABS_API_KEY not configured')

  const voiceId = options.voice_id ?? DEFAULT_VOICE_ID
  const modelId = options.model_id ?? 'eleven_turbo_v2'

  const body = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: options.stability ?? 0.5,
      similarity_boost: options.similarity_boost ?? 0.75,
      style: options.style ?? 0,
      use_speaker_boost: options.use_speaker_boost ?? true,
    },
  }

  const res = await fetch(`${ELEVEN_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVEN_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ElevenLabs TTS failed ${res.status}: ${text}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(destPath, buffer)
  return destPath
}

/** Get available voices from ElevenLabs (for voice picker UI) */
export async function getVoices(): Promise<Array<{ id: string; name: string; preview_url: string }>> {
  if (!ELEVEN_API_KEY) return []

  const res = await fetch(`${ELEVEN_BASE}/voices`, {
    headers: { 'xi-api-key': ELEVEN_API_KEY },
  })

  if (!res.ok) return []
  const json = await res.json()
  return (json.voices ?? []).map((v: any) => ({
    id: v.voice_id,
    name: v.name,
    preview_url: v.preview_url,
  }))
}
