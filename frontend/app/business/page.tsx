'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function BusinessPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

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

    return () => {
      sub?.subscription?.unsubscribe()
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#f9fafb] text-gray-900">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              Creerlio
            </Link>

            <nav className="hidden lg:flex items-center gap-x-8 text-sm text-gray-600">
              <Link href="/talent" className="hover:text-blue-600 transition-colors">Talent</Link>
              <Link href="/business" className="hover:text-blue-600 transition-colors">Business</Link>
              <Link href="/search" className="hover:text-blue-600 transition-colors">Search</Link>
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

            <div className="flex gap-3">
              <Link
                href="/login/talent?mode=signup&redirect=/dashboard/talent"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-sm text-white transition-colors"
              >
                Create Talent Account
              </Link>
              <Link
                href="/login/business?mode=signup&redirect=/dashboard/business"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-sm text-white transition-colors"
              >
                Create Business Account
              </Link>
              <Link
                href="/login/talent?mode=signin&redirect=/dashboard/talent"
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-sm text-white transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-16">
        <section className="space-y-6 border-b border-gray-200 pb-16">
          <div className="w-full">
            <Image
              src="/138fb370-9c2a-479a-b7e6-501ae4333de6.png"
              alt="Business hero"
              width={1400}
              height={720}
              className="w-full rounded-2xl border border-gray-200 shadow-sm"
              priority
            />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            Smarter workforce planning starts here.
          </h1>
          <p className="max-w-3xl text-lg text-gray-600">
            Discover high-intent talent, request permission to connect, and engage meaningfully ÔÇö without wasted outreach.
          </p>
          <Link
            href="/search"
            className="inline-flex rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Search for Talent
          </Link>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Explore Talent with Intent</h2>
          <p className="max-w-3xl text-sm text-gray-600">
            Businesses can search via list or map. Results are anonymized until connection approval. No cold outreach or
            resume scraping.
          </p>
        </section>

        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-gray-900">Permissioned Access</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Anonymity in Search',
                body: 'View talent profiles without exposing identity.',
              },
              {
                title: 'Gated Portfolio Access',
                body: 'Full portfolios unlock only after approval.',
              },
              {
                title: 'Messaging & Video',
                body: 'Engage directly once connected.',
              },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-3 text-sm text-gray-600">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Reduce wasted outreach and focus on what matters.</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {['Fewer, better conversations', 'Higher intent connections', 'Relationship-led hiring'].map((item) => (
              <div key={item} className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="text-center">
          <Link
            href="/search"
            className="inline-flex rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Explore Talent
          </Link>
        </section>
      </main>
    </div>
  )
}
