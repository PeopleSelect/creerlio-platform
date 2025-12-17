'use client'

import { useState } from 'react'
import Link from 'next/link'
import MapboxMap from '@/components/MapboxMap'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header/Navigation */}
      <header className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <span className="text-white text-2xl font-bold">Creerlio</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/dashboard/talent" className="text-gray-300 hover:text-blue-400 transition-colors">Smarter Hiring</Link>
          <Link href="/dashboard/business" className="text-gray-300 hover:text-blue-400 transition-colors">Business</Link>
          <Link href="/mapping" className="text-gray-300 hover:text-blue-400 transition-colors">Analytics</Link>
          <Link href="/portfolio" className="text-gray-300 hover:text-blue-400 transition-colors">Portfolio</Link>
        </nav>
        
        <div className="flex items-center space-x-4">
          <Link href="/register" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Sign Up
          </Link>
          <Link href="/login" className="px-4 py-2 border border-blue-500 text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors">
            Sign In
          </Link>
          <button className="text-gray-300 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
            Creerlio - The AI Powered{' '}
            <span className="text-blue-400 glow-text">Talent and Business</span> Platform
          </h1>
          
          {/* Description */}
          <p className="text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto">
            Smarter hiring, talent insights, and proactive workforce strategy. 
            Connect businesses with top talent through AI-powered matching and intelligent analytics.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link 
              href="/register"
              className="px-8 py-4 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all glow-blue text-center"
            >
              Get Started
            </Link>
            <Link 
              href="/login"
              className="px-8 py-4 border-2 border-blue-500 text-blue-400 rounded-lg font-semibold hover:bg-blue-500/10 transition-all text-center"
            >
              Sign In
            </Link>
          </div>

          {/* Key Metrics / Statistics */}
          <div className="grid grid-cols-2 gap-8 max-w-md mx-auto pt-12">
            <div className="text-center p-6 dashboard-card rounded-xl">
              <div className="text-green-400 text-4xl font-bold mb-2">84.38%</div>
              <div className="text-gray-400 font-medium">Match Score</div>
            </div>
            <div className="text-center p-6 dashboard-card rounded-xl">
              <div className="text-blue-400 text-4xl font-bold mb-2">655K</div>
              <div className="text-gray-400 font-medium">Active Talent</div>
            </div>
          </div>

          {/* Mapbox Map - Below Statistics */}
          <div className="relative pt-12">
            <div className="relative w-full h-96 bg-slate-800/50 rounded-2xl overflow-hidden border border-blue-500/20 shadow-2xl">
              <MapboxMap className="w-full h-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-white text-center mb-12">Feature Set</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature Card 1 */}
          <div className="dashboard-card rounded-xl p-8 hover:border-blue-500/50 transition-all relative">
            <div className="absolute top-4 right-4 text-gray-400 text-sm">?</div>
            <div className="w-16 h-16 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Rich Multimedia Portfolio</h3>
            <p className="text-gray-400">Showcase portfolios with videos, images, and interactive content to highlight talent capabilities.</p>
          </div>

          {/* Feature Card 2 */}
          <div className="dashboard-card rounded-xl p-8 hover:border-blue-500/50 transition-all relative">
            <div className="absolute top-4 right-4 text-gray-400 text-sm">?</div>
            <div className="w-16 h-16 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Business Dashboard</h3>
            <p className="text-gray-400">Seamless analytics and insights for businesses to track talent acquisition and workforce metrics.</p>
          </div>

          {/* Feature Card 3 */}
          <div className="dashboard-card rounded-xl p-8 hover:border-blue-500/50 transition-all relative">
            <div className="absolute top-4 right-4 text-gray-400 text-sm">3</div>
            <div className="w-16 h-16 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">PeopleSelect Integration</h3>
            <p className="text-gray-400">How it works - Seamless integration with PeopleSelect for enhanced talent matching and selection.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-gray-800">
        <div className="text-center text-gray-400">
          <p>&copy; 2025 Creerlio Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
