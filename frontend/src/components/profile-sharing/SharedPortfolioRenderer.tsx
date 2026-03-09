'use client'

import { useEffect } from 'react'

function safeArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function isExternalUrl(path?: string | null) {
  return !!path && /^https?:\/\//i.test(path)
}

function getEmbedUrl(url?: string | null) {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      return v ? `https://www.youtube.com/embed/${v}` : null
    }
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (host.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean)[0]
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {}
  return null
}

export function SharedPortfolioRenderer({
  payload,
  mediaUrls,
}: {
  payload: any
  mediaUrls: { avatar_url?: string | null; intro_video_url?: string | null }
}) {
  // Best-effort download protection (client-side)
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => e.preventDefault()
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && (key === 's' || key === 'u' || key === 'p')) e.preventDefault()
      if (e.key === 'F12') e.preventDefault()
    }
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const intro = payload?.sections?.intro || {}
  const skills = safeArray<string>(payload?.sections?.skills)
  const social = safeArray<any>(payload?.sections?.social)
  const experience = safeArray<any>(payload?.sections?.experience)
  const education = safeArray<any>(payload?.sections?.education)
  const projects = safeArray<any>(payload?.sections?.projects)
  const attachments = safeArray<any>(payload?.sections?.attachments)
  const referees = safeArray<any>(payload?.sections?.referees)

  const avatar = mediaUrls?.avatar_url || null
  const introVideo = mediaUrls?.intro_video_url || null
  const embed = introVideo && isExternalUrl(introVideo) ? getEmbedUrl(introVideo) : null

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full bg-slate-950 text-white rounded-b-3xl shadow-lg px-8 py-10 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-shrink-0">
          <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white/20 bg-white/10 shadow-xl">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt="Avatar"
                className="w-full h-full object-cover select-none pointer-events-none"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-4xl">
                {(String(intro?.name || 'T').slice(0, 1) || 'T').toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 break-words">{intro?.name || 'Talent Profile'}</h1>
          <div className="text-lg md:text-2xl text-slate-300 mb-2 break-words">{intro?.title || ''}</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {intro?.bio ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-slate-800 whitespace-pre-wrap text-lg">{intro.bio}</div>
              </section>
            ) : null}

            {introVideo ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Introduction Video</h2>
                <div className="rounded-3xl overflow-hidden bg-slate-100 border border-slate-200">
                  {embed ? (
                    <iframe
                      src={embed}
                      className="w-full aspect-video bg-black"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Introduction Video"
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  ) : (
                    <video
                      src={introVideo}
                      controls
                      playsInline
                      controlsList="nodownload"
                      className="w-full bg-black select-none"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                    />
                  )}
                </div>
              </section>
            ) : null}

            {skills.length ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {experience.length ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Experience</h2>
                <div className="space-y-4">
                  {experience.map((exp: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="font-semibold text-slate-900">{exp.title || 'Role'}</div>
                      <div className="text-slate-700 text-sm mt-1">{exp.company || 'Company'}</div>
                      {exp.description ? (
                        <div className="mt-3 text-slate-700 text-sm whitespace-pre-wrap">{exp.description}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {education.length ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Education</h2>
                <div className="space-y-4">
                  {education.map((edu: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="font-semibold text-slate-900">{edu.degree || edu.course || 'Qualification'}</div>
                      <div className="text-slate-700 text-sm mt-1">{edu.institution || 'Institution'}</div>
                      {edu.year ? <div className="text-slate-500 text-sm mt-1">{edu.year}</div> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {projects.length ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Projects</h2>
                <div className="space-y-4">
                  {projects.map((project: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="font-semibold text-slate-900">{project.name || project.title || 'Project'}</div>
                      {project.description ? (
                        <div className="text-slate-700 text-sm mt-2 whitespace-pre-wrap">{project.description}</div>
                      ) : null}
                      {project.url ? (
                        <a className="text-sm text-blue-700 hover:underline mt-2 inline-block" href={project.url} target="_blank" rel="noreferrer">
                          {project.url}
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="lg:col-span-4 space-y-6">
            {social.length ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">My Social Media</h2>
                <div className="space-y-2">
                  {social.map((link: any, idx: number) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                    >
                      <div className="font-medium">{link.platform || 'Link'}</div>
                      <div className="text-xs text-slate-500 break-all">{link.url}</div>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            {referees.length ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">References</h2>
                <div className="space-y-3">
                  {referees.map((r: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="font-semibold text-slate-900">{r.name || 'Referee'}</div>
                      {r.relationship ? <div className="text-slate-600 text-sm">{r.relationship}</div> : null}
                      {r.company ? <div className="text-slate-600 text-sm">{r.company}</div> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {attachments.length ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Documents</h2>
                <div className="space-y-2">
                  {attachments.map((a: any, idx: number) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="font-medium text-slate-900 text-sm">{a.title || a.name || 'Document'}</div>
                      <div className="text-xs text-slate-500">Download disabled (ask talent for permission).</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

