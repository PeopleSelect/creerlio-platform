'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setIsAuthenticated(!!data.session?.user?.id)
      } catch {
        setIsAuthenticated(false)
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
              <Link href="/jobs" className="hover:text-blue-600 transition-colors">Jobs</Link>
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

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-24 pt-8">
        <section className="space-y-6">
          <div className="w-full">
            <Image
              src="/a94c7965-afb3-4d95-831f-af4a386d4fd0.png"
              alt="Creerlio platform overview"
              width={1400}
              height={720}
              className="w-full rounded-2xl border border-gray-200 shadow-sm"
              priority
            />
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">How Creerlio Works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Discover',
                body: 'Explore talent or businesses through search and map views — without exposing private details.',
              },
              {
                title: 'Request',
                body: 'Send a connection request to unlock deeper portfolio access.',
              },
              {
                title: 'Connect',
                body: 'Once accepted, message, video chat, and build a working relationship.',
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
          <h2 className="text-2xl font-semibold text-gray-900">For Talent</h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <ul className="space-y-3 text-sm text-gray-700">
              <li>Create a private portfolio with documents, media, and credentials</li>
              <li>Control who can view or export your information</li>
              <li>Accept or decline connection requests</li>
              <li>Messaging and video chat unlock only after acceptance</li>
              <li>Manage all connections in one place</li>
            </ul>
            <div className="mt-6">
              <Link
                href="/login/talent?mode=signup&redirect=/dashboard/talent"
                className="inline-flex rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create Your Portfolio
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">For Businesses</h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <ul className="space-y-3 text-sm text-gray-700">
              <li>Discover talent using search and map intelligence</li>
              <li>Request permission before viewing full portfolios</li>
              <li>Avoid cold outreach and unsolicited applications</li>
              <li>Message and video chat after acceptance</li>
              <li>Maintain long-term talent relationships</li>
            </ul>
            <div className="mt-6">
              <Link
                href="/search"
                className="inline-flex rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Explore Talent
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Privacy is built into every step.</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              'Private portfolios by default',
              'Consent required to view or export content',
              'Messaging unlocked only after acceptance',
              'All consent decisions recorded',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">What happens after you connect</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
            <li>Direct messaging</li>
            <li>Video chat</li>
            <li>Portfolio access</li>
            <li>Ongoing relationship management</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900">Start with intent.</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/talent"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              I’m Talent
            </Link>
            <Link
              href="/business"
              className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-600"
            >
              I’m a Business
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
