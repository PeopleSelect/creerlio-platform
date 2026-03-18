'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const authed = !!data.session?.user?.id
        setIsAuthenticated(authed)
        if (!authed) {
          setIsAdmin(false)
          return
        }
        const { data: { user } } = await supabase.auth.getUser()
        const meta = user?.user_metadata || {}
        const email = (user?.email || data.session?.user?.email || '').toLowerCase()
        const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
        const hasAdminFlag = meta.is_admin === true || meta.admin === true
        setIsAdmin(hasAdminFlag || (!!email && adminEmails.includes(email)))
      } catch {
        setIsAuthenticated(false)
        setIsAdmin(false)
      }
    }

    checkAuth().catch(() => {})
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      checkAuth().catch(() => {})
    })

    // Load industry list for autocomplete
    fetch('/api/taxonomy/industries')
      .then(r => r.json())
      .then(j => { if (j.industries?.length) setIndustries(j.industries.map((i: any) => i.name)) })
      .catch(() => {})

    // Close suggestions on outside click
    const handleClick = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node) &&
          searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)

    return () => {
      sub?.subscription?.unsubscribe()
      document.removeEventListener('mousedown', handleClick)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-gray-900 relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              Creerlio
            </Link>

            <nav className="hidden lg:flex items-center gap-x-8 text-sm text-gray-600">
              <Link href="/talent" className="hover:text-blue-600 transition-colors">Talent</Link>
              <Link href="/business" className="hover:text-blue-600 transition-colors">Business</Link>
              <Link href="/businesses" className="hover:text-blue-600 transition-colors">Find Businesses</Link>
              <Link href="/search" className="hover:text-blue-600 transition-colors">Search</Link>
              <Link href="/login/customer" className="hover:text-blue-600 transition-colors">Customer Login</Link>
              {isAdmin && (
                <Link href="/admin" className="hover:text-blue-600 transition-colors">
                  Admin
                </Link>
              )}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut()
                    router.refresh()
                  }}
                  className="hover:text-blue-600 transition-colors text-left"
                >
                  Sign out
                </button>
              )}
            </nav>

            <div className="flex gap-2 flex-wrap justify-end">
              <Link
                href="/login/talent?mode=signup&redirect=/dashboard/talent"
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white transition-colors"
              >
                Talent Account
              </Link>
              <Link
                href="/login/business?mode=signup&redirect=/dashboard/business"
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white transition-colors"
              >
                Business Account
              </Link>
              <Link
                href="/login/customer?mode=signup&redirect=/dashboard/customer"
                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold text-xs text-white transition-colors"
              >
                Customer Account
              </Link>
              <Link
                href="/login/customer"
                className="px-3 py-2 rounded-lg border border-gray-300 hover:border-gray-400 font-semibold text-xs text-gray-700 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="bg-white text-gray-900">
        {/* Hero */}
        <section className="relative w-full min-h-screen overflow-hidden">
          <div
            className="absolute inset-0 bg-center bg-contain bg-no-repeat"
            style={{ backgroundImage: "url('/0f1d3d6d-093e-44cc-9c5d-a138b0cc9cee.png')" }}
          />
          <div className="absolute inset-0 bg-transparent" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8 py-20 sm:py-24 lg:py-28" />
        </section>

        {/* Business Search */}
        <section className="w-full bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 py-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Businesses on Creerlio</h2>
            <p className="text-gray-500 mb-6 text-sm">Search law firms, agencies, studios, and more by name, industry, or location.</p>
            <form
              onSubmit={e => {
                e.preventDefault()
                setShowSuggestions(false)
                const q = searchQ.trim()
                router.push(`/businesses${q ? `?q=${encodeURIComponent(q)}` : ''}`)
              }}
              className="flex items-center gap-2 max-w-lg mx-auto"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQ}
                  onChange={e => {
                    const val = e.target.value
                    setSearchQ(val)
                    if (val.trim().length >= 1) {
                      const q = val.trim().toLowerCase()
                      setSuggestions(industries.filter(i => i.toLowerCase().includes(q)).slice(0, 6))
                      setShowSuggestions(true)
                    } else {
                      setShowSuggestions(false)
                    }
                  }}
                  onFocus={() => {
                    if (searchQ.trim().length >= 1 && suggestions.length > 0) setShowSuggestions(true)
                  }}
                  placeholder="e.g. Law firm, Marketing agency, Accountant Sydney…"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div ref={suggestRef} className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setSearchQ(s)
                          setShowSuggestions(false)
                          router.push(`/businesses?q=${encodeURIComponent(s)}`)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </form>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {['Law firm', 'Marketing agency', 'Software company', 'Recruitment agency'].map(ex => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => router.push(`/businesses?q=${encodeURIComponent(ex)}`)}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Customer CTA */}
        <section className="w-full bg-blue-50 border-b border-blue-100">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Looking to contact a business?</p>
              <p className="text-xs text-gray-500 mt-0.5">Create a free Customer account to send enquiries, track conversations, and save businesses.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                href="/login/customer?mode=signup"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Create Customer Account
              </Link>
              <Link
                href="/login/customer?mode=signin"
                className="rounded-lg border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Engagement and Relationships */}
        <section className="w-full bg-[#0e0e0e]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-18">
            <div className="max-w-3xl space-y-6">
              <h2 className="text-3xl font-bold text-white">Engagement and Relationships</h2>
              <ul className="space-y-4 text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#20C997]" aria-hidden="true" />
                  <span>
                    <span className="text-white font-semibold">Stronger Engagement:</span> Ongoing interactions build stronger connections between businesses and candidates.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#20C997]" aria-hidden="true" />
                  <span>
                    <span className="text-white font-semibold">Proactive Talent Management:</span> Continuous relationship-building allows for proactive workforce planning.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#20C997]" aria-hidden="true" />
                  <span>
                    <span className="text-white font-semibold">Trust and Loyalty:</span> Candidates are more likely to commit to a company they have a relationship with.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Who Is Creerlio For */}
        <section className="w-full bg-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-18">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Who Is Creerlio For?</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: 'Talent',
                  body: 'Build private portfolios, control visibility, and connect with businesses on your terms.',
                },
                {
                  title: 'Business',
                  body: 'Let the right talent discover you and respond to intentional connection requests.',
                },
                {
                  title: 'Public',
                  body: 'Browse businesses and jobs without creating an account.',
                },
              ].map((card) => (
                <div key={card.title} className="rounded-2xl border border-gray-100 p-6 shadow-sm bg-white">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{card.title}</h3>
                  <p className="text-gray-600">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Discovery Flow */}
        <section className="w-full bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-18">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Discover → Request → Connect</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { title: 'Discover', body: 'Explore businesses and jobs with no friction or noise.' },
                { title: 'Request', body: 'Talent initiates connection requests with intent and context.' },
                { title: 'Connect', body: 'Businesses respond to real interest, not cold outreach.' },
              ].map((step) => (
                <div key={step.title} className="rounded-2xl border border-gray-200 bg-white p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cost Efficiency */}
        <section className="w-full bg-[#0e0e0e]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-18">
            <div className="max-w-3xl space-y-6">
              <h2 className="text-3xl font-bold text-white">Cost Efficiency</h2>
              <ul className="space-y-4 text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#20C997]" aria-hidden="true" />
                  <span>Reduction in Recruitment Costs: Eliminates fees paid to external recruiters and agencies.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#20C997]" aria-hidden="true" />
                  <span>Lower Advertising Costs: Reduced need for extensive job advertisements due to direct relationships.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#20C997]" aria-hidden="true" />
                  <span>Reduced Time-to-Hire: Faster recruitment process as businesses already have access to a pool of potential candidates.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Private Talent Portfolios */}
        <section className="w-full bg-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-18">
            <div className="max-w-3xl space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">Private Talent Portfolios</h2>
              <p className="text-gray-600 text-lg">
                Private by default. Visibility is controlled by talent. No public broadcasting.
              </p>
            </div>
          </div>
        </section>

        {/* Business Profiles */}
        <section className="w-full bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-18">
            <div className="max-w-3xl space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">
                Stop chasing candidates. Let them discover you.
              </h2>
              <p className="text-gray-600 text-lg">
                Publish your profile once. Let talent explore and request connections when it makes sense.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy & Information Control */}
        <section className="w-full bg-[#0e0e0e]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-18">
            <div className="max-w-3xl space-y-6">
              <h2 className="text-3xl font-bold text-white">Maintain Control of your Privacy and Information</h2>
              <div className="space-y-4 text-gray-400">
                <p>
                  <span className="text-orange-600 font-semibold">Privacy of Information:</span> No longer will you lose control of your information like you currently do when you apply for jobs or send your Resume and documents for employment consideration. You choose what Business see when they see it and how long they see it for!
                </p>
                <p>
                  <span className="text-orange-600 font-semibold">Avoiding Unsolicited Offers:</span> Controlling your information helps prevent your data from being sold or shared without your consent, leading to unsolicited job offers or marketing communications.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Jobs */}
        <section className="w-full bg-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-18">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Jobs</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <p className="text-gray-700 font-medium">Jobs are public</p>
                <p className="text-gray-600 mt-2">Open roles can be discovered without login.</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <p className="text-gray-700 font-medium">Applying requires a portfolio</p>
                <p className="text-gray-600 mt-2">Less noise, better fit, and clearer intent.</p>
              </div>
            </div>
          </div>
        </section>

        {/* PeopleSelect */}
        <section className="w-full bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-18">
            <div className="rounded-3xl border border-gray-200 bg-white p-8 flex flex-col gap-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                Powered by Creerlio. Managed by PeopleSelect.
              </h2>
              <p className="text-gray-600">
                A trusted operating layer for curated opportunities and responsible connections.
              </p>
            </div>
          </div>
        </section>

        {/* Governance & Trust */}
        <section className="w-full bg-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-18">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Governance &amp; Trust</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { title: 'Permissioned connections', body: 'Connections happen by intent, not by default.' },
                { title: 'Privacy controls', body: 'Talent controls visibility across portfolio sections.' },
                { title: 'Australian platform', body: 'Built for local trust, clarity, and compliance.' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-gray-100 bg-white p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="w-full bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-18">
            <div className="rounded-3xl border border-gray-200 bg-white p-8 flex flex-col gap-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Start with intent</h2>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/businesses"
                  className="px-6 py-3 rounded-xl bg-[#2B4EA2] hover:bg-[#243F86] text-white font-semibold transition-colors"
                >
                  Find Businesses
                </Link>
                <Link
                  href="/search"
                  className="px-6 py-3 rounded-xl bg-[#2B4EA2] hover:bg-[#243F86] text-white font-semibold transition-colors"
                >
                  Search Jobs
                </Link>
                <Link
                  href="/login/talent?mode=signup&redirect=/dashboard/talent"
                  className="px-6 py-3 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 font-semibold transition-colors"
                >
                  Create a Private Talent Portfolio
                </Link>
                <Link
                  href="/peopleselect/contact"
                  className="px-6 py-3 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 font-semibold transition-colors"
                >
                  Book a Call
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between text-sm text-gray-600">
          <span>© {new Date().getFullYear()} Creerlio</span>
          <Link href="/terms" className="hover:text-[#2B4EA2] transition-colors">
            Terms and Conditions
          </Link>
        </div>
      </footer>
    </div>
  )
}
