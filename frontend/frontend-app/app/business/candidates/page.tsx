'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CandidatesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');

    if (!token || userType !== 'Business') {
      router.push('/auth/login');
      return;
    }

    setUser({ email: 'business@demo.com', type: 'Business' });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <button onClick={() => router.push('/')} className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-xl font-serif text-gray-900">Creerlio</span>
              </button>

              <div className="hidden md:flex space-x-1">
                <button onClick={() => router.push('/business/dashboard')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Dashboard
                </button>
                <button onClick={() => router.push('/business/candidates')} className="px-4 py-2 text-amber-700 bg-amber-50 rounded-lg text-sm font-medium">
                  Candidates
                </button>
                <button onClick={() => router.push('/business/jobs')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Job Postings
                </button>
                <button onClick={() => router.push('/business/portfolio')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Company Profile
                </button>
                <button onClick={() => router.push('/business/messages')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Messages
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-amber-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
          <p className="mt-2 text-gray-600">Browse and manage candidate applications</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search candidates..."
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent">
              <option>All Job Postings</option>
              <option>Senior Software Engineer</option>
              <option>Full Stack Developer</option>
              <option>DevOps Engineer</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent">
              <option>All Statuses</option>
              <option>New</option>
              <option>Reviewing</option>
              <option>Interview</option>
              <option>Offer</option>
            </select>
            <button className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
              Search
            </button>
          </div>
        </div>

        {/* Candidates List */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-amber-700">SJ</span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Sarah Johnson</h3>
                    <p className="text-gray-600 mt-1">Senior Software Engineer</p>
                    <p className="text-sm text-gray-500 mt-1">Sydney, NSW • 8 years experience</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">96% Match</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">React</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Node.js</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">TypeScript</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">AWS</span>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => router.push('/business/candidates/1')} className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
                    View Profile
                  </button>
                  <button onClick={() => router.push('/business/messages')} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    Schedule Interview
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-blue-700">MC</span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Michael Chen</h3>
                    <p className="text-gray-600 mt-1">Full Stack Developer</p>
                    <p className="text-sm text-gray-500 mt-1">Melbourne, VIC • 5 years experience</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">92% Match</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">.NET</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">C#</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Azure</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">SQL</span>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => router.push('/business/candidates/2')} className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
                    View Profile
                  </button>
                  <button onClick={() => router.push('/business/messages')} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    Schedule Interview
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-purple-700">EW</span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Emma Wilson</h3>
                    <p className="text-gray-600 mt-1">Frontend Developer</p>
                    <p className="text-sm text-gray-500 mt-1">Brisbane, QLD • 4 years experience</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">89% Match</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">React</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Next.js</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Tailwind</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">JavaScript</span>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => router.push('/business/candidates/3')} className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
                    View Profile
                  </button>
                  <button onClick={() => router.push('/business/messages')} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    Schedule Interview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
