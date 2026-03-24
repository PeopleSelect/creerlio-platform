// ─── Script + scene prompt generator (GPT-4o) ────────────────────────────────

import OpenAI from 'openai'
import type { GeneratedScript, SceneScript, VideoStyle } from './types'

const STYLE_INSTRUCTIONS: Record<VideoStyle, string> = {
  corporate: 'Professional, clean, authoritative. Modern office environments, confident people, blue/white palette. Suitable for B2B audiences.',
  cinematic: 'Dramatic, high-production feel. Wide establishing shots, moody lighting, dynamic transitions. Emotional storytelling.',
  social: 'Energetic, fast-paced, eye-catching. Bold colours, quick cuts, text overlays. Optimised for social media engagement.',
  product: 'Clean product showcase. Macro detail shots, white/neutral backgrounds, sleek animations. Focus on features and quality.',
}

export async function generateVideoScript(
  openai: OpenAI,
  opts: {
    title: string
    description?: string
    style: VideoStyle
    duration_secs: number
    brief?: string
    companyName?: string
    industry?: string
  }
): Promise<GeneratedScript> {
  // How many scenes: ~5s per scene, clamped 2–8
  const sceneCount = Math.max(2, Math.min(8, Math.round(opts.duration_secs / 5)))

  const systemPrompt = `You are a professional video scriptwriter and creative director.
Generate a complete video script with exactly ${sceneCount} scenes.
Style: ${opts.style} — ${STYLE_INSTRUCTIONS[opts.style]}

Respond with valid JSON only — no markdown fences, no extra text.
Schema:
{
  "full_narration": "Complete voice-over script as a single flowing paragraph",
  "scenes": [
    {
      "title": "Short scene title",
      "prompt": "Detailed Runway text-to-video prompt describing visuals (50-100 words). Be specific about camera movement, lighting, subjects, atmosphere.",
      "narration": "Voice-over text for this specific scene (1-3 sentences)",
      "duration_secs": 5
    }
  ]
}

Rules:
- total scene duration must sum to approximately ${opts.duration_secs} seconds
- each scene must have a distinct visual moment — no repetition
- prompts must be safe-for-work and avoid real people's names
- narration should flow naturally as a single voice-over when scenes are concatenated`

  const userContent = [
    `Title: ${opts.title}`,
    opts.description ? `Description: ${opts.description}` : '',
    opts.companyName ? `Company: ${opts.companyName}` : '',
    opts.industry ? `Industry: ${opts.industry}` : '',
    opts.brief ? `\nBrief / key messages:\n${opts.brief}` : '',
  ].filter(Boolean).join('\n')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as GeneratedScript

  // Validate / normalise
  if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error('GPT returned no scenes in script')
  }

  parsed.scenes = parsed.scenes.map((s: SceneScript, i: number) => ({
    title: s.title ?? `Scene ${i + 1}`,
    prompt: s.prompt ?? opts.title,
    narration: s.narration ?? '',
    duration_secs: s.duration_secs ?? 5,
  }))

  parsed.full_narration = parsed.full_narration ?? parsed.scenes.map((s) => s.narration).join(' ')

  return parsed
}
