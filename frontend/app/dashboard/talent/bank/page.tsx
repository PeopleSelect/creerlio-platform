// frontend/app/dashboard/talent/bank/page.tsx
'use client'

import { useEffect, useRef, useState, DragEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface TalentBankItem {
  id: number
  user_id: string
  item_type: string
  title: string
  description?: string | null
  file_path?: string | null
  file_type?: string | null
  file_size?: number | null
  metadata?: any
  created_at: string
}

type ItemFilter =
  | 'all'
  | 'document'
  | 'image'
  | 'video'
  | 'experience'
  | 'education'
  | 'credential'
  | 'social'

const BUCKET = 'talent-bank'
// Supabase Storage enforces a per-object max upload size (varies by plan/project settings).
// Keep this conservative to prevent large uploads from failing after a long wait.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024 // 50 MB

export default function TalentBankPage() {
  const router = useRouter()
  const [items, setItems] = useState<TalentBankItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [filter, setFilter] = useState<ItemFilter>('all')
  const [saveCategory, setSaveCategory] = useState<'document' | 'education' | 'credential'>('document')
  const [userId, setUserId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [authRequired, setAuthRequired] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<
    | { kind: 'image'; url: string; title: string }
    | { kind: 'video'; url: string; title: string }
    | null
  >(null)
  const [portfolioSelected, setPortfolioSelected] = useState<Record<number, boolean>>({})
  const [portfolioRow, setPortfolioRow] = useState<{ id: number; item_type: string; metadata: any } | null>(null)

  // Structured entry forms
  const [expCompany, setExpCompany] = useState('')
  const [expTitle, setExpTitle] = useState('')
  const [expStart, setExpStart] = useState('')
  const [expEnd, setExpEnd] = useState('')
  const [expDescription, setExpDescription] = useState('')

  const [eduInstitution, setEduInstitution] = useState('')
  const [eduCourse, setEduCourse] = useState('')
  const [eduYear, setEduYear] = useState('')
  const [eduNotes, setEduNotes] = useState('')

  const [credType, setCredType] = useState('')
  const [credIssuer, setCredIssuer] = useState('')
  const [credExpiry, setCredExpiry] = useState('')
  const [credId, setCredId] = useState('')
  const [credNotes, setCredNotes] = useState('')

  const [editEntry, setEditEntry] = useState<null | { item: TalentBankItem; draft: any }>(null)

  // Social links
  const [socialPlatform, setSocialPlatform] = useState('LinkedIn')
  const [socialUrl, setSocialUrl] = useState('')

  // Video recording
  const [recOpen, setRecOpen] = useState(false)
  const [recBusy, setRecBusy] = useState(false)
  const [recErr, setRecErr] = useState<string | null>(null)
  const [recStream, setRecStream] = useState<MediaStream | null>(null)
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null)
  const [recChunks, setRecChunks] = useState<BlobPart[]>([])
  const recChunksRef = useRef<BlobPart[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recPreviewUrl, setRecPreviewUrl] = useState<string | null>(null)
  const [recMime, setRecMime] = useState<string>('video/webm')
  const liveVideoRef = useRef<HTMLVideoElement | null>(null)

  // #region agent log
  function agentDbg(hypothesisId: string, message: string, data: any) {
    fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'run-talent-bank-social',
        hypothesisId,
        location: 'dashboard/talent/bank/page.tsx',
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }
  // #endregion agent log

  useEffect(() => {
    // #region agent log
    agentDbg('H1', 'TalentBank mount', {
      pathname: typeof window !== 'undefined' ? window.location.pathname : null,
      hasSocialFilterInCode: true,
    })
    // #endregion agent log
    ensureSessionAndRefresh()
    return () => {}
  }, [])

  useEffect(() => {
    return () => {
      try {
        if (recStream) recStream.getTracks().forEach((t) => t.stop())
      } catch {}
      try {
        if (recPreviewUrl) URL.revokeObjectURL(recPreviewUrl)
      } catch {}
    }
  }, [recStream, recPreviewUrl])

  useEffect(() => {
    if (liveVideoRef.current && recStream) {
      try {
        ;(liveVideoRef.current as any).srcObject = recStream
      } catch {}
    }
  }, [recStream, recOpen])

  function chooseRecorderMime() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4', // may be unsupported in many browsers for MediaRecorder
    ]
    for (const c of candidates) {
      // eslint-disable-next-line no-undef
      if (typeof MediaRecorder !== 'undefined' && (MediaRecorder as any).isTypeSupported?.(c)) return c
    }
    return 'video/webm'
  }

  async function startCamera() {
    setRecErr(null)
    setRecBusy(true)
    try {
      // Some browsers (especially mobile) require a secure context for camera access.
      if (typeof window !== 'undefined' && !(window as any).isSecureContext) {
        setRecErr('Camera access requires a secure connection (HTTPS) or localhost. If you are on a phone, open the site over HTTPS (or use localhost on the device).')
        await log('recorder blocked (insecure context)', 'TB_REC_HTTP', {
          isSecureContext: (window as any).isSecureContext ?? null,
          origin: typeof window !== 'undefined' ? window.location.origin : null,
        })
        // #region agent log
        agentDbg('TB_REC_HTTP', 'recorder blocked (insecure context)', { origin: typeof window !== 'undefined' ? window.location.origin : null })
        // #endregion agent log
        return
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        setRecErr('Camera recording is not supported in this browser.')
        // #region agent log
        agentDbg('TB_REC_1', 'camera unsupported', { hasGetUserMedia: false })
        // #endregion agent log
        await log('camera unsupported', 'TB_REC_1', { hasGetUserMedia: false })
        return
      }

      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch (e: any) {
        // Fallback: some devices block audio. Try video-only.
        await log('camera getUserMedia AV failed, retrying video-only', 'TB_REC_1', { name: e?.name ?? null, message: e?.message ?? String(e) })
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }
      setRecStream(stream)
      const mime = chooseRecorderMime()
      setRecMime(mime)
      // #region agent log
      agentDbg('TB_REC_1', 'camera started', {
        hasStream: !!stream,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        mime,
      })
      // #endregion agent log
      await log('camera started', 'TB_REC_1', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        mime,
      })
    } catch (e: any) {
      const name = e?.name ?? null
      const msg =
        name === 'NotAllowedError'
          ? 'Permission denied. Please allow camera + microphone access for this site (browser address bar → site permissions), then try again.'
          : (e?.message ?? 'Failed to access camera/microphone.')
      setRecErr(msg)
      // #region agent log
      agentDbg('TB_REC_1', 'camera start error', { message: e?.message ?? String(e), name })
      // #endregion agent log
      await log('camera start error', 'TB_REC_1', { message: e?.message ?? String(e), name })
    } finally {
      setRecBusy(false)
    }
  }

  async function beginRecording() {
    setRecErr(null)
    if (!recStream) {
      await startCamera()
      return
    }
    try {
      if (typeof MediaRecorder === 'undefined') {
        setRecErr('Video recording is not supported in this browser.')
        // #region agent log
        agentDbg('TB_REC_2', 'MediaRecorder missing', {})
        // #endregion agent log
        await log('MediaRecorder missing', 'TB_REC_2', {})
        return
      }
      if (recPreviewUrl) {
        try { URL.revokeObjectURL(recPreviewUrl) } catch {}
        setRecPreviewUrl(null)
      }
      setRecChunks([])
      recChunksRef.current = []

      const preferred = chooseRecorderMime()
      const candidates = Array.from(
        new Set([
          preferred,
          'video/webm;codecs=vp8,opus',
          'video/webm',
        ])
      )

      let chosen: string | null = null
      let mr: MediaRecorder | null = null

      const attachHandlers = (rec: MediaRecorder, mimeForBlob: string) => {
        rec.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            recChunksRef.current = [...recChunksRef.current, ev.data]
            setRecChunks(recChunksRef.current)
          }
        }
        rec.onstop = () => {
          const blob = new Blob(recChunksRef.current, { type: mimeForBlob })
          if (recPreviewUrl) {
            try { URL.revokeObjectURL(recPreviewUrl) } catch {}
          }
          const url = URL.createObjectURL(blob)
          setRecPreviewUrl(url)
          // #region agent log
          agentDbg('TB_REC_3', 'recording finalized', { mime: mimeForBlob, bytes: blob.size, chunkCount: recChunksRef.current.length })
          // #endregion agent log
        }
      }

      // Some browsers report isTypeSupported=true but still fail on start().
      // Try a few codecs, then fall back to no mimeType.
      for (const c of candidates) {
        try {
          const rec = new MediaRecorder(recStream, { mimeType: c } as any)
          attachHandlers(rec, c)
          rec.start(250)
          mr = rec
          chosen = c
          break
        } catch (e: any) {
          // #region agent log
          agentDbg('TB_REC_2', 'recording codec attempt failed', { mime: c, name: e?.name ?? null, message: e?.message ?? String(e) })
          // #endregion agent log
          await log('recording codec attempt failed', 'TB_REC_2', { mime: c, name: e?.name ?? null })
        }
      }

      if (!mr) {
        try {
          const rec = new MediaRecorder(recStream)
          const fallbackMime = (rec as any)?.mimeType || 'video/webm'
          attachHandlers(rec, fallbackMime)
          rec.start(250)
          mr = rec
          chosen = fallbackMime
          // #region agent log
          agentDbg('TB_REC_2', 'recording started (no mimeType fallback)', { mime: chosen })
          // #endregion agent log
          await log('recording started (no mimeType fallback)', 'TB_REC_2', { mime: chosen })
        } catch (e: any) {
          // If audio is the issue, try recording video-only by dropping audio tracks.
          try {
            const videoOnly = new MediaStream(recStream.getVideoTracks())
            const rec2 = new MediaRecorder(videoOnly)
            const fallbackMime2 = (rec2 as any)?.mimeType || 'video/webm'
            attachHandlers(rec2, fallbackMime2)
            rec2.start(250)
            mr = rec2
            chosen = fallbackMime2
            await log('recording started (video-only fallback)', 'TB_REC_2', { mime: chosen })
            // #region agent log
            agentDbg('TB_REC_2', 'recording started (video-only fallback)', { mime: chosen })
            // #endregion agent log
          } catch (e2: any) {
            setRecErr(
              'Recording is not supported by this browser/device. Try Chrome/Edge, or record with your phone camera and upload the file.'
            )
            // #region agent log
            agentDbg('TB_REC_2', 'recording start failed (all fallbacks)', { name: e2?.name ?? null, message: e2?.message ?? String(e2) })
            // #endregion agent log
            await log('recording start failed (all fallbacks)', 'TB_REC_2', { name: e2?.name ?? null })
            return
          }
        }
      }

      setRecMime(chosen || preferred)
      setRecorder(mr)
      setIsRecording(true)
      // #region agent log
      agentDbg('TB_REC_2', 'recording started', { mime: chosen || preferred })
      // #endregion agent log
      await log('recording started', 'TB_REC_2', { mime: chosen || preferred })
    } catch (e: any) {
      setRecErr(e?.message ?? 'Failed to start recording.')
      // #region agent log
      agentDbg('TB_REC_2', 'recording start error', { message: e?.message ?? String(e), name: e?.name ?? null })
      // #endregion agent log
      await log('recording start error', 'TB_REC_2', { message: e?.message ?? String(e), name: e?.name ?? null })
    }
  }

  async function stopRecording() {
    try { recorder?.stop() } catch {}
    setIsRecording(false)
    setRecorder(null)
  }

  function clearRecording() {
    try {
      if (recPreviewUrl) URL.revokeObjectURL(recPreviewUrl)
    } catch {}
    setRecPreviewUrl(null)
    setRecChunks([])
    recChunksRef.current = []
  }

  async function uploadRecordedVideo() {
    setRecErr(null)
    const uid = userId ?? (await ensureSession())
    setUserId(uid)
    if (!uid) return

    const blob = new Blob(recChunksRef.current, { type: recMime })
    if (!blob.size) {
      setRecErr('No recording captured yet.')
      // #region agent log
      agentDbg('TB_REC_4', 'upload blocked (empty blob)', { chunkCount: recChunksRef.current.length, mime: recMime })
      // #endregion agent log
      return
    }
    if (blob.size > MAX_UPLOAD_BYTES) {
      const sizeMb = Math.round((blob.size / (1024 * 1024)) * 10) / 10
      const limitMb = Math.round((MAX_UPLOAD_BYTES / (1024 * 1024)) * 10) / 10
      setRecErr(`Recording is ${sizeMb}MB, which exceeds the current upload limit (~${limitMb}MB). Please record a shorter video.`)
      // #region agent log
      agentDbg('TB_REC_4', 'upload blocked (too large)', { bytes: blob.size, limit: MAX_UPLOAD_BYTES })
      // #endregion agent log
      return
    }

    const ext = recMime.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([blob], `intro-video-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`, { type: recMime })

    setIsUploading(true)
    try {
      // #region agent log
      agentDbg('TB_REC_4', 'upload start', { fileType: file.type, fileSize: file.size })
      // #endregion agent log
      await uploadSingleFile(file, { source: 'recording', categoryOverride: 'document' })
      clearRecording()
      setRecOpen(false)
    } finally {
      setIsUploading(false)
    }
  }

  async function uploadSingleFile(file: File, opts?: { source?: string; categoryOverride?: 'document' | 'education' | 'credential' }) {
    const uid = userId ?? (await ensureSession())
    setUserId(uid)
    if (!uid) return
    const { data: sessionData } = await supabase.auth.getSession()
    const sessionEmail = sessionData?.session?.user?.email ?? (authEmail || null)
    const category = opts?.categoryOverride ?? saveCategory

    if (file.size > MAX_UPLOAD_BYTES) {
      const sizeMb = Math.round((file.size / (1024 * 1024)) * 10) / 10
      const limitMb = Math.round((MAX_UPLOAD_BYTES / (1024 * 1024)) * 10) / 10
      setUploadError(`“${file.name}” is ${sizeMb}MB, which exceeds this app’s current upload limit (~${limitMb}MB).`)
      // #region agent log
      agentDbg('TB_REC_5', 'uploadSingleFile blocked (too large)', { source: opts?.source ?? 'file', bytes: file.size })
      // #endregion agent log
      return
    }

    const path = `${uid}/${crypto.randomUUID()}-${file.name}`
    const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type })
    await log('storage upload', 'TB_STORAGE_UPLOAD', {
      hasError: !!storageError,
      errorMessage: (storageError as any)?.message ?? null,
      fileSize: file.size,
      fileType: file.type,
      source: opts?.source ?? 'file',
    })
    // #region agent log
    agentDbg('TB_REC_5', 'storage upload result', { hasError: !!storageError, source: opts?.source ?? 'file' })
    // #endregion agent log
    if (storageError) {
      const msg = (storageError as any)?.message ?? 'Upload failed'
      setUploadError(`Upload failed: ${msg}`)
      return
    }

    const insertPayload = {
      user_id: uid,
      item_type: category,
      title: file.name,
      description: category === 'education'
        ? 'Education document/certificate'
        : category === 'credential'
          ? 'Credential / licence / accreditation'
          : null,
      file_path: path,
      file_type: file.type,
      file_size: file.size,
      metadata: {
        file_kind: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'document',
        category,
        source: opts?.source ?? 'file',
      },
      is_public: false,
    }

    let { error: insertError } = await supabase.from('talent_bank_items').insert(insertPayload as any)
    await log('db insert', 'TB_DB_INSERT', {
      hasError: !!insertError,
      errorCode: (insertError as any)?.code ?? null,
      errorMessage: (insertError as any)?.message ?? null,
      errorDetails: (insertError as any)?.details ?? null,
      errorHint: (insertError as any)?.hint ?? null,
      source: opts?.source ?? 'file',
    })
    // #region agent log
    agentDbg('TB_REC_6', 'db insert result', { hasError: !!insertError, code: (insertError as any)?.code ?? null, source: opts?.source ?? 'file' })
    // #endregion agent log

    if ((insertError as any)?.code === '23503') {
      await ensureUserRow(uid, sessionEmail)
      const retry = await supabase.from('talent_bank_items').insert(insertPayload as any)
      insertError = retry.error
      await log('db insert retry', 'TB_DB_INSERT_RETRY', {
        hasError: !!insertError,
        errorCode: (insertError as any)?.code ?? null,
        errorMessage: (insertError as any)?.message ?? null,
        errorDetails: (insertError as any)?.details ?? null,
        source: opts?.source ?? 'file',
      })
    }

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([path])
      return
    }

    await refreshItems(uid)
  }

  async function log(message: string, hypothesisId: string, data: any) {
    fetch('/api/debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'run-talent-bank',
        hypothesisId,
        location: 'dashboard/talent/bank/page.tsx',
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }

  async function ensureSession(): Promise<string | null> {
    setAuthRequired(false)
    setAuthError(null)

    // Prefer session (fast) over getUser() which may require network.
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const sessionUserId = sessionData?.session?.user?.id ?? null
    await log('auth.getSession()', 'TB_SESSION', {
      hasSession: !!sessionData?.session,
      hasUser: !!sessionUserId,
      hasError: !!sessionError,
      errorName: (sessionError as any)?.name ?? null,
    })
    if (sessionUserId) return sessionUserId

    // Auto-create an anonymous session so the user can save/review/delete without a manual login flow.
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously()
    const anonUserId = anonData?.user?.id ?? null
    await log('auth.signInAnonymously()', 'TB_ANON', {
      hasUser: !!anonUserId,
      hasError: !!anonError,
      errorName: (anonError as any)?.name ?? null,
      errorMessage: (anonError as any)?.message ?? null,
    })

    if (anonUserId) return anonUserId

    // If anonymous is disabled (common), require user auth via email/password.
    if ((anonError as any)?.message?.toLowerCase?.().includes('anonymous')) {
      setAuthRequired(true)
      setAuthError('Anonymous sign-ins are disabled in Supabase. Please sign in (or create an account) below.')
      return null
    }

    setAuthRequired(true)
    setAuthError((anonError as any)?.message ?? 'Authentication required to use Talent Bank.')
    return null
  }

  async function ensureUserRow(uid: string, email?: string | null) {
    // We observed FK violations on `talent_bank_items.user_id` (23503). That implies a referenced row
    // (often in public.users/profiles) is missing. Try to create it in a few likely tables.
    const candidates: Array<{ table: string; row: Record<string, any> }> = [
      // Based on runtime evidence: public.users has a NOT NULL "role" column.
      { table: 'users', row: { id: uid, email: email ?? null, role: 'talent' } },
      { table: 'users', row: { id: uid, email: email ?? null, role: 'user' } },
      { table: 'profiles', row: { id: uid, email: email ?? null } },
      { table: 'user_profiles', row: { id: uid, email: email ?? null } },
      { table: 'profiles', row: { user_id: uid, email: email ?? null } },
      { table: 'users', row: { user_id: uid, email: email ?? null } },
    ]

    for (const c of candidates) {
      const { error } = await supabase.from(c.table).upsert(c.row as any)
      await log('ensureUserRow', 'TB_ENSURE_USER_ROW', {
        table: c.table,
        keys: Object.keys(c.row),
        hasEmail: 'email' in c.row && !!email,
        hasError: !!error,
        errorCode: (error as any)?.code ?? null,
        errorMessage: (error as any)?.message ?? null,
        errorDetails: (error as any)?.details ?? null,
      })
      if (!error) return true
    }
    return false
  }

  async function ensureSessionAndRefresh() {
    const uid = await ensureSession()
    setUserId(uid)
    await refreshItems(uid)
  }

  async function refreshItems(uidArg?: string | null) {
    setIsLoading(true)

    const uid = uidArg ?? userId ?? (await ensureSession())
    setUserId(uid)
    if (!uid) {
      await log('refreshItems aborted (no user id)', 'TB_LIST', { reason: 'no-session' })
      setItems([])
      setIsLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('talent_bank_items')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    await log('list talent_bank_items', 'TB_LIST', {
      hasError: !!error,
      errorCode: (error as any)?.code ?? null,
      errorMessage: (error as any)?.message ?? null,
      rowCount: Array.isArray(data) ? data.length : 0,
    })

    // #region agent log
    agentDbg('H2', 'TalentBank list result', {
      hasError: !!error,
      rowCount: Array.isArray(data) ? data.length : 0,
      socialCount: Array.isArray(data) ? data.filter((x: any) => x?.item_type === 'social').length : 0,
    })
    // #endregion agent log

    if (!error) setItems(data || [])
    await loadPortfolioSelections(uid)
    setIsLoading(false)
  }

  async function ensurePortfolioRow(uid: string) {
    // Portfolio metadata is used to persist "Show in Portfolio" selections across pages.
    const existing = await supabase
      .from('talent_bank_items')
      .select('id,item_type,metadata')
      .eq('user_id', uid)
      .in('item_type', ['portfolio', 'document'])
      .eq('title', 'Portfolio')
      .order('created_at', { ascending: false })
      .limit(1)

    if (existing.data?.[0]) {
      setPortfolioRow(existing.data[0] as any)
      return existing.data[0] as any
    }

    // Try to create as item_type=portfolio, but fall back if schema rejects it.
    const attempt = await supabase.from('talent_bank_items').insert({
      user_id: uid,
      item_type: 'portfolio',
      title: 'Portfolio',
      metadata: { portfolioSelections: [] },
      is_public: false,
    } as any)

    await log('ensurePortfolioRow insert', 'TB_PORTFOLIO', {
      hasError: !!attempt.error,
      errorCode: (attempt.error as any)?.code ?? null,
      errorMessage: (attempt.error as any)?.message ?? null,
    })

    if (!attempt.error) {
      // Re-query to get the id.
      const created = await supabase
        .from('talent_bank_items')
        .select('id,item_type,metadata')
        .eq('user_id', uid)
        .eq('item_type', 'portfolio')
        .eq('title', 'Portfolio')
        .order('created_at', { ascending: false })
        .limit(1)
      if (created.data?.[0]) {
        setPortfolioRow(created.data[0] as any)
        return created.data[0] as any
      }
    }

    // Fallback: store portfolio metadata as a "document" row (known item_type) with JSON file_type.
    const fallback = await supabase.from('talent_bank_items').insert({
      user_id: uid,
      item_type: 'document',
      title: 'Portfolio',
      file_type: 'application/json',
      metadata: { portfolioSelections: [] },
      is_public: false,
    } as any)

    await log('ensurePortfolioRow insert fallback', 'TB_PORTFOLIO', {
      hasError: !!fallback.error,
      errorCode: (fallback.error as any)?.code ?? null,
      errorMessage: (fallback.error as any)?.message ?? null,
    })

    const created2 = await supabase
      .from('talent_bank_items')
      .select('id,item_type,metadata')
      .eq('user_id', uid)
      .eq('title', 'Portfolio')
      .order('created_at', { ascending: false })
      .limit(1)

    if (created2.data?.[0]) {
      setPortfolioRow(created2.data[0] as any)
      return created2.data[0] as any
    }

    return null
  }

  async function loadPortfolioSelections(uid: string) {
    const row = (portfolioRow && portfolioRow.id) ? portfolioRow : await ensurePortfolioRow(uid)
    const meta = (row as any)?.metadata ?? {}
    const selections: number[] = Array.isArray(meta?.portfolioSelections) ? meta.portfolioSelections : []
    const next: Record<number, boolean> = {}
    for (const id of selections) next[id] = true
    setPortfolioSelected(next)

    await log('loadPortfolioSelections', 'TB_PORTFOLIO', {
      hasRow: !!row?.id,
      selectionCount: selections.length,
    })
  }

  async function toggleInPortfolio(item: TalentBankItem, checked: boolean) {
    const uid = userId ?? (await ensureSession())
    setUserId(uid)
    if (!uid) return

    const row = (portfolioRow && portfolioRow.id) ? portfolioRow : await ensurePortfolioRow(uid)
    if (!row?.id) {
      await log('toggleInPortfolio failed (no portfolio row)', 'TB_PORTFOLIO_TOGGLE', { itemId: item.id })
      return
    }

    const prevSelections: number[] = Array.isArray((row as any)?.metadata?.portfolioSelections)
      ? (row as any).metadata.portfolioSelections
      : []
    const nextSelections = checked
      ? Array.from(new Set([...prevSelections, item.id]))
      : prevSelections.filter((x) => x !== item.id)

    const nextMeta = { ...((row as any).metadata ?? {}), portfolioSelections: nextSelections }
    const { error } = await supabase
      .from('talent_bank_items')
      .update({ metadata: nextMeta })
      .eq('id', row.id)
      .eq('user_id', uid)

    await log('toggleInPortfolio update', 'TB_PORTFOLIO_TOGGLE', {
      hasError: !!error,
      errorCode: (error as any)?.code ?? null,
      errorMessage: (error as any)?.message ?? null,
      itemId: item.id,
      checked,
      selectionCount: nextSelections.length,
    })

    if (!error) {
      setPortfolioRow({ ...(row as any), metadata: nextMeta })
      setPortfolioSelected((prev) => ({ ...prev, [item.id]: checked }))
    }
  }

  // Load signed URLs on-demand (for images/videos). This avoids the "only first N thumbnails load" issue.
  async function ensureSignedUrl(path: string) {
    if (!path) return
    if (thumbUrls[path]) return
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10)
    if (data?.signedUrl) {
      setThumbUrls((prev) => ({ ...prev, [path]: data.signedUrl }))
    }
  }

  function fileExt(title: string) {
    const m = title.toLowerCase().match(/\.([a-z0-9]+)$/)
    return m?.[1] ?? ''
  }

  function getSocialUrl(item: TalentBankItem): string {
    const u = (item.metadata as any)?.url ?? item.description ?? ''
    return typeof u === 'string' ? u : ''
  }

  function socialLabel(platform: string) {
    const p = (platform || '').toLowerCase()
    if (p.includes('linkedin')) return 'in'
    if (p.includes('github')) return 'GH'
    if (p.includes('twitter') || p === 'x' || p.includes('x ')) return 'X'
    if (p.includes('instagram')) return 'IG'
    if (p.includes('facebook')) return 'f'
    if (p.includes('youtube')) return 'YT'
    if (p.includes('tiktok')) return 'TT'
    if (p.includes('website')) return 'WWW'
    return 'SM'
  }

  function ThumbIcon({ label }: { label: string }) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
        <div className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1 text-[10px] font-semibold tracking-wide text-slate-100">
          {label}
        </div>
      </div>
    )
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setIsUploading(true)
    setUploadError(null)

    const uid = userId ?? (await ensureSession())
    setUserId(uid)
    await log('upload start', 'TB_UPLOAD_START', { hasUser: !!uid, fileCount: files.length })
    if (!uid) {
      setIsUploading(false)
      setDragActive(false)
      return
    }

    for (const file of Array.from(files)) {
      await uploadSingleFile(file, { source: 'file' })
    }

    setIsUploading(false)
    setDragActive(false)
    refreshItems(uid)
  }

  async function signInWithPassword() {
    setAuthBusy(true)
    try {
      await log('auth.signInWithPassword() start', 'TB_PW_SIGNIN', { hasEmail: !!authEmail, hasPassword: !!authPassword })
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      })

      await log('auth.signInWithPassword() result', 'TB_PW_SIGNIN', {
        hasUser: !!data?.user?.id,
        hasSession: !!data?.session,
        hasError: !!error,
        errorMessage: (error as any)?.message ?? null,
      })

      if (error) {
        setAuthError((error as any)?.message ?? 'Sign-in failed')
        return
      }

      if (data.user?.id) {
        await ensureUserRow(data.user.id, data.user.email ?? authEmail ?? null)
      }

      setAuthRequired(false)
      setAuthError(null)
      setUserId(data.user?.id ?? null)
      await refreshItems(data.user?.id ?? null)
    } finally {
      setAuthBusy(false)
    }
  }

  async function signUpWithPassword() {
    setAuthBusy(true)
    try {
      await log('auth.signUp() start', 'TB_PW_SIGNUP', { hasEmail: !!authEmail, hasPassword: !!authPassword })
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
      })

      await log('auth.signUp() result', 'TB_PW_SIGNUP', {
        hasUser: !!data?.user?.id,
        hasSession: !!data?.session,
        hasError: !!error,
        errorMessage: (error as any)?.message ?? null,
      })

      if (error) {
        setAuthError((error as any)?.message ?? 'Sign-up failed')
        return
      }

      // If email confirmations are disabled, you'll get a session immediately. Otherwise user must confirm email first.
      if (data?.session?.user?.id) {
        await ensureUserRow(data.session.user.id, data.session.user.email ?? authEmail ?? null)
        setAuthRequired(false)
        setAuthError(null)
        setUserId(data.session.user.id)
        await refreshItems(data.session.user.id)
      } else {
        setAuthError('Account created. Please check your email to confirm, then sign in.')
      }
    } finally {
      setAuthBusy(false)
    }
  }

  async function openFile(path: string) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10)

    await log('createSignedUrl', 'TB_SIGNED_URL', {
      hasError: !!error,
      errorMessage: (error as any)?.message ?? null,
      hasUrl: !!data?.signedUrl,
    })

    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  function renderThumb(item: TalentBankItem) {
    const type = item.item_type
    const path = item.file_path || ''
    const url = path ? thumbUrls[path] : undefined
    const isImg = (item.file_type?.startsWith('image') ?? false) || type === 'image'
    const isVid = (item.file_type?.startsWith('video') ?? false) || type === 'video'

    const base =
      'w-[20mm] h-[20mm] rounded-lg border border-slate-700 bg-slate-950/40 overflow-hidden flex items-center justify-center shrink-0'

    const ext = fileExt(item.title)
    const label =
      isImg
        ? 'IMG'
        : isVid
          ? 'VID'
          : type === 'resume'
            ? 'CV'
            : type === 'social'
              ? socialLabel(item.title)
            : ext
              ? ext.toUpperCase().slice(0, 4)
              : type === 'document'
                ? 'DOC'
                : type === 'experience'
                  ? 'EXP'
                  : type === 'education'
                    ? 'EDU'
                    : 'FILE'

    // Image thumbnail
    if (isImg) {
      if (!url && path) ensureSignedUrl(path).catch(() => {})
      if (url) {
        return (
          <button
            type="button"
            className={base}
            onClick={() => setPreview({ kind: 'image', url, title: item.title })}
            title="Click to expand"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={item.title} className="w-full h-full object-cover" />
          </button>
        )
      }
      return (
        <div className={base} title="Loading thumbnail…">
          <ThumbIcon label={label} />
        </div>
      )
    }

    // Video thumbnail (use metadata frame if we can get a signed URL)
    if (isVid) {
      if (!url && path) ensureSignedUrl(path).catch(() => {})
      if (url) {
        return (
          <button
            type="button"
            className={base}
            onClick={() => setPreview({ kind: 'video', url, title: item.title })}
            title="Click to expand"
          >
            <div className="relative w-full h-full">
              <video
                className="w-full h-full object-cover"
                src={url}
                muted
                playsInline
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center text-white/90 text-xs font-semibold bg-black/30">
                ▶
              </div>
            </div>
          </button>
        )
      }
      return (
        <div className={base} title="Video thumbnail unavailable">
          <ThumbIcon label={label} />
        </div>
      )
    }

    // All non-image/video items: show an icon-thumbnail tile (still a "picture") and make it clickable to open.
    if (item.file_path) {
      return (
        <button
          type="button"
          className={base}
          onClick={() => openFile(item.file_path!)}
          title="Open file"
        >
          <ThumbIcon label={label} />
        </button>
      )
    }

    if (type === 'social') {
      const u = getSocialUrl(item)
      return (
        <button
          type="button"
          className={base}
          onClick={() => {
            if (u) window.open(u, '_blank')
          }}
          title="Open social link"
        >
          <ThumbIcon label={label} />
        </button>
      )
    }

    return (
      <div className={base} aria-label={`${label} thumbnail`}>
        <ThumbIcon label={label} />
      </div>
    )
  }

  async function deleteItem(item: TalentBankItem) {
    const uid = userId ?? (await ensureSession())
    setUserId(uid)
    if (!uid) return

    // Delete file first (optional) then row. If file is missing, still delete DB row.
    if (item.file_path) {
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove([item.file_path])
      await log('storage remove', 'TB_DELETE_STORAGE', {
        hasError: !!removeError,
        errorMessage: (removeError as any)?.message ?? null,
      })
    }

    const { error: deleteError } = await supabase
      .from('talent_bank_items')
      .delete()
      .eq('id', item.id)
      .eq('user_id', uid)

    await log('db delete', 'TB_DELETE_DB', {
      hasError: !!deleteError,
      errorCode: (deleteError as any)?.code ?? null,
      errorMessage: (deleteError as any)?.message ?? null,
    })

    await refreshItems(uid)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const filtered =
    filter === 'all'
      ? items
      : filter === 'image'
        ? items.filter((i) => !!i.file_path && (i.file_type?.startsWith('image') ?? false))
        : filter === 'video'
          ? items.filter((i) => !!i.file_path && (i.file_type?.startsWith('video') ?? false))
          : filter === 'document'
            ? items.filter((i) => !!i.file_path && !(i.file_type?.startsWith('image') ?? false) && !(i.file_type?.startsWith('video') ?? false))
            : items.filter((i) => i.item_type === filter)

  const institutions = [
    'Australian National University (ANU)',
    'University of Sydney',
    'University of Melbourne',
    'University of Queensland',
    'Monash University',
    'RMIT University',
    'University of Technology Sydney (UTS)',
    'TAFE NSW',
    'TAFE Queensland',
    'Open Universities Australia',
    'Coursera',
    'edX',
    'Udemy',
    'Pluralsight',
  ]

  const credentialTypes = [
    'Driver Licence',
    'Working With Children Check',
    'Police Check',
    'First Aid Certificate',
    'CPR Certificate',
    'White Card (Construction)',
    'Forklift Licence',
    'Confined Space Ticket',
    'Working at Heights',
    'RSA (Responsible Service of Alcohol)',
    'RSG (Responsible Service of Gambling)',
    'Security Licence',
    'Trade Qualification',
    'Practising Certificate (Law)',
    'Professional Registration',
    'Blue Card',
    'ASE / CompTIA / Cisco / Microsoft Certification',
    'AWS Certification',
  ]

  const socialPlatforms = [
    'LinkedIn',
    'GitHub',
    'X (Twitter)',
    'Instagram',
    'Facebook',
    'YouTube',
    'TikTok',
    'Website',
  ]

  function normalizeUrl(url: string) {
    const u = url.trim()
    if (!u) return ''
    if (u.startsWith('http://') || u.startsWith('https://')) return u
    return `https://${u}`
  }

  function isValidUrl(url: string) {
    try {
      // URL() throws on invalid
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  async function addSocialLink() {
    const uid = userId ?? (await ensureSession())
    setUserId(uid)
    if (!uid) return

    const url = normalizeUrl(socialUrl)
    if (!url || !isValidUrl(url)) {
      setUploadError('Please enter a valid social profile URL (e.g. https://linkedin.com/in/username).')
      await log('addSocialLink invalid url', 'TB_SOCIAL_ADD', { hasUrl: !!url })
      // #region agent log
      agentDbg('H3', 'Social add invalid url', { platform: socialPlatform, hasUrl: !!url })
      // #endregion agent log
      return
    }

    let urlHost: string | null = null
    try {
      urlHost = new URL(url).host
    } catch {
      urlHost = null
    }
    // #region agent log
    agentDbg('H3', 'Social add attempt', { platform: socialPlatform, urlHost })
    // #endregion agent log

    const payload = {
      user_id: uid,
      item_type: 'social',
      title: socialPlatform,
      description: url,
      metadata: { platform: socialPlatform, url },
      is_public: false,
    }

    const { error } = await supabase.from('talent_bank_items').insert(payload as any)
    await log('addSocialLink', 'TB_SOCIAL_ADD', {
      hasError: !!error,
      errorCode: (error as any)?.code ?? null,
      errorMessage: (error as any)?.message ?? null,
      platform: socialPlatform,
    })
    // #region agent log
    agentDbg('H3', 'Social add result', {
      platform: socialPlatform,
      hasError: !!error,
      errorCode: (error as any)?.code ?? null,
    })
    // #endregion agent log

    if (!error) {
      setSocialUrl('')
      await refreshItems(uid)
    }
  }

  async function addStructuredEntry(kind: 'experience' | 'education' | 'credential') {
    const uid = userId ?? (await ensureSession())
    setUserId(uid)
    if (!uid) return

    const base = { user_id: uid, item_type: kind, is_public: false } as any
    const payload =
      kind === 'experience'
        ? {
            ...base,
            title: `${expCompany || 'Company'} — ${expTitle || 'Role'}`,
            metadata: { company: expCompany, title: expTitle, startDate: expStart, endDate: expEnd, description: expDescription },
          }
        : kind === 'education'
          ? {
              ...base,
              title: `${eduInstitution || 'Institution'} — ${eduCourse || 'Course'}`,
              metadata: { institution: eduInstitution, course: eduCourse, year: eduYear, notes: eduNotes },
            }
          : {
              ...base,
              title: `${credType || 'Credential'}${credIssuer ? ` — ${credIssuer}` : ''}`,
              metadata: { credentialType: credType, issuer: credIssuer, expiry: credExpiry, credentialId: credId, notes: credNotes },
            }

    const { error } = await supabase.from('talent_bank_items').insert(payload)
    await log('addStructuredEntry', 'TB_ENTRY_ADD', {
      kind,
      hasError: !!error,
      errorCode: (error as any)?.code ?? null,
      errorMessage: (error as any)?.message ?? null,
    })

    if (!error) {
      // reset relevant form
      if (kind === 'experience') {
        setExpCompany(''); setExpTitle(''); setExpStart(''); setExpEnd(''); setExpDescription('')
      } else if (kind === 'education') {
        setEduInstitution(''); setEduCourse(''); setEduYear(''); setEduNotes('')
      } else {
        setCredType(''); setCredIssuer(''); setCredExpiry(''); setCredId(''); setCredNotes('')
      }
      await refreshItems(uid)
    }
  }

  async function saveEditEntry() {
    if (!editEntry) return
    const uid = userId ?? (await ensureSession())
    setUserId(uid)
    if (!uid) return

    const kind = editEntry.item.item_type
    const nextTitle =
      kind === 'experience'
        ? `${editEntry.draft.company || 'Company'} — ${editEntry.draft.title || 'Role'}`
        : kind === 'education'
          ? `${editEntry.draft.institution || 'Institution'} — ${editEntry.draft.course || 'Course'}`
          : kind === 'credential'
            ? `${editEntry.draft.credentialType || 'Credential'}${editEntry.draft.issuer ? ` — ${editEntry.draft.issuer}` : ''}`
            : `${editEntry.draft.platform || 'LinkedIn'}`

    const updatePayload: any =
      kind === 'social'
        ? {
            title: nextTitle,
            metadata: { platform: editEntry.draft.platform || nextTitle, url: normalizeUrl(editEntry.draft.url || '') },
            description: normalizeUrl(editEntry.draft.url || ''),
          }
        : { title: nextTitle, metadata: editEntry.draft }

    const { error } = await supabase
      .from('talent_bank_items')
      .update(updatePayload)
      .eq('id', editEntry.item.id)
      .eq('user_id', uid)

    await log('saveEditEntry', 'TB_ENTRY_EDIT', {
      hasError: !!error,
      errorCode: (error as any)?.code ?? null,
      errorMessage: (error as any)?.message ?? null,
      itemId: editEntry.item.id,
      kind: editEntry.item.item_type,
    })

    if (!error) {
      setEditEntry(null)
      await refreshItems(uid)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="px-6 py-4 border-b border-slate-800 flex justify-between">
        <Link href="/dashboard/talent" className="font-bold text-xl">
          Talent Bank
        </Link>
        <button onClick={() => router.push('/dashboard/talent')}>
          Back
        </button>
      </header>

      <main className="p-6 space-y-6">
        {preview && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setPreview(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full max-w-5xl bg-slate-950 border border-white/10 rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="font-semibold truncate pr-4">{preview.title}</div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                  onClick={() => setPreview(null)}
                >
                  Close
                </button>
              </div>
              <div className="p-4 bg-black flex items-center justify-center">
                {preview.kind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.url} alt={preview.title} className="max-h-[75vh] w-auto object-contain" />
                ) : (
                  <video
                    src={preview.url}
                    controls
                    className="max-h-[75vh] w-auto object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {editEntry && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setEditEntry(null)}
          >
            <div
              className="w-full max-w-2xl bg-slate-950 border border-white/10 rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="font-semibold">Edit {editEntry.item.item_type}</div>
                <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm" onClick={() => setEditEntry(null)}>
                  Close
                </button>
              </div>
              <div className="p-4 space-y-3 text-sm">
                {editEntry.item.item_type === 'experience' && (
                  <>
                    <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500" value={editEntry.draft.company || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, company: e.target.value } }) : p)} placeholder="Company" />
                    <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500" value={editEntry.draft.title || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, title: e.target.value } }) : p)} placeholder="Role / Title" />
                    <div className="grid grid-cols-2 gap-3">
                      <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500" value={editEntry.draft.startDate || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, startDate: e.target.value } }) : p)} placeholder="Start date" />
                      <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500" value={editEntry.draft.endDate || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, endDate: e.target.value } }) : p)} placeholder="End date" />
                    </div>
                    <textarea className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500" value={editEntry.draft.description || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, description: e.target.value } }) : p)} placeholder="Responsibilities / achievements" rows={5} />
                  </>
                )}

                {editEntry.item.item_type === 'education' && (
                  <>
                    <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={editEntry.draft.institution || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, institution: e.target.value } }) : p)} placeholder="Institution" />
                    <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={editEntry.draft.course || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, course: e.target.value } }) : p)} placeholder="Course / Qualification" />
                    <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={editEntry.draft.year || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, year: e.target.value } }) : p)} placeholder="Year (or date range)" />
                    <textarea className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={editEntry.draft.notes || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, notes: e.target.value } }) : p)} placeholder="Notes" rows={4} />
                  </>
                )}

                {editEntry.item.item_type === 'credential' && (
                  <>
                    <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500" value={editEntry.draft.credentialType || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, credentialType: e.target.value } }) : p)} placeholder="Credential type" />
                    <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500" value={editEntry.draft.issuer || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, issuer: e.target.value } }) : p)} placeholder="Issuing authority" />
                    <div className="grid grid-cols-2 gap-3">
                      <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500" value={editEntry.draft.expiry || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, expiry: e.target.value } }) : p)} placeholder="Expiry (optional)" />
                      <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500" value={editEntry.draft.credentialId || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, credentialId: e.target.value } }) : p)} placeholder="Licence / ID number (optional)" />
                    </div>
                    <textarea className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500" value={editEntry.draft.notes || ''} onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, notes: e.target.value } }) : p)} placeholder="Notes" rows={4} />
                  </>
                )}

                {editEntry.item.item_type === 'social' && (
                  <>
                    <select
                      value={editEntry.draft.platform || 'LinkedIn'}
                      onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, platform: e.target.value } }) : p)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white"
                    >
                      {socialPlatforms.map((p) => (
                        <option key={p} className="bg-slate-900 !text-white" value={p}>{p}</option>
                      ))}
                    </select>
                    <input
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500"
                      value={editEntry.draft.url || ''}
                      onChange={(e) => setEditEntry((p) => p ? ({ ...p, draft: { ...p.draft, url: e.target.value } }) : p)}
                      placeholder="https://linkedin.com/in/yourname"
                    />
                    <div className="text-xs text-slate-400">
                      Tip: Click Save, then use “Show in Portfolio” to share/unshare this link.
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button className="px-3 py-2 rounded bg-slate-800 border border-slate-700" onClick={() => setEditEntry(null)}>
                    Cancel
                  </button>
                  <button className="px-3 py-2 rounded bg-blue-600" onClick={saveEditEntry}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {recOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setRecOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full max-w-3xl bg-slate-950 border border-white/10 rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="font-semibold">Record video</div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                  onClick={() => {
                    setRecOpen(false)
                    try { recStream?.getTracks().forEach((t) => t.stop()) } catch {}
                    setRecStream(null)
                    setRecorder(null)
                    setIsRecording(false)
                    clearRecording()
                    // #region agent log
                    agentDbg('TB_REC_UI', 'record modal closed', {})
                    // #endregion agent log
                  }}
                >
                  Close
                </button>
              </div>
              <div className="p-4 space-y-4">
                {recErr && (
                  <div className="text-sm text-amber-300">
                    {recErr}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4 items-start">
                  <div className="border border-white/10 rounded-xl overflow-hidden bg-black">
                    {recPreviewUrl ? (
                      <video src={recPreviewUrl} controls playsInline className="w-full h-[260px] object-contain" />
                    ) : (
                      <video ref={liveVideoRef} autoPlay muted playsInline className="w-full h-[260px] object-contain" />
                    )}
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="text-slate-300">
                      {recPreviewUrl ? 'Preview your recording, then upload.' : 'Start your camera, then record.'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={recBusy || !!recStream}
                        className="px-3 py-2 rounded bg-slate-800 border border-slate-700 disabled:opacity-60"
                        onClick={startCamera}
                      >
                        {recStream ? 'Camera Ready' : recBusy ? 'Starting…' : 'Start Camera'}
                      </button>
                      <button
                        type="button"
                        disabled={!recStream || isRecording}
                        className="px-3 py-2 rounded bg-green-600 disabled:opacity-60"
                        onClick={beginRecording}
                      >
                        Start Recording
                      </button>
                      <button
                        type="button"
                        disabled={!isRecording}
                        className="px-3 py-2 rounded bg-amber-600 disabled:opacity-60"
                        onClick={stopRecording}
                      >
                        Stop
                      </button>
                      <button
                        type="button"
                        disabled={!recPreviewUrl || isUploading}
                        className="px-3 py-2 rounded bg-blue-600 disabled:opacity-60"
                        onClick={uploadRecordedVideo}
                      >
                        {isUploading ? 'Uploading…' : 'Upload to Talent Bank'}
                      </button>
                      <button
                        type="button"
                        disabled={isRecording}
                        className="px-3 py-2 rounded bg-slate-800 border border-slate-700 disabled:opacity-60"
                        onClick={clearRecording}
                      >
                        Discard
                      </button>
                    </div>
                    <div className="text-xs text-slate-400">
                      Tip: Keep videos short to stay under the ~50MB upload limit.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="border border-amber-500/40 bg-amber-500/10 text-amber-200 rounded-xl p-4 text-sm">
            {uploadError}
          </div>
        )}

        {authRequired && (
          <div className="border border-slate-700 rounded-xl p-4 bg-slate-950/40">
            <div className="font-semibold mb-2">Sign in to use Talent Bank</div>
            {authError && <div className="text-sm text-amber-300 mb-3">{authError}</div>}
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <label className="text-sm">
                Email
                <input
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded bg-slate-900 border border-slate-700"
                  placeholder="you@domain.com"
                />
              </label>
              <label className="text-sm">
                Password
                <input
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  type="password"
                  className="mt-1 w-full px-3 py-2 rounded bg-slate-900 border border-slate-700"
                  placeholder="••••••••"
                />
              </label>
              <div className="flex gap-2">
                <button
                  disabled={authBusy || !authEmail.trim() || !authPassword}
                  onClick={signInWithPassword}
                  className="px-3 py-2 rounded bg-blue-600 disabled:opacity-50"
                >
                  Sign in
                </button>
                <button
                  disabled={authBusy || !authEmail.trim() || !authPassword}
                  onClick={signUpWithPassword}
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-700 disabled:opacity-50"
                >
                  Create account
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-slate-200">Save files under:</div>
          <select
            value={saveCategory}
            onChange={(e) => {
              const v = e.target.value as any
              setSaveCategory(v)
              log('saveCategory changed', 'TB_CATEGORY', { saveCategory: v })
            }}
            className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-sm !text-white"
          >
            <option className="bg-slate-900 !text-white" value="document">Document</option>
            <option className="bg-slate-900 !text-white" value="education">Education</option>
            <option className="bg-slate-900 !text-white" value="credential">Credential</option>
          </select>
          <div className="text-xs text-slate-400">
            (Images/videos remain images/videos for thumbnails, but will be saved under your chosen category for easier filtering.)
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${
            dragActive ? 'border-blue-400' : 'border-slate-700'
          }`}
          onDrop={onDrop}
          onDragOver={e => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onClick={() =>
            document.getElementById('file-input')?.click()
          }
        >
          <input
            id="file-input"
            type="file"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
          <p>Drag files here or click to upload</p>
          <p className="mt-1 text-xs text-slate-400">
            Max file size: ~{Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB per file
          </p>
          {isUploading && <p className="mt-2 text-blue-400">Uploading…</p>}
        </div>

        <div className="flex gap-2 flex-wrap">
          {(
            ['all', 'document', 'image', 'video', 'experience', 'education', 'credential', 'social'] as ItemFilter[]
          ).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-full text-xs ${
                filter === t ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {(filter === 'experience' || filter === 'education' || filter === 'credential') && (
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30">
            <div className="font-semibold mb-3">
              {filter === 'experience'
                ? 'Add work experience (editable later)'
                : filter === 'education'
                  ? 'Add education entry (editable later)'
                  : 'Add credential / licence / accreditation (editable later)'}
            </div>

            {filter === 'experience' && (
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <input className="px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={expCompany} onChange={(e) => setExpCompany(e.target.value)} placeholder="Company" />
                <input className="px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={expTitle} onChange={(e) => setExpTitle(e.target.value)} placeholder="Role / Title" />
                <input className="px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={expStart} onChange={(e) => setExpStart(e.target.value)} placeholder="Start date (e.g. Jan 2022)" />
                <input className="px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={expEnd} onChange={(e) => setExpEnd(e.target.value)} placeholder="End date (or Present)" />
                <textarea className="md:col-span-2 px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={expDescription} onChange={(e) => setExpDescription(e.target.value)} placeholder="Responsibilities / achievements" rows={4} />
                <div className="md:col-span-2 flex justify-end">
                  <button className="px-3 py-2 rounded bg-blue-600" onClick={() => addStructuredEntry('experience')}>Add Experience</button>
                </div>
              </div>
            )}

            {filter === 'education' && (
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <input list="institutions" className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={eduInstitution} onChange={(e) => setEduInstitution(e.target.value)} placeholder="Institution" />
                  <datalist id="institutions">
                    {institutions.map((x) => <option key={x} value={x} />)}
                  </datalist>
                </div>
                <input className="px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={eduCourse} onChange={(e) => setEduCourse(e.target.value)} placeholder="Course / Qualification" />
                <input className="px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={eduYear} onChange={(e) => setEduYear(e.target.value)} placeholder="Year (or date range)" />
                <textarea className="md:col-span-2 px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={eduNotes} onChange={(e) => setEduNotes(e.target.value)} placeholder="Notes (optional)" rows={3} />
                <div className="md:col-span-2 flex justify-end">
                  <button className="px-3 py-2 rounded bg-blue-600" onClick={() => addStructuredEntry('education')}>Add Education</button>
                </div>
                <div className="md:col-span-2 text-xs text-slate-400">
                  Tip: To add education certificates (PDF/JPG), set “Save files under: Education” above and upload.
                </div>
              </div>
            )}

            {filter === 'credential' && (
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <input list="credTypes" className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={credType} onChange={(e) => setCredType(e.target.value)} placeholder="Credential type (start typing…)" />
                  <datalist id="credTypes">
                    {credentialTypes.map((x) => <option key={x} value={x} />)}
                  </datalist>
                </div>
                <input className="px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={credIssuer} onChange={(e) => setCredIssuer(e.target.value)} placeholder="Issuing authority (e.g. State Govt / Bar Association)" />
                <input className="px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={credExpiry} onChange={(e) => setCredExpiry(e.target.value)} placeholder="Expiry (optional)" />
                <input className="px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={credId} onChange={(e) => setCredId(e.target.value)} placeholder="Licence / ID number (optional)" />
                <textarea className="md:col-span-2 px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white placeholder:text-slate-500" value={credNotes} onChange={(e) => setCredNotes(e.target.value)} placeholder="Notes (optional)" rows={3} />
                <div className="md:col-span-2 flex justify-end">
                  <button className="px-3 py-2 rounded bg-blue-600" onClick={() => addStructuredEntry('credential')}>Add Credential</button>
                </div>
                <div className="md:col-span-2 text-xs text-slate-400">
                  Tip: To attach credential documents/images, set “Save files under: Credential” above and upload.
                </div>
              </div>
            )}
          </div>
        )}

        {filter === 'video' && (
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">Record a video introduction</div>
                <div className="text-xs text-slate-400 mt-1">
                  Record a short video with your camera. It will upload to your Talent Bank and show under the Videos tab.
                </div>
              </div>
              <button
                className="px-3 py-2 rounded bg-blue-600"
                onClick={() => {
                  setRecOpen(true)
                  setRecErr(null)
                  // #region agent log
                  agentDbg('TB_REC_UI', 'record modal open clicked', {})
                  // #endregion agent log
                }}
              >
                Record Video
              </button>
            </div>
          </div>
        )}

        {filter === 'social' && (
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30">
            <div className="font-semibold mb-3">Add social media link (shareable in Portfolio)</div>
            <div className="grid md:grid-cols-3 gap-3 items-end text-sm">
              <label className="text-sm text-slate-200">
                Platform
                <select
                  value={socialPlatform}
                  onChange={(e) => setSocialPlatform(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white"
                >
                  {socialPlatforms.map((p) => (
                    <option key={p} className="bg-slate-900 !text-white" value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2 text-sm text-slate-200">
                Profile URL
                <input
                  value={socialUrl}
                  onChange={(e) => setSocialUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/yourname"
                  className="mt-1 w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500"
                />
              </label>
              <div className="md:col-span-3 flex justify-end">
                <button className="px-3 py-2 rounded bg-blue-600" onClick={addSocialLink}>
                  Add Social Link
                </button>
              </div>
              <div className="md:col-span-3 text-xs text-slate-400">
                Tip: Tick “Show in Portfolio” on any social link to include it when sharing your portfolio with businesses.
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {isLoading && <p>Loading…</p>}
          {!isLoading && filtered.length === 0 && <p>No items</p>}
          {filtered.map(item => {
            const socialUrl = item.item_type === 'social' ? getSocialUrl(item) : ''
            return (
              <div
                key={item.id}
                className="border border-slate-800 rounded-lg p-4 flex gap-4"
              >
                {renderThumb(item)}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold break-words">{item.title}</div>
                <div className="text-xs text-slate-400">
                  {item.item_type}
                    {item.file_type ? ` • ${item.file_type}` : ''}
                </div>
                  {item.item_type === 'social' && !!socialUrl && (
                    <div className="mt-1 text-xs text-slate-300 break-all">
                      {socialUrl}
                    </div>
                  )}

                  {item.title !== 'Portfolio' && (
                    <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!portfolioSelected[item.id]}
                        onChange={(e) => toggleInPortfolio(item, e.target.checked)}
                      />
                      Show in Portfolio
                    </label>
                  )}

                  {!item.file_path && (item.item_type === 'experience' || item.item_type === 'education' || item.item_type === 'credential' || item.item_type === 'social') && (
                    <div className="mt-2 flex items-center gap-3">
                      {item.item_type === 'social' && !!socialUrl && (
                        <button
                          className="text-blue-400 text-xs underline"
                          onClick={() => window.open(socialUrl, '_blank')}
                        >
                          Open
                        </button>
                      )}
                      <button
                        className="text-blue-400 text-xs underline"
                        onClick={() => {
                          if (item.item_type === 'social') {
                            setEditEntry({
                              item,
                              draft: {
                                platform: item.title || (item.metadata as any)?.platform || 'LinkedIn',
                                url: socialUrl,
                              },
                            })
                            return
                          }
                          setEditEntry({ item, draft: item.metadata ?? {} })
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-400 text-xs underline"
                        onClick={() => deleteItem(item)}
                      >
                        Delete
                      </button>
                    </div>
                  )}

                {item.file_path && (
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        className="text-blue-400 text-xs underline"
                        onClick={() => openFile(item.file_path!)}
                      >
                        Open
                      </button>
                      <button
                        className="text-red-400 text-xs underline"
                        onClick={() => deleteItem(item)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
