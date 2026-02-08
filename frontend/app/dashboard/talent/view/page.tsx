'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function isExternalUrl(path?: string | null) {
  return !!path && /^https?:\/\//i.test(path)
}

async function resolveTalentBankUrl(path?: string | null, seconds = 60 * 30) {
  if (!path) return null
  if (isExternalUrl(path)) return path
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  try {
    const { data, error } = await supabase.storage.from('talent-bank').createSignedUrl(path, seconds)
    if (!error && data?.signedUrl) {
      return data.signedUrl
    }
  } catch {}
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/talent-bank/${encodeURIComponent(path)}`
  }
  return null
}

interface TalentProfile {
  id: string
  user_id: string
  name: string | null
  title: string | null
  headline: string | null
  bio: string | null
  skills: string[] | null
  location: string | null
  city: string | null
  state: string | null
  country: string | null
  phone: string | null
  search_visible: boolean
  search_summary: string | null
  availability_description: string | null
  intent_status: string | null
  intent_visibility: boolean
}

export default function ViewTalentProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<TalentProfile | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const handleDeleteRegistration = async () => {
    setIsDeleting(true)
    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const userId = sessionRes.session?.user?.id
      if (!userId) {
        alert('No active session found.')
        return
      }

      // Delete talent profile first
      const { error: profileError } = await supabase
        .from('talent_profiles')
        .delete()
        .eq('user_id', userId)

      if (profileError) {
        console.error('Error deleting talent profile:', profileError)
        // Continue anyway - profile might not exist
      }

      // Delete auth account via backend API (requires admin privileges)
      const accessToken = sessionRes.session?.access_token
      if (!accessToken) {
        alert('Failed to delete account: missing access token. Please sign in again.')
        return
      }

      let deleteResponse
      try {
        deleteResponse = await fetch('/api/auth/delete-account', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ user_id: userId }),
        })
      } catch (fetchError: any) {
        alert(`Failed to delete account: ${fetchError?.message || 'Failed to fetch'}. Please contact support.`)
        return
      }

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json().catch(() => ({}))
        const errorMsg = errorData?.detail || errorData?.message || 'Unknown error'
        console.error('Error deleting auth account:', errorData)
        alert(`Failed to delete account: ${errorMsg}. The account may still exist. Please contact support.`)
        return
      }

      const deleteResult = await deleteResponse.json().catch(() => ({}))
      if (!deleteResult.success) {
        alert(`Account deletion may have failed: ${deleteResult.message || 'Unknown error'}. Please contact support.`)
        return
      }

      // Clear localStorage
      localStorage.removeItem('creerlio_active_role')
      localStorage.removeItem('user_type')
      localStorage.removeItem('access_token')
      localStorage.removeItem('user_email')

      // Sign out
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        console.log('Sign out attempted')
      }

      // Redirect to home
      router.replace('/')

      alert('Your Talent account has been deleted successfully.')
    } catch (error: any) {
      console.error('Error deleting registration:', error)
      alert(`Failed to delete account: ${error?.message || 'Unknown error'}. Please contact support.`)
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true)
      setError(null)

      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const uid = sessionRes.session?.user?.id
        const email = sessionRes.session?.user?.email

        if (!uid) {
          router.push('/login?redirect=/dashboard/talent/view')
          return
        }

        setUserEmail(email || null)

        const { data, error: fetchError } = await supabase
          .from('talent_profiles')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle()

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        if (!data) {
          setError('No talent profile found. Please create your profile first.')
          return
        }

        setProfile(data as TalentProfile)

        const { data: portfolioRow } = await supabase
          .from('talent_bank_items')
          .select('metadata')
          .eq('user_id', uid)
          .eq('item_type', 'portfolio')
          .maybeSingle()

        const avatarPath = (portfolioRow as any)?.metadata?.avatar_path || null
        if (avatarPath) {
          const url = await resolveTalentBankUrl(String(avatarPath))
          setAvatarUrl(url)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/dashboard/talent"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              &larr; Back to Dashboard
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Link
                href="/dashboard/talent/edit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Extract just the city name if it contains commas (e.g., "Cooma, New South Wales, Australia" -> "Cooma")
  const cityName = profile?.city?.split(',')[0]?.trim() || null
  const locationParts = [cityName, profile?.state, profile?.country].filter(Boolean)
  const locationString = locationParts.length > 0 ? locationParts.join(', ') : profile?.location || 'Not specified'

  const skillsArray = Array.isArray(profile?.skills)
    ? profile.skills
    : typeof profile?.skills === 'string'
      ? profile.skills.split(',').map(s => s.trim()).filter(Boolean)
      : []

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard/talent"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            &larr; Back to Dashboard
          </Link>
          <Link
            href="/dashboard/talent/edit"
            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Profile
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/talent/edit"
                className="w-14 h-14 rounded-full bg-white/20 border border-white/30 overflow-hidden flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                title="View Profile"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold">
                    {(profile?.name || 'U').charAt(0)}
                  </span>
                )}
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {profile?.name || 'Unnamed Talent'}
                </h1>
                {profile?.title && (
                  <p className="text-blue-100 mt-1">{profile.title}</p>
                )}
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-8 space-y-8">
            {/* Contact Info */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{userEmail || 'Not available'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-gray-900">{profile?.phone || 'Not specified'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-gray-900">{locationString}</p>
                </div>
              </div>
            </section>

            {/* Headline & Bio */}
            {(profile?.headline || profile?.bio) && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>
                {profile?.headline && (
                  <p className="text-gray-700 font-medium mb-2">{profile.headline}</p>
                )}
                {profile?.bio && (
                  <p className="text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
                )}
              </section>
            )}

            {/* Skills */}
            {skillsArray.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {skillsArray.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Anonymous Search Settings */}
            <section className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Business Search Visibility
              </h2>

              <div className={`p-4 rounded-lg ${profile?.search_visible ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${profile?.search_visible ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className={`font-medium ${profile?.search_visible ? 'text-green-700' : 'text-gray-600'}`}>
                    {profile?.search_visible ? 'Visible to Businesses' : 'Hidden from Business Search'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {profile?.search_visible
                    ? 'Businesses can find you anonymously and request to connect.'
                    : 'Your profile is not visible in business searches. Enable visibility to be discovered by potential employers.'}
                </p>
              </div>

              {/* Anonymous Preview */}
              {profile?.search_visible && (
                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3">
                    What Businesses See (Anonymous Preview)
                  </h3>
                  <div className="bg-slate-800 text-white rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center text-slate-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-400 text-sm mb-1">Anonymous Talent</p>
                        <p className="font-medium text-white mb-2">{profile?.title || 'Professional'}</p>
                        {profile?.search_summary ? (
                          <p className="text-slate-300 text-sm">{profile.search_summary}</p>
                        ) : (
                          <p className="text-slate-400 text-sm italic">No anonymous summary set. Add one in Edit Profile to help businesses understand your background.</p>
                        )}
                        {profile?.availability_description && (
                          <p className="text-slate-400 text-sm mt-2">
                            <span className="text-green-400">Available:</span> {profile.availability_description}
                          </p>
                        )}
                        {locationParts.length > 0 && (
                          <p className="text-slate-400 text-sm mt-1">
                            {cityName}{profile?.state ? `, ${profile.state}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <button
                        disabled
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg opacity-75 cursor-not-allowed"
                      >
                        Request to Connect
                      </button>
                      <p className="text-slate-400 text-xs mt-2">
                        Businesses click this to send you a connection request
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Intent Status */}
              {profile?.intent_status && profile?.intent_visibility && (
                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Current Status</h3>
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-blue-700 font-medium capitalize">
                      {profile.intent_status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Delete Registration */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          {!showDeleteConfirm ? (
            <div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete Registration
              </button>
              <p className="mt-2 text-sm text-gray-500">
                Permanently delete your talent account and all associated data.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium mb-2">
                Are you sure you want to delete your account?
              </p>
              <p className="text-red-600 text-sm mb-4">
                This action cannot be undone. All your profile data, portfolio, and connections will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteRegistration}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
