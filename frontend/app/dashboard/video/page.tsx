'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import VideoBuilder from '@/components/VideoBuilder'
import VideoProjectView from '@/components/VideoProjectView'

interface ProjectSummary {
  id: string
  title: string
  style: string
  aspect_ratio: string
  duration_secs: number
  status: 'draft' | 'processing' | 'completed' | 'failed'
  final_video_url?: string | null
  thumbnail_url?: string | null
  created_at: string
}

type View = 'list' | 'create' | 'project'

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  processing: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export default function VideoPage() {
  const [view, setView] = useState<View>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  async function loadProjects() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/video/projects', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setProjects(data)
    }
    setLoadingProjects(false)
  }

  useEffect(() => { loadProjects() }, [])

  function openProject(id: string) {
    setSelectedId(id)
    setView('project')
  }

  function handleCreated(projectId: string) {
    setSelectedId(projectId)
    setView('project')
    loadProjects()
  }

  function goList() {
    setView('list')
    setSelectedId(null)
    loadProjects()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Video Studio</h1>
            <p className="text-gray-500 text-sm mt-1">Generate professional videos from your business profile</p>
          </div>
          {view === 'list' && (
            <button
              onClick={() => setView('create')}
              className="rounded-lg bg-blue-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 transition"
            >
              + New Video
            </button>
          )}
        </div>

        {/* Create form */}
        {view === 'create' && (
          <div>
            <button
              onClick={goList}
              className="text-sm text-blue-600 hover:underline mb-6 block"
            >
              ← Back to projects
            </button>
            <VideoBuilder onCreated={handleCreated} />
          </div>
        )}

        {/* Project detail */}
        {view === 'project' && selectedId && (
          <VideoProjectView projectId={selectedId} onBack={goList} />
        )}

        {/* Project list */}
        {view === 'list' && (
          <div>
            {loadingProjects ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🎬</div>
                <p className="text-gray-500 text-sm mb-6">No videos yet. Create your first AI video.</p>
                <button
                  onClick={() => setView('create')}
                  className="rounded-lg bg-blue-600 text-white px-6 py-3 text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Create Video
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => openProject(project.id)}
                    className="text-left bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition group"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                      {project.thumbnail_url ? (
                        <img
                          src={project.thumbnail_url}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : project.final_video_url ? (
                        <video
                          src={project.final_video_url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <div className="text-3xl text-gray-300">🎬</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{project.title}</p>
                        <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[project.status] ?? STATUS_BADGE.draft}`}>
                          {project.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {project.style} · {project.aspect_ratio} · {project.duration_secs}s
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
