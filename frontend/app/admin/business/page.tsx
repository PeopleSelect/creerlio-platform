'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminBusinessPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [businessList, setBusinessList] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  // AI Generator modal state
  const [showGenerator, setShowGenerator] = useState(false)
  const [genMode, setGenMode]             = useState<'single' | 'bulk'>('single')
  const [genWebsite, setGenWebsite]       = useState('')
  const [genLinkedin, setGenLinkedin]     = useState('')
  const [genYoutube, setGenYoutube]       = useState('')
  const [genSlug, setGenSlug]             = useState('')
  const [genIndustry, setGenIndustry]     = useState('')
  const [genLocation, setGenLocation]     = useState('')
  const [genMaxResults, setGenMaxResults] = useState(2)
  const [genRunning, setGenRunning]       = useState(false)
  const [genLogs, setGenLogs]             = useState<{ text: string; isError?: boolean }[]>([])
  const [genDone, setGenDone]             = useState(false)
  const [genError, setGenError]           = useState('')

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const u = sessionRes.session?.user
        if (!u?.id) {
          router.replace('/login?redirect=/admin/business')
          return
        }

        setUser(u)
        const { data: { user: freshUser } } = await supabase.auth.getUser()
        const userMetadata = (freshUser || u).user_metadata || {}
        const email = u.email || ''
        
        const hasAdminFlag = userMetadata.is_admin === true || userMetadata.admin === true
        const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
        const isAdminEmail = adminEmails.includes(email.toLowerCase())
        
        if (hasAdminFlag || isAdminEmail) {
          setIsAdmin(true)
          loadBusiness(u.id)
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
  }, [router])

  async function loadBusiness(userId: string) {
    try {
      // Use Supabase directly
      let query = supabase
        .from('business_profiles')
        .select('*')
      
      // Apply search filter if provided
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const { data: allData, error } = await supabase
          .from('business_profiles')
          .select('*')
        
        if (error) throw error
        
        // Filter in JavaScript - handle various possible column names
        const filtered = (allData || []).filter((item: any) => {
          const name = item.name || item.business_name || item.company_name || ''
          const email = item.email || ''
          return name.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower)
        })
        
        // Sort by created_at descending
        filtered.sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || 0).getTime()
          const dateB = new Date(b.created_at || 0).getTime()
          return dateB - dateA
        })
        
        // Apply pagination
        const total = filtered.length
        const paginated = filtered.slice(page * 50, (page + 1) * 50)
        
        setBusinessList(paginated)
        setTotalCount(total)
        return
      }
      
      // No search - get all results first (RLS might limit, so we get all and paginate in JS)
      const { data: allData, error, count } = await supabase
        .from('business_profiles')
        .select('*', { count: 'exact' })
      
      if (error) {
        console.error('Supabase error:', error)
        // Check if it's an RLS error
        if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('RLS')) {
          throw new Error('Permission denied. Admin RLS policies may not be set up. Please run admin_rls_policies.sql in Supabase SQL Editor.')
        }
        throw error
      }
      
      // Sort and paginate in JavaScript
      const sorted = (allData || []).sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime()
        const dateB = new Date(b.created_at || 0).getTime()
        return dateB - dateA
      })
      
      const paginated = sorted.slice(page * 50, (page + 1) * 50)
      
      setBusinessList(paginated)
      setTotalCount(count || sorted.length)
    } catch (error: any) {
      console.error('Error loading business:', error)
      const errorMsg = error?.message || 'Failed to load business registrations'
      alert(errorMsg)
    }
  }

  useEffect(() => {
    if (isAdmin && user) {
      loadBusiness(user.id)
    }
  }, [page, searchQuery, isAdmin, user])

  async function runGenerator() {
    if (genMode === 'single' && !genWebsite.trim()) return
    if (genMode === 'bulk' && (!genIndustry.trim() || !genLocation.trim())) return
    setGenRunning(true)
    setGenLogs([])
    setGenDone(false)
    setGenError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('No session token')

      const body = genMode === 'bulk'
        ? { mode: 'bulk', industry: genIndustry.trim(), location: genLocation.trim(), maxResults: genMaxResults }
        : { mode: 'single', websiteUrl: genWebsite.trim(), linkedinUrl: genLinkedin.trim() || undefined, youtubeUrl: genYoutube.trim() || undefined, slug: genSlug.trim() || undefined }

      const res = await fetch('/api/admin/generate-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Failed to start generator' }))
        throw new Error(err.error || 'Failed to start generator')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let receivedDone = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (!line) continue
          try {
            const msg = JSON.parse(line)
            if (msg.log !== undefined) {
              setGenLogs(prev => [...prev, { text: msg.log, isError: msg.isError }])
            }
            if (msg.done) {
              receivedDone = true
              setGenDone(true)
              loadBusiness(user.id)
            }
            if (msg.error) {
              setGenError(msg.error)
            }
          } catch (_) {}
        }
      }

      if (!receivedDone) {
        setGenError('Stream closed before completion — Vercel function likely timed out (5 min limit). For bulk mode use 1–2 businesses max. Check the business list — partial profiles may have been created.')
      }
    } catch (e: any) {
      setGenError(e.message || 'Unknown error')
    } finally {
      setGenRunning(false)
    }
  }

  function openGenerator() {
    setShowGenerator(true)
    setGenMode('single')
    setGenWebsite('')
    setGenLinkedin('')
    setGenYoutube('')
    setGenSlug('')
    setGenIndustry('')
    setGenLocation('')
    setGenMaxResults(2)
    setGenLogs([])
    setGenDone(false)
    setGenError('')
    setGenRunning(false)
  }

  async function toggleActive(businessId: string, currentStatus: boolean) {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', businessId)

      if (error) throw error

      // Reload list
      loadBusiness(user.id)
    } catch (error: any) {
      console.error('Error updating business:', error)
      alert(`Failed to update business status: ${error?.message || 'Unknown error'}`)
    }
  }

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
              <Link href="/admin" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
                ← Admin Panel
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-lg font-semibold">Business Management</span>
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
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Business Registrations</h1>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(0)
              }}
              className="px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
            />
            <button
              type="button"
              onClick={openGenerator}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <span>✨</span> Generate AI Profile
            </button>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Industry</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Location</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Created</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {businessList.map((business) => {
                  // Handle various possible column names
                  const name = business.name || business.business_name || business.company_name || 'N/A'
                  const email = business.email || 'N/A'
                  const industry = business.industry || business.sector || 'N/A'
                  const location = business.location || business.city || business.address || 'N/A'
                  
                  return (
                  <tr 
                    key={business.id} 
                    className="border-b border-white/5 hover:bg-slate-800/30 cursor-pointer"
                    onClick={() => router.push(`/admin/users/${business.user_id || business.id}`)}
                  >
                    <td className="px-6 py-4 text-white">{name}</td>
                    <td className="px-6 py-4 text-gray-300">{email}</td>
                    <td className="px-6 py-4 text-gray-300">{industry}</td>
                    <td className="px-6 py-4 text-gray-300">{location}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          business.is_active
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-red-500/20 text-red-400 border border-red-500/50'
                        }`}
                      >
                        {business.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {business.created_at
                        ? new Date(business.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/admin/users/${business.user_id || business.id}`)
                          }}
                          className="px-3 py-1 rounded text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleActive(business.id, business.is_active)
                          }}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                            business.is_active
                              ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                              : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                          }`}
                        >
                          {business.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {businessList.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No business registrations found</p>
            </div>
          )}

          {/* Pagination */}
          {totalCount > 50 && (
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Showing {page * 50 + 1} - {Math.min((page + 1) * 50, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * 50 >= totalCount}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Generator Modal */}
      {showGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">✨ Generate AI Business Profile</h2>
                <p className="text-sm text-gray-400 mt-0.5">Researches the company and builds a complete profile automatically</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerator(false)}
                className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Form — hidden while running, done, or showing error panel */}
            {!genRunning && !genDone && !genError && (
              <div className="px-6 py-5 space-y-4">
                {/* Mode toggle */}
                <div className="flex rounded-lg overflow-hidden border border-white/10">
                  <button
                    type="button"
                    onClick={() => setGenMode('single')}
                    className={`flex-1 py-2 text-sm font-semibold transition-colors ${genMode === 'single' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-gray-400 hover:text-gray-200'}`}
                  >
                    Single Business
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenMode('bulk')}
                    className={`flex-1 py-2 text-sm font-semibold transition-colors ${genMode === 'bulk' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-gray-400 hover:text-gray-200'}`}
                  >
                    Bulk Discovery
                  </button>
                </div>

                {genMode === 'single' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Website URL <span className="text-red-400">*</span></label>
                      <input type="url" placeholder="https://www.example.com.au" value={genWebsite} onChange={e => setGenWebsite(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                        style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">LinkedIn <span className="text-gray-500">(optional)</span></label>
                        <input type="url" placeholder="https://linkedin.com/company/..." value={genLinkedin} onChange={e => setGenLinkedin(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                          style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">YouTube <span className="text-gray-500">(optional)</span></label>
                        <input type="url" placeholder="https://youtube.com/@..." value={genYoutube} onChange={e => setGenYoutube(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                          style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Slug <span className="text-gray-500">(optional)</span></label>
                      <input type="text" placeholder="e.g. ray-white (auto-generated if blank)" value={genSlug} onChange={e => setGenSlug(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                        style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }} />
                    </div>
                    <div className="bg-slate-800/50 rounded-lg px-4 py-3 text-sm text-gray-400">
                      Generates <strong className="text-gray-200">10 DALL-E images</strong>, <strong className="text-gray-200">TTS intro video</strong>, <strong className="text-gray-200">4 jobs</strong>, <strong className="text-gray-200">5 services</strong>. Takes ~3–5 minutes.
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Industry <span className="text-red-400">*</span></label>
                      <input type="text" placeholder="e.g. Law Firms, Real Estate, Accounting" value={genIndustry} onChange={e => setGenIndustry(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                        style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Location <span className="text-red-400">*</span></label>
                      <input type="text" placeholder="e.g. Newtown NSW, Sydney, Melbourne CBD" value={genLocation} onChange={e => setGenLocation(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                        style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Number of businesses <span className="text-gray-500">(1–2)</span></label>
                      <input type="number" min={1} max={2} title="Number of businesses to generate" placeholder="2" value={genMaxResults} onChange={e => setGenMaxResults(Math.min(2, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                        style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }} />
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-300">
                      Discovers {genMaxResults} business{genMaxResults > 1 ? 'es' : ''} via GPT-4o then generates a full profile for each. Estimated time: <strong>{genMaxResults * 4}–{genMaxResults * 5} minutes</strong>. Limited to 2 max due to Vercel's 5-min timeout.
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setShowGenerator(false)} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 text-sm transition-colors">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={runGenerator}
                    disabled={genMode === 'single' ? !genWebsite.trim() : (!genIndustry.trim() || !genLocation.trim())}
                    className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
                  >
                    {genMode === 'bulk' ? `Discover & Generate ${genMaxResults} Profiles` : 'Generate Profile'}
                  </button>
                </div>
              </div>
            )}

            {/* Live log output */}
            {(genRunning || (genLogs.length > 0 && !genDone && !genError)) && (
              <div className="px-6 py-4 flex flex-col gap-3 overflow-hidden">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  Generating profile — this takes 3–5 minutes...
                </div>
                <div className="bg-black/50 rounded-lg p-4 font-mono text-xs text-green-400 overflow-y-auto h-72 flex flex-col gap-0.5">
                  {genLogs.map((l, i) => (
                    <div key={i} className={l.isError ? 'text-red-400' : 'text-green-300'}>{l.text}</div>
                  ))}
                  {genRunning && <div className="text-gray-500 animate-pulse">▌</div>}
                </div>
              </div>
            )}

            {/* Success state */}
            {genDone && (
              <div className="px-6 py-6 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-3xl">✅</div>
                <div>
                  <h3 className="text-lg font-bold text-white">Profile Created Successfully!</h3>
                  <p className="text-gray-400 text-sm mt-1">The business profile has been added to the platform and is now visible in the list below.</p>
                </div>
                <div className="bg-slate-800 rounded-lg px-6 py-3 text-left w-full max-w-sm">
                  <p className="text-xs text-gray-500 mb-1">Login credentials saved to profile</p>
                  {genLogs.filter(l => l.text.includes('Login Email') || l.text.includes('Password')).map((l, i) => (
                    <p key={i} className="text-sm font-mono text-gray-200">{l.text.trim()}</p>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            )}

            {/* Error state */}
            {!genRunning && genError && (
              <div className="px-6 py-4 flex flex-col gap-3">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400 font-semibold">
                  {genError}
                </div>
                {genLogs.length > 0 ? (
                  <div className="bg-black/50 rounded-lg p-4 font-mono text-xs overflow-y-auto h-48 flex flex-col gap-0.5">
                    {genLogs.map((l, i) => (
                      <div key={i} className={l.isError ? 'text-red-400' : 'text-green-300'}>{l.text}</div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-black/50 rounded-lg p-4 text-xs text-gray-500 italic">
                    No output — the process may have failed to start. Check that the Vercel deployment is complete and all environment variables (OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY) are set.
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => { setGenError(''); setGenLogs([]); }} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-300 text-sm transition-colors">
                    Try Again
                  </button>
                  <button type="button" onClick={() => setShowGenerator(false)} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 text-sm transition-colors">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

