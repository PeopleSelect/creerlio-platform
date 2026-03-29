'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  QrCode, Download, Copy, CheckCheck, Loader2,
  Briefcase, Link2, ChevronLeft, Share2, ExternalLink,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function TalentQRPage() {
  const router = useRouter()

  const [talentId, setTalentId]     = useState<string | null>(null)
  const [talentName, setTalentName] = useState('')
  const [talentTitle, setTalentTitle] = useState('')
  const [loading, setLoading]       = useState(true)
  const [copied, setCopied]         = useState(false)
  const [connCount, setConnCount]   = useState(0)
  const [viewCount, setViewCount]   = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.replace('/login/talent'); return }

      const meta = session.user.user_metadata || {}
      if (meta.registration_type === 'business') {
        router.replace('/dashboard/business'); return
      }

      // Get talent profile
      const { data: tp } = await supabase
        .from('talent_profiles')
        .select('id, name, title')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!tp) { router.replace('/dashboard/talent'); return }

      setTalentId(tp.id)
      setTalentName(tp.name || session.user.user_metadata?.full_name || 'Your Profile')
      setTalentTitle(tp.title || '')

      // Connection stats
      const { count: connTotal } = await supabase
        .from('talent_connection_requests')
        .select('id', { count: 'exact', head: true })
        .eq('talent_id', tp.id)
      setConnCount(connTotal || 0)

      // Business outreach received
      const { count: outreachTotal } = await supabase
        .from('business_outreach_requests')
        .select('id', { count: 'exact', head: true })
        .eq('talent_id', tp.id)
      setViewCount(outreachTotal || 0)

      setLoading(false)
    }).catch(() => router.replace('/login/talent'))
  }, [router])

  const origin     = typeof window !== 'undefined' ? window.location.origin : 'https://creerlio.com'
  const profileUrl = talentId ? `${origin}/portfolio/view?talent_id=${talentId}` : ''
  const qrImgUrl   = profileUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(profileUrl)}&color=0f172a&bgcolor=ffffff`
    : ''

  async function copyLink() {
    if (!profileUrl) return
    await navigator.clipboard.writeText(profileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function downloadQR() {
    if (!qrImgUrl) return
    const a = document.createElement('a')
    a.href = qrImgUrl
    a.download = `creerlio-talent-qr-${talentName.toLowerCase().replace(/\s+/g, '-')}.png`
    a.target = '_blank'
    a.click()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Back */}
        <Link href="/dashboard/talent"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Profile QR Code</h1>
          <p className="text-gray-500 mt-1">Share anywhere — business cards, LinkedIn, email signatures. Businesses scan once to instantly view your portfolio.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* QR card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-2xl p-1.5 mb-5 shadow-lg">
              {qrImgUrl ? (
                <img src={qrImgUrl} alt="Profile QR Code" className="h-[200px] w-[200px] rounded-xl" />
              ) : (
                <div className="h-[200px] w-[200px] rounded-xl bg-white/10 flex items-center justify-center">
                  <QrCode className="h-10 w-10 text-white/40" />
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 text-center mb-0.5 font-medium">creerlio.com/portfolio</p>
            <p className="text-sm font-bold text-gray-900 text-center">{talentName}</p>
            {talentTitle && <p className="text-xs text-gray-500 text-center mb-5">{talentTitle}</p>}
            {!talentTitle && <div className="mb-5" />}

            <div className="w-full space-y-3">
              <button type="button" onClick={downloadQR}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
                <Download className="h-4 w-4" /> Download QR Code
              </button>
              <button type="button" onClick={copyLink}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                {copied
                  ? <><CheckCheck className="h-4 w-4 text-emerald-600" /> Copied!</>
                  : <><Copy className="h-4 w-4" /> Copy Profile Link</>}
              </button>
            </div>
          </div>

          {/* Stats + info */}
          <div className="space-y-4">

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Link2 className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-gray-500 font-medium">Connections</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{connCount}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-gray-500 font-medium">Business Reach</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{viewCount}</p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">How it works</h3>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Add your QR code to your resume, business card, or LinkedIn banner' },
                  { step: '2', text: 'A recruiter or business scans it with their phone — no app required' },
                  { step: '3', text: 'They land directly on your Creerlio portfolio' },
                  { step: '4', text: 'They can send a connection request or reach out instantly' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {s.step}
                    </span>
                    <p className="text-sm text-gray-600">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Share link */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="h-4 w-4 text-slate-600" />
                <p className="text-sm font-semibold text-slate-900">Your profile link</p>
              </div>
              <p className="text-xs text-slate-500 font-mono break-all mb-3">{profileUrl}</p>
              <Link href="/portfolio/view" target="_blank"
                className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:underline">
                Preview your portfolio <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
