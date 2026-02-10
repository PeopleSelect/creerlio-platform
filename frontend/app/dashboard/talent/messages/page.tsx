'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default function TalentMessagesPage() {
  return (
    <Suspense fallback={null}>
      <TalentMessagesPageInner />
    </Suspense>
  )
}

function TalentMessagesPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const initialBusinessId = params.get('business_id') || params.get('businessId')
  const initialConnectionId = params.get('connection_id') || params.get('connectionId')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(initialBusinessId)
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [businessIndustry, setBusinessIndustry] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [items, setItems] = useState<Array<{ id: string; sender_type: string; body: string; created_at: string }>>([])
  const [body, setBody] = useState('')
  const [connectionId, setConnectionId] = useState<string | null>(initialConnectionId)
  const [videoChatLoading, setVideoChatLoading] = useState(false)

  // Load business details when businessId is available
  useEffect(() => {
    if (!businessId) return

    async function loadBusinessDetails() {
      try {
        const talentId = await resolveTalentId()
        if (!talentId) return

        let foundName: string | null = null
        let foundIndustry: string | null = null

        // Try to get business name from business_profiles using multiple field selectors
        // (same approach as talent dashboard loadConnections)
        const nameSelectors = ['id, business_name, industry', 'id, name, industry', 'id, company_name, industry', 'id, display_name, industry']
        for (const sel of nameSelectors) {
          const res = await supabase.from('business_profiles').select(sel).eq('id', businessId).maybeSingle()
          if (!res.error && res.data) {
            const bp = res.data as any
            const name = bp.business_name || bp.name || bp.company_name || bp.display_name
            if (name) {
              foundName = name
              if (bp.industry) foundIndustry = bp.industry
              break
            }
          }
        }

        // Set business name and industry
        if (foundName) {
          setBusinessName(foundName)
        }
        if (foundIndustry) {
          setBusinessIndustry(foundIndustry)
        }

        // Get the connection ID for this business (if not already provided)
        if (!connectionId) {
          const { data: connRes } = await supabase
            .from('talent_connection_requests')
            .select('id')
            .eq('talent_id', talentId)
            .eq('business_id', businessId)
            .eq('status', 'accepted')
            .limit(1)
            .maybeSingle()

          if (connRes && !('error' in connRes) && connRes.id) {
            setConnectionId(String(connRes.id))
          }
        }

        // Ensure we have at least a default name
        if (!foundName) {
          setBusinessName('Business')
        }
      } catch (err) {
        console.error('[Messages] Error loading business details:', err)
        // Set default name on error
        setBusinessName('Business')
      }
    }

    loadBusinessDetails()
  }, [businessId, connectionId])

  async function resolveTalentId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user?.id ?? null
    if (!uid) return null
    const res: any = await (supabase.from('talent_profiles').select('id') as any).eq('user_id', uid).maybeSingle()
    if (!res.error && res.data?.id) return String(res.data.id)
    return null
  }

  async function ensureConversation(selectedBusinessId: string, talentId: string) {
    const existingRes = await supabase
      .from('conversations')
      .select('id')
      .eq('talent_id', talentId)
      .eq('business_id', selectedBusinessId)
      .maybeSingle()
    if (!existingRes.error && (existingRes.data as any)?.id) return String((existingRes.data as any).id)

    const createRes = await supabase
      .from('conversations')
      .insert({ talent_id: talentId, business_id: selectedBusinessId })
      .select('id')
      .single()
    if (!createRes.error && (createRes.data as any)?.id) return String((createRes.data as any).id)

    // If insert hit unique constraint, re-fetch
    const again = await supabase
      .from('conversations')
      .select('id')
      .eq('talent_id', talentId)
      .eq('business_id', selectedBusinessId)
      .maybeSingle()
    return (again.data as any)?.id ? String((again.data as any).id) : null
  }

  async function gateAndLoadConversation(selectedBusinessId: string) {
    setLoading(true)
    setError(null)
    try {
      const talentId = await resolveTalentId()
      if (!talentId) {
        setError('Please sign in to use Messages.')
        return
      }

      // Permission gate: must have an accepted connection request
      const gateRes = await supabase
        .from('talent_connection_requests')
        .select('id, status, responded_at')
        .eq('talent_id', talentId)
        .eq('business_id', selectedBusinessId)
        .eq('status', 'accepted')
        .order('responded_at', { ascending: false })
        .limit(1)

      const gate = (gateRes.data || [])[0]
      if (!gate || gate.status !== 'accepted') {
        setConversationId(null)
        setItems([])
        setError('Connection not accepted. Please accept the connection request first.')
        return
      }

      const convRes = await supabase
        .from('conversations')
        .select('id')
        .eq('talent_id', talentId)
        .eq('business_id', selectedBusinessId)
        .maybeSingle()

      if (convRes.error) {
        setError('Could not load conversation (missing tables or permissions).')
        return
      }

      const cid = (convRes.data as any)?.id || null
      setConversationId(cid)

      if (!cid) {
        setItems([])
        return
      }

      const msgRes = await supabase
        .from('messages')
        .select('id, sender_type, body, created_at')
        .eq('conversation_id', cid)
        .order('created_at', { ascending: true })

      if (msgRes.error) {
        setError('Could not load messages (permissions or schema issue).')
        return
      }

      setItems((msgRes.data || []) as any)
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    const msg = body.trim()
    if (!msg || !businessId) return
    setLoading(true)
    setError(null)
    try {
      const talentId = await resolveTalentId()
      if (!talentId) {
        setError('Please sign in to use Messages.')
        return
      }

      // Permission gate before write: check for accepted connection
      const gateRes = await supabase
        .from('talent_connection_requests')
        .select('id, status')
        .eq('talent_id', talentId)
        .eq('business_id', businessId)
        .eq('status', 'accepted')
        .limit(1)

      if ((gateRes.data || []).length === 0) {
        setError('Connection not accepted. Please accept the connection request first.')
        return
      }

      let cid = conversationId
      if (!cid) {
        cid = await ensureConversation(businessId, talentId)
        setConversationId(cid)
      }

      if (!cid) {
        setError('Could not start conversation.')
        return
      }

      const { data: sessionRes } = await supabase.auth.getSession()
      const uid = sessionRes.session?.user?.id ?? null
      if (!uid) {
        setError('Please sign in to use Messages.')
        return
      }

      const insertRes = await supabase
        .from('messages')
        .insert({ conversation_id: cid, sender_type: 'talent', sender_user_id: uid, body: msg })

      if (insertRes.error) {
        setError('Could not send message (permissions or schema issue).')
        return
      }

      setBody('')
      await gateAndLoadConversation(businessId)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Update businessId and connectionId if they change in URL params
    const urlBusinessId = params.get('business_id') || params.get('businessId')
    const urlConnectionId = params.get('connection_id') || params.get('connectionId')

    if (urlBusinessId) {
      if (urlBusinessId !== businessId) {
        setBusinessId(urlBusinessId)
      }
      // Load conversation when businessId is available
      gateAndLoadConversation(urlBusinessId).catch(() => {})
    }

    if (urlConnectionId && urlConnectionId !== connectionId) {
      setConnectionId(urlConnectionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  // Also load conversation when businessId state changes
  useEffect(() => {
    if (!businessId) return
    gateAndLoadConversation(businessId).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  async function handleVideoChat() {
    if (!businessId || !connectionId) return
    setVideoChatLoading(true)
    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      if (!sessionRes?.session?.access_token) {
        throw new Error('Please sign in to start video chat')
      }

      const response = await fetch('/api/video-chat/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionRes.session.access_token}`,
        },
        body: JSON.stringify({
          connection_request_id: connectionId,
          initiated_by: 'talent',
          recording_enabled: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success && data.session?.room_url) {
        window.open(data.session.room_url, '_blank')
      } else {
        throw new Error(data.error || 'Failed to initiate video chat')
      }
    } catch (err: any) {
      console.error('[Messages] Video chat error:', err)
      alert(err.message || 'Failed to start video chat')
    } finally {
      setVideoChatLoading(false)
    }
  }

  async function handleDiscontinue() {
    if (!connectionId) return
    if (!confirm('Are you sure you want to discontinue this connection? This action cannot be undone.')) {
      return
    }
    try {
      const { error } = await supabase
        .from('talent_connection_requests')
        .update({
          status: 'discontinued',
          responded_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      if (error) {
        alert('Failed to discontinue connection. Please try again.')
      } else {
        router.push('/dashboard/talent')
      }
    } catch (err) {
      console.error('Error discontinuing connection:', err)
      alert('An error occurred. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-black border-0">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link href="/dashboard/talent" className="flex items-center space-x-3">
            <div className="px-4 py-2 rounded-full bg-[#20C997] text-white text-base font-bold">
              C
            </div>
            <span className="text-white text-2xl font-bold">Creerlio</span>
          </Link>
          <button
            onClick={() => router.push('/dashboard/talent')}
            className="px-4 py-2 text-white hover:text-[#20C997] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Business Header Card */}
        {businessId && businessName && (
          <div className="dashboard-card rounded-xl p-6 mb-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{businessName}</h1>
                {businessIndustry && <p className="text-gray-500 mt-1">{businessIndustry}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleVideoChat}
                  disabled={videoChatLoading || !connectionId}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg font-semibold transition-colors disabled:opacity-60"
                >
                  {videoChatLoading ? 'Starting...' : 'Video Chat'}
                </button>
                <button
                  onClick={() => router.push(`/dashboard/talent/calendar?schedule_meeting=true&business_id=${businessId}&connection_id=${connectionId}`)}
                  disabled={!connectionId}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-semibold transition-colors disabled:opacity-60"
                >
                  Meeting
                </button>
                <Link
                  href={`/dashboard/business/view?id=${businessId}&from_connection=${connectionId}`}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-semibold transition-colors"
                >
                  View Business
                </Link>
                <button
                  onClick={handleDiscontinue}
                  disabled={!connectionId}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg font-semibold transition-colors disabled:opacity-60"
                >
                  Discontinue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Messages</h2>
          {!businessName && (
            <p className="text-gray-500 text-sm mt-1">Messaging is only available for accepted Business connections.</p>
          )}
        </div>

        {!businessId && (
          <div className="dashboard-card rounded-xl p-6">
            <p className="text-gray-500 mb-3">Select a business from your connections to start messaging.</p>
            <Link href="/dashboard/talent?tab=connections" className="text-blue-600 hover:text-blue-500 transition-colors">
              Go to Business Connections
            </Link>
          </div>
        )}

        {error && (
          <div className="mb-4 border border-red-300 bg-red-50 text-red-700 rounded-lg p-4">
            {error}
          </div>
        )}

        {businessId && (
          <div className="dashboard-card rounded-xl overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-medium">
                  {businessName ? `Conversation with ${businessName}` : 'Conversation'}
                </p>
              </div>
              <button
                onClick={() => gateAndLoadConversation(businessId)}
                className="px-3 py-1.5 text-sm bg-[#20C997] text-white rounded-lg hover:bg-[#1DB886] transition-colors disabled:opacity-60"
                disabled={loading}
              >
                Refresh
              </button>
            </div>

            <div className="p-4 space-y-3 min-h-[400px] max-h-[500px] overflow-y-auto bg-gray-50">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-[#20C997] border-t-transparent rounded-full animate-spin" />
                  <p className="ml-3 text-gray-500">Loading messages...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-700 mb-1 font-medium">No messages yet</p>
                  <p className="text-gray-500 text-sm">Start the conversation by sending a message below.</p>
                </div>
              ) : (
                items.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-lg px-4 py-3 ${
                      m.sender_type === 'talent'
                        ? 'ml-auto bg-[#20C997] text-white'
                        : 'mr-auto bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    <p className={`text-[11px] mt-2 ${m.sender_type === 'talent' ? 'text-white/70' : 'text-gray-400'}`}>
                      {m.sender_type === 'talent' ? 'You' : businessName || 'Business'} • {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-3">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a message..."
                  rows={2}
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#20C997]/40 focus:border-[#20C997]"
                />
                <button
                  onClick={send}
                  disabled={loading || !body.trim()}
                  className="px-6 py-2 bg-[#20C997] text-white rounded-lg hover:bg-[#1DB886] transition-colors disabled:opacity-60 font-semibold"
                >
                  Send
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">If the connection is discontinued, messaging will be disabled.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
