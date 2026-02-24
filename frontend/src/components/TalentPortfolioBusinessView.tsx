/**
 * Talent Portfolio Business View
 * 
 * Renders portfolio from immutable snapshot ONLY
 * No access to live talent data or unshared content
 * Deterministic and reproducible rendering
 */

'use client'

import { useEffect, useState } from 'react'
import { PortfolioSnapshot, getSnapshotById, getSnapshotForBusiness } from '@/lib/portfolioSnapshots'
import { getTemplateById } from './portfolioTemplates'
import { supabase } from '@/lib/supabase'

interface TalentPortfolioBusinessViewProps {
  snapshotId?: string
  talentProfileId?: string
  businessId?: string
}

export default function TalentPortfolioBusinessView({
  snapshotId,
  talentProfileId,
  businessId,
}: TalentPortfolioBusinessViewProps) {
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    async function loadSnapshot() {
      try {
        setLoading(true)
        setError(null)

        let loadedSnapshot: PortfolioSnapshot | null = null

        if (snapshotId) {
          loadedSnapshot = await getSnapshotById(snapshotId)
        } else if (talentProfileId && businessId) {
          loadedSnapshot = await getSnapshotForBusiness(talentProfileId, businessId)
        } else if (talentProfileId) {
          // Fallback: get latest snapshot (not recommended for business view)
          const { data } = await supabase
            .from('talent_portfolio_snapshots')
            .select('*')
            .eq('talent_profile_id', talentProfileId)
            .order('snapshot_timestamp', { ascending: false })
            .limit(1)
            .maybeSingle()
          loadedSnapshot = data as PortfolioSnapshot | null
        }

        if (!loadedSnapshot) {
          setError('Portfolio snapshot not found')
          return
        }

        setSnapshot(loadedSnapshot)

        // Load media URLs from snapshot
        const payload = loadedSnapshot.shared_payload
        if (payload.media.avatar_path) {
          const { data } = await supabase.storage
            .from('talent-bank')
            .createSignedUrl(payload.media.avatar_path, 3600)
          if (data) setAvatarUrl(data.signedUrl)
        }

        if (payload.media.intro_video_id) {
          // Get video file path from talent_bank_items
          const { data: videoItem } = await supabase
            .from('talent_bank_items')
            .select('file_path')
            .eq('id', payload.media.intro_video_id)
            .maybeSingle()
          
          if (videoItem?.file_path) {
            const { data } = await supabase.storage
              .from('talent-bank')
              .createSignedUrl(videoItem.file_path, 3600)
            if (data) setIntroVideoUrl(data.signedUrl)
          }
        }
      } catch (err: any) {
        console.error('Error loading snapshot:', err)
        setError(err.message || 'Failed to load portfolio')
      } finally {
        setLoading(false)
      }
    }

    loadSnapshot()
  }, [snapshotId, talentProfileId, businessId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Portfolio Not Available</h2>
          <p className="text-gray-400">{error || 'No portfolio snapshot found'}</p>
        </div>
      </div>
    )
  }

  const template = getTemplateById(snapshot.template_id)
  const payload = snapshot.shared_payload


  return (
    <div className="min-h-screen bg-white">
      {/* Top Section - Dark Header */}
      <div className="w-full bg-slate-950 text-white rounded-b-3xl shadow-lg px-8 py-10 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-shrink-0">
          <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white/20 bg-white/10 shadow-xl">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-4xl">
                {(payload.sections.intro?.name || 'T').slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{payload.sections.intro?.name || 'Talent Portfolio'}</h1>
          <div className="text-lg md:text-2xl text-slate-300 mb-2">{payload.sections.intro?.title || ''}</div>
          {/* Experience summary if available */}
          {payload.sections.intro?.experience && (
            <div className="inline-block bg-slate-900 text-slate-200 px-4 py-2 rounded-xl text-base font-medium mt-2">
              {payload.sections.intro.experience}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - White Background */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Bio Section */}
            {payload.sections.intro?.bio && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-slate-800 whitespace-pre-wrap text-lg">
                  {payload.sections.intro.bio}
                </div>
              </section>
            )}

            {/* Intro Video */}
            {introVideoUrl && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Introduction Video</h2>
                <div className="rounded-3xl overflow-hidden bg-slate-100 border border-slate-200">
                  <video src={introVideoUrl} controls playsInline className="w-full" />
                </div>
              </section>
            )}

            {/* Skills */}
            {payload.sections.skills && payload.sections.skills.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {payload.sections.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Experience */}
            {payload.sections.experience && payload.sections.experience.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Experience</h2>
                <div className="space-y-4">
                  {payload.sections.experience.map((exp: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="font-semibold text-slate-900">{exp.title || 'Role'}</div>
                      <div className="text-slate-700 text-sm mt-1">{exp.company || 'Company'}</div>
                      {exp.description && (
                        <div className="mt-3 text-slate-700 text-sm whitespace-pre-wrap">
                          {exp.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            {payload.sections.education && payload.sections.education.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Education</h2>
                <div className="space-y-4">
                  {payload.sections.education.map((edu: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="font-semibold text-slate-900">{edu.degree || 'Degree'}</div>
                      <div className="text-slate-700 text-sm mt-1">{edu.institution || 'Institution'}</div>
                      {edu.field && (
                        <div className="text-slate-500 text-sm mt-1">{edu.field}</div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {payload.sections.projects && payload.sections.projects.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Projects</h2>
                <div className="space-y-4">
                  {payload.sections.projects.map((project: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="font-semibold text-slate-900">{project.name || project.title || 'Project'}</div>
                      {project.description && (
                        <div className="text-slate-700 text-sm mt-2 whitespace-pre-wrap">
                          {project.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Social Links */}
            {payload.sections.social && payload.sections.social.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Connect</h2>
                <div className="space-y-2">
                  {payload.sections.social.map((link: any, idx: number) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-sm transition-colors"
                    >
                      {link.platform || link.label || 'Link'}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Template Info (for debugging - remove in production) */}
            {template && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-xs text-gray-500">
                  Template: {template.name}
                  <br />
                  Snapshot: {new Date(snapshot.snapshot_timestamp).toLocaleDateString()}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
