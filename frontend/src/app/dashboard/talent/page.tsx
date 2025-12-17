'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

interface User {
  id: number
  email: string
  username: string
  full_name: string | null
  user_type: string
  is_active: boolean
}

export default function TalentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [talentProfile, setTalentProfile] = useState<any>(null)

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('access_token')
    const email = localStorage.getItem('user_email')

    if (!token || !email) {
      router.push('/login')
      return
    }

    // Fetch user info
    fetchUserInfo(email)
  }, [router])

  const fetchUserInfo = async (email: string) => {
    try {
      // #region agent log
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/talent/page.tsx:39',message:'API URL resolved for dashboard',data:{apiUrl,envVar:process.env.NEXT_PUBLIC_API_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/talent/page.tsx:40',message:'Attempting fetch user info',data:{url:`${apiUrl}/api/auth/me`,hasToken:!!localStorage.getItem('access_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const response = await axios.get(`${apiUrl}/api/auth/me`, {
        params: { email },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/talent/page.tsx:46',message:'Fetch user info succeeded',data:{status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setUser(response.data)
      
      // Fetch talent profile if exists
      if (response.data.talent_profile_id) {
        fetchTalentProfile(response.data.talent_profile_id)
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/talent/page.tsx:52',message:'Fetch user info failed',data:{hasResponse:!!error.response,status:error.response?.status,code:error.code,message:error.message,isNetworkError:!error.response},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching user:', error)
      // If auth fails, redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('user_email')
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTalentProfile = async (talentId: number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await axios.get(`${apiUrl}/api/talent/${talentId}`)
      setTalentProfile(response.data)
    } catch (error) {
      console.error('Error fetching talent profile:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_email')
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-4 flex items-center justify-between border-b border-gray-800">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <span className="text-white text-2xl font-bold">Creerlio</span>
        </Link>
        
        <div className="flex items-center space-x-4">
          <span className="text-gray-300">Welcome, {user?.full_name || user?.username}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Talent Dashboard</h1>
          <p className="text-gray-400">Manage your profile, portfolio, and job applications</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="dashboard-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Your Profile</h2>
            {user && (
              <div className="space-y-2">
                <p className="text-gray-300"><span className="text-gray-500">Email:</span> {user.email}</p>
                <p className="text-gray-300"><span className="text-gray-500">Username:</span> {user.username}</p>
                {user.full_name && (
                  <p className="text-gray-300"><span className="text-gray-500">Name:</span> {user.full_name}</p>
                )}
                <Link
                  href="/portfolio"
                  className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Edit Portfolio
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/resume/upload"
                className="block px-4 py-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                Upload Resume
              </Link>
              <Link
                href="/portfolio"
                className="block px-4 py-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                Edit Portfolio
              </Link>
              <Link
                href="/talent/search"
                className="block px-4 py-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                Search Jobs
              </Link>
            </div>
          </div>

          {/* Stats Card */}
          <div className="dashboard-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Statistics</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-500 text-sm">Profile Views</p>
                <p className="text-3xl font-bold text-blue-400">0</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Applications</p>
                <p className="text-3xl font-bold text-green-400">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Talent Profile Section */}
        {talentProfile ? (
          <div className="mt-8 dashboard-card rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Talent Profile</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {talentProfile.skills?.map((skill: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Location</h3>
                <p className="text-gray-300">{talentProfile.location || 'Not set'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 dashboard-card rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Create Your Talent Profile</h2>
            <p className="text-gray-400 mb-4">Complete your profile to start matching with opportunities</p>
            <Link
              href="/portfolio"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}


