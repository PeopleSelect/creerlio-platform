'use client'

import { useEffect, useRef, useState, DragEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface BusinessBankItem {
  id: number
  user_id: string
  item_type: string
  title: string
  description?: string | null
  file_url?: string | null
  file_path?: string | null
  file_type?: string | null
  file_size?: number | null
  metadata?: any
  created_at: string
}

type ItemFilter = 'all' | 'document' | 'image' | 'video' | 'link' | 'logo' | 'business_introduction'

const BUCKET = 'business-bank'
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024 // 50 MB

export default function BusinessBankPage() {
  const router = useRouter()
  const [items, setItems] = useState<BusinessBankItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [filter, setFilter] = useState<ItemFilter>('all')
  const [userId, setUserId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<
    | { kind: 'image'; url: string; title: string }
    | { kind: 'video'; url: string; title: string }
    | null
  >(null)

  // Document form
  const [docTitle, setDocTitle] = useState('')
  const [docDescription, setDocDescription] = useState('')

  // Link form
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkDescription, setLinkDescription] = useState('')

  // Business Introduction form
  const [introVideoUrl, setIntroVideoUrl] = useState('')
  const [introVideoTitle, setIntroVideoTitle] = useState('Business Introduction Video')
  const [introVideoSource, setIntroVideoSource] = useState<'record' | 'upload' | 'link'>('link')

  // Website/brochure parsing
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [websiteParseBusy, setWebsiteParseBusy] = useState(false)
  const [websiteParseError, setWebsiteParseError] = useState<string | null>(null)
  const [brochureFile, setBrochureFile] = useState<File | null>(null)
  const [brochureParseBusy, setBrochureParseBusy] = useState(false)
  const [brochureParseError, setBrochureParseError] = useState<string | null>(null)

  // Video recording state
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
  const videoFileInputRef = useRef<HTMLInputElement>(null)

  const [editEntry, setEditEntry] = useState<null | { item: BusinessBankItem; draft: any }>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadItems()
  }, [filter])

  async function loadItems() {
    try {
      setIsLoading(true)
      const { data: sessionRes } = await supabase.auth.getSession()
      const uid = sessionRes.session?.user?.id

      if (!uid) {
        router.replace('/login?redirect=/dashboard/business/bank')
        return
      }

      setUserId(uid)

      let query = supabase
        .from('business_bank_items')
        .select('*')
        .eq('user_id', uid)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('item_type', filter)
      }

      const { data, error } = await query

      if (error) throw error

      setItems(data || [])

      // Load thumbnails for images and videos (including business_introduction)
      const mediaItems = (data || []).filter(
        (item) => item.item_type === 'image' || item.item_type === 'video' || item.item_type === 'business_introduction'
      )
      const thumbMap: Record<string, string> = {}
      for (const item of mediaItems) {
        if (item.file_path) {
          const { data: urlData } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(item.file_path, 3600)
          if (urlData) {
            thumbMap[String(item.id)] = urlData.signedUrl
          }
        } else if (item.file_url) {
          thumbMap[String(item.id)] = item.file_url
        }
      }
      setThumbUrls(thumbMap)
    } catch (err: any) {
      console.error('Error loading items:', err)
      setUploadError(err.message || 'Failed to load items')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0 || !userId) return

    setIsUploading(true)
    setUploadError(null)

    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_UPLOAD_BYTES) {
          setUploadError(`File ${file.name} exceeds maximum size of 50MB`)
          continue
        }

        const fileExt = file.name.split('.').pop()
        // Path structure: business/{user_id}/{filename}
        // Using user_id directly as business identifier (matches business_profiles.user_id)
        const fileName = `business/${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
        const filePath = fileName

        // Determine item type
        let itemType: BusinessBankItem['item_type'] = 'document'
        if (file.type.startsWith('image/')) {
          itemType = file.type === 'image/svg+xml' || file.name.toLowerCase().includes('logo') ? 'logo' : 'image'
        } else if (file.type.startsWith('video/')) {
          itemType = 'video'
        }

        // Upload to Supabase Storage
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Storage upload error details:', {
            message: uploadError.message,
            statusCode: uploadError.statusCode,
            error: uploadError,
            filePath: filePath,
            userId: userId,
          })
          // If it's an RLS error, provide helpful message
          if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('policy') || uploadError.statusCode === 403) {
            throw new Error('Storage upload failed: RLS policy error. Please run FIX_STORAGE_RLS_BUSINESS_BANK.sql in Supabase SQL Editor.')
          }
          throw new Error(uploadError.message || `Storage upload failed: ${uploadError.statusCode || 'Unknown error'}`)
        }

        // Get public URL (or signed URL if bucket is private)
        let fileUrl: string | null = null
        if (uploadData?.path) {
          // Try to get public URL first (works if bucket is public)
          const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path)
          if (publicUrlData?.publicUrl) {
            fileUrl = publicUrlData.publicUrl
          } else {
            // For private buckets, use the path directly (Supabase will handle auth)
            // Or create a signed URL if needed for immediate access
            try {
              const { data: urlData, error: signError } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(uploadData.path, 31536000) // 1 year
              if (signError) {
                console.warn('Could not create signed URL, using path:', signError)
                // Use path-based URL that will be resolved by Supabase client
                fileUrl = `${BUCKET}/${uploadData.path}`
              } else {
                fileUrl = urlData?.signedUrl || null
              }
            } catch (signErr) {
              console.warn('Signed URL creation failed, using path:', signErr)
              fileUrl = `${BUCKET}/${uploadData.path}`
            }
          }
        }

        // Create database record
        const { error: dbError, data: dbData } = await supabase.from('business_bank_items').insert({
          user_id: userId,
          item_type: itemType,
          title: file.name,
          file_path: filePath,
          file_url: fileUrl,
          file_type: file.type,
          file_size: file.size,
          metadata: {
            originalName: file.name,
          },
        }).select()

        if (dbError) {
          console.error('Database insert error details:', {
            message: dbError.message,
            details: dbError.details,
            hint: dbError.hint,
            code: dbError.code,
          })
          // If DB insert fails, try to clean up the uploaded file
          if (uploadData?.path) {
            try {
              await supabase.storage.from(BUCKET).remove([uploadData.path])
            } catch (cleanupErr) {
              console.error('Failed to cleanup uploaded file:', cleanupErr)
            }
          }
          throw new Error(dbError.message || dbError.details || 'Failed to save file record to database')
        }
      }

      await loadItems()
      setUploadError(null) // Clear any previous errors on success
    } catch (err: any) {
      console.error('Upload error details:', {
        message: err.message,
        error: err,
        stack: err.stack,
      })
      setUploadError(err.message || err.details || 'Upload failed. Check console for details.')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleLinkCreate() {
    if (!linkTitle.trim() || !linkUrl.trim() || !userId) {
      setUploadError('Title and URL are required')
      return
    }

    try {
      const { error } = await supabase.from('business_bank_items').insert({
        user_id: userId,
        item_type: 'link',
        title: linkTitle,
        description: linkDescription || null,
        file_url: linkUrl,
        metadata: {
          url: linkUrl,
        },
      })

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      // Reset form immediately after successful creation
      setLinkTitle('')
      setLinkUrl('')
      setLinkDescription('')
      setUploadError(null)
      await loadItems()
    } catch (err: any) {
      console.error('Error creating link:', err)
      setUploadError(err.message || err.details || 'Failed to create link')
    }
  }

  async function createTextItem(title: string, description: string, metadata?: any) {
    if (!userId) return
    const { error } = await supabase.from('business_bank_items').insert({
      user_id: userId,
      item_type: 'document',
      title,
      description,
      metadata: metadata || null,
    })
    if (error) throw error
  }

  async function handleDocumentCreate() {
    if (!docTitle.trim() || !userId) {
      setUploadError('Document title is required')
      return
    }
    try {
      await createTextItem(docTitle.trim(), docDescription.trim(), { source: 'manual' })
      setDocTitle('')
      setDocDescription('')
      setUploadError(null)
      await loadItems()
    } catch (err: any) {
      console.error('Error creating document:', err)
      setUploadError(err.message || 'Failed to create document')
    }
  }

  async function parseWebsiteAndSave() {
    if (!websiteUrl.trim() || !userId) {
      setWebsiteParseError('Website URL is required.')
      return
    }
    setWebsiteParseBusy(true)
    setWebsiteParseError(null)
    try {
      const res = await fetch('/api/website/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to parse website.')
      }

      const name = String(data?.name || '').trim()
      const description = String(data?.description || '').trim()
      const services = Array.isArray(data?.services) ? data.services : []
      const address = data?.address?.full || ''
      const phone = data?.phone || ''
      const email = data?.email || ''
      const website = data?.website || websiteUrl.trim()
      const socials = Array.isArray(data?.socialLinks) ? data.socialLinks : []

      const summaryParts = [
        description ? `Summary: ${description}` : null,
        services.length ? `Services: ${services.join(', ')}` : null,
        address ? `Address: ${address}` : null,
        phone ? `Phone: ${phone}` : null,
        email ? `Email: ${email}` : null,
        socials.length ? `Socials: ${socials.join(', ')}` : null,
      ].filter(Boolean)

      const summary = summaryParts.join('\n')
      const title = name ? `Website Summary: ${name}` : 'Website Summary'

      await createTextItem(title, summary || `Website: ${website}`, {
        source: 'website',
        website,
        name,
        description,
        services,
        address: data?.address || null,
        phone,
        email,
        socials,
        raw: data,
      })

      if (website) {
        await supabase.from('business_bank_items').insert({
          user_id: userId,
          item_type: 'link',
          title: name ? `${name} Website` : 'Business Website',
          description: description || null,
          file_url: website,
          metadata: { url: website, source: 'website' },
        })
      }

      setWebsiteUrl('')
      await loadItems()
    } catch (err: any) {
      console.error('Website parse error:', err)
      setWebsiteParseError(err.message || 'Failed to parse website.')
    } finally {
      setWebsiteParseBusy(false)
    }
  }

  async function parseBrochureAndSave() {
    if (!brochureFile || !userId) {
      setBrochureParseError('Brochure file is required.')
      return
    }
    setBrochureParseBusy(true)
    setBrochureParseError(null)
    try {
      const formData = new FormData()
      formData.append('file', brochureFile)
      const res = await fetch('/api/business/parse-brochure', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to parse brochure.')
      }

      const summary = String(data?.summary || '').trim()
      const highlights = Array.isArray(data?.highlights) ? data.highlights : []
      const descriptionParts = [
        summary ? summary : null,
        highlights.length ? `Highlights:\n- ${highlights.join('\n- ')}` : null,
      ].filter(Boolean)
      const description = descriptionParts.join('\n\n') || 'Brochure parsed.'

      await createTextItem(`Brochure Summary: ${brochureFile.name}`, description, {
        source: 'brochure',
        fileName: brochureFile.name,
        highlights,
        summary,
        rawText: data?.rawText || null,
      })

      setBrochureFile(null)
      await loadItems()
    } catch (err: any) {
      console.error('Brochure parse error:', err)
      setBrochureParseError(err.message || 'Failed to parse brochure.')
    } finally {
      setBrochureParseBusy(false)
    }
  }

  // Video recording functions
  function chooseRecorderMime() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ]
    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && (MediaRecorder as any).isTypeSupported?.(c)) return c
    }
    return 'video/webm'
  }

  async function startCamera() {
    setRecErr(null)
    setRecBusy(true)
    try {
      if (typeof window !== 'undefined' && !(window as any).isSecureContext) {
        setRecErr('Camera access requires a secure connection (HTTPS) or localhost.')
        return
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        setRecErr('Camera recording is not supported in this browser.')
        return
      }

      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch (e: any) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }
      setRecStream(stream)
      const mime = chooseRecorderMime()
      setRecMime(mime)
    } catch (e: any) {
      const name = e?.name ?? null
      const msg =
        name === 'NotAllowedError'
          ? 'Permission denied. Please allow camera + microphone access for this site.'
          : (e?.message ?? 'Failed to access camera/microphone.')
      setRecErr(msg)
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
        return
      }
      if (recPreviewUrl) {
        try { URL.revokeObjectURL(recPreviewUrl) } catch {}
        setRecPreviewUrl(null)
      }
      setRecChunks([])
      recChunksRef.current = []

      const preferred = chooseRecorderMime()
      const candidates = Array.from(new Set([preferred, 'video/webm;codecs=vp8,opus', 'video/webm']))

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
        }
      }

      for (const c of candidates) {
        try {
          const rec = new MediaRecorder(recStream, { mimeType: c } as any)
          attachHandlers(rec, c)
          rec.start(250)
          mr = rec
          chosen = c
          break
        } catch (e: any) {
          // Try next codec
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
        } catch (e: any) {
          try {
            const videoOnly = new MediaStream(recStream.getVideoTracks())
            const rec2 = new MediaRecorder(videoOnly)
            const fallbackMime2 = (rec2 as any)?.mimeType || 'video/webm'
            attachHandlers(rec2, fallbackMime2)
            rec2.start(250)
            mr = rec2
            chosen = fallbackMime2
          } catch (e2: any) {
            setRecErr('Recording is not supported by this browser/device.')
            return
          }
        }
      }

      setRecMime(chosen || preferred)
      setRecorder(mr)
      setIsRecording(true)
    } catch (e: any) {
      setRecErr(e?.message ?? 'Failed to start recording.')
    }
  }

  async function stopRecording() {
    try { recorder?.stop() } catch {}
    setIsRecording(false)
    setRecorder(null)
  }

  function clearRecording() {
    try {
      if (recStream) recStream.getTracks().forEach((t) => t.stop())
      if (recPreviewUrl) URL.revokeObjectURL(recPreviewUrl)
    } catch {}
    setRecStream(null)
    setRecPreviewUrl(null)
    setRecChunks([])
    recChunksRef.current = []
  }

  async function uploadRecordedVideo() {
    setRecErr(null)
    if (!userId) {
      setUploadError('Please sign in to upload video.')
      return
    }

    const blob = new Blob(recChunksRef.current, { type: recMime })
    if (!blob.size) {
      setRecErr('No recording captured yet.')
      return
    }
    if (blob.size > MAX_UPLOAD_BYTES) {
      const sizeMb = Math.round((blob.size / (1024 * 1024)) * 10) / 10
      const limitMb = Math.round((MAX_UPLOAD_BYTES / (1024 * 1024)) * 10) / 10
      setRecErr(`Recording is ${sizeMb}MB, which exceeds the upload limit (~${limitMb}MB). Please record a shorter video.`)
      return
    }

    const ext = recMime.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([blob], `business-intro-${Date.now()}.${ext}`, { type: recMime })

    setIsUploading(true)
    try {
      const fileExt = ext
      const fileName = `business/${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const filePath = fileName

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message || 'Storage upload failed')
      }

      let fileUrl: string | null = null
      if (uploadData?.path) {
        const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path)
        if (publicUrlData?.publicUrl) {
          fileUrl = publicUrlData.publicUrl
        } else {
          try {
            const { data: urlData } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(uploadData.path, 31536000)
            fileUrl = urlData?.signedUrl || null
          } catch {
            fileUrl = `${BUCKET}/${uploadData.path}`
          }
        }
      }

      console.log('[Business Bank] Inserting recorded video:', {
        user_id: userId,
        item_type: 'business_introduction',
        title: introVideoTitle || 'Business Introduction Video',
        file_path: filePath,
        file_url: fileUrl,
        file_type: file.type,
        file_size: file.size,
      })

      const { error: dbError, data: dbData } = await supabase
        .from('business_bank_items')
        .insert({
          user_id: userId,
          item_type: 'business_introduction',
          title: introVideoTitle || 'Business Introduction Video',
          file_path: filePath,
          file_url: fileUrl,
          file_type: file.type,
          file_size: file.size,
          metadata: {
            originalName: file.name,
            source: 'recording',
          },
        })
        .select()

      if (dbError) {
        console.error('[Business Bank] Database error:', {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code,
        })
        
        if (uploadData?.path) {
          await supabase.storage.from(BUCKET).remove([uploadData.path])
        }
        
        // Check for constraint violation
        if (dbError.message?.includes('check constraint') || dbError.message?.includes('business_bank_items_item_type_check')) {
          throw new Error(
            'The item type "business_introduction" is not allowed. Please run FIX_BUSINESS_BANK_ITEM_TYPE_CONSTRAINT.sql in Supabase SQL Editor to enable this type.'
          )
        } else {
          throw new Error(dbError.message || dbError.details || 'Failed to save video record')
        }
      }

      console.log('[Business Bank] Recorded video inserted successfully:', dbData)

      console.log('[Business Bank] Recorded video inserted successfully')

      clearRecording()
      setRecOpen(false)
      setIntroVideoTitle('Business Introduction Video')
      setUploadError(null)
      await loadItems()
      
      // Show success message
      alert('Video recorded and saved successfully!')
    } catch (err: any) {
      setRecErr(err.message || 'Failed to upload video')
      setUploadError(err.message || 'Failed to upload video')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleIntroVideoUpload(files: FileList | null) {
    if (!files || files.length === 0 || !userId) return

    const file = files[0]
    if (!file.type.startsWith('video/')) {
      setUploadError('Please select a video file.')
      return
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      const sizeMb = Math.round((file.size / (1024 * 1024)) * 10) / 10
      const limitMb = Math.round((MAX_UPLOAD_BYTES / (1024 * 1024)) * 10) / 10
      setUploadError(`File is ${sizeMb}MB, which exceeds the upload limit (~${limitMb}MB).`)
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `business/${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const filePath = fileName

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message || 'Storage upload failed')
      }

      let fileUrl: string | null = null
      if (uploadData?.path) {
        const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path)
        if (publicUrlData?.publicUrl) {
          fileUrl = publicUrlData.publicUrl
        } else {
          try {
            const { data: urlData } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(uploadData.path, 31536000)
            fileUrl = urlData?.signedUrl || null
          } catch {
            fileUrl = `${BUCKET}/${uploadData.path}`
          }
        }
      }

      console.log('[Business Bank] Inserting video file:', {
        user_id: userId,
        item_type: 'business_introduction',
        title: introVideoTitle || 'Business Introduction Video',
        file_path: filePath,
        file_url: fileUrl,
        file_type: file.type,
        file_size: file.size,
      })

      const { error: dbError, data: dbData } = await supabase
        .from('business_bank_items')
        .insert({
          user_id: userId,
          item_type: 'business_introduction',
          title: introVideoTitle || 'Business Introduction Video',
          file_path: filePath,
          file_url: fileUrl,
          file_type: file.type,
          file_size: file.size,
          metadata: {
            originalName: file.name,
            source: 'upload',
          },
        })
        .select()

      if (dbError) {
        console.error('[Business Bank] Database error:', {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code,
        })
        
        if (uploadData?.path) {
          await supabase.storage.from(BUCKET).remove([uploadData.path])
        }
        
        // Check for constraint violation
        if (dbError.message?.includes('check constraint') || dbError.message?.includes('business_bank_items_item_type_check')) {
          throw new Error(
            'The item type "business_introduction" is not allowed. Please run FIX_BUSINESS_BANK_ITEM_TYPE_CONSTRAINT.sql in Supabase SQL Editor to enable this type.'
          )
        } else {
          throw new Error(dbError.message || dbError.details || 'Failed to save video record')
        }
      }

      console.log('[Business Bank] Video file inserted successfully:', dbData)

      setIntroVideoTitle('Business Introduction Video')
      setUploadError(null)
      await loadItems()
      
      // Show success message
      alert('Video uploaded successfully!')
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload video')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleIntroVideoLink() {
    if (!introVideoUrl.trim() || !userId) {
      setUploadError('Please enter a video URL')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      // Validate URL
      try {
        new URL(introVideoUrl)
      } catch {
        setUploadError('Please enter a valid URL')
        setIsUploading(false)
        return
      }

      console.log('[Business Bank] Inserting video link:', {
        user_id: userId,
        item_type: 'business_introduction',
        title: introVideoTitle || 'Business Introduction Video',
        file_url: introVideoUrl,
      })

      const { error, data } = await supabase
        .from('business_bank_items')
        .insert({
          user_id: userId,
          item_type: 'business_introduction',
          title: introVideoTitle || 'Business Introduction Video',
          file_url: introVideoUrl,
          metadata: {
            url: introVideoUrl,
            source: 'link',
          },
        })
        .select()

      if (error) {
        console.error('[Business Bank] Database error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        
        // Check for constraint violation
        if (error.message?.includes('check constraint') || error.message?.includes('business_bank_items_item_type_check')) {
          setUploadError(
            'The item type "business_introduction" is not allowed. Please run FIX_BUSINESS_BANK_ITEM_TYPE_CONSTRAINT.sql in Supabase SQL Editor to enable this type.'
          )
        } else {
          setUploadError(error.message || error.details || 'Failed to create video link')
        }
        setIsUploading(false)
        return
      }

      console.log('[Business Bank] Video link inserted successfully:', data)

      setIntroVideoUrl('')
      setIntroVideoTitle('Business Introduction Video')
      setUploadError(null)
      await loadItems()
      
      // Show success message
      alert('Video link added successfully!')
    } catch (err: any) {
      console.error('[Business Bank] Error creating video link:', err)
      setUploadError(err.message || err.details || 'Failed to create video link')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const item = items.find((i) => i.id === id)
      if (item?.file_path) {
        await supabase.storage.from(BUCKET).remove([item.file_path])
      }

      const { error } = await supabase
        .from('business_bank_items')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadItems()
    } catch (err: any) {
      console.error('Error deleting item:', err)
      setUploadError(err.message || 'Failed to delete item')
    }
  }

  function handleDrag(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  function isExternalUrl(value: string) {
    return /^https?:\/\//i.test(value)
  }

  async function openFile(path: string) {
    if (isExternalUrl(path)) {
      window.open(path, '_blank')
      return
    }
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  function renderThumb(item: BusinessBankItem) {
    const base =
      'w-[20mm] h-[20mm] rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0'
    const isImg = item.item_type === 'image' || item.item_type === 'logo'
    const isVid = item.item_type === 'video' || item.item_type === 'business_introduction'
    const url = thumbUrls[item.id] || item.file_url || ''

    const ext = (item.title.split('.').pop() || '').toUpperCase().slice(0, 4)
    const label = isImg ? 'IMG' : isVid ? 'VID' : ext || 'DOC'

    if (isImg && url) {
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

    if (isVid && url) {
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
      <div className={base}>
        <span className="text-xs text-gray-600 font-semibold">{label}</span>
      </div>
    )
  }

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'image') return item.item_type === 'image' || item.item_type === 'logo'
    if (filter === 'video') return item.item_type === 'video' || item.item_type === 'business_introduction'
    if (filter === 'document') return item.item_type === 'document' || item.item_type === 'text'
    return item.item_type === filter
  })

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <Link href="/dashboard/business" className="font-bold text-xl text-gray-900">
          Business Bank
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/business/edit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
          >
            Edit Profile
          </Link>
          <button onClick={() => router.push('/dashboard/business')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Back
          </button>
      </header>

      <main className="p-6 space-y-6">
        {uploadError && (
          <div className="border border-amber-500/40 bg-amber-500/10 text-amber-700 rounded-xl p-4 text-sm">
            {uploadError}
          </div>
        )}

        {/* Upload Area */}
        <div
          ref={dropRef}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${
            dragActive ? 'border-blue-400' : 'border-gray-300'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          <p>Drag files here or click to upload</p>
          <p className="mt-1 text-xs text-gray-500">
            Max file size: ~{Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB per file
          </p>
          {isUploading && <p className="mt-2 text-blue-600">Uploading…</p>}
        </main>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'document', 'image', 'video', 'link', 'logo', 'business_introduction'] as ItemFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'business_introduction' ? 'business introduction' : f}
            </button>
          ))}
        </div>

        {filter === 'document' && (
          <>
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="font-semibold mb-3">Add a business document or note</div>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <input
                  className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Title (e.g. Company Overview)"
                />
                <textarea
                  className="md:col-span-2 px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Summary or notes"
                  rows={4}
                />
                <div className="md:col-span-2 flex justify-end">
                  <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={handleDocumentCreate}>
                    Add Document
                  </button>
                </div>
                <div className="md:col-span-2 text-xs text-gray-500">
                  Tip: Use documents to capture business summaries, services, and brochure notes.
                </div>
              </div>
            </div>

            {/* Business Website & Brochure Parsing */}
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Website & Brochure Parsing</h3>
              <p className="text-sm text-gray-600 mb-4">
                Parse a business website or brochure to auto-create Business Bank entries you can reuse in your Business Profile.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Website URL</label>
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                  />
                  {websiteParseError && <div className="text-xs text-red-600">{websiteParseError}</div>}
                  <button
                    type="button"
                    onClick={parseWebsiteAndSave}
                    disabled={websiteParseBusy}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {websiteParseBusy ? 'Parsing…' : 'Parse Website'}
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Brochure (PDF)</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setBrochureFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-200 file:text-gray-800 hover:file:bg-gray-300"
                  />
                  {brochureParseError && <div className="text-xs text-red-600">{brochureParseError}</div>}
                  <button
                    type="button"
                    onClick={parseBrochureAndSave}
                    disabled={brochureParseBusy || !brochureFile}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {brochureParseBusy ? 'Parsing…' : 'Parse Brochure'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Business Introduction Video */}
        {(filter === 'video' || filter === 'business_introduction') && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">Record a business introduction</div>
                <div className="text-xs text-gray-500 mt-1">
                  Record a short video, upload a file, or link a video URL. It will appear under the Videos tab.
                </div>
              </div>
              <button
                className="px-3 py-2 rounded bg-blue-600 text-white"
                onClick={() => {
                  setRecOpen(true)
                  setRecErr(null)
                }}
              >
                Record Video
              </button>
            </div>
          </div>
        )}

        {/* Add Link */}
        {filter === 'link' && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="font-semibold mb-3">Add link</div>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <input
                type="text"
                placeholder="Title (e.g., Company Website)"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
              <input
                type="url"
                placeholder="URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
              <textarea
                placeholder="Description (optional)"
                value={linkDescription}
                onChange={(e) => setLinkDescription(e.target.value)}
                rows={2}
                className="md:col-span-2 px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={handleLinkCreate}
                  className="px-3 py-2 rounded bg-blue-600 text-white"
                >
                  Add Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {isLoading && <p>Loading…</p>}
          {!isLoading && filteredItems.length === 0 && <p>No items</p>}
          {filteredItems.map((item) => {
            const openPath = item.file_path || item.file_url || ''
            const displayType = item.item_type === 'text' ? 'document' : item.item_type
            return (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 flex gap-4">
                {renderThumb(item)}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold break-words">{item.title}</div>
                  <div className="text-xs text-gray-500">
                    {displayType}
                    {item.file_type ? ` • ${item.file_type}` : ''}
                  </div>
                  {item.description && (
                    <div className="mt-1 text-xs text-gray-500 line-clamp-2">{item.description}</div>
                  )}
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    {openPath && (
                      <button
                        className="text-blue-600 text-xs underline"
                        onClick={() => openFile(openPath)}
                      >
                        Open
                      </button>
                    )}
                    <button className="text-red-600 text-xs underline" onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Preview Modal */}
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

      {/* Video Recording Modal */}
      {recOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => {
            if (!isRecording) {
              clearRecording()
              setRecOpen(false)
            }
          }}
        >
          <div
            className="max-w-3xl w-full bg-slate-950 border border-white/10 rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Record Business Introduction Video</h3>
              <button
                onClick={() => {
                  if (!isRecording) {
                    clearRecording()
                    setRecOpen(false)
                  }
                }}
                disabled={isRecording}
                className="text-gray-400 hover:text-white text-2xl disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {recErr && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg text-sm">
                {recErr}
              </div>
            )}

            {!recStream && !recPreviewUrl && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIntroVideoSource('record')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      introVideoSource === 'record'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntroVideoSource('upload')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      introVideoSource === 'upload'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntroVideoSource('link')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      introVideoSource === 'link'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Link URL
                  </button>
                </div>

                {introVideoSource === 'record' && (
                  <>
                    <p className="text-gray-300">
                      Click "Start Camera" to begin recording your business introduction video.
                    </p>
                    <button
                      onClick={startCamera}
                      disabled={recBusy}
                      className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 font-semibold"
                    >
                      {recBusy ? 'Starting Camera...' : 'Start Camera'}
                    </button>
                  </>
                )}

                {introVideoSource === 'upload' && (
                  <div className="space-y-3">
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleIntroVideoUpload(e.target.files)}
                      className="hidden"
                    />
                    <button
                      onClick={() => videoFileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 font-semibold"
                    >
                      {isUploading ? 'Uploading...' : 'Choose Video File'}
                    </button>
                  </div>
                )}

                {introVideoSource === 'link' && (
                  <div className="space-y-3">
                    <input
                      type="url"
                      placeholder="Video URL (YouTube, Vimeo, or direct video link)"
                      value={introVideoUrl}
                      onChange={(e) => setIntroVideoUrl(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                    <button
                      onClick={handleIntroVideoLink}
                      disabled={isUploading}
                      className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 font-semibold"
                    >
                      {isUploading ? 'Saving...' : 'Add Video Link'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {recStream && !recPreviewUrl && (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={liveVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-[400px] object-contain"
                  />
                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/80 px-3 py-1 rounded-full">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-white text-sm font-medium">Recording</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-center">
                  {!isRecording ? (
                    <button
                      onClick={beginRecording}
                      className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
                    >
                      Start Recording
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
                    >
                      Stop Recording
                    </button>
                  )}
                  <button
                    onClick={clearRecording}
                    disabled={isRecording}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {recPreviewUrl && (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    src={recPreviewUrl}
                    controls
                    className="w-full max-h-[400px] object-contain"
                  />
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={uploadRecordedVideo}
                    disabled={isUploading}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 font-semibold"
                  >
                    {isUploading ? 'Uploading...' : 'Save Video'}
                  </button>
                  <button
                    onClick={clearRecording}
                    disabled={isUploading}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Record Again
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
