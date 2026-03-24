'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import SceneEditor from './SceneEditor'

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

interface Project {
  id: string
  title: string
  style: string
  aspect_ratio: string
  duration_secs: number
  script?: string | null
  status: 'draft' | 'processing' | 'completed' | 'failed'
  final_video_url?: string | null
  thumbnail_url?: string | null
  error_message?: string | null
  scenes: Scene[]
}

interface ProgressEvent {
  type: string
  message: string
  scene_index?: number
  scene_count?: number
  progress_pct?: number
  video_url?: string
  error?: string
}

interface VideoProjectViewProps {
  projectId: string
  onBack?: () => void
}

export default function VideoProjectView({ projectId, onBack }: VideoProjectViewProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [progressLog, setProgressLog] = useState<ProgressEvent[]>([])
  const [progressPct, setProgressPct] = useState(0)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  async function loadProject() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`/api/video/project/${projectId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (!res.ok) { setError('Project not found'); return }
      const data = await res.json()
      setProject(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProject() }, [projectId])

  async function startProcessing() {
    setError('')
    setProcessing(true)
    setProgressLog([])
    setProgressPct(0)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not logged in'); setProcessing(false); return }

    abortRef.current = new AbortController()

    try {
      const res = await fetch(`/api/video/process/${projectId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => 'Unknown error')
        throw new Error(text)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt: ProgressEvent = JSON.parse(line.slice(6))
            setProgressLog((prev) => [...prev, evt])
            if (evt.progress_pct !== undefined) setProgressPct(evt.progress_pct)

            if (evt.type === 'complete') {
              await loadProject()
              setProcessing(false)
            }
            if (evt.type === 'error') {
              setError(evt.error ?? evt.message)
              setProcessing(false)
              await loadProject()
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      setProcessing(false)
    }
  }

  function updateScene(updated: Scene) {
    setProject((p) => {
      if (!p) return p
      return { ...p, scenes: p.scenes.map((s) => s.id === updated.id ? updated : s) }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return <div className="text-red-600 text-sm">{error || 'Project not found'}</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {onBack && (
            <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-1">
              ← Back to projects
            </button>
          )}
          <h2 className="text-2xl font-bold text-gray-900">{project.title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {project.style} · {project.aspect_ratio} · {project.duration_secs}s
          </p>
        </div>
        <span className={`mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${
          project.status === 'completed' ? 'bg-green-100 text-green-700'
          : project.status === 'processing' ? 'bg-yellow-100 text-yellow-700'
          : project.status === 'failed' ? 'bg-red-100 text-red-700'
          : 'bg-gray-100 text-gray-600'
        }`}>
          {project.status}
        </span>
      </div>

      {/* Final video */}
      {project.final_video_url && (
        <div className="rounded-xl overflow-hidden bg-black">
          <video
            src={project.final_video_url}
            controls
            poster={project.thumbnail_url ?? undefined}
            className="w-full max-h-80 object-contain"
          />
          <div className="flex gap-3 px-4 py-3 bg-gray-900">
            <a
              href={project.final_video_url}
              download
              className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg transition font-medium"
            >
              Download MP4
            </a>
          </div>
        </div>
      )}

      {/* Script */}
      {project.script && (
        <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Generated Script</p>
          <p className="text-sm text-gray-700 leading-relaxed">{project.script}</p>
        </div>
      )}

      {/* Processing progress */}
      {processing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Processing…</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {progressLog.slice(-6).map((evt, i) => (
              <p key={i} className={`text-xs ${evt.type === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
                {evt.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Scenes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Scenes ({project.scenes.length})
        </h3>
        <div className="space-y-2">
          {project.scenes.map((scene) => (
            <SceneEditor key={scene.id} scene={scene} onUpdated={updateScene} />
          ))}
        </div>
      </div>

      {/* Actions */}
      {(project.status === 'draft' || project.status === 'failed') && !processing && (
        <div className="pt-2">
          <button
            onClick={startProcessing}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold text-sm hover:bg-blue-700 transition"
          >
            {project.status === 'failed' ? 'Retry Processing' : 'Generate Video'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Rendering takes 3–8 minutes depending on duration. You can leave this page.
          </p>
        </div>
      )}
    </div>
  )
}
