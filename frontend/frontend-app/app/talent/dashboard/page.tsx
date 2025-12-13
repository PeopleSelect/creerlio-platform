'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';
import BusinessSearch from '@/components/BusinessSearch';

interface DashboardData {
  stats: {
    activeApplications: number;
    savedJobs: number;
    profileViews: number;
    matchScore: number;
  };
  recommendedJobs: Array<{
    id: string;
    title: string;
    company: string;
    location: string;
    type: string;
    salary: string;
    matchScore: number;
    tags: string[];
    postedDate: string;
  }>;
  recentActivity: Array<{
    type: string;
    message: string;
    date: string;
  }>;
}

export default function TalentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');

    if (!token || userType !== 'Talent') {
      router.push('/auth/login');
      return;
    }

    setUser({ email: 'talent@demo.com', type: 'Talent' });
    fetchDashboardData(token);
  }, [router]);

  const fetchDashboardData = async (token: string) => {
    try {
      // Use mock data since backend endpoint not implemented yet
      console.log('📊 Loading dashboard with mock data...');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockData: DashboardData = {
        stats: {
          activeApplications: 0,
          savedJobs: 0,
          profileViews: 0,
          matchScore: 0
        },
        recommendedJobs: [],
        recentActivity: []
      };
      
      setDashboardData(mockData);
      console.log('✅ Dashboard loaded');
    } catch (error) {
      console.error('❌ Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    router.push('/');
  };

  const getTimeSince = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
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
                <button onClick={() => router.push('/talent/dashboard')} className="px-4 py-2 text-amber-700 bg-amber-50 rounded-lg text-sm font-medium">
                  Dashboard
                </button>
                <button onClick={() => router.push('/talent/jobs')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Job Search
                </button>
                <button onClick={() => router.push('/talent/applications')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
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

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-8 mb-8 text-white">
          <h1 className="text-3xl font-serif mb-2">Welcome back!</h1>
          <p className="text-amber-50">Search for businesses you want to work for - take control of your career</p>
        </div>

        {/* Business Search - Primary Feature */}
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-2xl font-serif text-gray-900 mb-2">Find Your Perfect Employer</h2>
            <p className="text-gray-600">Search for businesses in your area by location, industry, size, and more. Connect directly with employers you want to work for.</p>
          </div>
          <BusinessSearch />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Active Applications</span>
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? '...' : dashboardData?.stats.activeApplications || 0}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Saved Jobs</span>
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? '...' : dashboardData?.stats.savedJobs || 0}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Profile Views</span>
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? '...' : dashboardData?.stats.profileViews || 0}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Match Score</span>
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? '--' : (dashboardData?.stats.matchScore || '--')}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => router.push('/talent/map')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-6 text-left transition-all shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">🗺️</span>
              <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-1">Job Map</h3>
            <p className="text-sm text-blue-100">Find jobs near you with interactive map</p>
          </button>

          <button
            onClick={() => router.push('/talent/jobs')}
            className="bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl p-6 text-left transition-all shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">💼</span>
              <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-1">Browse Jobs</h3>
            <p className="text-sm text-amber-100">Explore all available opportunities</p>
          </button>

          <button
            onClick={() => router.push('/talent/portfolio')}
            className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-6 text-left transition-all shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">📁</span>
              <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-1">My Portfolio</h3>
            <p className="text-sm text-purple-100">Showcase your work and skills</p>
          </button>
        </div>

        {/* Recommended Jobs */}
        {!loading && dashboardData && dashboardData.recommendedJobs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-serif text-gray-900">Recommended Jobs</h2>
              <button className="text-amber-700 hover:text-amber-800 text-sm font-medium">
                View all →
              </button>
            </div>
            <div className="space-y-4">
              {dashboardData.recommendedJobs.map((job) => (
                <div key={job.id} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                          <p className="text-gray-600">{job.company}</p>
                        </div>
                        <div className="flex items-center space-x-2 bg-amber-50 px-3 py-1 rounded-full">
                          <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm font-semibold text-amber-700">{job.matchScore}%</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.location}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {job.type}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {job.salary}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mb-3">
                        {job.tags.map((tag) => (
                          <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Posted {getTimeSince(job.postedDate)}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              // In production, would save to backend
                              alert('Job saved to your favorites!');
                            }}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium border border-gray-200"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => router.push(`/talent/jobs/${job.id}/apply`)}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
                          >
                            Apply Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {!loading && dashboardData && dashboardData.recentActivity.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-xl font-serif text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'application' ? 'bg-green-500' :
                    activity.type === 'profile_view' ? 'bg-blue-500' :
                    'bg-amber-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{getTimeSince(activity.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
