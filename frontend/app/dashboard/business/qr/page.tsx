'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  QrCode, Download, Copy, CheckCheck, Loader2, Users,
  Zap, ExternalLink, ChevronLeft, Share2,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function BusinessQRPage() {
  const router = useRouter()

  const [bizId, setBizId]       = useState<string | null>(null)
  const [bizName, setBizName]   = useState('')
  const [slug, setSlug]         = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState(false)
  const [connCount, setConnCount] = useState(0)
  const [qrCount, setQrCount]   = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.replace('/login/business'); return }

      const meta = session.user.user_metadata || {}
      if (meta.registration_type !== 'business') {
        router.replace(`/login/${meta.registration_type || 'business'}`); return
      }

      // Get business profile
      const { data: bp } = await (supabase as any)
        .from('business_profiles')
        .select('id, name, business_name')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!bp) { router.replace('/dashboard/business'); return }

      setBizId(bp.id)
      setBizName(bp.name || bp.business_name || 'Your Business')

      // Get slug
      const { data: page } = await (supabase as any)
        .from('business_profile_pages')
        .select('slug')
        .eq('business_id', bp.id)
        .maybeSingle()
      if (page?.slug) setSlug(page.slug)

      // Connection stats
      const { count: total } = await (supabase as any)
        .from('customer_connections')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', bp.id)
      setConnCount(total || 0)

      const { count: qrTotal } = await (supabase as any)
        .from('customer_connections')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', bp.id)
        .not('qr_source', 'is', null)
      setQrCount(qrTotal || 0)

      setLoading(false)
    }).catch(() => router.replace('/login/business'))
  }, [router])

  const origin    = typeof window !== 'undefined' ? window.location.origin : 'https://creerlio.com'
  const connectUrl = bizId ? `${origin}/connect?b=${bizId}` : ''
  const qrImgUrl   = connectUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(connectUrl)}&color=1e3a5f&bgcolor=ffffff`
    : ''

  async function copyLink() {
    if (!connectUrl) return
    await navigator.clipboard.writeText(connectUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function downloadQR() {
    if (!qrImgUrl) return
    const a = document.createElement('a')
    a.href = qrImgUrl
    a.download = `creerlio-qr-${bizName.toLowerCase().replace(/\s+/g, '-')}.png`
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
        <Link href="/dashboard/business"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your QR Connect Code</h1>
          <p className="text-gray-500 mt-1">Display anywhere — in-store, on products, receipts, or print. Customers scan once and instantly connect.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* QR card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center">
            <div className="bg-gradient-to-br from-blue-950 to-indigo-900 rounded-2xl p-1.5 mb-5 shadow-lg">
              {qrImgUrl ? (
                <img src={qrImgUrl} alt="QR Code" className="h-[200px] w-[200px] rounded-xl" />
              ) : (
                <div className="h-[200px] w-[200px] rounded-xl bg-white/10 flex items-center justify-center">
                  <QrCode className="h-10 w-10 text-white/40" />
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 text-center mb-1 font-medium">creerlio.com/connect</p>
            <p className="text-sm font-semibold text-gray-900 text-center mb-6">{bizName}</p>

            <div className="w-full space-y-3">
              <button type="button" onClick={downloadQR}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                <Download className="h-4 w-4" /> Download QR Code
              </button>
              <button type="button" onClick={copyLink}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                {copied ? <><CheckCheck className="h-4 w-4 text-emerald-600" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Link</>}
              </button>
            </div>
          </div>

          {/* Stats + info */}
          <div className="space-y-4">

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-gray-500 font-medium">Total Connections</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{connCount}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-gray-500 font-medium">Via QR Scan</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{qrCount}</p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">How it works</h3>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Print or display your QR code anywhere customers can see it' },
                  { step: '2', text: 'Customer scans with their phone — no app required' },
                  { step: '3', text: 'They instantly appear in your Creerlio connections' },
                  { step: '4', text: 'Ready to receive enquiries, quotes, and opportunities' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {s.step}
                    </span>
                    <p className="text-sm text-gray-600">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Share link */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-blue-900">Share your connect link</p>
              </div>
              <p className="text-xs text-blue-600 font-mono break-all mb-3">{connectUrl}</p>
              {slug && (
                <Link href={`/businesses/${slug}`} target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:underline">
                  View your public profile <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
