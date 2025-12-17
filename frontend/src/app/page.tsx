'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Creerlio Platform</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            title="AI Resume Parsing"
            description="Upload and parse resumes with AI-powered extraction"
            link="/resume"
          />
          <FeatureCard
            title="Business Profiles"
            description="Create and manage business profiles with location features"
            link="/business"
          />
          <FeatureCard
            title="Talent Search"
            description="Search and discover talent by skills and location"
            link="/talent"
          />
          <FeatureCard
            title="Mapping & Routes"
            description="Advanced mapping intelligence with route calculation"
            link="/mapping"
          />
          <FeatureCard
            title="Portfolio Editor"
            description="Create and edit professional portfolios"
            link="/portfolio"
          />
          <FeatureCard
            title="PDF Generation"
            description="Generate professional PDFs for resumes and profiles"
            link="/pdf"
          />
        </div>
      </div>
    </main>
  )
}

function FeatureCard({ title, description, link }: { title: string; description: string; link: string }) {
  return (
    <Link href={link}>
      <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>
    </Link>
  )
}


