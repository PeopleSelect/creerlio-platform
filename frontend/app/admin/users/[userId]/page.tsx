'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function UserDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string
  
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [talentProfile, setTalentProfile] = useState<any>(null)
  const [businessProfile, setBusinessProfile] = useState<any>(null)
  const [authUser, setAuthUser] = useState<any>(null)
  const [editingTalent, setEditingTalent] = useState(false)
  const [editingBusiness, setEditingBusiness] = useState(false)
  const [talentDraft, setTalentDraft] = useState<any>(null)
  const [businessDraft, setBusinessDraft] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const u = sessionRes.session?.user
        if (!u?.id) {
          router.replace('/login?redirect=/admin/users')
          return
        }

        const { data: { user: freshUser } } = await supabase.auth.getUser()
        const userMetadata = (freshUser || u).user_metadata || {}
        const email = u.email || ''
        
        const hasAdminFlag = userMetadata.is_admin === true || userMetadata.admin === true
        const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
        const isAdminEmail = adminEmails.includes(email.toLowerCase())
        
        if (hasAdminFlag || isAdminEmail) {
          setIsAdmin(true)
          loadUserDetails(userId)
        } else {
          alert('Access denied. Admin privileges required.')
          router.replace('/')
        }
      } catch (error) {
        console.error('Error checking admin:', error)
        router.replace('/')
      } finally {
        setIsLoading(false)
      }
    }
    checkAdmin()
  }, [router, userId])

  async function loadUserDetails(userId: string) {
    try {
      // Load talent profile
      const { data: talentData, error: talentError } = await supabase
        .from('talent_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (talentData) {
        setTalentProfile(talentData)
        setUser({
          user_id: userId,
          name: talentData.name || talentData.talent_name || talentData.full_name || 'N/A',
          email: talentData.email || 'N/A',
          type: 'talent',
          created_at: talentData.created_at,
          is_active: talentData.is_active ?? true
        })
      }
      
      // Load business profile
      const { data: businessData, error: businessError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (businessData) {
        setBusinessProfile(businessData)
        if (!user) {
          setUser({
            user_id: userId,
            name: businessData.name || businessData.business_name || businessData.company_name || 'N/A',
            email: businessData.email || 'N/A',
            type: 'business',
            created_at: businessData.created_at,
            is_active: businessData.is_active ?? true
          })
        }
      }
      
      // Try to get auth user info (this might require admin API)
      // For now, we'll use profile data
      
    } catch (error: any) {
      console.error('Error loading user details:', error)
      alert(`Failed to load user details: ${error?.message || 'Unknown error'}`)
    }
  }

  async function saveTalentProfile() {
    if (!talentDraft || !talentProfile?.id) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('talent_profiles')
        .update(talentDraft)
        .eq('id', talentProfile.id)

      if (error) throw error

      setTalentProfile({ ...talentProfile, ...talentDraft })
      setEditingTalent(false)
      alert('Talent profile updated successfully!')
    } catch (error: any) {
      console.error('Error saving talent profile:', error)
      alert(`Failed to save: ${error?.message || 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  async function saveBusinessProfile() {
    if (!businessDraft || !businessProfile?.id) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update(businessDraft)
        .eq('id', businessProfile.id)

      if (error) throw error

      setBusinessProfile({ ...businessProfile, ...businessDraft })
      setEditingBusiness(false)
      alert('Business profile updated successfully!')
    } catch (error: any) {
      console.error('Error saving business profile:', error)
      alert(`Failed to save: ${error?.message || 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  function startEditTalent() {
    setTalentDraft({ ...talentProfile })
    setEditingTalent(true)
  }

  function startEditBusiness() {
    setBusinessDraft({ ...businessProfile })
    setEditingBusiness(true)
  }

  function cancelEditTalent() {
    setTalentDraft(null)
    setEditingTalent(false)
  }

  function cancelEditBusiness() {
    setBusinessDraft(null)
    setEditingBusiness(false)
  }

  // Fields that should be editable
  const editableTalentFields = ['name', 'title', 'headline', 'bio', 'skills', 'location', 'city', 'state', 'country', 'phone', 'search_visible', 'search_summary', 'availability_description']
  const editableBusinessFields = ['name', 'business_name', 'email', 'phone', 'website', 'description', 'industry', 'city', 'state', 'country', 'address']

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur bg-slate-950/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/users" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
                ← Back to Users
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-lg font-semibold">User Details</span>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/')
              }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <h1 className="text-3xl font-bold mb-6">User Details</h1>
        
        {user ? (
          <div className="space-y-6">
            {/* User Info Card */}
            <div className="bg-slate-900/70 border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">User Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">User ID</p>
                  <p className="text-white font-mono text-sm">{user.user_id}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Name</p>
                  <p className="text-white">{user.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Email</p>
                  <p className="text-white">{user.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Type</p>
                  <span
                    className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                      user.type === 'talent'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'bg-green-500/20 text-green-400 border border-green-500/50'
                    }`}
                  >
                    {user.type}
                  </span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                      user.is_active
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-red-500/20 text-red-400 border border-red-500/50'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Created</p>
                  <p className="text-white">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Talent Profile Details */}
            {talentProfile && (
              <div className="bg-slate-900/70 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Talent Profile</h2>
                  {!editingTalent ? (
                    <button
                      onClick={startEditTalent}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={saveTalentProfile}
                        disabled={isSaving}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditTalent}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(talentProfile).map(([key, value]) => {
                    if (key === 'id' || key === 'user_id' || key === 'created_at' || key === 'updated_at') return null
                    if (!editingTalent && (value === null || value === undefined || value === '')) return null

                    const isEditable = editableTalentFields.includes(key)

                    if (editingTalent && isEditable) {
                      return (
                        <div key={key} className={key === 'bio' || key === 'search_summary' ? 'md:col-span-2' : ''}>
                          <label className="text-gray-400 text-sm mb-1 capitalize block">{key.replace(/_/g, ' ')}</label>
                          {key === 'search_visible' ? (
                            <input
                              type="checkbox"
                              checked={talentDraft?.[key] || false}
                              onChange={(e) => setTalentDraft({ ...talentDraft, [key]: e.target.checked })}
                              className="w-5 h-5"
                            />
                          ) : key === 'bio' || key === 'search_summary' || key === 'availability_description' ? (
                            <textarea
                              value={talentDraft?.[key] || ''}
                              onChange={(e) => setTalentDraft({ ...talentDraft, [key]: e.target.value })}
                              rows={4}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                            />
                          ) : (
                            <input
                              type="text"
                              value={talentDraft?.[key] || ''}
                              onChange={(e) => setTalentDraft({ ...talentDraft, [key]: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                            />
                          )}
                        </div>
                      )
                    }

                    let displayValue = value
                    if (typeof value === 'object') {
                      displayValue = JSON.stringify(value, null, 2)
                    }

                    return (
                      <div key={key}>
                        <p className="text-gray-400 text-sm mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-white text-sm break-words">{String(displayValue)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Business Profile Details */}
            {businessProfile && (
              <div className="bg-slate-900/70 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Business Profile</h2>
                  {!editingBusiness ? (
                    <button
                      type="button"
                      onClick={startEditBusiness}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveBusinessProfile}
                        disabled={isSaving}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditBusiness}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(businessProfile).map(([key, value]) => {
                    if (key === 'id' || key === 'user_id' || key === 'created_at' || key === 'updated_at') return null
                    if (!editingBusiness && (value === null || value === undefined || value === '')) return null

                    const isEditable = editableBusinessFields.includes(key)

                    if (editingBusiness && isEditable) {
                      return (
                        <div key={key} className={key === 'description' ? 'md:col-span-2' : ''}>
                          <label className="text-gray-400 text-sm mb-1 capitalize block">{key.replace(/_/g, ' ')}</label>
                          {key === 'description' ? (
                            <textarea
                              value={businessDraft?.[key] || ''}
                              onChange={(e) => setBusinessDraft({ ...businessDraft, [key]: e.target.value })}
                              rows={4}
                              placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                            />
                          ) : (
                            <input
                              type="text"
                              value={businessDraft?.[key] || ''}
                              onChange={(e) => setBusinessDraft({ ...businessDraft, [key]: e.target.value })}
                              placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                            />
                          )}
                        </div>
                      )
                    }

                    let displayValue = value
                    if (typeof value === 'object') {
                      displayValue = JSON.stringify(value, null, 2)
                    }

                    return (
                      <div key={key}>
                        <p className="text-gray-400 text-sm mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-white text-sm break-words">{String(displayValue)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!talentProfile && !businessProfile && (
              <div className="bg-slate-900/70 border border-white/10 rounded-xl p-6 text-center">
                <p className="text-gray-400">No profile data found for this user.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-slate-900/70 border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">View Profile & Portfolio</h2>
              <div className="flex flex-wrap gap-4">
                {talentProfile && (
                  <Link
                    href={`/admin/users/${userId}/portfolio`}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    View Talent Portfolio
                  </Link>
                )}
                {businessProfile && (
                  <Link
                    href={`/admin/users/${userId}/business`}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    View Business Profile
                  </Link>
                )}
                {!talentProfile && !businessProfile && (
                  <p className="text-gray-400">No profile or portfolio available to view.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/70 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-gray-400">User not found.</p>
          </div>
        )}
      </div>
    </div>
  )
}

