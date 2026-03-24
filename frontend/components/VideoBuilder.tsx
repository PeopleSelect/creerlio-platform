'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export type VideoStyle = 'corporate' | 'cinematic' | 'social' | 'product'
export type AspectRatio = '16:9' | '9:16' | '1:1'

interface VideoBuilderProps {
  businessId?: string
  businessName?: string
  onCreated?: (projectId: string) => void
}

const STYLE_OPTIONS: { value: VideoStyle; label: string; desc: string }[] = [
  { value: 'corporate', label: 'Corporate', desc: 'Professional, B2B, clean' },
  { value: 'cinematic', label: 'Cinematic', desc: 'Dramatic, storytelling' },
  { value: 'social', label: 'Social', desc: 'Fast-paced, bold, social media' },
  { value: 'product', label: 'Product', desc: 'Showcase features & quality' },
]

const RATIO_OPTIONS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: '16:9', label: 'Landscape', icon: '▬' },
  { value: '9:16', label: 'Portrait', icon: '▮' },
  { value: '1:1', label: 'Square', icon: '■' },
]

const DURATION_OPTIONS = [
  { value: 15, label: '15s — Quick clip' },
  { value: 30, label: '30s — Social ad' },
  { value: 60, label: '60s — Standard' },
  { value: 90, label: '90s — Extended' },
]

export default function VideoBuilder({ businessId, businessName, onCreated }: VideoBuilderProps) {
  const [title, setTitle] = useState(businessName ? `${businessName} Brand Video` : '')
  const [description, setDescription] = useState('')
  const [brief, setBrief] = useState('')
  const [style, setStyle] = useState<VideoStyle>('corporate')
  const [ratio, setRatio] = useState<AspectRatio>('16:9')
  const [duration, setDuration] = useState(60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!title.trim()) { setError('Please enter a title'); return }
    setError('')
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const res = await fetch('/api/video/project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          brief: brief.trim() || undefined,
          style,
          aspect_ratio: ratio,
          duration_secs: duration,
          business_id: businessId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create project')

      onCreated?.(data.project_id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Create AI Video</h2>
        <p className="text-sm text-gray-500 mt-1">
          Describe your video and our AI will write the script, generate scenes, and stitch everything together.
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Video title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Company Brand Overview"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What should this video communicate?"
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Brief / key messages */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Key messages / brief</label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="List specific points you want covered — services, achievements, calls to action…"
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStyle(opt.value)}
              className={`rounded-lg border-2 px-3 py-3 text-left transition ${
                style === opt.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Aspect ratio</label>
        <div className="flex gap-3">
          {RATIO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRatio(opt.value)}
              className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm transition ${
                ratio === opt.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <span className="text-base">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDuration(opt.value)}
              className={`rounded-lg border-2 px-3 py-2 text-sm transition ${
                duration === opt.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {loading ? 'Generating script…' : 'Generate Script & Create Project'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Script generation takes ~10 seconds. Video rendering happens after you review.
      </p>
    </div>
  )
}
