'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function JobPostingsPage() {
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
                <button onClick={() => router.push('/business/candidates')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Candidates
                </button>
                <button onClick={() => router.push('/business/jobs')} className="px-4 py-2 text-amber-700 bg-amber-50 rounded-lg text-sm font-medium">
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Job Postings</h1>
            <p className="mt-2 text-gray-600">Manage your job listings</p>
          </div>
          <button className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
            + Create New Job
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm">Active Jobs</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">4</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm">Total Applications</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">28</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm">Interviews Scheduled</p>
            <p className="text-3xl font-bold text-green-600 mt-2">6</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm">Draft Jobs</p>
            <p className="text-3xl font-bold text-gray-400 mt-2">1</p>
          </div>
        </div>

        {/* Job Postings List */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">Senior Software Engineer</h3>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">Active</span>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                  <span>📍 Remote</span>
                  <span>💰 $120k - $180k</span>
                  <span>👥 12 Applications</span>
                  <span>📅 Posted 2 weeks ago</span>
                </div>
                <p className="mt-4 text-gray-600 line-clamp-2">
                  We're looking for an experienced software engineer to join our growing team and help build scalable web applications...
                </p>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => router.push('/business/jobs/1/applications')} className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
                    View Applications
                  </button>
                  <button onClick={() => alert('Edit job functionality - would open job editor')} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    Edit
                  </button>
                  <button onClick={() => { if(confirm('Close this job posting?')) alert('Job posting closed'); }} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    Close Posting
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">Full Stack Developer</h3>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">Active</span>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                  <span>📍 Hybrid</span>
                  <span>💰 $100k - $140k</span>
                  <span>👥 8 Applications</span>
                  <span>📅 Posted 1 week ago</span>
                </div>
                <p className="mt-4 text-gray-600 line-clamp-2">
                  Join our innovative team and help build the next generation of web applications with modern technologies...
                </p>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => router.push('/business/jobs/2/applications')} className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
                    View Applications
                  </button>
                  <button onClick={() => alert('Edit job functionality - would open job editor')} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    Edit
                  </button>
                  <button onClick={() => { if(confirm('Close this job posting?')) alert('Job posting closed'); }} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    Close Posting
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">DevOps Engineer</h3>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">Active</span>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                  <span>📍 Remote</span>
                  <span>💰 $110k - $160k</span>
                  <span>👥 6 Applications</span>
                  <span>📅 Posted 5 days ago</span>
                </div>
                <p className="mt-4 text-gray-600 line-clamp-2">
                  Looking for a DevOps engineer to help manage our cloud infrastructure and CI/CD pipelines...
                </p>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => router.push('/business/jobs/3/applications')} className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
                    View Applications
                  </button>
                  <button onClick={() => alert('Edit job functionality - would open job editor')} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    Edit
                  </button>
                  <button onClick={() => { if(confirm('Close this job posting?')) alert('Job posting closed'); }} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    Close Posting
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 opacity-60">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">UI/UX Designer</h3>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">Draft</span>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                  <span>📍 Remote</span>
                  <span>💰 $90k - $130k</span>
                  <span>👥 0 Applications</span>
                  <span>📅 Created yesterday</span>
                </div>
                <p className="mt-4 text-gray-600 line-clamp-2">
                  Seeking a talented UI/UX designer to create beautiful and intuitive user experiences...
                </p>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => alert('Job published successfully!')} className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
                    Publish
                  </button>
                  <button onClick={() => alert('Edit job functionality - would open job editor')} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    Edit
                  </button>
                  <button onClick={() => { if(confirm('Delete this draft?')) alert('Draft deleted'); }} className="px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium">
                    Delete
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
