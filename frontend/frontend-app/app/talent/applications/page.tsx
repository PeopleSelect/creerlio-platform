'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ApplicationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');

    if (!token || userType !== 'Talent') {
      router.push('/auth/login');
      return;
    }

    setUser({ email: 'talent@demo.com', type: 'Talent' });
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
                <button onClick={() => router.push('/talent/dashboard')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Dashboard
                </button>
                <button onClick={() => router.push('/talent/jobs')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Job Search
                </button>
                <button onClick={() => router.push('/talent/applications')} className="px-4 py-2 text-amber-700 bg-amber-50 rounded-lg text-sm font-medium">
                  Applications
                </button>
                <button onClick={() => router.push('/talent/portfolio')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Portfolio
                </button>
                <button onClick={() => router.push('/talent/messages')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
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
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="mt-2 text-gray-600">Track your job applications</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm">Total Applications</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">8</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm">In Review</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">3</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm">Interviews</p>
            <p className="text-3xl font-bold text-green-600 mt-2">2</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm">Rejected</p>
            <p className="text-3xl font-bold text-gray-400 mt-2">3</p>
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">Senior Software Engineer</h3>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">Interview Scheduled</span>
                </div>
                <p className="text-gray-600 mt-1">TechCorp Inc.</p>
                <p className="text-sm text-gray-500 mt-2">Applied 3 days ago</p>
                <p className="text-sm text-amber-600 mt-2 font-medium">📅 Interview: Dec 1, 2025 at 2:00 PM</p>
              </div>
              <button onClick={() => router.push('/talent/applications/1')} className="ml-4 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                View Details
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">Full Stack Developer</h3>
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">Under Review</span>
                </div>
                <p className="text-gray-600 mt-1">StartupXYZ</p>
                <p className="text-sm text-gray-500 mt-2">Applied 5 days ago</p>
              </div>
              <button onClick={() => router.push('/talent/applications/2')} className="ml-4 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                View Details
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">Frontend Developer</h3>
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">Under Review</span>
                </div>
                <p className="text-gray-600 mt-1">Digital Agency Co.</p>
                <p className="text-sm text-gray-500 mt-2">Applied 1 week ago</p>
              </div>
              <button onClick={() => router.push('/talent/applications/3')} className="ml-4 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                View Details
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 opacity-60">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">Backend Engineer</h3>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">Not Selected</span>
                </div>
                <p className="text-gray-600 mt-1">CloudTech Solutions</p>
                <p className="text-sm text-gray-500 mt-2">Applied 2 weeks ago</p>
              </div>
              <button onClick={() => router.push('/talent/applications/4')} className="ml-4 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
