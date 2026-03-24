'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Scene {
  id: string
  scene_order: number
  title?: string | null
  prompt: string
  narration?: string | null
  duration_secs: number
  status: 'pending' | 'generating' | 'completed' | 'failed'
  stored_url?: string | null
  error_message?: string | null
  attempts: number
}

interface SceneEditorProps {
  scene: Scene
  onUpdated?: (scene: Scene) => void
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  generating: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export default function SceneEditor({ scene, onUpdated }: SceneEditorProps) {
  const [expanded, setExpanded] = useState(false)
  const [prompt, setPrompt] = useState(scene.prompt)
  const [narration, setNarration] = useState(scene.narration ?? '')
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState('')

  async function handleRegenerate() {
    setError('')
    setRegenerating(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const res = await fetch(`/api/video/scene/${scene.id}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Regeneration failed')

      onUpdated?.({
        ...scene,
        prompt,
        narration,
        status: 'completed',
        stored_url: data.stored_url,
        attempts: scene.attempts + 1,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
            {scene.scene_order + 1}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-800">{scene.title ?? `Scene ${scene.scene_order + 1}`}</p>
            <p className="text-xs text-gray-500">{scene.duration_secs}s</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[scene.status] ?? STATUS_BADGE.pending}`}>
            {scene.status}
          </span>
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100">

          {/* Preview */}
          {scene.stored_url && (
            <div className="mt-3">
              <video
                src={scene.stored_url}
                controls
                className="w-full rounded-lg max-h-48 object-cover bg-black"
              />
            </div>
          )}

          {scene.error_message && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 rounded px-3 py-2">
              Error: {scene.error_message}
            </div>
          )}

          {/* Prompt editor */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Visual prompt (Runway)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Narration editor */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Narration (voice-over)
            </label>
            <textarea
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="rounded-lg border border-blue-500 text-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {regenerating ? 'Regenerating…' : 'Regenerate this scene'}
          </button>
        </div>
      )}
    </div>
  )
}
