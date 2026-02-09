'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default function BusinessMessagesPage() {
  return (
    <Suspense fallback={null}>
      <BusinessMessagesPageInner />
    </Suspense>
  )
}

function BusinessMessagesPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  // Support both 'talent_id' and 'talentId' for backward compatibility
  const initialTalentId = params.get('talent_id') || params.get('talentId')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Initialize talentId from URL params (support both talent_id and talentId)
  const initialTalentIdFromUrl = params.get('talent_id') || params.get('talentId')
  const [talentId, setTalentId] = useState<string | null>(initialTalentIdFromUrl || initialTalentId)
  const [talentName, setTalentName] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [items, setItems] = useState<Array<{ id: string; sender_type: string; body: string; created_at: string }>>([])
  const [body, setBody] = useState('')
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentReason, setConsentReason] = useState('')
  const [consentStatus, setConsentStatus] = useState<string | null>(null)
  const [talentTitle, setTalentTitle] = useState<string | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [videoChatLoading, setVideoChatLoading] = useState(false)
  
  // Load talent name and details when talentId is available
  useEffect(() => {
    if (!talentId) return

    async function loadTalentDetails() {
      try {
        // Try to get name and title from talent_profiles
        const { data: talentRes } = await supabase
          .from('talent_profiles')
          .select('name, title')
          .eq('id', talentId)
          .maybeSingle()

        if (talentRes && !('error' in talentRes)) {
          const name = talentRes.name || talentRes.title || 'Talent'
          setTalentName(name)
          if (talentRes.title) {
            setTalentTitle(talentRes.title)
          }
        }

        // Get the connection ID for this talent
        const businessId = await resolveBusinessId()
        if (businessId) {
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
      } catch (err) {
        console.error('[Messages] Error loading talent details:', err)
      }
    }

    loadTalentDetails()
  }, [talentId])

  const businessIdFallback = useMemo(() => {
    // In this repo state, business dashboards often use auth.uid() as the business_id.
    // This remains permission-gated by talent_access_grants and RLS in the DB.
    return null as string | null
  }, [])

  async function resolveBusinessId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user?.id ?? null
    if (!uid) return null
    // Use user_id (canonical column per RLS policies)
    const res: any = await (supabase.from('business_profiles').select('id') as any).eq('user_id', uid).maybeSingle()
    if (!res.error && res.data?.id) return String(res.data.id)
    // No business profile found
    return null
  }

  async function ensureConversation(selectedTalentId: string, businessId: string) {
    const existingRes = await supabase
      .from('conversations')
      .select('id')
      .eq('talent_id', selectedTalentId)
      .eq('business_id', businessId)
      .maybeSingle()
    if (!existingRes.error && (existingRes.data as any)?.id) return String((existingRes.data as any).id)

    const createRes = await supabase
      .from('conversations')
      .insert({ talent_id: selectedTalentId, business_id: businessId })
      .select('id')
      .single()
    if (!createRes.error && (createRes.data as any)?.id) return String((createRes.data as any).id)

    // If insert hit unique constraint, re-fetch
    const again = await supabase
      .from('conversations')
      .select('id')
      .eq('talent_id', selectedTalentId)
      .eq('business_id', businessId)
      .maybeSingle()
    return (again.data as any)?.id ? String((again.data as any).id) : null
  }

  async function refreshConsentStatus(selectedTalentId: string) {
    try {
      const businessId = (await resolveBusinessId()) || businessIdFallback
      if (!businessId) return
      const res = await supabase
        .from('talent_export_consent_requests')
        .select('id,status,expires_at,requested_at')
        .eq('talent_id', selectedTalentId)
        .eq('business_id', businessId)
        .order('requested_at', { ascending: false })
        .limit(1)
      const row: any = (res.data || [])[0] || null
      if (!row) {
        setConsentStatus(null) // Don't show consent status if no request exists
        return
      }
      if (row.status === 'approved') {
        const exp = row.expires_at ? new Date(row.expires_at).toLocaleString() : null
        setConsentStatus(exp ? `Approved until ${exp}` : 'Approved')
        return
      }
      setConsentStatus(row.status === 'pending' ? 'Pending' : row.status === 'denied' ? 'Denied' : String(row.status))
    } catch {
      // ignore - consent status is optional
      setConsentStatus(null)
    }
  }

  async function gateAndLoadConversation(selectedTalentId: string) {
    setLoading(true)
    setError(null)
    try {
      const businessId = (await resolveBusinessId()) || businessIdFallback
      if (!businessId) {
        setError('Please sign in to use Messages.')
        return
      }

      // Permission gate: must have an accepted connection request
      const gateRes = await supabase
        .from('talent_connection_requests')
        .select('id, status, responded_at')
        .eq('talent_id', selectedTalentId)
        .eq('business_id', businessId)
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
        .eq('talent_id', selectedTalentId)
        .eq('business_id', businessId)
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
      refreshConsentStatus(selectedTalentId).catch(() => {})
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    const msg = body.trim()
    if (!msg || !talentId) return
    setLoading(true)
    setError(null)
    try {
      const businessId = await resolveBusinessId()
      if (!businessId) {
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
        cid = await ensureConversation(talentId, businessId)
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
        .insert({ conversation_id: cid, sender_type: 'business', sender_user_id: uid, body: msg })

      if (insertRes.error) {
        setError('Could not send message (permissions or schema issue).')
        return
      }

      setBody('')
      await gateAndLoadConversation(talentId)
    } finally {
      setLoading(false)
    }
  }

  async function requestConsent() {
    if (!talentId) return
    setLoading(true)
    setError(null)
    try {
      const businessId = await resolveBusinessId()
      if (!businessId) {
        setError('Please sign in to request consent.')
        return
      }
      const { data: sessionRes } = await supabase.auth.getSession()
      const uid = sessionRes.session?.user?.id ?? null
      if (!uid) {
        setError('Please sign in to request consent.')
        return
      }

      const ins = await supabase
        .from('talent_export_consent_requests')
        .insert({
          talent_id: talentId,
          business_id: businessId,
          requested_by_user_id: uid,
          request_reason: consentReason?.trim() ? consentReason.trim() : null,
          scope: 'portfolio',
          scope_ref: {},
          status: 'pending',
        } as any)
        .select('id')
        .single()

      if (ins.error || !(ins.data as any)?.id) {
        setError(ins.error?.message || 'Could not create consent request (permissions or missing migrations).')
        return
      }
      const reqId = String((ins.data as any).id)

      await supabase.from('talent_export_consent_events').insert({
        request_id: reqId,
        talent_id: talentId,
        business_id: businessId,
        actor_type: 'business',
        actor_user_id: uid,
        event_type: 'request_created',
        meta: { scope: 'portfolio' },
      } as any)

      const cid = await ensureConversation(talentId, businessId)
      if (cid) {
        await supabase.from('messages').insert({
          conversation_id: cid,
          sender_type: 'business',
          sender_user_id: uid,
          body:
            `Consent request: Please approve permission to print/export Talent portfolio content.\n\n` +
            `Reason: ${consentReason?.trim() ? consentReason.trim() : '(not specified)'}\n\n` +
            `Request ID: ${reqId}\n\n` +
            `You can approve/deny this in your Talent Dashboard.`,
        } as any)
      }

      setConsentOpen(false)
      setConsentReason('')
      await refreshConsentStatus(talentId)
      await gateAndLoadConversation(talentId)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Update talentId if it changes in URL params
    const urlTalentId = params.get('talent_id') || params.get('talentId')
    if (urlTalentId) {
      if (urlTalentId !== talentId) {
        setTalentId(urlTalentId)
      }
      // Load conversation when talentId is available
      gateAndLoadConversation(urlTalentId).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])
  
  // Also load conversation when talentId state changes
  useEffect(() => {
    if (!talentId) return
    gateAndLoadConversation(talentId).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talentId])

  async function handleVideoChat() {
    if (!talentId || !connectionId) return
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
          initiated_by: 'business',
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
        router.push('/dashboard/business')
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
          <Link href="/dashboard/business" className="flex items-center space-x-3">
            <div className="px-4 py-2 rounded-full bg-[#20C997] text-white text-base font-bold">
              C
            </div>
            <span className="text-white text-2xl font-bold">Creerlio</span>
          </Link>
          <button
            onClick={() => router.push('/dashboard/business')}
            className="px-4 py-2 text-white hover:text-[#20C997] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Talent Header Card */}
        {talentId && talentName && (
          <div className="dashboard-card rounded-xl p-6 mb-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{talentName}</h1>
                {talentTitle && <p className="text-gray-500 mt-1">{talentTitle}</p>}
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
                  onClick={() => router.push(`/dashboard/business/calendar?schedule_meeting=true&talent_id=${talentId}&connection_id=${connectionId}`)}
                  disabled={!connectionId}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-semibold transition-colors disabled:opacity-60"
                >
                  Meeting
                </button>
                <Link
                  href={`/portfolio/view?talent_id=${talentId}&request_id=${connectionId}&shared=true`}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-semibold transition-colors"
                >
                  View Profile
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
          {!talentName && (
            <p className="text-gray-500 text-sm mt-1">Messaging is only available for accepted Talent connections.</p>
          )}
        </div>

        {!talentId && (
          <div className="dashboard-card rounded-xl p-6">
            <p className="text-gray-300 mb-3">Select a talent from your connections to start messaging.</p>
            <Link href="/dashboard/business?tab=connections" className="text-blue-400 hover:text-blue-300 transition-colors">
              Go to Talent Connections
            </Link>
          </div>
        )}

        {error && (
          <div className="mb-4 border border-red-300 bg-red-50 text-red-700 rounded-lg p-4">
            {error}
          </div>
        )}

        {talentId && (
          <div className="dashboard-card rounded-xl overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-medium">
                  {talentName ? `Conversation with ${talentName}` : 'Conversation'}
                </p>
                {consentStatus ? <p className="text-xs text-gray-500 mt-1">Print/export consent: {consentStatus}</p> : null}
              </div>
              <button
                onClick={() => gateAndLoadConversation(talentId)}
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
                  <p className="ml-3 text-gray-500">Loading messages…</p>
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
                      m.sender_type === 'business'
                        ? 'ml-auto bg-[#20C997] text-white'
                        : 'mr-auto bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    <p className={`text-[11px] mt-2 ${m.sender_type === 'business' ? 'text-white/70' : 'text-gray-400'}`}>
                      {m.sender_type === 'business' ? 'You' : talentName || 'Talent'} • {new Date(m.created_at).toLocaleString()}
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
                  placeholder="Write a message…"
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

        {consentOpen ? (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setConsentOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 text-white p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Request consent to print/export</h2>
                  <p className="text-sm text-slate-300 mt-2">
                    Creerlio privacy rules prohibit printing, exporting or copying Talent content without explicit Talent consent.
                    This request will be recorded and sent to the Talent via Messages.
                  </p>
                </div>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10"
                  onClick={() => setConsentOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="mt-5">
                <label className="block text-sm text-slate-300 mb-2">Reason (shown to Talent)</label>
                <textarea
                  value={consentReason}
                  onChange={(e) => setConsentReason(e.target.value)}
                  rows={4}
                  placeholder="e.g., Need to print a copy for onboarding records. Please approve one-time printing."
                  className="w-full px-4 py-3 bg-white text-black rounded-lg border border-blue-500/20 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConsentOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={requestConsent}
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold disabled:opacity-60"
                >
                  Send request
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}


