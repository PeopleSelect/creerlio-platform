'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BusinessPreview {
  id: string
  name: string
  slug: string
  website: string
  industry: string
  location: string
  tagline: string
  mission: string
  logo_url: string | null
  hero_image_url: string | null
  culture_values: { title?: string; label?: string; description?: string; text?: string }[]
  benefits: { title?: string; label?: string; description?: string }[]
  business_areas: { name?: string; title?: string; description?: string }[]
  programs: { name?: string; title?: string; description?: string }[]
  social_proof: { quote?: string; text?: string; author?: string; company?: string }[]
  impact_stats: { label?: string; value?: string; stat?: string }[]
  value_prop_headline: string
  value_prop_body: string
  media_assets: { intro_video_url?: string }
  contact_email: string
  website_url: string
  linkedin_url: string
  youtube_url: string
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BusinessClaimPage() {
  const params = useParams()
  const router = useRouter()
  const token = String(params?.token || '')

  const [profile, setProfile] = useState<BusinessPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Claim modal state
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [claimName, setClaimName] = useState('')
  const [claimEmail, setClaimEmail] = useState('')
  const [claimPassword, setClaimPassword] = useState('')
  const [claimConfirm, setClaimConfirm] = useState('')
  const [claimError, setClaimError] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [removeReason, setRemoveReason] = useState('')
  const [removeLoading, setRemoveLoading] = useState(false)
  const [claimDone, setClaimDone] = useState(false)
  const [removeDone, setRemoveDone] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/business/claim/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setProfile(data)
      })
      .catch(() => setError('Unable to load this profile. Please try again.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault()
    setClaimError('')
    if (!claimName.trim()) { setClaimError('Please enter your full name.'); return }
    if (!claimEmail.includes('@')) { setClaimError('Please enter a valid email address.'); return }
    if (claimPassword.length < 8) { setClaimError('Password must be at least 8 characters.'); return }
    if (claimPassword !== claimConfirm) { setClaimError('Passwords do not match.'); return }

    setClaimLoading(true)
    try {
      const res = await fetch('/api/business/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', token, name: claimName, email: claimEmail, password: claimPassword }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setClaimError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setClaimDone(true)
      // Redirect to login with magic link or login page after short delay
      setTimeout(() => {
        if (data.magic_link) {
          window.location.href = data.magic_link
        } else {
          router.push(`/login/business?email=${encodeURIComponent(claimEmail)}&claimed=1`)
        }
      }, 2500)
    } catch {
      setClaimError('Network error. Please try again.')
    } finally {
      setClaimLoading(false)
    }
  }

  async function handleRemove(e: React.FormEvent) {
    e.preventDefault()
    setRemoveLoading(true)
    try {
      const res = await fetch('/api/business/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', token, reason: removeReason }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to process removal request.')
        return
      }
      setRemoveDone(true)
      setShowRemoveModal(false)
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setRemoveLoading(false)
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-white mb-2">Link Not Found</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <a href="/" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors">
            Go to Creerlio
          </a>
        </div>
      </div>
    )
  }

  if (removeDone) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">Profile Removed</h1>
          <p className="text-gray-400">
            The profile for <span className="text-white font-semibold">{profile?.name}</span> has been removed from Creerlio.
            It is no longer visible to anyone.
          </p>
        </div>
      </div>
    )
  }

  const p = profile!
  const introVideoUrl = p.media_assets?.intro_video_url || p.youtube_url || null
  const isYouTubeVideo = introVideoUrl && (introVideoUrl.includes('watch?v=') || introVideoUrl.includes('youtu.be/'))
  const isYouTubeChannel = introVideoUrl && !isYouTubeVideo && (introVideoUrl.includes('@') || introVideoUrl.includes('/channel/') || introVideoUrl.includes('/user/'))

  function getYouTubeEmbedUrl(url: string): string {
    const vidMatch = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
    return vidMatch ? `https://www.youtube.com/embed/${vidMatch[1]}?autoplay=0&rel=0` : url
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Claim Banner (MANDATORY DISCLAIMER) ──────────────────────────── */}
      <div className="bg-amber-500/15 border-b border-amber-500/30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-2xl flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-amber-200 text-sm leading-relaxed">
              <span className="font-semibold">This profile has been automatically generated using publicly available information.</span>{' '}
              It is not publicly visible and may contain inaccuracies.
              If you represent this business, you can claim and update it.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowClaimModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg text-sm transition-colors whitespace-nowrap"
            >
              Claim Profile
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero / Banner ─────────────────────────────────────────────────── */}
      <div className="relative h-64 sm:h-80 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 overflow-hidden">
        {p.hero_image_url && (
          <img
            src={p.hero_image_url}
            alt={`${p.name} banner`}
            className="w-full h-full object-cover opacity-60"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        {/* Logo + Name */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <div className="max-w-5xl mx-auto flex items-end gap-4">
            {p.logo_url && (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-white/20 bg-white overflow-hidden flex-shrink-0 shadow-2xl">
                <img
                  src={p.logo_url}
                  alt={`${p.name} logo`}
                  className="w-full h-full object-contain p-1"
                  onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-full uppercase tracking-wide">
                  Unclaimed
                </span>
                {p.industry && (
                  <span className="px-2 py-0.5 bg-white/10 border border-white/20 text-gray-300 text-xs rounded-full">
                    {p.industry}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{p.name}</h1>
              {p.tagline && <p className="text-gray-300 text-sm mt-1">{p.tagline}</p>}
              {p.location && (
                <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                  <span>📍</span> {p.location}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Mission / About */}
            {p.mission && (
              <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                <h2 className="text-lg font-bold text-white mb-3">About {p.name}</h2>
                <p className="text-gray-300 leading-relaxed">{p.mission}</p>
              </section>
            )}

            {/* Value Prop */}
            {(p.value_prop_headline || p.value_prop_body) && (
              <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                {p.value_prop_headline && (
                  <h2 className="text-lg font-bold text-white mb-3">{p.value_prop_headline}</h2>
                )}
                {p.value_prop_body && (
                  <p className="text-gray-300 leading-relaxed">{p.value_prop_body}</p>
                )}
              </section>
            )}

            {/* Impact Stats */}
            {p.impact_stats?.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                <h2 className="text-lg font-bold text-white mb-4">By the Numbers</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {p.impact_stats.map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{stat.value || stat.stat}</div>
                      <div className="text-gray-400 text-xs mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Intro Video */}
            {introVideoUrl && (
              <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                <h2 className="text-lg font-bold text-white mb-4">Introduction</h2>
                {isYouTubeVideo ? (
                  <div className="aspect-video rounded-xl overflow-hidden bg-black">
                    <iframe
                      src={getYouTubeEmbedUrl(introVideoUrl)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : isYouTubeChannel ? (
                  <a
                    href={introVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-red-600/15 border border-red-500/30 rounded-xl hover:bg-red-600/25 transition-colors"
                  >
                    <span className="text-3xl">▶️</span>
                    <div>
                      <div className="text-white font-semibold">Watch on YouTube</div>
                      <div className="text-gray-400 text-sm">{introVideoUrl}</div>
                    </div>
                  </a>
                ) : (
                  <video controls className="w-full rounded-xl bg-black" src={introVideoUrl} />
                )}
              </section>
            )}

            {/* Culture Values */}
            {p.culture_values?.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                <h2 className="text-lg font-bold text-white mb-4">Culture & Values</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {p.culture_values.map((v, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                      <div>
                        <div className="text-white font-semibold text-sm">{v.title || v.label}</div>
                        {(v.description || v.text) && (
                          <div className="text-gray-400 text-sm mt-1">{v.description || v.text}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Business Areas / Services */}
            {p.business_areas?.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                <h2 className="text-lg font-bold text-white mb-4">What We Do</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {p.business_areas.map((area, i) => (
                    <div key={i} className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
                      <div className="text-white font-semibold text-sm mb-1">{area.name || area.title}</div>
                      {area.description && (
                        <div className="text-gray-400 text-sm">{area.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Benefits */}
            {p.benefits?.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                <h2 className="text-lg font-bold text-white mb-4">Benefits & Perks</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {p.benefits.map((b, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <div>
                        <div className="text-white text-sm font-medium">{b.title || b.label}</div>
                        {b.description && <div className="text-gray-400 text-xs mt-0.5">{b.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Social Proof */}
            {p.social_proof?.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                <h2 className="text-lg font-bold text-white mb-4">What People Say</h2>
                <div className="space-y-4">
                  {p.social_proof.map((sp, i) => (
                    <blockquote key={i} className="border-l-2 border-purple-500 pl-4">
                      <p className="text-gray-300 italic text-sm">"{sp.quote || sp.text}"</p>
                      {(sp.author || sp.company) && (
                        <footer className="text-gray-500 text-xs mt-2">
                          — {[sp.author, sp.company].filter(Boolean).join(', ')}
                        </footer>
                      )}
                    </blockquote>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Claim CTA Card */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 sticky top-4">
              <h3 className="text-white font-bold text-base mb-2">Is this your business?</h3>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                You're already set up — just claim your profile to unlock full editing, post jobs, and connect with talent.
              </p>
              <button
                onClick={() => setShowClaimModal(true)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors mb-2"
              >
                ✨ Claim This Profile
              </button>
              <button
                onClick={() => setShowRemoveModal(true)}
                className="w-full py-2 bg-transparent border border-white/20 text-gray-400 hover:text-white hover:border-white/40 text-sm rounded-xl transition-colors"
              >
                Request Removal
              </button>
            </div>

            {/* Business Details */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 space-y-3">
              <h3 className="text-white font-semibold text-sm">Business Info</h3>
              {p.industry && (
                <div>
                  <div className="text-gray-500 text-xs">Industry</div>
                  <div className="text-gray-200 text-sm">{p.industry}</div>
                </div>
              )}
              {p.location && (
                <div>
                  <div className="text-gray-500 text-xs">Location</div>
                  <div className="text-gray-200 text-sm">{p.location}</div>
                </div>
              )}
              {p.website_url && (
                <div>
                  <div className="text-gray-500 text-xs">Website</div>
                  <a href={p.website_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 text-sm hover:underline truncate block">
                    {p.website_url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {p.linkedin_url && (
                <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-400 text-sm hover:underline">
                  <span>🔗</span> LinkedIn
                </a>
              )}
            </div>

            {/* Programs */}
            {p.programs?.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
                <h3 className="text-white font-semibold text-sm mb-3">Programs & Initiatives</h3>
                <ul className="space-y-2">
                  {p.programs.map((prog, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>{prog.name || prog.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Legal Footer */}
        <div className="mt-12 pt-6 border-t border-white/10 text-center">
          <p className="text-gray-600 text-xs">
            This profile was automatically generated by Creerlio using publicly available information.
            It is not an endorsement of any kind. If you represent {p.name} and wish to have this profile removed,{' '}
            <button onClick={() => setShowRemoveModal(true)} className="text-gray-500 hover:text-gray-300 underline">click here</button>.
            All data is sourced from public web content and does not contain any private or confidential information.
          </p>
        </div>
      </div>

      {/* ── Claim Modal ───────────────────────────────────────────────────── */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {claimDone ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-white mb-2">Profile Claimed!</h3>
                <p className="text-gray-300 text-sm">
                  Welcome to Creerlio! Your {p.name} profile is now live.
                  Redirecting you to login…
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Claim {p.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">Create your account to take ownership of this profile.</p>
                  </div>
                  <button onClick={() => { setShowClaimModal(false); setClaimError('') }}
                    className="text-gray-500 hover:text-white text-xl p-1">×</button>
                </div>

                <form onSubmit={handleClaim} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={claimName}
                      onChange={e => setClaimName(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Work Email</label>
                    <input
                      type="email"
                      required
                      value={claimEmail}
                      onChange={e => setClaimEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={claimPassword}
                      onChange={e => setClaimPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      value={claimConfirm}
                      onChange={e => setClaimConfirm(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  {claimError && (
                    <div className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                      {claimError}
                    </div>
                  )}

                  <div className="bg-slate-800/50 rounded-xl px-4 py-3 text-xs text-gray-400">
                    By claiming this profile, you confirm that you are authorised to represent{' '}
                    <span className="text-gray-200">{p.name}</span> and agree to Creerlio's{' '}
                    <a href="/terms" className="text-purple-400 hover:underline">Terms of Service</a>.
                  </div>

                  <button
                    type="submit"
                    disabled={claimLoading}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold rounded-xl transition-colors"
                  >
                    {claimLoading ? 'Claiming profile…' : 'Claim Profile'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Remove Modal ──────────────────────────────────────────────────── */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Request Profile Removal</h3>
                <p className="text-gray-400 text-sm mt-1">
                  We'll remove this profile immediately. No questions asked.
                </p>
              </div>
              <button onClick={() => setShowRemoveModal(false)}
                className="text-gray-500 hover:text-white text-xl p-1">×</button>
            </div>
            <form onSubmit={handleRemove} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Reason (optional)</label>
                <textarea
                  value={removeReason}
                  onChange={e => setRemoveReason(e.target.value)}
                  placeholder="e.g. Incorrect information, not our business, other..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={removeLoading}
                className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
              >
                {removeLoading ? 'Removing…' : 'Remove Profile'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
