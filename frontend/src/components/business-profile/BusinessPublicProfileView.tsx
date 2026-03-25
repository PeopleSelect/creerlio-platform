'use client'

import { useState } from 'react'

type SocialLink = { platform: string; url: string }

interface Props {
  name: string
  logo_url: string | null
  industry: string | null
  tagline: string | null
  location: string | null
  bio: string | null
  email: string | null
  socialLinks: SocialLink[]
  cultureDecisions: string | null
  cultureFeedback: string | null
  cultureConflict: string | null
  cultureSuccess: string | null
  introVideoUrl: string | null
  productCards: any[]
  jobs: any[]
  attachments: any[]
  aiSections: any[]
  aiBenefits: any | null
}

function clampStyle(lines: number): React.CSSProperties {
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  }
}

function SocialPill({ link }: { link: SocialLink }) {
  const pl = String(link.platform).toLowerCase()
  const isLinkedIn  = pl.includes('linkedin')
  const isYouTube   = pl.includes('youtube')
  const isFacebook  = pl.includes('facebook')
  const isInstagram = pl.includes('instagram')
  const isTwitter   = pl.includes('twitter') || pl === 'x'
  const isCareers   = pl.includes('career')

  const colors = isLinkedIn  ? 'border-blue-500/30 bg-blue-500/5 hover:border-blue-400/60 hover:bg-blue-500/10 text-blue-300'
               : isYouTube   ? 'border-red-500/30 bg-red-500/5 hover:border-red-400/60 hover:bg-red-500/10 text-red-300'
               : isFacebook  ? 'border-blue-600/30 bg-blue-600/5 hover:border-blue-500/60 hover:bg-blue-600/10 text-blue-400'
               : isInstagram ? 'border-pink-500/30 bg-pink-500/5 hover:border-pink-400/60 hover:bg-pink-500/10 text-pink-300'
               : isTwitter   ? 'border-slate-500/30 bg-slate-500/5 hover:border-slate-400/60 hover:bg-slate-500/10 text-slate-300'
               : isCareers   ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/60 hover:bg-emerald-500/10 text-emerald-300'
               :               'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 text-slate-300'

  const icon = isLinkedIn ? (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  ) : isYouTube ? (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  ) : isFacebook ? (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  ) : isInstagram ? (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  ) : isTwitter ? (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  ) : isCareers ? (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
  ) : (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
  )

  return (
    <a
      href={String(link.url)}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${colors}`}
    >
      {icon}
      <span>{link.platform}</span>
    </a>
  )
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function BusinessPublicProfileView({
  name,
  logo_url,
  industry,
  tagline,
  location,
  bio,
  email,
  socialLinks,
  cultureDecisions,
  cultureFeedback,
  cultureConflict,
  cultureSuccess,
  introVideoUrl,
  productCards,
  jobs,
  attachments,
  aiSections,
  aiBenefits,
}: Props) {
  const [bioExpanded, setBioExpanded] = useState(false)
  const [cultureExpanded, setCultureExpanded] = useState({ decisions: false, feedback: false, conflict: false, success: false })
  const [attachExpanded, setAttachExpanded] = useState(false)
  const [jobsExpanded, setJobsExpanded] = useState(false)

  const hasCulture = !!(cultureDecisions || cultureFeedback || cultureConflict || cultureSuccess)

  const hasIntroVideo = !!introVideoUrl

  function renderIntroVideo() {
    if (!introVideoUrl) return null
    const ytMatch = introVideoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    if (ytMatch) {
      return (
        <div className="rounded-2xl overflow-hidden bg-black border border-white/10">
          <iframe
            src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0`}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    }
    const vimeoMatch = introVideoUrl.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) {
      return (
        <div className="rounded-2xl overflow-hidden bg-black border border-white/10">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
            className="w-full aspect-video"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    }
    return (
      <a
        href={introVideoUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
      >
        <svg className="w-8 h-8 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/></svg>
        <div>
          <div className="text-white font-medium">Watch Introduction Video</div>
          <div className="text-slate-400 text-sm truncate max-w-sm">{introVideoUrl.replace(/^https?:\/\//, '')}</div>
        </div>
      </a>
    )
  }

  const visibleJobs = jobsExpanded ? jobs : jobs.slice(0, 3)
  const visibleAttachments = attachExpanded ? attachments : attachments.slice(0, 6)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top nav bar */}
      <header className="sticky top-0 z-40 backdrop-blur bg-slate-950/80 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <span className="text-slate-400 text-sm">Business Profile</span>
          <span className="text-slate-200 font-semibold">{name}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Jump to nav */}
        <nav className="sticky top-14 z-30 bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="text-sm font-medium text-slate-300 whitespace-nowrap">Jump to:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => scrollTo('section-about')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium whitespace-nowrap transition-colors"
              >
                About
              </button>
              {hasIntroVideo && (
                <button
                  onClick={() => scrollTo('section-intro')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium whitespace-nowrap transition-colors"
                >
                  Introduction Video
                </button>
              )}
              {productCards.length > 0 && (
                <button
                  onClick={() => scrollTo('section-products')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium whitespace-nowrap transition-colors"
                >
                  Products & Services
                </button>
              )}
              {hasCulture && (
                <button
                  onClick={() => scrollTo('section-culture')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium whitespace-nowrap transition-colors"
                >
                  Culture & Values
                </button>
              )}
              {attachments.length > 0 && (
                <button
                  onClick={() => scrollTo('section-attachments')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium whitespace-nowrap transition-colors"
                >
                  Attachments
                </button>
              )}
              {jobs.length > 0 && (
                <button
                  onClick={() => scrollTo('section-jobs')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium whitespace-nowrap transition-colors"
                >
                  Job Vacancies
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Company header */}
        <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl overflow-hidden border border-white/10 bg-white shadow-xl">
                {logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo_url} alt={name} className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-3xl text-slate-700">
                    {name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl md:text-4xl font-bold">{name}</h1>
              {(industry || tagline) && (
                <p className="text-slate-300 mt-1">{industry || tagline}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300 mt-3">
                {location && <span>📍 {location}</span>}
                {industry && tagline && (
                  <span className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">{tagline}</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Main content */}
          <div className="lg:col-span-9 space-y-6">
            {/* About */}
            <section id="section-about" className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              {bio ? (
                <>
                  <p
                    className="text-slate-300 leading-relaxed whitespace-pre-wrap"
                    style={bioExpanded ? undefined : clampStyle(5)}
                  >
                    {bio}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-blue-300 hover:text-blue-200 text-sm font-medium"
                    onClick={() => setBioExpanded(v => !v)}
                  >
                    {bioExpanded ? 'Show less' : 'Show more'}
                  </button>
                </>
              ) : (
                <p className="text-slate-400">No description available.</p>
              )}
            </section>

            {/* AI Sections */}
            {aiSections.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">AI Research</span>
                  <span className="text-xs text-slate-500">— generated from public sources</span>
                </div>
                {[...aiSections]
                  .sort((a: any, b: any) => (a.priority ?? 5) - (b.priority ?? 5))
                  .map((section: any) => (
                    <section key={section.key} className="rounded-2xl border border-purple-500/20 bg-slate-950/40 p-6">
                      <h2 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                        {section.title}
                        <span className="text-[10px] font-normal text-purple-400 border border-purple-500/30 rounded-full px-2 py-0.5">
                          AI · {section.confidence ?? 0}% confidence
                        </span>
                      </h2>
                      {typeof section.content === 'string' ? (
                        section.content.split('\n').filter(Boolean).map((para: string, i: number) => (
                          <p key={i} className="text-slate-300 leading-relaxed mt-2 first:mt-0">{para}</p>
                        ))
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(section.content as Record<string, any>).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-white font-medium capitalize">{k.replace(/_/g, ' ')}: </span>
                              <span className="text-slate-300">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
              </div>
            )}

            {/* AI Benefits */}
            {aiBenefits && Object.keys(aiBenefits).some(k => k !== 'summary' && k !== 'generated_at' && Array.isArray(aiBenefits[k]) && aiBenefits[k].length > 0) && (
              <section className="rounded-2xl border border-purple-500/20 bg-slate-950/40 p-6">
                <h2 className="text-lg font-semibold mb-1 text-white flex items-center gap-2">
                  Benefits & Perks
                  <span className="text-[10px] font-normal text-purple-400 border border-purple-500/30 rounded-full px-2 py-0.5">AI Researched</span>
                </h2>
                {aiBenefits.summary && <p className="text-slate-400 text-sm mb-4">{aiBenefits.summary}</p>}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(['parental_leave','health','flexibility','development','perks','financial','wellbeing'] as const).map(cat => {
                    const items: string[] = aiBenefits[cat] || []
                    if (!items.length) return null
                    const labels: Record<string, string> = { parental_leave: 'Parental Leave', health: 'Health', flexibility: 'Flexibility', development: 'Development', perks: 'Perks', financial: 'Financial', wellbeing: 'Wellbeing' }
                    return (
                      <div key={cat} className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
                        <p className="text-white font-medium text-sm mb-2">{labels[cat]}</p>
                        <ul className="space-y-1">
                          {items.map((item, i) => (
                            <li key={i} className="text-slate-400 text-xs flex items-start gap-1.5">
                              <span className="text-slate-600 mt-0.5">•</span>{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Intro Video */}
            {hasIntroVideo && (
              <section id="section-intro" className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
                <h2 className="text-xl font-semibold mb-4">Introduction Video</h2>
                {renderIntroVideo()}
              </section>
            )}

            {/* Products & Services */}
            {productCards.length > 0 && (
              <section id="section-products" className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
                <h2 className="text-xl font-semibold mb-4">Products & Services</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {productCards.map((card: any, idx: number) => (
                    <div key={card.id ?? idx} className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
                      <div className="font-semibold text-white mb-1">{card.name}</div>
                      {card.category && <div className="text-xs text-slate-400 mb-2">{card.category}</div>}
                      {card.short_description && (
                        <p className="text-slate-300 text-sm leading-relaxed">{card.short_description}</p>
                      )}
                      {card.external_link && (
                        <a
                          href={card.external_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-3 text-blue-300 hover:text-blue-200 text-xs font-medium"
                        >
                          Learn more
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Culture & Values */}
            {hasCulture && (
              <section id="section-culture" className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
                <h2 className="text-xl font-semibold mb-4">Culture & Values</h2>
                <div className="space-y-4">
                  {cultureDecisions && (
                    <div>
                      <div className="text-slate-200 font-semibold">How decisions are made</div>
                      <div className="text-slate-300 whitespace-pre-wrap text-sm mt-2" style={cultureExpanded.decisions ? undefined : clampStyle(3)}>
                        {cultureDecisions}
                      </div>
                      <button type="button" className="mt-2 text-blue-300 hover:text-blue-200 text-sm font-medium" onClick={() => setCultureExpanded(p => ({ ...p, decisions: !p.decisions }))}>
                        {cultureExpanded.decisions ? 'Show less' : 'Show more'}
                      </button>
                    </div>
                  )}
                  {cultureFeedback && (
                    <div>
                      <div className="text-slate-200 font-semibold">How feedback works</div>
                      <div className="text-slate-300 whitespace-pre-wrap text-sm mt-2" style={cultureExpanded.feedback ? undefined : clampStyle(3)}>
                        {cultureFeedback}
                      </div>
                      <button type="button" className="mt-2 text-blue-300 hover:text-blue-200 text-sm font-medium" onClick={() => setCultureExpanded(p => ({ ...p, feedback: !p.feedback }))}>
                        {cultureExpanded.feedback ? 'Show less' : 'Show more'}
                      </button>
                    </div>
                  )}
                  {cultureConflict && (
                    <div>
                      <div className="text-slate-200 font-semibold">How conflict is handled</div>
                      <div className="text-slate-300 whitespace-pre-wrap text-sm mt-2" style={cultureExpanded.conflict ? undefined : clampStyle(3)}>
                        {cultureConflict}
                      </div>
                      <button type="button" className="mt-2 text-blue-300 hover:text-blue-200 text-sm font-medium" onClick={() => setCultureExpanded(p => ({ ...p, conflict: !p.conflict }))}>
                        {cultureExpanded.conflict ? 'Show less' : 'Show more'}
                      </button>
                    </div>
                  )}
                  {cultureSuccess && (
                    <div>
                      <div className="text-slate-200 font-semibold">How success is celebrated</div>
                      <div className="text-slate-300 whitespace-pre-wrap text-sm mt-2" style={cultureExpanded.success ? undefined : clampStyle(3)}>
                        {cultureSuccess}
                      </div>
                      <button type="button" className="mt-2 text-blue-300 hover:text-blue-200 text-sm font-medium" onClick={() => setCultureExpanded(p => ({ ...p, success: !p.success }))}>
                        {cultureExpanded.success ? 'Show less' : 'Show more'}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <section id="section-attachments" className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
                <h2 className="text-xl font-semibold mb-4">Attachments</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visibleAttachments.map((a: any, idx: number) => (
                    <div key={a?.id ?? idx} className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
                      <div className="text-sm text-slate-200 truncate">{a?.title || 'Attachment'}</div>
                      <div className="text-xs text-slate-500 mt-1">{a?.file_type || a?.item_type || 'File'}</div>
                    </div>
                  ))}
                </div>
                {attachments.length > 6 && (
                  <button type="button" className="mt-4 text-blue-300 hover:text-blue-200 text-sm font-medium" onClick={() => setAttachExpanded(v => !v)}>
                    {attachExpanded ? 'Show fewer' : 'Show all attachments'}
                  </button>
                )}
              </section>
            )}

            {/* Social Links — full width, only if more than 1 */}
            {socialLinks.length > 1 && (
              <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
                <h2 className="text-lg font-semibold mb-4">Connect with {name}</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {socialLinks.map((link, idx) => (
                    <SocialPill key={idx} link={link} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-3 space-y-6">
            {/* View and Connect */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <div className="text-slate-200 font-semibold mb-4">View and Connect with {name}</div>
              <div className="space-y-4 text-sm">
                {email && (
                  <div>
                    <div className="text-slate-400 text-xs">Email</div>
                    <div className="text-slate-200 break-all">{email}</div>
                  </div>
                )}
                {location && (
                  <div>
                    <div className="text-slate-400 text-xs">Location</div>
                    <div className="text-slate-200">{location}</div>
                  </div>
                )}
                {industry && (
                  <div>
                    <div className="text-slate-400 text-xs">Industry</div>
                    <div className="text-slate-200">{industry}</div>
                  </div>
                )}
              </div>
              {socialLinks.length > 0 && (
                <div className="mt-5">
                  <div className="text-slate-400 text-xs mb-2">Social</div>
                  <div className="flex flex-col gap-2">
                    {socialLinks.slice(0, 4).map((link, idx) => (
                      <SocialPill key={idx} link={link} />
                    ))}
                  </div>
                </div>
              )}
              {productCards.length > 0 && (
                <div className="mt-5">
                  <div className="text-slate-400 text-xs mb-2">Products & Services</div>
                  <div className="flex flex-wrap gap-2">
                    {productCards.slice(0, 6).map((p: any, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200 text-xs">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Job Vacancies */}
            <div id="section-jobs" className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-slate-200 font-semibold">Job Vacancies</div>
                {jobs.length > 3 && (
                  <button type="button" className="text-blue-300 hover:text-blue-200 text-sm font-medium" onClick={() => setJobsExpanded(v => !v)}>
                    {jobsExpanded ? 'Show less' : 'Show all'}
                  </button>
                )}
              </div>
              {jobs.length === 0 ? (
                <p className="text-slate-400 text-sm">No open positions at this time.</p>
              ) : (
                <div className="space-y-3">
                  {visibleJobs.map((job: any, idx: number) => (
                    <div key={job.id ?? idx} className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
                      <div className="text-sm font-medium text-white">{job.title || job.role_title || 'Position'}</div>
                      {(job.employment_type || job.location) && (
                        <div className="text-xs text-slate-400 mt-1">
                          {[job.employment_type, job.location].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
