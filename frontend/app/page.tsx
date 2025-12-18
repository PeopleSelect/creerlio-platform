"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MapboxMap = dynamic(() => import("@/components/MapboxMap"), {
  ssr: false,
});

export default function Home() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ lat: -33.8688, lng: 151.2093 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setLocation({ lat: -33.8688, lng: 151.2093 });
      }
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">

      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 backdrop-blur bg-slate-950/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-4xl font-bold">
            <span className="text-blue-400">C</span>reerlio
          </div>

          <nav className="hidden lg:flex items-center gap-12 text-sm text-slate-300">
            <Link href="/about" className="hover:text-blue-400">About</Link>
            <Link href="/talent" className="hover:text-blue-400">Talent</Link>
            <Link href="/business" className="hover:text-blue-400">Business</Link>
            <Link href="/analytics" className="hover:text-blue-400">Analytics</Link>
            <Link href="/search" className="hover:text-blue-400">Search</Link>
          </nav>

          <Link
            href="/register"
            className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 font-semibold text-sm ml-8"
          >
            Free Trial
          </Link>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="max-w-7xl mx-auto px-8 py-28 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">

        {/* LEFT COPY */}
        <div className="space-y-8">
          <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight">
            Creerlio  The AI powered<br />
            <span className="text-blue-400 drop-shadow-[0_0_30px_rgba(96,165,250,0.9)]">
              Talent & Business Platform
            </span>
          </h1>

          <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
            Smarter hiring, deeper talent insight, and proactive workforce strategy.
            Creerlio connects businesses and talent through AI-powered matching,
            location intelligence, and dynamic portfolios.
          </p>

          <div className="flex gap-4">
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 font-semibold"
            >
              Get Started
            </Link>
            <Link
              href="/talent"
              className="px-6 py-3 rounded-xl border border-blue-400/60 text-blue-300 hover:bg-blue-500/10"
            >
              View Talent
            </Link>
          </div>
        </div>

        {/* RIGHT VISUAL */}
        <div className="relative rounded-3xl bg-slate-900/70 border border-blue-500/20 shadow-2xl p-6">

          {/* STATS */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-slate-800/70 p-5">
              <div className="text-green-400 text-3xl font-bold">84.38%</div>
              <div className="text-slate-400 text-sm">Match Accuracy</div>
            </div>
            <div className="rounded-xl bg-slate-800/70 p-5">
              <div className="text-blue-400 text-3xl font-bold">655K</div>
              <div className="text-slate-400 text-sm">Active Talent</div>
            </div>
          </div>

          {/* MAP */}
          <div className="relative h-[420px] rounded-2xl overflow-hidden border border-blue-500/20 bg-slate-950">
            {location && (
              <MapboxMap center={location} zoom={10} />
            )}
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="max-w-7xl mx-auto px-8 py-28">
        <h2 className="text-4xl font-bold mb-14">
          Feature Set
        </h2>

        <div className="grid md:grid-cols-3 gap-10">

          <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-8">
            <h3 className="text-xl font-semibold mb-3">Rich Multimedia Portfolios</h3>
            <p className="text-slate-400">
              Go beyond CVs with video, images, credentials, and interactive
              talent profiles designed for modern hiring.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-8">
            <h3 className="text-xl font-semibold mb-3">Business Intelligence</h3>
            <p className="text-slate-400">
              Workforce analytics, AI matching, and proactive hiring insights
              built for scale.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-8">
            <h3 className="text-xl font-semibold mb-3">Location Intelligence</h3>
            <p className="text-slate-400">
              Map-based insights into talent density, relocation feasibility,
              commute zones, and opportunity distribution.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}
