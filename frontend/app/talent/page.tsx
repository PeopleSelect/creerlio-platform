'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TalentPage() {
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

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-16">
        <section className="space-y-6">
          <div className="w-full">
            <Image
              src="/9fc3c9a7-4d35-4451-b0b4-30fb5580c695.png"
              alt="Talent hero"
              width={1400}
              height={720}
              className="w-full rounded-2xl border border-gray-200 shadow-sm"
              priority
            />
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4 text-xs text-gray-500">
            <span className="font-semibold text-gray-900">CREERLIO</span>
            <span className="rounded-full border border-gray-200 px-3 py-1 text-[11px]">Manage Your Portfolio</span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-xl border border-gray-200 bg-gray-100" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Simon Bell</h3>
                    <p className="text-xs text-gray-600">Software Engineer</p>
                    <p className="text-xs text-gray-500">San Francisco CA</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full border border-gray-200 px-3 py-1 text-[11px] text-gray-600">
                    Confidential private Talent
                  </span>
                  <span className="rounded-full border border-blue-200 px-3 py-1 text-[11px] text-blue-600">
                    Invite Your Talent
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-gray-600">
                  {['Overview', 'Video', 'Resume', 'Skills', 'Credentials'].map((tab, index) => (
                    <span
                      key={tab}
                      className={`rounded-full px-3 py-1 ${index === 0 ? 'bg-blue-600 text-white' : 'border border-gray-200'}`}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-gray-900">Overview</div>
                <ul className="mt-3 space-y-2 text-[11px] text-gray-400">
                  <li className="h-2 w-4/5 rounded-full bg-gray-200" />
                  <li className="h-2 w-3/5 rounded-full bg-gray-200" />
                  <li className="h-2 w-2/3 rounded-full bg-gray-200" />
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-xs text-gray-500 shadow-sm">
                <div className="h-3 w-2/3 rounded-full bg-gray-200" />
                <div className="mt-4 h-20 w-full rounded-xl bg-gray-100" />
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-xs text-gray-500 shadow-sm">
                <div className="h-3 w-1/2 rounded-full bg-gray-200" />
                <div className="mt-4 h-20 w-full rounded-xl bg-gray-100" />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Manage Your Visibility</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: 'Private Portfolio',
                body: 'Your portfolio is private by default.',
              },
              {
                title: 'Manage Your Access',
                body: 'Approve or decline connection requests.',
              },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-2 text-xs text-gray-600">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 text-center text-xs text-gray-600 shadow-sm">
          Create a Private Portfolio · Manage Visibility · Accept Connection · Engage
        </section>

        <section className="text-center">
          <Link
            href="/login/talent?mode=signup&redirect=/dashboard/talent"
            className="inline-flex rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Build Your Portfolio
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-xs text-gray-600">
          <span>Talent</span>
          <span>Business</span>
          <span className="rounded-full border border-gray-200 px-4 py-1 text-[11px]">Get Started</span>
        </div>
      </footer>
    </div>
  )
}
