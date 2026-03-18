'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Building2, MapPin, Globe, Mail, Phone, ArrowLeft, Loader2,
  ShieldCheck, Star, Briefcase, Send, CheckCircle2, ChevronRight,
  Users, Wrench, BadgeCheck, UserPlus,
} from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────

interface Service {
  id: number
  name: string
  category: string | null
  short_description: string | null
  who_it_is_for: string | null
  problem_it_solves: string | null
  logo_or_icon: string | null
}

interface TalentRequest {
  id: string
  role_title: string
  location: string | null
  experience_level: string | null
  notes: string | null
  created_at: string
}

interface BusinessData {
  slug: string
  business_id: string | null
  name: string
  tagline: string | null
  mission: string | null
  logo_url: string | null
  hero_image_url: string | null
  industry: string | null
  location: string | null
  website_url: string | null
  contact_email: string | null
  enquiry_enabled: boolean
  description: string | null
  industries_served: string[]
  hiring_interests: string[]
  badges: string[]
  impact_stats: { label: string; value: string }[]
  benefits: { title: string; description: string }[]
  services: Service[]
  talent_requests: TalentRequest[]
}

// ── Badge pill ───────────────────────────────────────────────────────────────

function BadgePill({ label }: { label: string }) {
  const map: Record<string, { icon: React.ReactNode; cls: string }> = {
    'Verified Business':  { icon: <BadgeCheck className="h-3.5 w-3.5" />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'Active Employer':    { icon: <Briefcase  className="h-3.5 w-3.5" />, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    'Talent Recommended': { icon: <Star       className="h-3.5 w-3.5" />, cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  }
  const def = map[label] || { icon: <ShieldCheck className="h-3.5 w-3.5" />, cls: 'bg-gray-50 text-gray-600 border-gray-200' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${def.cls}`}>
      {def.icon} {label}
    </span>
  )
}

// ── Enquiry modal ────────────────────────────────────────────────────────────

function EnquiryModal({
  businessId, businessName, enquiryType, onClose,
}: {
  businessId: string
  businessName: string
  enquiryType: 'general' | 'consultation' | 'message'
  onClose: () => void
}) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSub]  = useState(false)
  const [done, setDone]       = useState(false)
  const [err, setErr]         = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSub(true)
    setErr('')
    try {
      const res = await fetch('/api/businesses/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, enquiry_type: enquiryType, name, email, message }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to send')
      }
      setDone(true)
    } catch (e: any) {
      setErr(e.message || 'Something went wrong')
    } finally {
      setSub(false)
    }
  }

  const titles: Record<string, string> = {
    general:      `Contact ${businessName}`,
    consultation: `Request a Consultation`,
    message:      `Send a Message`,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Enquiry sent</h3>
            <p className="mt-2 text-sm text-gray-500">{businessName} will be in touch.</p>
            <button onClick={onClose} className="mt-6 rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700">Close</button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-5">{titles[enquiryType]}</h3>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Your name *</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email address *</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

function BusinessPublicPageInner() {
  const params = useParams()
  const router = useRouter()
  const slug = typeof params?.slug === 'string' ? params.slug : ''

  const [data, setData]           = useState<BusinessData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [notFound, setNF]         = useState(false)
  const [modal, setModal]         = useState<'general' | 'consultation' | 'message' | null>(null)
  // Customer session state
  const [customerToken, setCToken] = useState<string | null>(null)
  const [isCustomer, setIsCustomer] = useState(false)
  const [customerConnModal, setCCModal] = useState<'general' | 'consultation' | null>(null)
  const [ccMessage, setCCMessage]  = useState('')
  const [ccSending, setCCSending]  = useState(false)
  const [ccDone, setCCDone]        = useState(false)
  const [ccErr, setCCErr]          = useState('')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/api/businesses/${slug}`)
      .then(r => { if (r.status === 404) { setNF(true); return null } return r.json() })
      .then(j => { if (j) setData(j) })
      .catch(() => setNF(true))
      .finally(() => setLoading(false))

    // Check if visitor is a logged-in customer
    supabase.auth.getSession().then(({ data: sd }) => {
      const session = sd?.session
      if (!session) return
      const meta = session.user.user_metadata || {}
      if (meta.registration_type === 'customer') {
        setCToken(session.access_token)
        setIsCustomer(true)
      }
    }).catch(() => {})
  }, [slug])

  function openCustomerModal(type: 'general' | 'consultation') {
    if (!isCustomer) {
      const redirect = encodeURIComponent(`/businesses/${slug}`)
      router.push(`/login/customer?mode=signup&redirect=${redirect}&action=enquiry&type=${type}`)
      return
    }
    setCCModal(type)
    setCCMessage('')
    setCCDone(false)
    setCCErr('')
  }

  async function sendCustomerConnect(e: React.FormEvent) {
    e.preventDefault()
    if (!customerToken || !data?.business_id || !ccMessage.trim()) return
    setCCSending(true)
    setCCErr('')
    try {
      const res = await fetch('/api/customer/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          business_id:  data.business_id,
          body:         ccMessage.trim(),
          enquiry_type: customerConnModal || 'general',
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to send')
      }
      setCCDone(true)
    } catch (err: any) {
      setCCErr(err.message || 'Something went wrong')
    } finally {
      setCCSending(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  if (notFound || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Building2 className="h-12 w-12 text-gray-300" />
      <p className="text-gray-500">Business not found.</p>
      <Link href="/businesses" className="text-sm text-blue-600 hover:underline">Browse businesses</Link>
    </div>
  )

  const hasServices        = data.services.length > 0
  const hasTalentRequests  = data.talent_requests.length > 0
  const hasHiringInterests = data.hiring_interests.length > 0
  const hasIndustries      = data.industries_served.length > 0

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/businesses" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Businesses
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700 truncate">{data.name}</span>
          <div className="ml-auto">
            <Link href="/" className="text-sm font-bold text-gray-900">Creerlio</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* ── 1. Business Header ─────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {data.logo_url ? (
              <img
                src={data.logo_url}
                alt={`${data.name} logo`}
                className="h-20 w-20 rounded-2xl border border-gray-100 object-cover shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <Building2 className="h-10 w-10 text-blue-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
                {data.badges.map(b => <BadgePill key={b} label={b} />)}
              </div>
              {data.tagline && <p className="text-gray-600 mb-3">{data.tagline}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {data.industry && (
                  <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" />{data.industry}</span>
                )}
                {data.location && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{data.location}</span>
                )}
                {data.website_url && (
                  <a href={data.website_url.startsWith('http') ? data.website_url : `https://${data.website_url}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                    <Globe className="h-4 w-4" />{data.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
                {data.contact_email && (
                  <a href={`mailto:${data.contact_email}`}
                    className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                    <Mail className="h-4 w-4" />{data.contact_email}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Contact actions — customer-gated */}
          {data.enquiry_enabled && data.business_id && (
            <div className="mt-6 border-t border-gray-100 pt-5">
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-medium">General enquiries</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openCustomerModal('general')}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <Mail className="h-4 w-4" /> Send Enquiry
                </button>
                <button
                  type="button"
                  onClick={() => openCustomerModal('consultation')}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Phone className="h-4 w-4" /> Request Consultation
                </button>
              </div>
              {!isCustomer && (
                <p className="mt-3 text-xs text-gray-400">
                  <UserPlus className="inline h-3 w-3 mr-1" />
                  You'll be asked to create a free Customer account to send your enquiry.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── 2. About ──────────────────────────────────────── */}
        {(data.mission || data.description) && (
          <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About {data.name}</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {data.mission || data.description}
            </p>
          </section>
        )}

        {/* ── 3. Services ───────────────────────────────────── */}
        {hasServices && (
          <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Services</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {data.services.map(svc => (
                <div key={svc.id} className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                  <div className="flex items-start gap-3">
                    {svc.logo_or_icon ? (
                      <img src={svc.logo_or_icon} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center shrink-0">
                        <Wrench className="h-4 w-4 text-blue-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{svc.name}</h3>
                      {svc.category && (
                        <span className="text-xs text-gray-400">{svc.category}</span>
                      )}
                      {svc.short_description && (
                        <p className="mt-1 text-sm text-gray-600">{svc.short_description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 4. Industries Served ──────────────────────────── */}
        {hasIndustries && (
          <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Industries We Serve</h2>
            <div className="flex flex-wrap gap-2">
              {data.industries_served.map(ind => (
                <span key={ind} className="rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-sm text-gray-700">
                  {ind}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── 5. Talent Access Requests ─────────────────────── */}
        {hasTalentRequests && (
          <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Open Talent Requests</h2>
            <p className="text-sm text-gray-500 mb-6">
              {data.name} is looking to connect with professionals in these areas.
              If you match, sign in and let them know you're interested.
            </p>
            <div className="space-y-3">
              {data.talent_requests.map(tr => (
                <div key={tr.id} className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{tr.role_title}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                      {tr.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{tr.location}</span>}
                      {tr.experience_level && <span>{tr.experience_level}</span>}
                    </div>
                    {tr.notes && <p className="mt-2 text-sm text-gray-600">{tr.notes}</p>}
                  </div>
                  <Link
                    href={`/login/talent?mode=signin&redirect=/dashboard/talent`}
                    className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors shrink-0"
                  >
                    I'm interested <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 6. Hiring Interests (informational only) ──────── */}
        {hasHiringInterests && !hasTalentRequests && (
          <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Talent We're Interested In</h2>
            <p className="text-sm text-gray-500 mb-4">
              {data.name} is open to connecting with professionals in the following areas.
            </p>
            <div className="flex flex-wrap gap-2">
              {data.hiring_interests.map(role => (
                <span key={role} className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm text-blue-700">
                  <Users className="h-3.5 w-3.5" /> {role}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── 7. Talent CTA ─────────────────────────────────── */}
        {(hasTalentRequests || hasHiringInterests) && (
          <section className="rounded-2xl bg-violet-600 p-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-1">
                <h2 className="text-lg font-bold mb-1">Are you a talent looking to connect?</h2>
                <p className="text-violet-100 text-sm">
                  Talent enquiries require a registered profile. Create your free talent profile to
                  express interest in {data.name} and be discovered by businesses like them.
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Link
                  href="/login/talent?mode=signup"
                  className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 transition-colors text-center"
                >
                  Create Talent Profile
                </Link>
                <Link
                  href="/login/talent?mode=signin"
                  className="rounded-lg border border-white/40 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors text-center"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── 8. General contact CTA ────────────────────────── */}
        {data.enquiry_enabled && data.business_id && (
          <section className="rounded-2xl bg-blue-600 p-8 text-white text-center">
            <h2 className="text-xl font-bold mb-2">Get in touch with {data.name}</h2>
            <p className="text-blue-100 mb-6 text-sm">
              {isCustomer
                ? 'Send your enquiry directly through your Customer account.'
                : 'Create a free Customer account to send enquiries and track your conversations.'}
            </p>
            <div className="flex justify-center flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openCustomerModal('general')}
                className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
              >
                {isCustomer ? 'Send Enquiry' : 'Register & Send Enquiry'}
              </button>
              <button
                type="button"
                onClick={() => openCustomerModal('consultation')}
                className="rounded-lg border border-white/40 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Request Consultation
              </button>
              {data.website_url && (
                <a
                  href={data.website_url.startsWith('http') ? data.website_url : `https://${data.website_url}`}
                  target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-white/40 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Visit Website
                </a>
              )}
            </div>
          </section>
        )}

        {/* ── Customer Connect Modal ─────────────────────────── */}
        {customerConnModal && data.business_id && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={e => { if (e.target === e.currentTarget) setCCModal(null) }}>
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
              {ccDone ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Enquiry sent!</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {data.name} will be in touch. View your conversation in your{' '}
                    <Link href="/dashboard/customer/messages" className="text-blue-600 hover:underline">Customer Dashboard</Link>.
                  </p>
                  <button type="button" onClick={() => setCCModal(null)}
                    className="mt-6 rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-5">
                    {customerConnModal === 'consultation' ? 'Request a Consultation' : `Contact ${data.name}`}
                  </h3>
                  <form onSubmit={sendCustomerConnect} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Your message *</label>
                      <textarea required rows={5} value={ccMessage} onChange={e => setCCMessage(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder={customerConnModal === 'consultation'
                          ? "Describe what you'd like to discuss in a consultation..."
                          : "Tell them what you're looking for..."}
                      />
                    </div>
                    {ccErr && <p className="text-sm text-red-600">{ccErr}</p>}
                    <div className="flex gap-3 pt-1">
                      <button type="button" onClick={() => setCCModal(null)}
                        className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                        Cancel
                      </button>
                      <button type="submit" disabled={ccSending}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                        {ccSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Enquiry modal */}
      {modal && data.business_id && (
        <EnquiryModal
          businessId={data.business_id}
          businessName={data.name}
          enquiryType={modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default function BusinessPublicPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <BusinessPublicPageInner />
    </Suspense>
  )
}
