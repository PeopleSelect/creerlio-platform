'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { INDUSTRY_OPTIONS, INDUSTRY_SET } from '@/constants/industries'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BusinessProfileShareConfig, { ShareConfig } from '@/components/BusinessProfileShareConfig'
import { buildSharedPayload, createPortfolioSnapshot } from '@/lib/portfolioSnapshots'
import { TemplateId } from '@/components/portfolioTemplates'

const DEBUG_LOG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_LOG_ENABLED === 'true'
const DEBUG_ENDPOINT = 'http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc'
const emitDebugLog = (payload: Record<string, unknown>) => {
  if (!DEBUG_LOG_ENABLED) return
  fetch(DEBUG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {})
}

type BusinessIntentStatus = 'actively_building_talent' | 'future_planning' | 'not_hiring'
type BusinessTimeHorizon = 'now' | 'near' | 'future' | ''
type BusinessEngagementType = 'hire' | 'contract' | 'advisory' | ''
type BusinessLocationReality = 'on_site' | 'hybrid' | 'remote' | ''

const defaultBusinessIntent = {
  intent_status: 'not_hiring' as BusinessIntentStatus,
  visibility: false,
  capability_needs: '',
  time_horizon: '' as BusinessTimeHorizon,
  location_reality: '' as BusinessLocationReality,
  engagement_type: '' as BusinessEngagementType,
}

let pdfJsLibPromise: Promise<any> | null = null
function loadPdfJsLib() {
  if (pdfJsLibPromise) return pdfJsLibPromise
  pdfJsLibPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('pdfjs can only load in the browser'))
    const w = window as any
    if (w.pdfjsLib) return resolve(w.pdfjsLib)

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    script.onload = () => {
      if (w.pdfjsLib) {
        w.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(w.pdfjsLib)
      } else {
        reject(new Error('Failed to load pdfjs'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load pdfjs script'))
    document.head.appendChild(script)
  })
  return pdfJsLibPromise
}

function CollapsibleTextarea({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  expandKey,
  defaultRows = 5,
  expanded,
  onToggle,
  showVoiceButtons = false,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  expandKey: string
  defaultRows?: number
  expanded: boolean
  onToggle: (key: string) => void
  showVoiceButtons?: boolean
}) {
  const [isListening, setIsListening] = useState(false)
  const [isPolishing, setIsPolishing] = useState(false)
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [interimText, setInterimText] = useState('')
  const baseValueRef = useRef<string>('')
  const finalTranscriptRef = useRef<string>('')
  const shouldContinueListeningRef = useRef<boolean>(false)
  const lineCount = String((value || '') + interimText).split('\n').length
  const needsExpansion = lineCount > defaultRows || String((value || '') + interimText).length > 200

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!showVoiceButtons) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript
        const newValue = baseValueRef.current + finalTranscriptRef.current
        baseValueRef.current = newValue
        finalTranscriptRef.current = ''
        onChange({ target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>)
      }

      setInterimText(interimTranscript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      shouldContinueListeningRef.current = false
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please enable microphone permissions in your browser settings.')
      }
    }

    recognition.onend = () => {
      if (shouldContinueListeningRef.current) {
        try {
          recognition.start()
        } catch (error: any) {
          if (error.name !== 'InvalidStateError') {
            console.error('Error restarting speech recognition:', error)
            setIsListening(false)
            shouldContinueListeningRef.current = false
          }
        }
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
    }
  }, [value, onChange, showVoiceButtons])

  useEffect(() => {
    if (!isListening) {
      baseValueRef.current = value || ''
      finalTranscriptRef.current = ''
    }
  }, [value, isListening])

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not available in your browser. Please use Chrome, Edge, or Safari.')
      return
    }

    try {
      baseValueRef.current = value || ''
      finalTranscriptRef.current = ''
      setInterimText('')
      shouldContinueListeningRef.current = true
      recognitionRef.current.start()
      setIsListening(true)
    } catch (error: any) {
      console.error('Error starting speech recognition:', error)
      shouldContinueListeningRef.current = false
      if (error.name === 'InvalidStateError') {
        setIsListening(false)
      } else {
        alert('Error starting speech recognition. Please try again.')
      }
    }
  }

  const stopListening = () => {
    shouldContinueListeningRef.current = false
    setIsListening(false)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error('Error stopping speech recognition:', error)
      }
    }
    setInterimText('')
  }

  const handlePolishText = async () => {
    if (!value || !value.trim()) {
      alert('Please enter some text to polish.')
      return
    }

    setIsPolishing(true)
    try {
      const response = await fetch('/api/ai/polish-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: value }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to polish text')
      }

      const data = await response.json()
      if (data.success && data.polished_text) {
        onChange({ target: { value: data.polished_text } } as React.ChangeEvent<HTMLTextAreaElement>)
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error: any) {
      console.error('Error polishing text:', error)
      const msg = String(error?.message || 'Failed to polish text. Please check your OpenAI API key is configured.')
      const safeMsg = msg.replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-***')
      alert(safeMsg)
    } finally {
      setIsPolishing(false)
    }
  }

  const displayValue = (value || '') + (interimText || '')

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={displayValue}
        onChange={onChange}
        disabled={disabled}
        className={className}
        rows={expanded ? Math.max(defaultRows, lineCount) : defaultRows}
      />
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {showVoiceButtons && !disabled && (
          <>
            {!isListening ? (
              <button
                type="button"
                onClick={startListening}
                className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded disabled:opacity-50 transition-colors flex items-center gap-1"
                title="Start voice input (Talk to TXT)"
              >
                🎤 Talk to TXT
              </button>
            ) : (
              <button
                type="button"
                onClick={stopListening}
                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded disabled:opacity-50 transition-colors flex items-center gap-1"
                title="Stop voice input"
              >
                ⏹ Stop
              </button>
            )}
            <button
              type="button"
              onClick={handlePolishText}
              disabled={isPolishing || !value || !value.trim()}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded disabled:opacity-50 transition-colors flex items-center gap-1"
              title="AI Polish - Fix grammar, spelling, and improve style"
            >
              {isPolishing ? '⏳ Polishing...' : '✨ AI Polish'}
            </button>
          </>
        )}
        {needsExpansion && (
          <button
            type="button"
            onClick={() => onToggle(expandKey)}
            className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded disabled:opacity-50 transition-colors"
            disabled={disabled}
          >
            {expanded ? '▲ Show Less' : '▼ Show More'}
          </button>
        )}
      </div>
    </div>
  )
}

interface BusinessProfileData {
  name: string
  title: string
  bio: string
  avatar_path?: string | null
  banner_path?: string | null
  sectionOrder?: string[]
  introVideoId?: number | null
  socialLinks: Array<{
    platform: string
    url: string
  }>
  skills: string[]
  cultureDecisions: string
  cultureFeedback: string
  cultureConflict: string
  cultureSuccess: string
  experience: Array<{
    company: string
    title: string
    startDate: string
    endDate: string
    description: string
  }>
  education: Array<{
    institution: string
    degree: string
    field: string
    year: string
    attachmentIds?: number[]
  }>
  referees: Array<{
    name: string
    relationship: string
    company: string
    title: string
    email: string
    phone: string
    notes: string
    attachmentIds?: number[]
  }>
  attachments: Array<{
    id: number
    title: string
    item_type: string
    file_path: string | null
    file_type: string | null
    url: string | null
  }>
  projects: Array<{
    name: string
    description: string
    url: string
    attachmentIds?: number[]
  }>
}

interface BusinessBankItem {
  id: number
  item_type: string
  title: string
  metadata?: any
  file_path?: string | null
  file_url?: string | null
  file_type?: string | null
  created_at?: string
}

type ImportTab = 'upload' | 'link' | 'bank'

interface LocalImportItem {
  id: string
  source: 'upload' | 'link'
  title: string
  item_type: string
  file_path?: string | null
  file_type?: string | null
  url?: string | null
  previewUrl?: string | null
  status: 'ready' | 'uploading' | 'error'
  error?: string | null
  created_at?: string
  savedToBank?: boolean
  attachmentId?: number
}

type BusinessProductsOverview = {
  id?: number
  short_headline: string
  summary: string
  primary_industries: string[]
  business_model: string
  is_public: boolean
}

type BusinessProductMedia = {
  id?: number
  media_type: string
  title: string
  file_path?: string | null
  file_url?: string | null
  file_type?: string | null
  order_index: number
}

type BusinessProductImpact = {
  who_it_helps: string
  what_it_improves: string
  real_world_outcomes: string
}

type BusinessProductSignals = {
  we_are_hiring_for_this: boolean
  open_to_partnerships: boolean
  in_research_and_development: boolean
  currently_scaling: boolean
}

type BusinessProductCard = {
  id?: number
  name: string
  category: string
  short_description: string
  who_it_is_for: string
  problem_it_solves: string
  logo_or_icon: string
  explainer_video_url: string
  external_link: string
  lifecycle_stage: string
  order_index: number
  is_published: boolean
  visibility_level: string
  roles: string[]
  skills: string[]
  teams: string[]
  growth_areas: string[]
  media: BusinessProductMedia[]
  impact: BusinessProductImpact
  signals: BusinessProductSignals
}

type BusinessProductRoadmap = {
  id?: number
  upcoming_products: string[]
  roadmap_ideas: string
  expansion_plans: string
  new_markets: string
  is_public: boolean
}

export default function BusinessProfileEditor() {
  const router = useRouter()
  const DEFAULT_SECTION_ORDER = ['intro', 'social', 'skills', 'experience', 'projects', 'attachments'] as const
  type SectionKey = (typeof DEFAULT_SECTION_ORDER)[number]
  const SOCIAL_PLATFORMS = [
    'LinkedIn',
    'GitHub',
    'YouTube',
    'X',
    'Instagram',
    'Facebook',
    'TikTok',
    'Behance',
    'Dribbble',
    'Website',
  ] as const
  const [profile, setProfile] = useState<BusinessProfileData>({
    name: '',
    title: '',
    bio: '',
    avatar_path: null,
    banner_path: null,
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    introVideoId: null,
    socialLinks: [],
    skills: [],
    cultureDecisions: '',
    cultureFeedback: '',
    cultureConflict: '',
    cultureSuccess: '',
    experience: [],
    education: [],
    referees: [],
    attachments: [],
    projects: []
  })

  const [industryOpen, setIndustryOpen] = useState(false)
  const [industryActiveIdx, setIndustryActiveIdx] = useState(0)
  const industrySuggestions = useMemo(() => {
    const q = String(profile.title || '').trim().toLowerCase()
    if (!q) return INDUSTRY_OPTIONS.slice(0, 8) as unknown as string[]
    return INDUSTRY_OPTIONS.filter((x) => x.toLowerCase().includes(q)).slice(0, 8) as unknown as string[]
  }, [profile.title])

  const [newSkill, setNewSkill] = useState('')
  type BulkSection = 'skills' | 'experience' | 'education' | 'referees' | 'attachments' | 'projects'
  const [bulkSel, setBulkSel] = useState<Record<BulkSection, Record<string, boolean>>>({
    skills: {},
    experience: {},
    education: {},
    referees: {},
    attachments: {},
    projects: {},
  })
  const [sectionEdit, setSectionEdit] = useState<Record<string, boolean>>({
    basic: true,
    social: true,
    skills: true,
    products_services: true,
    experience: true,
    education: true,
    referees: true,
    attachments: true,
    projects: true,
  })
  const [savingSection, setSavingSection] = useState<string | null>(null)
  // Section visibility for public view (default all sections visible)
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({
    basic: true,
    social: true,
    skills: true,
    experience: true,
    education: true,
    referees: true,
    attachments: true,
    projects: true,
  })
  // Individual item visibility (for social links, experience entries, education entries, etc.)
  const [itemVisibility, setItemVisibility] = useState<Record<string, Record<number, boolean>>>({
    social: {},
    experience: {},
    education: {},
    referees: {},
    projects: {},
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [availableItems, setAvailableItems] = useState<BusinessBankItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const [importTab, setImportTab] = useState<ImportTab>('upload')
  const [localImportItems, setLocalImportItems] = useState<LocalImportItem[]>([])
  const [importDragActive, setImportDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [linkInput, setLinkInput] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null)
  const tempAttachmentIdRef = useRef(-1)
  const imageUploadRef = useRef<HTMLInputElement | null>(null)
  const videoUploadRef = useRef<HTMLInputElement | null>(null)
  const docUploadRef = useRef<HTMLInputElement | null>(null)
  const replaceUploadRef = useRef<HTMLInputElement | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [websiteImportUrl, setWebsiteImportUrl] = useState('')
  const [websiteImportLoading, setWebsiteImportLoading] = useState(false)
  const [websiteImportError, setWebsiteImportError] = useState<string | null>(null)
  const [websiteImportResult, setWebsiteImportResult] = useState<any | null>(null)
  const [websiteImportOpen, setWebsiteImportOpen] = useState(false)
  const [projectImportOpen, setProjectImportOpen] = useState(false)
  const [activeProjectIndex, setActiveProjectIndex] = useState<number | null>(null)
  const [projectSelectedIds, setProjectSelectedIds] = useState<Record<number, boolean>>({})
  const [educationImportOpen, setEducationImportOpen] = useState(false)
  const [activeEducationIndex, setActiveEducationIndex] = useState<number | null>(null)
  const [educationSelectedIds, setEducationSelectedIds] = useState<Record<number, boolean>>({})
  const [refereeImportOpen, setRefereeImportOpen] = useState(false)
  const [activeRefereeIndex, setActiveRefereeIndex] = useState<number | null>(null)
  const [refereeSelectedIds, setRefereeSelectedIds] = useState<Record<number, boolean>>({})
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})
  const [tbItemCache, setTbItemCache] = useState<Record<number, BusinessBankItem>>({})
  const [preview, setPreview] = useState<
    | { kind: 'image'; url: string; title: string }
    | { kind: 'video'; url: string; title: string }
    | null
  >(null)

  const [layoutDragIndex, setLayoutDragIndex] = useState<number | null>(null)
  const [layoutExpanded, setLayoutExpanded] = useState(false)
  const [introModalOpen, setIntroModalOpen] = useState(false)
  
  // Track expanded state for textareas (key format: "section-index" or "section")
  const [expandedTextareas, setExpandedTextareas] = useState<Record<string, boolean>>({})
  
  // Helper function to toggle textarea expansion
  const toggleTextarea = (key: string) => {
    setExpandedTextareas(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const [introItems, setIntroItems] = useState<BusinessBankItem[]>([])
  const [introPickId, setIntroPickId] = useState<number | null>(null)
  const [introPreviewUrl, setIntroPreviewUrl] = useState<string | null>(null)
  const introPreviewVideoIdRef = useRef<number | null>(null) // Track which video ID the preview URL is for

  // Share configuration and template selection state
  const [shareConfig, setShareConfig] = useState<ShareConfig | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId | null>(null)
  const [businessProfileId, setBusinessProfileId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Intent Mode (Business)
  const [intentMode, setIntentMode] = useState(defaultBusinessIntent)
  const [intentLoaded, setIntentLoaded] = useState(false)
  const [intentSaving, setIntentSaving] = useState(false)
  const [intentError, setIntentError] = useState<string | null>(null)
  const [intentCollapsed, setIntentCollapsed] = useState(true)
  const [intentRecordId, setIntentRecordId] = useState<string | null>(null)
  const intentOriginalRef = useRef<any>(null)

  const [productsOverview, setProductsOverview] = useState<BusinessProductsOverview>({
    short_headline: '',
    summary: '',
    primary_industries: [],
    business_model: 'Other',
    is_public: true,
  })
  const [productsRoadmap, setProductsRoadmap] = useState<BusinessProductRoadmap>({
    upcoming_products: [],
    roadmap_ideas: '',
    expansion_plans: '',
    new_markets: '',
    is_public: true,
  })
  const [productCards, setProductCards] = useState<BusinessProductCard[]>([])
  const [productLoading, setProductLoading] = useState(false)
  const [productSaving, setProductSaving] = useState(false)
  const [productError, setProductError] = useState<string | null>(null)
  const [deletedProductIds, setDeletedProductIds] = useState<number[]>([])
  const [productDragIndex, setProductDragIndex] = useState<number | null>(null)
  const [productInputs, setProductInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    // Load existing saved profile (if present)
    loadSavedPortfolio()
    
    // Reload template ID when component mounts or when returning from template selection
    const reloadTemplateId = async () => {
      try {
        const uid = await getUserId()
        if (!uid) return
        
        const { data } = await supabase
          .from('business_bank_items')
          .select('metadata')
          .eq('user_id', uid)
          .eq('item_type', 'profile')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (data?.metadata && (data.metadata as any).selected_template_id) {
          setSelectedTemplateId((data.metadata as any).selected_template_id)
        }
      } catch (error) {
        console.error('Error reloading template ID:', error)
      }
    }
    
    reloadTemplateId()
    
    // Reload template ID when page becomes visible (user returns from template selection)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reloadTemplateId()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Load talent profile ID and user ID
    async function loadProfileIds() {
      const uid = await getUserId()
      if (!uid) return
      setUserId(uid)
      
      const { data } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', uid)
        .maybeSingle()
      
      if (data) setBusinessProfileId(data.id)
    }
    loadProfileIds()
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!businessProfileId || !userId) return
    loadProductsServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessProfileId, userId])

  useEffect(() => {
    if (!userId || !businessProfileId || intentLoaded) return
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('intent_modes')
          .select('id,intent_status,visibility,constraints')
          .eq('profile_type', 'business')
          .eq('profile_id', businessProfileId)
          .maybeSingle()
        if (error) throw error
        if (!cancelled && data) {
          const constraints = (data as any).constraints || {}
          setIntentRecordId(data.id)
          const next = {
            intent_status: (data.intent_status || 'not_hiring') as BusinessIntentStatus,
            visibility: !!data.visibility,
            capability_needs: Array.isArray(constraints.capability_needs) ? constraints.capability_needs.join(', ') : (constraints.capability_needs || ''),
            time_horizon: constraints.time_horizon || '',
            location_reality: constraints.location_reality || '',
            engagement_type: constraints.engagement_type || '',
          }
          setIntentMode(next)
          intentOriginalRef.current = { ...next }
        }
        if (!cancelled) setIntentLoaded(true)
      } catch (err: any) {
        if (!cancelled) {
          setIntentError(err.message || 'Failed to load intent mode')
          setIntentLoaded(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, businessProfileId, intentLoaded])

  useEffect(() => {
    if (websiteImportUrl.trim()) return
    const link = (profile.socialLinks || []).find((s) => String(s?.platform || '').toLowerCase() === 'website')
    if (link?.url) setWebsiteImportUrl(String(link.url))
  }, [profile.socialLinks, websiteImportUrl])

  const parseCsv = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  const saveIntentMode = async () => {
    if (!userId || !businessProfileId) return
    setIntentSaving(true)
    setIntentError(null)
    try {
      const constraints = {
        capability_needs: parseCsv(intentMode.capability_needs),
        time_horizon: intentMode.time_horizon,
        location_reality: intentMode.location_reality,
        engagement_type: intentMode.engagement_type,
      }

      const { data, error } = await supabase
        .from('intent_modes')
        .upsert(
          {
            id: intentRecordId || undefined,
            user_id: userId,
            profile_type: 'business',
            profile_id: businessProfileId,
            intent_status: intentMode.intent_status,
            visibility: intentMode.visibility,
            constraints,
          },
          { onConflict: 'profile_type,profile_id' }
        )
        .select('id')
        .maybeSingle()

      if (error) throw error

      const intentId = data?.id || intentRecordId
      if (intentId) setIntentRecordId(intentId)

      const events: Array<{ intent_id: string | null; user_id: string; profile_type: string; profile_id: string; event_type: string }> = []
      const prev = intentOriginalRef.current
      if (!prev) {
        events.push({ intent_id: intentId || null, user_id: userId, profile_type: 'business', profile_id: businessProfileId, event_type: 'intent_created' })
      } else {
        events.push({ intent_id: intentId || null, user_id: userId, profile_type: 'business', profile_id: businessProfileId, event_type: 'intent_updated' })
        if (prev.visibility !== intentMode.visibility) {
          events.push({ intent_id: intentId || null, user_id: userId, profile_type: 'business', profile_id: businessProfileId, event_type: 'intent_visibility_changed' })
        }
      }

      if (events.length) {
        await supabase.from('intent_events').insert(events)
      }

      intentOriginalRef.current = { ...intentMode }

      // #region agent log
      emitDebugLog({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H9',location:'BusinessProfileEditor.tsx:intent-save',message:'intent mode saved',data:{intentId,visibility:intentMode.visibility,intent_status:intentMode.intent_status},timestamp:Date.now()})
      // #endregion
    } catch (err: any) {
      setIntentError(err.message || 'Failed to save intent mode')
    } finally {
      setIntentSaving(false)
    }
  }

  // Ensure we have an intro video preview URL even if it was previously saved (without opening the picker modal).
  useEffect(() => {
    let cancelled = false
    async function loadIntroPreview() {
      const id = typeof profile.introVideoId === 'number' ? profile.introVideoId : null
      if (!id) {
        if (!cancelled) {
          setIntroPreviewUrl(null)
          introPreviewVideoIdRef.current = null
        }
        return
      }
      
      // If we already have a preview URL for this video ID, don't reload
      if (introPreviewUrl && introPreviewVideoIdRef.current === id) {
        return
      }
      
      const uid = await getUserId()
      if (!uid) return
      const row = await supabase
        .from('business_bank_items')
        .select('id,file_path,file_url,title,file_type')
        .eq('user_id', uid)
        .eq('id', id)
        .maybeSingle()
      const item = row.data as any
      if (!item) {
        if (!cancelled) {
          setIntroPreviewUrl(null)
          introPreviewVideoIdRef.current = null
        }
        return
      }
      
      // For uploaded/recorded videos, use file_path to get signed URL
      if (item.file_path) {
        const { data: urlData } = await supabase.storage.from('business-bank').createSignedUrl(item.file_path, 60 * 30)
        if (!cancelled) {
          setIntroPreviewUrl(urlData?.signedUrl ?? null)
          introPreviewVideoIdRef.current = id
        }
      }
      // For linked videos, use file_url directly
      else if (item.file_url) {
        if (!cancelled) {
          setIntroPreviewUrl(item.file_url)
          introPreviewVideoIdRef.current = id
        }
      } else {
        if (!cancelled) {
          setIntroPreviewUrl(null)
          introPreviewVideoIdRef.current = null
        }
      }
    }
    loadIntroPreview().catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.introVideoId])

  function LivePreview() {
    const order = Array.isArray(profile.sectionOrder) ? profile.sectionOrder : [...DEFAULT_SECTION_ORDER]
    const social = Array.isArray(profile.socialLinks) ? profile.socialLinks.filter((s) => (s?.url || '').trim()) : []

    const [bioExpanded, setBioExpanded] = useState(false)
    const [skillsExpanded, setSkillsExpanded] = useState(false)
    const [expListExpanded, setExpListExpanded] = useState(false)
    const [eduListExpanded, setEduListExpanded] = useState(false)
    const [projListExpanded, setProjListExpanded] = useState(false)
    const [refListExpanded, setRefListExpanded] = useState(false)
    const [expExpanded, setExpExpanded] = useState<Record<number, boolean>>({})
    const [eduExpanded, setEduExpanded] = useState<Record<number, boolean>>({})
    const [projExpanded, setProjExpanded] = useState<Record<number, boolean>>({})
    const [refExpanded, setRefExpanded] = useState<Record<number, boolean>>({})

    const clampStyle = (lines = 5) => ({
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical' as const,
      WebkitLineClamp: lines,
      overflow: 'hidden',
    })

    const normalizeDisplayText = (s: string) =>
      String(s || '')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    const openSocial = (url: string) => {
      const u = String(url || '').trim()
      if (!u) return
      const href = /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, '')}`
      window.open(href, '_blank')
    }

    return (
      <div className="min-h-[70vh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40">
          <div className="h-44 md:h-56 bg-slate-900 relative">
            {bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-80" />
            ) : (
              <div className="w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.35),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.25),transparent_45%)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
          </div>
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end gap-5">
              <div className="-mt-16 md:-mt-20 shrink-0">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-xl">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-2xl">
                      {(profile.name || 'T').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold truncate">{profile.name || 'Your Name'}</h1>
                  <p className="text-slate-300 mt-1">{profile.title || 'Your Title'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-12 gap-6 mt-6">
          <div className="lg:col-span-8 space-y-6">
            <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <div className="text-slate-300 whitespace-pre-wrap" style={bioExpanded ? undefined : clampStyle(5)}>
                {normalizeDisplayText(profile.bio) || 'Add a short bio…'}
              </div>
              {normalizeDisplayText(profile.bio).length > 0 ? (
                <button
                  type="button"
                  className="mt-2 text-blue-300 hover:text-blue-200 text-sm font-medium"
                  onClick={() => setBioExpanded((v) => !v)}
                >
                  {bioExpanded ? 'Show less' : 'Show more'}
                </button>
              ) : null}
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Intent Mode</h2>
                  <p className="text-sm text-slate-300">
                    Share what you are open to right now, with clear boundaries and visibility control.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIntentCollapsed((v) => !v)}
                  className="text-sm text-blue-300 hover:text-blue-200"
                >
                  {intentCollapsed ? 'Expand' : 'Collapse'}
                </button>
              </div>

              {!intentCollapsed && (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      id="intent-visibility-business"
                      type="checkbox"
                      className="accent-blue-500"
                      checked={intentMode.visibility}
                      onChange={(e) => setIntentMode((p) => ({ ...p, visibility: e.target.checked }))}
                    />
                    <label htmlFor="intent-visibility-business" className="text-sm text-slate-200">
                      Visibility on (share intent signal in discovery)
                    </label>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Intent status</label>
                      <select
                        value={intentMode.intent_status}
                        onChange={(e) => setIntentMode((p) => ({ ...p, intent_status: e.target.value as BusinessIntentStatus }))}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
                      >
                        <option value="actively_building_talent">Actively building talent</option>
                        <option value="future_planning">Future planning</option>
                        <option value="not_hiring">Not hiring</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Engagement type</label>
                      <select
                        value={intentMode.engagement_type}
                        onChange={(e) => setIntentMode((p) => ({ ...p, engagement_type: e.target.value as BusinessEngagementType }))}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Select</option>
                        <option value="hire">Hire</option>
                        <option value="contract">Contract</option>
                        <option value="advisory">Advisory</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Time horizon</label>
                      <select
                        value={intentMode.time_horizon}
                        onChange={(e) => setIntentMode((p) => ({ ...p, time_horizon: e.target.value as BusinessTimeHorizon }))}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Select</option>
                        <option value="now">Now</option>
                        <option value="near">Near</option>
                        <option value="future">Future</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Location reality</label>
                      <select
                        value={intentMode.location_reality}
                        onChange={(e) => setIntentMode((p) => ({ ...p, location_reality: e.target.value as BusinessLocationReality }))}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Select</option>
                        <option value="on_site">On-site</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="remote">Remote</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Capability needs (comma-separated)</label>
                    <input
                      value={intentMode.capability_needs}
                      onChange={(e) => setIntentMode((p) => ({ ...p, capability_needs: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
                      placeholder="e.g., product design, data engineering"
                    />
                  </div>

                  {intentError && (
                    <div className="text-sm text-red-300">{intentError}</div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={saveIntentMode}
                      disabled={intentSaving}
                      className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-60"
                    >
                      {intentSaving ? 'Saving...' : 'Save Intent Mode'}
                    </button>
                    <span className="text-xs text-slate-400">
                      You can turn this off any time without affecting your profile.
                    </span>
                  </div>
                </div>
              )}
            </section>

            {introPreviewUrl ? (
              <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
                <h2 className="text-xl font-semibold mb-4">Introduction Video</h2>
                <div className="mx-auto max-w-3xl">
                  <div className="rounded-3xl p-[1px] bg-gradient-to-br from-white/15 via-white/5 to-transparent shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                    <div className="rounded-3xl overflow-hidden bg-slate-950/60 border border-white/10">
                      <div className="bg-black">
                        {(() => {
                          // Check if it's a YouTube URL
                          const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
                          const youtubeMatch = introPreviewUrl.match(youtubeRegex)
                          if (youtubeMatch) {
                            const videoId = youtubeMatch[1]
                            return (
                              <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                className="w-full aspect-video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            )
                          }
                          // Check if it's a Vimeo URL
                          const vimeoRegex = /(?:vimeo\.com\/)(\d+)/
                          const vimeoMatch = introPreviewUrl.match(vimeoRegex)
                          if (vimeoMatch) {
                            const videoId = vimeoMatch[1]
                            return (
                              <iframe
                                src={`https://player.vimeo.com/video/${videoId}`}
                                className="w-full aspect-video"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                              />
                            )
                          }
                          // Regular video URL
                          return (
                            <video src={introPreviewUrl} controls playsInline className="w-full max-h-[280px] object-contain" />
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {order.map((k) => {
              if (k === 'intro' || k === 'social') return null
              // Job Vacancies is intentionally rendered in the right column under "Connect With Me"
              if (k === 'projects') return null
              if (k === 'skills') {
                const collapsed = (profile.skills || []).slice(0, 20)
                const show = skillsExpanded ? (profile.skills || []) : collapsed
                return (
                  <section key={k} className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
                    <h2 className="text-xl font-semibold mb-2">Products and Services</h2>
                    <p className="text-slate-400 text-sm mb-4">
                      Provide a detailed description of what you offer, including customer testimonials or case studies.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {show.map((s, idx) => (
                        <span key={`${s}-${idx}`} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200 text-sm">
                          {s}
                        </span>
                      ))}
                      {!profile.skills?.length ? <div className="text-slate-400 text-sm">No products and services yet.</div> : null}
                    </div>
                    {(profile.skills || []).length > collapsed.length ? (
                      <button
                        type="button"
                        className="mt-3 text-blue-300 hover:text-blue-200 text-sm font-medium"
                        onClick={() => setSkillsExpanded((v) => !v)}
                      >
                        {skillsExpanded ? 'Show less' : 'Show more'}
                      </button>
                    ) : null}
                  </section>
                )
              }
              if (k === 'experience') {
                const list = expListExpanded ? (profile.experience || []) : (profile.experience || []).slice(0, 2)
                return (
                  <section key={k} className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
                    <h2 className="text-xl font-semibold mb-4">Experience</h2>
                    {list.map((e, idx) => (
                      <div key={idx} className="rounded-xl border border-white/10 bg-slate-900/40 p-4 mb-3">
                        <div className="font-semibold">{e.title || 'Role'}</div>
                        <div className="text-slate-300 text-sm mt-1">{e.company || 'Company'}</div>
                        {normalizeDisplayText(e.description || '') ? (
                          <div className="mt-3">
                            <div className="text-slate-300 text-sm whitespace-pre-wrap" style={expExpanded[idx] ? undefined : clampStyle(5)}>
                              {normalizeDisplayText(e.description || '')}
                            </div>
                            <button
                              type="button"
                              className="mt-2 text-blue-300 hover:text-blue-200 text-sm font-medium"
                              onClick={() => setExpExpanded((p) => ({ ...p, [idx]: !p[idx] }))}
                            >
                              {expExpanded[idx] ? 'Show less' : 'Show more'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {!profile.experience?.length ? <div className="text-slate-400 text-sm">No experience yet.</div> : null}
                    {(profile.experience || []).length > 2 ? (
                      <button
                        type="button"
                        className="mt-2 text-blue-300 hover:text-blue-200 text-sm font-medium"
                        onClick={() => setExpListExpanded((v) => !v)}
                      >
                        {expListExpanded ? 'Show fewer roles' : 'Show all roles'}
                      </button>
                    ) : null}
                  </section>
                )
              }
              if (k === 'attachments') {
                return (
                  <section key={k} className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
                    <h2 className="text-xl font-semibold mb-4">Attachments</h2>
                    {Array.isArray(profile.attachments) && profile.attachments.length ? (
                      <div className="space-y-2">
                        {profile.attachments.slice(0, 6).map((a) => (
                          <div key={a.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm text-slate-200 truncate">{a.title}</div>
                              <div className="text-xs text-slate-400 truncate">{a.item_type}</div>
                            </div>
                            {a.file_path ? (
                              <button type="button" className="text-xs text-blue-300 underline" onClick={() => openFilePath(a.file_path!)}>
                                Open
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-sm">No attachments yet.</div>
                    )}
                  </section>
                )
              }
              return null
            })}
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <div className="text-slate-200 font-semibold mb-4">Connect With Me</div>
              {social.length ? (
                <div className="space-y-2">
                  {social.slice(0, 8).map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
                      onClick={() => openSocial(String(s.url))}
                    >
                      <div className="text-sm font-semibold text-slate-200">{String(s.platform)}</div>
                      <div className="text-xs text-slate-400 break-all">{String(s.url)}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-sm">No social links yet.</div>
              )}
            </div>

            {/* Job Vacancies under Connect With Me (to fill the right column beside Intro Video) */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-slate-200 font-semibold">Job Vacancies</div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard/business/jobs/create"
                    className="text-blue-300 hover:text-blue-200 text-sm font-medium underline"
                  >
                    Post a Job
                  </Link>
                  {(profile.projects || []).length > 2 ? (
                    <button
                      type="button"
                      className="text-blue-300 hover:text-blue-200 text-sm font-medium"
                      onClick={() => setProjListExpanded((v) => !v)}
                    >
                      {projListExpanded ? 'Show less' : 'Show all'}
                    </button>
                  ) : null}
                </div>
              </div>

              {(profile.projects || []).length ? (
                <div className="space-y-3">
                  {(projListExpanded ? (profile.projects || []) : (profile.projects || []).slice(0, 2)).map((p, idx) => (
                    <div key={idx} className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
                      <div className="font-semibold">{p.name || 'Project'}</div>
                      {p.url ? (
                        <div className="text-blue-300 text-sm mt-1 break-all">{p.url}</div>
                      ) : null}
                      {normalizeDisplayText(p.description || '') ? (
                        <div className="mt-3">
                          <div className="text-slate-300 text-sm whitespace-pre-wrap" style={projExpanded[idx] ? undefined : clampStyle(5)}>
                            {normalizeDisplayText(p.description || '')}
                          </div>
                          <button
                            type="button"
                            className="mt-2 text-blue-300 hover:text-blue-200 text-sm font-medium"
                            onClick={() => setProjExpanded((q) => ({ ...q, [idx]: !q[idx] }))}
                          >
                            {projExpanded[idx] ? 'Show less' : 'Show more'}
                          </button>
                        </div>
                      ) : null}

                      {Array.isArray((p as any)?.attachmentIds) && (p as any).attachmentIds.length ? (
                        <div className="mt-4">
                          <div className="text-xs text-slate-400 mb-2">
                            Attached files: <span className="text-slate-200 font-semibold">{(p as any).attachmentIds.length}</span>
                          </div>
                          <div className="space-y-2">
                            {(p as any).attachmentIds.slice(0, 3).map((id: any) => (
                              <ProjectAttachmentChip key={id} id={Number(id)} onRemove={() => {}} />
                            ))}
                            {(p as any).attachmentIds.length > 3 ? (
                              <div className="text-xs text-slate-400 px-1">+{(p as any).attachmentIds.length - 3} more…</div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-sm">
                  No job vacancies posted yet.{' '}
                  <Link href="/dashboard/business/jobs/create" className="text-blue-300 hover:text-blue-200 underline">
                    Post a Job
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    )
  }

  async function log(message: string, hypothesisId: string, data: any) {
    fetch('/api/debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'run-profile',
        hypothesisId,
        location: 'src/components/BusinessProfileEditor.tsx',
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }

  async function getUserId() {
    const { data } = await supabase.auth.getSession()
    return data.session?.user?.id ?? null
  }

  const anySectionEditing = useMemo(() => Object.values(sectionEdit).some(Boolean), [sectionEdit])
  const localUploadItems = useMemo(() => localImportItems.filter((item) => item.source === 'upload'), [localImportItems])
  const localLinkItems = useMemo(() => localImportItems.filter((item) => item.source === 'link'), [localImportItems])
  const hasSelectedImportItems = useMemo(() => Object.values(selectedIds).some(Boolean), [selectedIds])

  async function ensureUsersRow(userId: string): Promise<boolean> {
    // Business Bank schema FK requires public.users(id) exist with a non-null role.
    // This function attempts to create/upsert a row in public.users for the current user.
    try {
      const isMissingColErr = (err: any) => {
        const msg = String(err?.message ?? '')
        const code = String(err?.code ?? '')
        return code === 'PGRST204' || /Could not find the .* column/i.test(msg)
      }

      // Determine which self column exists (id vs user_id) with minimal noise.
      let selfCol: 'id' | 'user_id' = 'id'
      const checkId = await supabase.from('users').select('id').eq('id', userId).maybeSingle()
      if (checkId.error && isMissingColErr(checkId.error)) {
        selfCol = 'user_id'
      } else if (!checkId.error && checkId.data) {
        return true
      }

      if (selfCol === 'user_id') {
        const checkUserId = await supabase.from('users').select('user_id').eq('user_id', userId).maybeSingle()
        if (!checkUserId.error && checkUserId.data) return true
      }

      // Get user email from auth session for the insert
      const { data: sessionData } = await supabase.auth.getSession()
      const userEmail = sessionData?.session?.user?.email || ''
      
      // Try INSERT first (more likely to work with RLS), then UPDATE if it already exists
      if (selfCol === 'id') {
        // Try INSERT first with email and role (role is required NOT NULL)
        const insertRes = await supabase.from('users').insert({ id: userId, email: userEmail, role: 'talent' } as any)
        if (!insertRes.error) return true
        
        // If insert fails due to conflict, try UPDATE
        if (insertRes.error && (insertRes.error as any)?.code === '23505') {
          const updateRes = await supabase.from('users').update({ id: userId } as any).eq('id', userId)
          if (!updateRes.error) return true
        }
        
        // If column doesn't exist, try user_id
        if (isMissingColErr(insertRes.error)) {
          const r2 = await supabase.from('users').insert({ user_id: userId, email: userEmail, role: 'talent' } as any)
          if (!r2.error) return true
          if (r2.error && (r2.error as any)?.code === '23505') {
            const updateRes2 = await supabase.from('users').update({ user_id: userId } as any).eq('user_id', userId)
            if (!updateRes2.error) return true
          }
        }
      } else {
        // Try INSERT first with user_id, email, and role
        const insertRes = await supabase.from('users').insert({ user_id: userId, email: userEmail, role: 'talent' } as any)
        if (!insertRes.error) return true
        
        // If insert fails due to conflict, try UPDATE
        if (insertRes.error && (insertRes.error as any)?.code === '23505') {
          const updateRes = await supabase.from('users').update({ user_id: userId } as any).eq('user_id', userId)
          if (!updateRes.error) return true
        }
        
        // If column doesn't exist, try id
        if (isMissingColErr(insertRes.error)) {
          const r2 = await supabase.from('users').insert({ id: userId, email: userEmail, role: 'talent' } as any)
          if (!r2.error) return true
          if (r2.error && (r2.error as any)?.code === '23505') {
            const updateRes2 = await supabase.from('users').update({ id: userId } as any).eq('id', userId)
            if (!updateRes2.error) return true
          }
        }
      }
      
      // If all attempts failed, check if it's an RLS issue
      const lastError = await supabase.from('users').select('id').eq('id', userId).maybeSingle()
      if (lastError.error) {
        const errorMsg = String((lastError.error as any)?.message ?? '')
        if (errorMsg.includes('policy') || errorMsg.includes('RLS') || errorMsg.includes('row-level security')) {
          console.error('RLS policy issue: Migration 2025122208_users_self_row.sql may not have been run')
          return false
        }
      }
      
      return false
    } catch (error) {
      console.error('ensureUsersRow exception:', error)
      return false
    }
  }

  function fileExt(title: string) {
    const m = title.toLowerCase().match(/\.([a-z0-9]+)$/)
    return m?.[1] ?? ''
  }

  const bankKey = (id: number) => `bank-${id}`
  const localKey = (id: string) => `local-${id}`

  const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
  const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm'])
  const ALLOWED_DOC_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])
  const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'pdf', 'doc', 'docx'])
  const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

  function allowedFileCategory(file: File) {
    if (ALLOWED_IMAGE_TYPES.has(file.type)) return 'image'
    if (ALLOWED_VIDEO_TYPES.has(file.type)) return 'video'
    if (ALLOWED_DOC_TYPES.has(file.type)) return 'doc'
    const ext = fileExt(file.name)
    if (ALLOWED_EXTENSIONS.has(ext)) {
      if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image'
      if (['mp4', 'webm'].includes(ext)) return 'video'
      if (['pdf', 'doc', 'docx'].includes(ext)) return 'doc'
    }
    return null
  }

  function normalizeUrl(input: string) {
    const raw = String(input || '').trim()
    if (!raw) return ''
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
    return `https://${raw}`
  }

  function isImageUrl(url: string) {
    return /\.(png|jpe?g|webp)(\?.*)?$/i.test(url)
  }

  function isVideoUrl(url: string) {
    return /\.(mp4|webm)(\?.*)?$/i.test(url)
  }

  const BUSINESS_MODEL_OPTIONS = ['B2B', 'B2C', 'SaaS', 'Retail', 'Marketplace', 'Agency', 'Other']
  const PRODUCT_CATEGORY_OPTIONS = ['Product', 'Service', 'Platform', 'Offering']
  const LIFECYCLE_OPTIONS = ['Idea', 'Beta', 'Live', 'Scaling']
  const VISIBILITY_OPTIONS = [
    { value: 'public_summary', label: 'Public summary' },
    { value: 'gated_detail', label: 'Gated detail' },
    { value: 'nda_only', label: 'NDA-only' },
    { value: 'confidential', label: 'Confidential' },
  ]

  const emptyImpact: BusinessProductImpact = {
    who_it_helps: '',
    what_it_improves: '',
    real_world_outcomes: '',
  }

  const emptySignals: BusinessProductSignals = {
    we_are_hiring_for_this: false,
    open_to_partnerships: false,
    in_research_and_development: false,
    currently_scaling: false,
  }

  function blankProductCard(orderIndex: number): BusinessProductCard {
    return {
      name: '',
      category: 'Product',
      short_description: '',
      who_it_is_for: '',
      problem_it_solves: '',
      logo_or_icon: '',
      explainer_video_url: '',
      external_link: '',
      lifecycle_stage: '',
      order_index: orderIndex,
      is_published: true,
      visibility_level: 'public_summary',
      roles: [],
      skills: [],
      teams: [],
      growth_areas: [],
      media: [],
      impact: { ...emptyImpact },
      signals: { ...emptySignals },
    }
  }

  function updateProductCard(index: number, patch: Partial<BusinessProductCard>) {
    setProductCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function updateProductListField(index: number, key: 'roles' | 'skills' | 'teams' | 'growth_areas', next: string[]) {
    updateProductCard(index, { [key]: next } as any)
  }

  function addProductCard() {
    setProductCards((prev) => [...prev, blankProductCard(prev.length)])
  }

  function removeProductCard(index: number) {
    setProductCards((prev) => {
      const next = [...prev]
      const removed = next.splice(index, 1)[0]
      if (removed?.id) setDeletedProductIds((ids) => [...ids, removed.id as number])
      return next.map((c, i) => ({ ...c, order_index: i }))
    })
  }

  function moveProductCard(from: number, to: number) {
    setProductCards((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((c, i) => ({ ...c, order_index: i }))
    })
  }

  function pushTag(list: string[], value: string) {
    const trimmed = value.trim()
    if (!trimmed) return list
    if (list.includes(trimmed)) return list
    return [...list, trimmed]
  }

  function removeTag(list: string[], value: string) {
    return list.filter((v) => v !== value)
  }

  async function uploadProductMedia(index: number, files: File[]) {
    setProductError(null)
    const uid = await getUserId()
    if (!uid) {
      setProductError('Please sign in to upload product media.')
      return
    }
    if (!files.length) return
    const nextMedia: BusinessProductMedia[] = []

    for (const file of files) {
      const category = allowedFileCategory(file)
      if (!category) {
        setProductError(`Unsupported file type: ${file.name}`)
        continue
      }
      const path = `business/${uid}/product-${crypto.randomUUID()}-${file.name}`
      const { error } = await supabase.storage.from('business-bank').upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      })
      if (error) {
        setProductError((error as any)?.message ?? 'Upload failed')
        continue
      }
      const { data } = await supabase.storage.from('business-bank').createSignedUrl(path, 60 * 30)
      const fileUrl = data?.signedUrl ?? null
      nextMedia.push({
        media_type: category === 'doc' ? 'document' : category,
        title: file.name,
        file_path: path,
        file_url: fileUrl,
        file_type: file.type || null,
        order_index: 0,
      })
    }

    if (nextMedia.length) {
      setProductCards((prev) =>
        prev.map((c, i) =>
          i === index
            ? { ...c, media: [...c.media, ...nextMedia].map((m, idx) => ({ ...m, order_index: idx })) }
            : c
        )
      )
    }
  }

  async function uploadProductLogo(index: number, file: File) {
    setProductError(null)
    const uid = await getUserId()
    if (!uid) {
      setProductError('Please sign in to upload a logo.')
      return
    }
    const category = allowedFileCategory(file)
    if (category !== 'image') {
      setProductError('Logo must be an image file.')
      return
    }
    const path = `business/${uid}/product-logo-${crypto.randomUUID()}-${file.name}`
    const { error } = await supabase.storage.from('business-bank').upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    })
    if (error) {
      setProductError((error as any)?.message ?? 'Upload failed')
      return
    }
    await ensureSignedUrl(path)
    updateProductCard(index, { logo_or_icon: path })
  }

  function addProductMediaLink(index: number, url: string) {
    const normalized = normalizeUrl(url)
    if (!normalized) return
    setProductCards((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              media: [
                ...c.media,
                {
                  media_type: 'link',
                  title: normalized,
                  file_url: normalized,
                  order_index: c.media.length,
                },
              ],
            }
          : c
      )
    )
  }

  function removeProductMedia(index: number, mediaIndex: number) {
    setProductCards((prev) =>
      prev.map((c, i) =>
        i === index
          ? { ...c, media: c.media.filter((_, idx) => idx !== mediaIndex).map((m, idx) => ({ ...m, order_index: idx })) }
          : c
      )
    )
  }

  function setProductInput(key: string, value: string) {
    setProductInputs((prev) => ({ ...prev, [key]: value }))
  }

  function commitProductTag(index: number, key: 'roles' | 'skills' | 'teams' | 'growth_areas', inputKey: string) {
    const value = productInputs[inputKey] || ''
    const current = productCards[index]?.[key] || []
    const next = pushTag(current, value)
    updateProductListField(index, key, next)
    setProductInput(inputKey, '')
  }

  async function ensureSignedUrl(path: string) {
    if (!path) return
    if (thumbUrls[path]) return
    const { data } = await supabase.storage.from('business-bank').createSignedUrl(path, 60 * 30)
    if (data?.signedUrl) setThumbUrls((prev) => ({ ...prev, [path]: data.signedUrl }))
  }

  function moveSection(from: number, to: number) {
    setProfile((prev) => {
      const order = Array.isArray(prev.sectionOrder) ? [...prev.sectionOrder] : [...DEFAULT_SECTION_ORDER]
      if (from < 0 || from >= order.length || to < 0 || to >= order.length) return prev
      const [moved] = order.splice(from, 1)
      order.splice(to, 0, moved)
      // #region agent log
      log('layout order changed', 'P_LAYOUT', { from, to, order }).catch(() => {})
      // #endregion agent log
      return { ...prev, sectionOrder: order }
    })
  }

  async function ensureMediaUrl(kind: 'avatar' | 'banner', path: string | null | undefined) {
    if (!path) return
    const { data, error } = await supabase.storage.from('business-bank').createSignedUrl(path, 60 * 30)
    await log('createSignedUrl media', 'P_MEDIA', {
      kind,
      hasError: !!error,
      errorMessage: (error as any)?.message ?? null,
      hasUrl: !!data?.signedUrl,
    })
    if (data?.signedUrl) {
      if (kind === 'avatar') setAvatarUrl(data.signedUrl)
      if (kind === 'banner') setBannerUrl(data.signedUrl)
    }
  }

  async function openFilePath(path: string) {
    const { data } = await supabase.storage.from('business-bank').createSignedUrl(path, 60 * 30)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function ensureTbItem(id: number) {
    if (!id) return
    if (tbItemCache[id]) return
    const uid = await getUserId()
    if (!uid) return
    const { data } = await supabase
      .from('business_bank_items')
      .select('id,item_type,title,metadata,file_path,file_type,created_at')
      .eq('user_id', uid)
      .eq('id', id)
      .maybeSingle()
    if (data?.id) {
      setTbItemCache((prev) => ({ ...prev, [id]: data as any }))
    }
  }

  function ThumbIcon({ label }: { label: string }) {
    return (
      <div className="w-[20mm] h-[20mm] rounded-lg border border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center">
        <div className="px-2 py-1 rounded border border-gray-200 bg-white text-[10px] font-semibold text-gray-700">
          {label}
        </div>
      </div>
    )
  }

  function MetaThumb({ kind, title }: { kind: string; title: string }) {
    const k = String(kind || '').toLowerCase()
    const badge =
      k === 'experience' ? 'EXP' :
      k === 'education' ? 'EDU' :
      k === 'credential' ? 'CERT' :
      k === 'social' ? 'SOC' :
      k === 'project' ? 'PROJ' :
      'ITEM'
    const icon =
      k === 'experience' ? '💼' :
      k === 'education' ? '🎓' :
      k === 'credential' ? '🏅' :
      k === 'social' ? '🔗' :
      k === 'project' ? '🧩' :
      '📄'

    return (
      <div className="w-[20mm] h-[20mm] rounded-lg border border-gray-300 bg-gradient-to-br from-gray-50 to-white overflow-hidden flex items-center justify-center shrink-0">
        <div className="text-center px-2">
          <div className="text-lg leading-none">{icon}</div>
          <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded border border-gray-200 bg-white text-[10px] font-semibold text-gray-700">
            {badge}
          </div>
          <div className="mt-1 text-[9px] text-gray-500 truncate max-w-[18mm]">{String(title || '').slice(0, 18)}</div>
        </div>
      </div>
    )
  }

  function PdfThumb({ url, title, onClick }: { url: string; title: string; onClick: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
      let cancelled = false
      async function render() {
        try {
          setErr(null)
          const pdfjsLib: any = await loadPdfJsLib()

          const loadingTask = pdfjsLib.getDocument({ url })
          const pdf = await loadingTask.promise
          const page = await pdf.getPage(1)

          const canvas = canvasRef.current
          if (!canvas || cancelled) return
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          const baseViewport = page.getViewport({ scale: 1 })
          const targetPx = 90 // roughly fits 20mm thumbnail
          const scale = targetPx / baseViewport.width
          const viewport = page.getViewport({ scale })

          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)

          await page.render({ canvasContext: ctx, viewport }).promise
        } catch (e: any) {
          if (!cancelled) setErr(e?.message ?? String(e))
        }
      }
      render()
      return () => {
        cancelled = true
      }
    }, [url])

    return (
      <button
        type="button"
        className="w-[20mm] h-[20mm] rounded-lg border border-gray-300 overflow-hidden bg-white shrink-0"
        onClick={onClick}
        title={title || 'Open PDF'}
      >
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          {err ? (
            <div className="text-[9px] text-gray-500">PDF</div>
          ) : (
            <canvas ref={canvasRef} className="w-full h-full object-contain" />
          )}
        </div>
      </button>
    )
  }

  function renderAttachmentThumb(a: BusinessProfileData['attachments'][number]) {
    const isImg = a.file_type?.startsWith('image') || a.item_type === 'image'
    const isVid = a.file_type?.startsWith('video') || a.item_type === 'video'
    const ext = fileExt(a.title)
    const label = isImg ? 'IMG' : isVid ? 'VID' : ext ? ext.toUpperCase().slice(0, 4) : 'FILE'

    if (a.file_path && (isImg || isVid)) {
      if (!a.url) ensureSignedUrl(a.file_path).catch(() => {})
      const url = a.url || thumbUrls[a.file_path]

      if (url && isImg) {
        return (
          <button
            type="button"
            className="w-[20mm] h-[20mm] rounded-lg border border-gray-300 overflow-hidden"
            onClick={() => setPreview({ kind: 'image', url, title: a.title })}
            title="Click to expand"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={a.title} className="w-full h-full object-cover" />
          </button>
        )
      }

      if (url && isVid) {
        return (
          <button
            type="button"
            className="w-[20mm] h-[20mm] rounded-lg border border-gray-300 overflow-hidden"
            onClick={() => setPreview({ kind: 'video', url, title: a.title })}
            title="Click to expand"
          >
            <div className="relative w-full h-full">
              <video className="w-full h-full object-cover" src={url} muted playsInline preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold bg-black/30 text-white">
                ▶
              </div>
            </div>
          </button>
        )
      }
    }

    return <ThumbIcon label={label} />
  }

  function renderImportThumb(item: BusinessBankItem) {
    const isImg = item.file_type?.startsWith('image') || item.item_type === 'image'
    const isVid = item.file_type?.startsWith('video') || item.item_type === 'video' || item.item_type === 'business_introduction'
    const isPdf = item.file_type?.includes('pdf') || fileExt(item.title) === 'pdf'
    const ext = fileExt(item.title)
    const label = isImg ? 'IMG' : isVid ? 'VID' : ext ? ext.toUpperCase().slice(0, 4) : 'FILE'

    const path = item.file_path || ''
    // For business_introduction items with file_url (linked videos), show a special icon
    const isLinkedVideo = item.item_type === 'business_introduction' && !path && item.file_url
    
    if (path && (isImg || isVid || isPdf) && !thumbUrls[path]) {
      ensureSignedUrl(path).catch(() => {})
    }
    const url = path ? thumbUrls[path] : null

    const base = 'w-[20mm] h-[20mm] rounded-lg border border-gray-300 overflow-hidden flex items-center justify-center shrink-0 bg-gray-50'

    if (url && isImg) {
      return (
        <button type="button" className={base} onClick={() => setPreview({ kind: 'image', url, title: item.title })}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={item.title} className="w-full h-full object-cover" />
        </button>
      )
    }

    if (url && isVid) {
      return (
        <button type="button" className={base} onClick={() => setPreview({ kind: 'video', url, title: item.title })}>
          <div className="relative w-full h-full">
            <video className="w-full h-full object-cover" src={url} muted playsInline preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold bg-black/30 text-white">▶</div>
          </div>
        </button>
      )
    }

    if (url && isPdf) {
      return <PdfThumb url={url} title={item.title} onClick={() => openFilePath(path)} />
    }

    // Linked videos (business_introduction with file_url): show link icon
    if (isLinkedVideo) {
      return (
        <div className={base}>
          <div className="px-2 py-1 rounded border border-gray-200 bg-white text-[10px] font-semibold text-gray-700">
            🔗 LINK
          </div>
        </div>
      )
    }

    // Structured items without files: show a clear card thumbnail.
    if (!path && (item.item_type === 'experience' || item.item_type === 'education' || item.item_type === 'credential' || item.item_type === 'social' || item.item_type === 'project')) {
      return <MetaThumb kind={item.item_type} title={item.title} />
    }

    // Documents/other: icon thumbnail; clicking opens the file if available.
    if (path) {
      return (
        <button type="button" className={base} onClick={() => openFilePath(path)}>
          <div className="px-2 py-1 rounded border border-gray-200 bg-white text-[10px] font-semibold text-gray-700">
            {label}
          </div>
        </button>
      )
    }

    return (
      <div className={base}>
        <div className="px-2 py-1 rounded border border-gray-200 bg-white text-[10px] font-semibold text-gray-700">
          {label}
        </div>
      </div>
    )
  }

  function renderLocalImportThumb(item: LocalImportItem) {
    const url = item.url || item.previewUrl
    const isImg = item.file_type?.startsWith('image') || (url ? isImageUrl(url) : false)
    const isVid = item.file_type?.startsWith('video') || (url ? isVideoUrl(url) : false)
    const isPdf = item.file_type?.includes('pdf') || fileExt(item.title) === 'pdf'
    const ext = fileExt(item.title)
    const label = isImg ? 'IMG' : isVid ? 'VID' : ext ? ext.toUpperCase().slice(0, 4) : 'FILE'
    const base = 'w-[20mm] h-[20mm] rounded-lg border border-gray-300 overflow-hidden flex items-center justify-center shrink-0 bg-gray-50'

    if (url && isImg) {
      return (
        <button type="button" className={base} onClick={() => setPreview({ kind: 'image', url, title: item.title })}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={item.title} className="w-full h-full object-cover" />
        </button>
      )
    }

    if (url && isVid) {
      return (
        <button type="button" className={base} onClick={() => setPreview({ kind: 'video', url, title: item.title })}>
          <div className="relative w-full h-full">
            <video className="w-full h-full object-cover" src={url} muted playsInline preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold bg-black/30 text-white">▶</div>
          </div>
        </button>
      )
    }

    if (url && isPdf) {
      return <PdfThumb url={url} title={item.title} onClick={() => window.open(url, '_blank')} />
    }

    if (item.source === 'link') {
      return (
        <div className={base}>
          <div className="px-2 py-1 rounded border border-gray-200 bg-white text-[10px] font-semibold text-gray-700">
            🔗 LINK
          </div>
        </div>
      )
    }

    return (
      <div className={base}>
        <div className="px-2 py-1 rounded border border-gray-200 bg-white text-[10px] font-semibold text-gray-700">
          {label}
        </div>
      </div>
    )
  }

  function ProjectAttachmentChip({ id, onRemove }: { id: number; onRemove: () => void }) {
    const item = tbItemCache[id]

    useEffect(() => {
      if (!item) ensureTbItem(id).catch(() => {})
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    useEffect(() => {
      if (item?.file_path && !thumbUrls[item.file_path]) {
        ensureSignedUrl(item.file_path).catch(() => {})
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item?.file_path])

    if (!item) {
      return (
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg border border-white/10 bg-slate-900/30">
          <ThumbIcon label="…" />
          <div className="text-xs text-slate-400">Loading…</div>
        </div>
      )
    }

    const open = () => {
      if (item.file_path) {
        openFilePath(item.file_path).catch(() => {})
        return
      }
      if (item.item_type === 'social') {
        const u = (item.metadata as any)?.url ?? ''
        if (u) window.open(String(u).startsWith('http') ? String(u) : `https://${u}`, '_blank')
      }
    }

    return (
      <div className="flex items-center gap-3 px-2 py-2 rounded-xl border border-white/10 bg-slate-900/30">
        {renderImportThumb(item)}
        <div className="min-w-0">
          <div className="text-sm text-slate-200 truncate">{item.title}</div>
          <div className="text-xs text-slate-400 truncate">{item.item_type}</div>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <button type="button" className="text-blue-300 underline" onClick={open}>
              Open
            </button>
            <button type="button" className="text-red-300 underline" onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
      </div>
    )
  }

  function toTenWords(s: string) {
    const words = String(s || '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
    if (words.length <= 10) return words.join(' ')
    return words.slice(0, 10).join(' ') + '…'
  }

  function itemSummary(item: BusinessBankItem) {
    const t = String(item.item_type || '').toLowerCase()
    const m: any = item.metadata ?? {}
    if (t === 'experience') {
      const role = m?.title || m?.role || ''
      const company = m?.company || ''
      const desc = m?.description || m?.summary || ''
      return toTenWords([role, company, desc].filter(Boolean).join(' — '))
    }
    if (t === 'education') {
      const inst = m?.institution || ''
      const degree = m?.degree || m?.course || ''
      const year = m?.year || m?.endDate || ''
      return toTenWords([inst, degree, year].filter(Boolean).join(' — '))
    }
    if (t === 'credential' || t === 'certification' || t === 'license') {
      const name = m?.name || item.title || ''
      const issuer = m?.issuer || ''
      const expiry = m?.expiry || ''
      return toTenWords([name, issuer, expiry].filter(Boolean).join(' — '))
    }
    if (t === 'social') {
      const platform = m?.platform || ''
      const url = m?.url || ''
      return toTenWords([platform, url].filter(Boolean).join(' '))
    }
    if (t === 'project') {
      const name = m?.name || item.title || ''
      const desc = m?.description || ''
      return toTenWords([name, desc].filter(Boolean).join(' — '))
    }
    if (t === 'referee' || t === 'referees' || t === 'reference') {
      const name = m?.name || item.title || ''
      const rel = m?.relationship || ''
      const company = m?.company || ''
      return toTenWords([name, rel, company].filter(Boolean).join(' — '))
    }
    const content = m?.description || m?.notes || item.title || ''
    return toTenWords(String(content))
  }

  async function loadSavedPortfolio() {
    try {
      const uid = await getUserId()
      await log('loadSavedPortfolio start', 'P_LOAD', { hasUser: !!uid })
      if (!uid) return

      const { data, error } = await supabase
        .from('business_bank_items')
        .select('id, metadata')
        .eq('user_id', uid)
        .eq('item_type', 'profile')
        .order('created_at', { ascending: false })
        .limit(1)

      await log('loadSavedPortfolio result', 'P_LOAD', { hasError: !!error, rowCount: data?.length ?? 0 })
      if (error) return

      const saved = data?.[0]?.metadata
      if (saved && typeof saved === 'object') {
        // Load selected template ID from saved profile
        if ((saved as any).selected_template_id) {
          setSelectedTemplateId((saved as any).selected_template_id)
        }
        
        // Load section visibility settings
        if ((saved as any).sectionVisibility && typeof (saved as any).sectionVisibility === 'object') {
          setSectionVisibility((prev) => ({
            ...prev,
            ...(saved as any).sectionVisibility,
          }))
        }
        // Load item visibility settings
        if ((saved as any).itemVisibility && typeof (saved as any).itemVisibility === 'object') {
          setItemVisibility((prev) => ({
            ...prev,
            ...(saved as any).itemVisibility,
          }))
        }
        
        setProfile((prev) => {
          // migrate older profiles by appending missing sections (e.g., referees, social)
          const savedOrder = Array.isArray((saved as any).sectionOrder) ? (saved as any).sectionOrder.map((x: any) => String(x)) : null
          const mergedOrder = savedOrder ? [...savedOrder] : [...(prev.sectionOrder ?? DEFAULT_SECTION_ORDER)]
          for (const k of DEFAULT_SECTION_ORDER) {
            const kk = String(k)
            if (!mergedOrder.includes(kk)) mergedOrder.push(kk)
          }
          const filteredOrder = mergedOrder.filter((k) => k !== 'education' && k !== 'referees')

          return {
            ...prev,
            ...saved,
            // ensure required fields exist
            socialLinks: Array.isArray((saved as any).socialLinks)
              ? (saved as any).socialLinks
                  .map((s: any) => ({ platform: String(s?.platform ?? ''), url: String(s?.url ?? '') }))
                  .filter((s: any) => s.platform.trim() && s.url.trim())
              : prev.socialLinks,
            skills: Array.isArray(saved.skills) ? saved.skills : prev.skills,
            experience: Array.isArray(saved.experience) ? saved.experience : prev.experience,
            education: Array.isArray(saved.education)
              ? saved.education.map((e: any) => ({
                  institution: e?.institution ?? '',
                  degree: e?.degree ?? '',
                  field: e?.field ?? '',
                  year: e?.year ?? '',
                  attachmentIds: Array.isArray(e?.attachmentIds) ? e.attachmentIds : [],
                }))
              : prev.education,
            referees: Array.isArray(saved.referees)
              ? saved.referees.map((r: any) => ({
                  name: r?.name ?? '',
                  relationship: r?.relationship ?? '',
                  company: r?.company ?? '',
                  title: r?.title ?? '',
                  email: r?.email ?? '',
                  phone: r?.phone ?? '',
                  notes: r?.notes ?? '',
                  attachmentIds: Array.isArray(r?.attachmentIds) ? r.attachmentIds : [],
                }))
              : prev.referees,
            attachments: Array.isArray(saved.attachments) ? saved.attachments : prev.attachments,
            projects: Array.isArray(saved.projects)
              ? saved.projects.map((p: any) => ({
                  name: p?.name ?? '',
                  description: p?.description ?? '',
                  url: p?.url ?? '',
                  attachmentIds: Array.isArray(p?.attachmentIds) ? p.attachmentIds : [],
                }))
              : prev.projects,
            sectionOrder: filteredOrder,
            introVideoId:
              typeof saved.introVideoId === 'number' ? saved.introVideoId : (saved.introVideoId == null ? null : prev.introVideoId),
          }
        })
      }

      await ensureMediaUrl('avatar', (saved as any)?.avatar_path)
      await ensureMediaUrl('banner', (saved as any)?.banner_path)

      // Also load profileSelections (set in Business Bank) and render as attachments automatically.
      const selections: number[] = Array.isArray(saved?.profileSelections) ? saved.profileSelections : []
      if (selections.length) {
        const { data: selItems, error: selErr } = await supabase
          .from('business_bank_items')
          .select('id,item_type,title,file_path,file_type')
          .eq('user_id', uid)
          .in('id', selections)

        await log('load profileSelections', 'P_LOAD', {
          hasError: !!selErr,
          selectedCount: selections.length,
          rowCount: Array.isArray(selItems) ? selItems.length : 0,
        })

        if (!selErr && Array.isArray(selItems)) {
          const attachments: any[] = []
          for (const it of selItems) {
            if (!it.file_path) continue
            const { data: urlData } = await supabase.storage.from('business-bank').createSignedUrl(it.file_path, 60 * 30)
            attachments.push({
              id: it.id,
              title: it.title,
              item_type: it.item_type,
              file_path: it.file_path,
              file_type: it.file_type ?? null,
              url: urlData?.signedUrl ?? null,
            })
          }
          setProfile((prev) => ({ ...prev, attachments }))
        }
      }
    } catch (e: any) {
      await log('loadSavedPortfolio exception', 'P_LOAD', { message: e?.message ?? String(e) })
    }
  }

  async function loadProductsServices() {
    if (!businessProfileId || !userId) return
    setProductLoading(true)
    setProductError(null)
    try {
      const [overviewRes, roadmapRes, productsRes] = await Promise.all([
        supabase
          .from('business_products_services_overview')
          .select('id, short_headline, summary, primary_industries, business_model, is_public')
          .eq('business_id', businessProfileId)
          .maybeSingle(),
        supabase
          .from('business_product_roadmap')
          .select('id, upcoming_products, roadmap_ideas, expansion_plans, new_markets, is_public')
          .eq('business_id', businessProfileId)
          .maybeSingle(),
        supabase
          .from('business_products_services')
          .select('id, name, category, short_description, who_it_is_for, problem_it_solves, logo_or_icon, explainer_video_url, external_link, lifecycle_stage, order_index, is_published')
          .eq('business_id', businessProfileId)
          .order('order_index', { ascending: true }),
      ])

      if (overviewRes.data) {
        setProductsOverview({
          id: overviewRes.data.id,
          short_headline: overviewRes.data.short_headline || '',
          summary: overviewRes.data.summary || '',
          primary_industries: Array.isArray(overviewRes.data.primary_industries) ? overviewRes.data.primary_industries : [],
          business_model: overviewRes.data.business_model || 'Other',
          is_public: overviewRes.data.is_public ?? true,
        })
      }

      if (roadmapRes.data) {
        setProductsRoadmap({
          id: roadmapRes.data.id,
          upcoming_products: Array.isArray(roadmapRes.data.upcoming_products) ? roadmapRes.data.upcoming_products : [],
          roadmap_ideas: roadmapRes.data.roadmap_ideas || '',
          expansion_plans: roadmapRes.data.expansion_plans || '',
          new_markets: roadmapRes.data.new_markets || '',
          is_public: roadmapRes.data.is_public ?? true,
        })
      }

      const products = Array.isArray(productsRes.data) ? productsRes.data : []
      const productIds = products.map((p) => p.id)

      if (!productIds.length) {
        setProductCards([])
        return
      }

      const [
        rolesRes,
        skillsRes,
        teamsRes,
        growthRes,
        mediaRes,
        impactRes,
        signalsRes,
        permissionsRes,
      ] = await Promise.all([
        supabase.from('business_product_roles').select('product_id, role_name, order_index').in('product_id', productIds),
        supabase.from('business_product_skills').select('product_id, skill_name').in('product_id', productIds),
        supabase.from('business_product_teams').select('product_id, team_name').in('product_id', productIds),
        supabase.from('business_product_growth_areas').select('product_id, growth_area').in('product_id', productIds),
        supabase.from('business_product_media').select('product_id, media_type, title, file_path, file_url, file_type, order_index').in('product_id', productIds),
        supabase.from('business_product_impact').select('product_id, who_it_helps, what_it_improves, real_world_outcomes').in('product_id', productIds),
        supabase.from('business_product_signals').select('product_id, we_are_hiring_for_this, open_to_partnerships, in_research_and_development, currently_scaling').in('product_id', productIds),
        supabase.from('business_product_permissions').select('product_id, visibility_level').in('product_id', productIds),
      ])

      const rolesMap = new Map<number, string[]>()
      const skillsMap = new Map<number, string[]>()
      const teamsMap = new Map<number, string[]>()
      const growthMap = new Map<number, string[]>()
      const mediaMap = new Map<number, BusinessProductMedia[]>()
      const impactMap = new Map<number, BusinessProductImpact>()
      const signalsMap = new Map<number, BusinessProductSignals>()
      const permMap = new Map<number, string>()

      for (const r of rolesRes.data ?? []) {
        const arr = rolesMap.get(r.product_id) ?? []
        arr.push(String(r.role_name || ''))
        rolesMap.set(r.product_id, arr)
      }
      for (const s of skillsRes.data ?? []) {
        const arr = skillsMap.get(s.product_id) ?? []
        arr.push(String(s.skill_name || ''))
        skillsMap.set(s.product_id, arr)
      }
      for (const t of teamsRes.data ?? []) {
        const arr = teamsMap.get(t.product_id) ?? []
        arr.push(String(t.team_name || ''))
        teamsMap.set(t.product_id, arr)
      }
      for (const g of growthRes.data ?? []) {
        const arr = growthMap.get(g.product_id) ?? []
        arr.push(String(g.growth_area || ''))
        growthMap.set(g.product_id, arr)
      }
      for (const m of mediaRes.data ?? []) {
        const arr = mediaMap.get(m.product_id) ?? []
        arr.push({
          media_type: String(m.media_type || 'document'),
          title: String(m.title || ''),
          file_path: m.file_path ?? null,
          file_url: m.file_url ?? null,
          file_type: m.file_type ?? null,
          order_index: typeof m.order_index === 'number' ? m.order_index : 0,
        })
        mediaMap.set(m.product_id, arr)
      }
      for (const imp of impactRes.data ?? []) {
        impactMap.set(imp.product_id, {
          who_it_helps: imp.who_it_helps || '',
          what_it_improves: imp.what_it_improves || '',
          real_world_outcomes: imp.real_world_outcomes || '',
        })
      }
      for (const s of signalsRes.data ?? []) {
        signalsMap.set(s.product_id, {
          we_are_hiring_for_this: !!s.we_are_hiring_for_this,
          open_to_partnerships: !!s.open_to_partnerships,
          in_research_and_development: !!s.in_research_and_development,
          currently_scaling: !!s.currently_scaling,
        })
      }
      for (const p of permissionsRes.data ?? []) {
        permMap.set(p.product_id, String(p.visibility_level || 'public_summary'))
      }

      setProductCards(
        products.map((p) => ({
          id: p.id,
          name: p.name || '',
          category: p.category || 'Product',
          short_description: p.short_description || '',
          who_it_is_for: p.who_it_is_for || '',
          problem_it_solves: p.problem_it_solves || '',
          logo_or_icon: p.logo_or_icon || '',
          explainer_video_url: p.explainer_video_url || '',
          external_link: p.external_link || '',
          lifecycle_stage: p.lifecycle_stage || '',
          order_index: typeof p.order_index === 'number' ? p.order_index : 0,
          is_published: p.is_published ?? true,
          visibility_level: permMap.get(p.id) || 'public_summary',
          roles: rolesMap.get(p.id) ?? [],
          skills: skillsMap.get(p.id) ?? [],
          teams: teamsMap.get(p.id) ?? [],
          growth_areas: growthMap.get(p.id) ?? [],
          media: (mediaMap.get(p.id) ?? []).sort((a, b) => a.order_index - b.order_index),
          impact: impactMap.get(p.id) ?? { ...emptyImpact },
          signals: signalsMap.get(p.id) ?? { ...emptySignals },
        }))
      )
    } catch (err: any) {
      console.error('Failed to load Products & Services:', err)
      setProductError(err?.message || 'Failed to load Products & Services.')
    } finally {
      setProductLoading(false)
    }
  }

  async function saveProductsServices() {
    if (!businessProfileId || !userId) {
      setProductError('Please sign in to save Products & Services.')
      return
    }
    if (!productsOverview.short_headline.trim() || !productsOverview.summary.trim()) {
      setProductError('Overview headline and summary are required before saving.')
      return
    }
    const invalidCard = productCards.find(
      (c) =>
        !c.name.trim() ||
        !c.category.trim() ||
        !c.short_description.trim() ||
        !c.who_it_is_for.trim() ||
        !c.problem_it_solves.trim()
    )
    if (invalidCard) {
      setProductError('Each product/service card needs all required fields before saving.')
      return
    }
    setProductSaving(true)
    setProductError(null)
    try {
      const assertOk = (result: { error?: any }, label: string) => {
        if (result?.error) {
          throw new Error(result.error?.message || `Failed to save ${label}`)
        }
      }
      const overviewPayload = {
        business_id: businessProfileId,
        user_id: userId,
        short_headline: productsOverview.short_headline.trim(),
        summary: productsOverview.summary.trim(),
        primary_industries: productsOverview.primary_industries,
        business_model: productsOverview.business_model || 'Other',
        is_public: productsOverview.is_public,
      }
      const overviewRes = await supabase
        .from('business_products_services_overview')
        .upsert(overviewPayload, { onConflict: 'business_id' })
      assertOk(overviewRes, 'overview')

      const roadmapPayload = {
        business_id: businessProfileId,
        user_id: userId,
        upcoming_products: productsRoadmap.upcoming_products,
        roadmap_ideas: productsRoadmap.roadmap_ideas,
        expansion_plans: productsRoadmap.expansion_plans,
        new_markets: productsRoadmap.new_markets,
        is_public: productsRoadmap.is_public,
      }
      const roadmapRes = await supabase.from('business_product_roadmap').upsert(roadmapPayload, { onConflict: 'business_id' })
      assertOk(roadmapRes, 'roadmap')

      if (deletedProductIds.length) {
        const deleteRes = await supabase.from('business_products_services').delete().in('id', deletedProductIds)
        assertOk(deleteRes, 'deleted products')
        setDeletedProductIds([])
      }

      for (const card of productCards) {
        const cardPayload = {
          business_id: businessProfileId,
          user_id: userId,
          name: card.name.trim(),
          category: card.category,
          short_description: card.short_description.trim(),
          who_it_is_for: card.who_it_is_for.trim(),
          problem_it_solves: card.problem_it_solves.trim(),
          logo_or_icon: card.logo_or_icon || null,
          explainer_video_url: card.explainer_video_url || null,
          external_link: card.external_link || null,
          lifecycle_stage: card.lifecycle_stage || null,
          order_index: card.order_index,
          is_published: card.is_published,
          is_active: true,
        }

        let productId = card.id
        if (productId) {
          const updateRes = await supabase.from('business_products_services').update(cardPayload).eq('id', productId)
          assertOk(updateRes, 'product card')
        } else {
          const insertRes = await supabase.from('business_products_services').insert(cardPayload).select('id').single()
          assertOk(insertRes, 'product card')
          const { data } = insertRes as any
          productId = data?.id
        }

        if (!productId) continue

        const permRes = await supabase.from('business_product_permissions').upsert(
          {
            product_id: productId,
            business_id: businessProfileId,
            user_id: userId,
            visibility_level: card.visibility_level || 'public_summary',
          },
          { onConflict: 'product_id' }
        )
        assertOk(permRes, 'permissions')

        const signalsRes = await supabase.from('business_product_signals').upsert(
          {
            product_id: productId,
            business_id: businessProfileId,
            user_id: userId,
            ...card.signals,
          },
          { onConflict: 'product_id' }
        )
        assertOk(signalsRes, 'signals')

        const impactRes = await supabase.from('business_product_impact').upsert(
          {
            product_id: productId,
            business_id: businessProfileId,
            user_id: userId,
            ...card.impact,
          },
          { onConflict: 'product_id' }
        )
        assertOk(impactRes, 'impact')

        const removeExisting = async (table: string) => {
          const res = await supabase.from(table).delete().eq('product_id', productId)
          assertOk(res, table)
        }

        await removeExisting('business_product_roles')
        if (card.roles.length) {
          const rolesRes = await supabase.from('business_product_roles').insert(
            card.roles.map((r, idx) => ({
              product_id: productId,
              business_id: businessProfileId,
              user_id: userId,
              role_name: r,
              order_index: idx,
            }))
          )
          assertOk(rolesRes, 'roles')
        }

        await removeExisting('business_product_skills')
        if (card.skills.length) {
          const skillsRes = await supabase.from('business_product_skills').insert(
            card.skills.map((s) => ({
              product_id: productId,
              business_id: businessProfileId,
              user_id: userId,
              skill_name: s,
            }))
          )
          assertOk(skillsRes, 'skills')
        }

        await removeExisting('business_product_teams')
        if (card.teams.length) {
          const teamsRes = await supabase.from('business_product_teams').insert(
            card.teams.map((t) => ({
              product_id: productId,
              business_id: businessProfileId,
              user_id: userId,
              team_name: t,
            }))
          )
          assertOk(teamsRes, 'teams')
        }

        await removeExisting('business_product_growth_areas')
        if (card.growth_areas.length) {
          const growthRes = await supabase.from('business_product_growth_areas').insert(
            card.growth_areas.map((g) => ({
              product_id: productId,
              business_id: businessProfileId,
              user_id: userId,
              growth_area: g,
            }))
          )
          assertOk(growthRes, 'growth areas')
        }

        await removeExisting('business_product_media')
        if (card.media.length) {
          const mediaRes = await supabase.from('business_product_media').insert(
            card.media.map((m, idx) => ({
              product_id: productId,
              business_id: businessProfileId,
              user_id: userId,
              media_type: m.media_type,
              title: m.title || null,
              file_path: m.file_path ?? null,
              file_url: m.file_url ?? null,
              file_type: m.file_type ?? null,
              order_index: idx,
            }))
          )
          assertOk(mediaRes, 'media')
        }
      }
    } catch (err: any) {
      console.error('Failed to save Products & Services:', err)
      setProductError(err?.message || 'Failed to save Products & Services.')
    } finally {
      setProductSaving(false)
    }
  }

  async function uploadPortfolioImage(kind: 'avatar' | 'banner', file: File) {
    const uid = await getUserId()
    await log('uploadPortfolioImage start', 'P_MEDIA', { kind, hasUser: !!uid, fileType: file.type, fileSize: file.size })
    if (!uid) {
      alert('Please sign in to upload images.')
      return
    }
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.')
      return
    }
    const maxBytes = 10 * 1024 * 1024
    if (file.size > maxBytes) {
      alert('Image is too large. Please use an image under 10MB.')
      return
    }

    const path = `business/${uid}/${kind}-${crypto.randomUUID()}-${file.name}`
    const { error } = await supabase.storage.from('business-bank').upload(path, file, { upsert: true, contentType: file.type })
    await log('uploadPortfolioImage result', 'P_MEDIA', {
      kind,
      hasError: !!error,
      errorMessage: (error as any)?.message ?? null,
    })
    if (error) {
      alert((error as any)?.message ?? 'Upload failed')
      return
    }

    setProfile((prev) => ({ ...prev, [`${kind}_path`]: path } as any))
    await ensureMediaUrl(kind, path)
  }

  const getWebsiteImportUrl = () => {
    if (websiteImportUrl.trim()) return websiteImportUrl.trim()
    const fromLinks = (profile.socialLinks || []).find((s) => String(s?.platform || '').toLowerCase() === 'website')
    return String(fromLinks?.url || '').trim()
  }

  const fetchImageAsFile = async (url: string, name: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to download image')
    const blob = await res.blob()
    const ext = blob.type?.split('/')[1] || 'png'
    return new File([blob], `${name}.${ext}`, { type: blob.type || 'image/png' })
  }

  const handleWebsiteImport = async () => {
    const url = getWebsiteImportUrl()
    setWebsiteImportOpen(true)
    if (!url) {
      setWebsiteImportError('Add a website URL first, then import.')
      return
    }
    setWebsiteImportLoading(true)
    setWebsiteImportError(null)
    setWebsiteImportResult(null)
    try {
      const res = await fetch('/api/website/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setWebsiteImportError(data?.error || 'Failed to import website.')
        return
      }
      setWebsiteImportResult(data)
      setWebsiteImportOpen(true)
    } catch (err: any) {
      setWebsiteImportError(err?.message || 'Failed to import website.')
    } finally {
      setWebsiteImportLoading(false)
    }
  }

  const applyWebsiteImport = async () => {
    if (!websiteImportResult) return
    const about = String(websiteImportResult.description || '').trim()
    const services = Array.isArray(websiteImportResult.services) ? websiteImportResult.services : []
    const summary = about || services.join(', ')

    setProfile((prev) => ({
      ...prev,
      bio: about || prev.bio,
    }))
    if (summary) {
      setProductsOverview((prev) => ({
        ...prev,
        summary: prev.summary || summary,
        short_headline: prev.short_headline || 'Products & Services',
      }))
    }

    const logoUrl = String(websiteImportResult.logo || '').trim()
    const bannerUrl = String(websiteImportResult.banner || '').trim()
    try {
      if (logoUrl) {
        const logoFile = await fetchImageAsFile(logoUrl, 'logo')
        await uploadPortfolioImage('avatar', logoFile)
      }
      if (bannerUrl) {
        const bannerFile = await fetchImageAsFile(bannerUrl, 'banner')
        await uploadPortfolioImage('banner', bannerFile)
      }
    } catch (err: any) {
      setWebsiteImportError(err?.message || 'Failed to import images.')
    } finally {
      setWebsiteImportOpen(false)
    }
  }

  function nextTempAttachmentId() {
    tempAttachmentIdRef.current -= 1
    return tempAttachmentIdRef.current
  }

  function updateLocalItem(id: string, patch: Partial<LocalImportItem>) {
    setLocalImportItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function removeLocalItem(id: string) {
    setLocalImportItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl)
        } catch {}
      }
      return prev.filter((item) => item.id !== id)
    })
    setSelectedIds((prev) => {
      const next = { ...prev }
      delete next[localKey(id)]
      return next
    })
  }

  async function uploadImportFiles(files: File[], replaceId?: string, forceCategory?: 'image' | 'video' | 'doc') {
    setImportError(null)
    if (!files.length) return
    const uid = await getUserId()
    if (!uid) {
      setImportError('Please sign in to upload files.')
      return
    }

    for (const file of files) {
      const category = allowedFileCategory(file)
      if (!category) {
        setImportError(`Unsupported file type: ${file.name}`)
        continue
      }
      if (forceCategory && category !== forceCategory) {
        setImportError(`Please choose a ${forceCategory === 'doc' ? 'document' : forceCategory} file.`)
        continue
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setImportError(`File is too large (max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB).`)
        continue
      }

      const targetId = replaceId ?? `tmp-${crypto.randomUUID()}`
      const previewUrl = URL.createObjectURL(file)
      const attachmentId =
        replaceId
          ? localImportItems.find((item) => item.id === replaceId)?.attachmentId ?? nextTempAttachmentId()
          : nextTempAttachmentId()

      if (replaceId) {
        updateLocalItem(replaceId, {
          title: file.name,
          item_type: category === 'doc' ? 'document' : category,
          file_type: file.type || null,
          previewUrl,
          status: 'uploading',
          error: null,
          savedToBank: false,
          attachmentId,
        })
      } else {
        setLocalImportItems((prev) => [
          {
            id: targetId,
            source: 'upload',
            title: file.name,
            item_type: category === 'doc' ? 'document' : category,
            file_type: file.type || null,
            previewUrl,
            status: 'uploading',
            error: null,
            created_at: new Date().toISOString(),
            attachmentId,
          },
          ...prev,
        ])
      }

      setUploadProgress((prev) => ({ ...prev, [targetId]: 10 }))

      const path = `business/${uid}/attach-${crypto.randomUUID()}-${file.name}`
      const { error } = await supabase.storage.from('business-bank').upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      })

      if (error) {
        updateLocalItem(targetId, { status: 'error', error: (error as any)?.message ?? 'Upload failed' })
        setUploadProgress((prev) => ({ ...prev, [targetId]: 0 }))
        continue
      }

      const { data } = await supabase.storage.from('business-bank').createSignedUrl(path, 60 * 30)
      const signedUrl = data?.signedUrl ?? null
      updateLocalItem(targetId, {
        status: 'ready',
        file_path: path,
        url: signedUrl,
        file_type: file.type || null,
        error: null,
      })
      setUploadProgress((prev) => ({ ...prev, [targetId]: 100 }))
    }
  }

  async function fetchLinkMeta(url: string) {
    let title = url
    let previewUrl: string | null = isImageUrl(url) ? url : null
    try {
      const res = await fetch(url)
      const contentType = res.headers.get('content-type') || ''
      if (res.ok && contentType.includes('text/html')) {
        const html = await res.text()
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
        const pageTitle = doc.querySelector('title')?.textContent
        title = String(ogTitle || pageTitle || title).trim()
        if (!previewUrl) {
          previewUrl = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || null
        }
      }
    } catch {}
    return { title, previewUrl }
  }

  async function addLinkItem() {
    setLinkError(null)
    const normalized = normalizeUrl(linkInput)
    if (!normalized) {
      setLinkError('Please enter a URL.')
      return
    }
    try {
      new URL(normalized)
    } catch {
      setLinkError('Please enter a valid URL.')
      return
    }

    setLinkBusy(true)
    try {
      const { title, previewUrl } = await fetchLinkMeta(normalized)
      const id = `link-${crypto.randomUUID()}`
      setLocalImportItems((prev) => [
        {
          id,
          source: 'link',
          title: title || normalized,
          item_type: 'link',
          url: normalized,
          previewUrl,
          status: 'ready',
          created_at: new Date().toISOString(),
          attachmentId: nextTempAttachmentId(),
        },
        ...prev,
      ])
      setLinkInput('')
    } finally {
      setLinkBusy(false)
    }
  }

  async function replaceLinkItem(item: LocalImportItem) {
    const nextUrl = window.prompt('Enter the new URL', item.url || '')
    if (!nextUrl) return
    const normalized = normalizeUrl(nextUrl)
    try {
      new URL(normalized)
    } catch {
      setLinkError('Please enter a valid URL.')
      return
    }
    const { title, previewUrl } = await fetchLinkMeta(normalized)
    updateLocalItem(item.id, {
      url: normalized,
      title: title || normalized,
      previewUrl,
    })
  }

  async function saveLocalItemToBusinessBank(item: LocalImportItem) {
    if (item.savedToBank) return
    const uid = await getUserId()
    if (!uid) {
      setImportError('Please sign in to save items to Business Bank.')
      return
    }
    const ok = await ensureUsersRow(uid)
    if (!ok) {
      setImportError('Please sign in again before saving to Business Bank.')
      return
    }

    let itemType = 'text'
    if (item.source === 'link') {
      itemType = 'link'
    } else if (item.file_type?.startsWith('image')) {
      itemType = 'image'
    } else if (item.file_type?.startsWith('video')) {
      itemType = 'video'
    }

    const { data, error } = await supabase
      .from('business_bank_items')
      .insert({
        user_id: uid,
        item_type: itemType,
        title: item.title,
        file_path: item.file_path ?? null,
        file_type: item.file_type ?? null,
        file_url: item.url ?? null,
        metadata: item.source === 'link' ? { url: item.url } : null,
      })
      .select('id,item_type,title,metadata,file_path,file_type,created_at')
      .single()

    if (error) {
      setImportError((error as any)?.message ?? 'Failed to save to Business Bank.')
      return
    }
    updateLocalItem(item.id, { savedToBank: true })
    if (data) {
      setAvailableItems((prev) => [data, ...prev])
    }
  }

  async function openImportModal() {
    setImportOpen(true)
    setIsImporting(true)
    setImportError(null)
    setLinkError(null)
    setImportTab('upload')
    try {
      const uid = await getUserId()
      await log('import modal open', 'P_IMPORT', { hasUser: !!uid })
      if (!uid) {
        setImportError('Please sign in to import from Business Bank.')
        return
      }

      const { data, error } = await supabase
        .from('business_bank_items')
        .select('id,item_type,title,metadata,file_path,file_type,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      await log('fetch business_bank_items', 'P_IMPORT', {
        hasError: !!error,
        rowCount: Array.isArray(data) ? data.length : 0,
        errorMessage: (error as any)?.message ?? null,
      })

      if (error) {
        setImportError((error as any)?.message ?? 'Failed to load Business Bank items')
        return
      }

      setAvailableItems((data ?? []).filter((i: any) => i.item_type !== 'profile'))
      setSelectedIds({})
    } finally {
      setIsImporting(false)
    }
  }

  async function applyImport() {
    try {
      const selectedBank = availableItems.filter((i) => selectedIds[bankKey(i.id)])
      const selectedLocal = localImportItems.filter((i) => selectedIds[localKey(i.id)])
      const selectedCount = selectedBank.length + selectedLocal.length
      await log('apply import', 'P_IMPORT_APPLY', { selectedCount })
      if (!selectedCount) {
        setImportOpen(false)
        return
      }

      // Build attachments (for any item that has a file_path)
      const attachmentsToAdd: BusinessProfileData['attachments'] = []
      for (const item of selectedBank) {
        if (!item.file_path) continue
        const { data, error } = await supabase.storage.from('business-bank').createSignedUrl(item.file_path, 60 * 30)
        await log('createSignedUrl for attachment', 'P_IMPORT', {
          hasError: !!error,
          errorMessage: (error as any)?.message ?? null,
          itemId: item.id,
          itemType: item.item_type,
          hasUrl: !!data?.signedUrl,
        })
        attachmentsToAdd.push({
          id: item.id,
          title: item.title,
          item_type: item.item_type,
          file_path: item.file_path ?? null,
          file_type: item.file_type ?? null,
          url: data?.signedUrl ?? null,
        })
      }

      for (const item of selectedLocal) {
        let url = item.url ?? item.previewUrl ?? null
        if (!url && item.file_path) {
          const { data } = await supabase.storage.from('business-bank').createSignedUrl(item.file_path, 60 * 30)
          url = data?.signedUrl ?? null
        }
        attachmentsToAdd.push({
          id: item.attachmentId ?? nextTempAttachmentId(),
          title: item.title,
          item_type: item.item_type,
          file_path: item.file_path ?? null,
          file_type: item.file_type ?? null,
          url,
        })
      }

      const mappedExperience = selectedBank
        .filter((i) => i.item_type === 'experience')
        .map((item) => ({
        company: item.metadata?.company || item.title,
        title: item.metadata?.title || '',
        startDate: item.metadata?.startDate || '',
        endDate: item.metadata?.endDate || '',
          description: item.metadata?.description || item.metadata?.summary || '',
      }))

      const mappedEducation = selectedBank
        .filter((i) => i.item_type === 'education')
        .map((item) => ({
        institution: item.metadata?.institution || item.title,
        degree: item.metadata?.degree || '',
        field: item.metadata?.field || '',
        year:
          item.metadata?.year ||
          item.metadata?.endDate ||
          item.metadata?.completionYear ||
            '',
      }))

      const mappedProjects = selectedBank
        .filter((i) => i.item_type === 'project')
        .map((item) => ({
          name: String(item.metadata?.name || item.title || '').trim() || 'Project',
          description: String(item.metadata?.description || item.metadata?.summary || '').trim(),
          url: String(item.metadata?.url || item.metadata?.link || '').trim(),
          attachmentIds: Array.isArray(item.metadata?.attachmentIds) ? item.metadata.attachmentIds : [],
        }))
        .filter((p) => p.name)

      // Map selected items to skills (Products and Services) - use titles from all selected items
      const mappedSkills = selectedBank
        .map((item) => String(item.title || '').trim())
        .filter((title) => title.length > 0)
        .filter((title, index, self) => self.indexOf(title) === index) // Remove duplicates

      setProfile((prev) => {
        const existingSkills = Array.isArray(prev.skills) ? prev.skills : []
        const newSkills = mappedSkills.filter((skill) => !existingSkills.includes(skill))
        
        return {
          ...prev,
          experience: mappedExperience.length ? [...prev.experience, ...mappedExperience] : prev.experience,
          education: mappedEducation.length ? [...prev.education, ...mappedEducation] : prev.education,
          projects: mappedProjects.length
            ? (() => {
                const existing = Array.isArray(prev.projects) ? prev.projects : []
                const next = [...existing]
                for (const p of mappedProjects) {
                  const url = String(p.url || '').trim()
                  if (url && next.some((x) => String(x?.url || '').trim().toLowerCase() === url.toLowerCase())) continue
                  next.push(p)
                }
                return next
              })()
            : prev.projects,
          skills: newSkills.length ? [...existingSkills, ...newSkills] : existingSkills,
          attachments: attachmentsToAdd.length ? [...prev.attachments, ...attachmentsToAdd] : prev.attachments,
        }
      })

      setImportOpen(false)
    } catch (e: any) {
      await log('applyImport exception', 'P_IMPORT_APPLY', { message: e?.message ?? String(e) })
      setImportError(e?.message ?? 'Failed to import')
    }
  }

  const addSkill = () => {
    if (!sectionEdit.skills) return
    const trimmed = newSkill.trim()
    if (trimmed) {
      setProfile((prev) => {
        const currentSkills = Array.isArray(prev.skills) ? prev.skills : []
        // Avoid duplicates
        if (currentSkills.includes(trimmed)) {
          return prev
        }
        return {
          ...prev,
          skills: [...currentSkills, trimmed]
        }
      })
      setNewSkill('')
    }
  }

  const removeSkill = (index: number) => {
    if (!sectionEdit.skills) return
    setProfile((prev) => {
      const currentSkills = Array.isArray(prev.skills) ? prev.skills : []
      return {
        ...prev,
        skills: currentSkills.filter((_, i) => i !== index)
      }
    })
  }

  const removeExperience = (index: number) => {
    if (!sectionEdit.experience) return
    setProfile((prev) => ({ ...prev, experience: prev.experience.filter((_, i) => i !== index) }))
  }

  const addExperience = () => {
    if (!sectionEdit.experience) return
    setProfile({
      ...profile,
      experience: [
        ...profile.experience,
        { company: '', title: '', startDate: '', endDate: '', description: '' }
      ]
    })
  }

  const updateExperience = (index: number, field: string, value: string) => {
    if (!sectionEdit.experience) return
    setProfile((prev) => {
      const updated = [...prev.experience]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, experience: updated }
    })
  }

  const bulkCount = (m: Record<string, boolean>) => Object.values(m).filter(Boolean).length
  const bulkIsAllSelected = (keys: string[], m: Record<string, boolean>) => keys.length > 0 && keys.every((k) => !!m[k])
  const bulkToggleKey = (section: BulkSection, key: string, checked: boolean) => {
    setBulkSel((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: checked },
    }))
  }
  const bulkSetAll = (section: BulkSection, keys: string[], checked: boolean) => {
    setBulkSel((prev) => ({
      ...prev,
      [section]: checked ? Object.fromEntries(keys.map((k) => [k, true])) : {},
    }))
  }
  const bulkClear = (section: BulkSection) => {
    setBulkSel((prev) => ({ ...prev, [section]: {} }))
  }
  const bulkDeleteSelected = (section: BulkSection) => {
    if (!sectionEdit[section]) return
    const sel = bulkSel[section]
    const count = bulkCount(sel)
    if (count === 0) return
    const ok = window.confirm(`Delete ${count} item(s) from ${section}? This cannot be undone.`)
    if (!ok) return

    if (section === 'skills') {
      setProfile((p) => ({ ...p, skills: p.skills.filter((_, i) => !sel[String(i)]) }))
    } else if (section === 'experience') {
      setProfile((p) => ({ ...p, experience: p.experience.filter((_, i) => !sel[String(i)]) }))
    } else if (section === 'education') {
      setProfile((p) => ({ ...p, education: p.education.filter((_, i) => !sel[String(i)]) }))
    } else if (section === 'referees') {
      setProfile((p) => ({ ...p, referees: p.referees.filter((_, i) => !sel[String(i)]) }))
    } else if (section === 'attachments') {
      setProfile((p) => ({ ...p, attachments: p.attachments.filter((a) => !sel[String(a.id)]) }))
    } else if (section === 'projects') {
      setProfile((p) => ({ ...p, projects: p.projects.filter((_, i) => !sel[String(i)]) }))
    }

    bulkClear(section)
  }

  const addEducation = () => {
    // Enable edit mode if not already enabled
    if (!sectionEdit.education) {
      setSectionEdit((p) => ({ ...p, education: true }))
    }
    // Add new education entry
    setProfile((prev) => ({
      ...prev,
      education: [...prev.education, { institution: '', degree: '', field: '', year: '', attachmentIds: [] }],
    }))
  }

  const updateEducation = (index: number, field: string, value: string) => {
    if (!sectionEdit.education) return
    setProfile((prev) => {
      const updated = [...prev.education]
      const current = updated[index]
      if (!current) return prev
      // Explicitly preserve attachmentIds when updating fields
      updated[index] = { 
        ...current, 
        [field]: value,
        attachmentIds: Array.isArray(current.attachmentIds) ? current.attachmentIds : []
      }
      return { ...prev, education: updated }
    })
  }

  const removeEducation = (index: number) => {
    if (!sectionEdit.education) return
    setProfile((prev) => ({ ...prev, education: prev.education.filter((_, i) => i !== index) }))
  }

  const addProject = () => {
    if (!sectionEdit.projects) return
    setProfile((prev) => ({
      ...prev,
      projects: [...prev.projects, { name: '', description: '', url: '', attachmentIds: [] }],
    }))
  }

  const updateProject = (index: number, field: string, value: string) => {
    if (!sectionEdit.projects) return
    setProfile((prev) => {
      const updated = [...prev.projects]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, projects: updated }
    })
  }

  const removeProject = (index: number) => {
    if (!sectionEdit.projects) return
    setProfile((prev) => ({ ...prev, projects: prev.projects.filter((_, i) => i !== index) }))
  }


  const addSocialLink = () => {
    if (!sectionEdit.social) return
    setProfile((p) => ({
      ...p,
      socialLinks: [...(p.socialLinks || []), { platform: 'LinkedIn', url: '' }],
    }))
  }

  const updateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    if (!sectionEdit.social) return
    setProfile((p) => {
      const next = [...(p.socialLinks || [])]
      next[index] = { ...next[index], [field]: value }
      return { ...p, socialLinks: next }
    })
  }

  const removeSocialLink = (index: number) => {
    if (!sectionEdit.social) return
    setProfile((p) => ({ ...p, socialLinks: (p.socialLinks || []).filter((_, i) => i !== index) }))
  }

  async function saveSocialLinksToTalentBank() {
    try {
      const uid = await getUserId()
      if (!uid) {
        alert('Please sign in first.')
        return
      }
      await ensureUsersRow(uid)

      const links = (profile.socialLinks || []).map((s) => ({
        platform: String(s.platform || '').trim(),
        url: String(s.url || '').trim(),
      })).filter((s) => s.platform && s.url)

      if (!links.length) {
        alert('No social links to save.')
        return
      }

      for (const s of links) {
        // Insert as individual Business Bank items so users can attach notes later.
        const title = s.platform
        const metadata = { platform: s.platform, url: s.url }
        const { error } = await supabase.from('business_bank_items').insert({
          user_id: uid,
          item_type: 'social',
          title,
          metadata,
          is_public: false,
        } as any)
        if (error) {
          console.warn('Social insert failed:', error)
        }
      }

      alert(`Saved ${links.length} social link(s) to Business Bank.`)
    } catch (e: any) {
      alert(`Failed to save social links: ${e?.message ?? String(e)}`)
    }
  }

  const addReferee = () => {
    if (!sectionEdit.referees) return
    setProfile((p) => ({
      ...p,
      referees: [
        ...p.referees,
        { name: '', relationship: '', company: '', title: '', email: '', phone: '', notes: '', attachmentIds: [] },
      ],
    }))
  }

  const updateReferee = (index: number, field: string, value: string) => {
    if (!sectionEdit.referees) return
    setProfile((p) => {
      const next = [...p.referees]
      next[index] = { ...next[index], [field]: value } as any
      return { ...p, referees: next }
    })
  }

  const removeReferee = (index: number) => {
    if (!sectionEdit.referees) return
    setProfile((p) => ({ ...p, referees: p.referees.filter((_, i) => i !== index) }))
  }

  async function openProjectImportModal(index: number) {
    setActiveProjectIndex(index)
    setProjectImportOpen(true)
    setIsImporting(true)
    setImportError(null)
    try {
      const uid = await getUserId()
      await log('project import modal open', 'P_PROJ', { hasUser: !!uid, index })
      if (!uid) {
        setImportError('Please sign in to import from Business Bank.')
        return
      }

      const { data, error } = await supabase
        .from('business_bank_items')
        .select('id,item_type,title,metadata,file_path,file_type,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      await log('project import fetch business_bank_items', 'P_PROJ', {
        hasError: !!error,
        rowCount: Array.isArray(data) ? data.length : 0,
        errorMessage: (error as any)?.message ?? null,
      })

      if (error) {
        setImportError((error as any)?.message ?? 'Failed to load Business Bank items')
        return
      }

      // For Projects, only allow attaching file-based Business Bank items (physical artifacts):
      // images, videos, audio/podcasts, PDFs/docs, etc. (anything with a file_path).
      const filtered = (data ?? [])
        .filter((i: any) => i.item_type !== 'profile')
        .filter((i: any) => !!i.file_path)

      setAvailableItems(filtered as any)

      const pre = new Set<number>(Array.isArray(profile.projects[index]?.attachmentIds) ? (profile.projects[index].attachmentIds as any) : [])
      const nextSel: Record<number, boolean> = {}
      for (const it of filtered as any[]) {
        nextSel[it.id] = pre.has(it.id)
      }
      setProjectSelectedIds(nextSel)
    } finally {
      setIsImporting(false)
    }
  }

  async function openProjectImportFromHeader() {
    if (!sectionEdit.projects) return
    if (!profile.projects.length) {
      alert('Add a project first, then import files from Business Bank into it.')
      return
    }
    const selectedIdx = Object.entries(bulkSel.projects)
      .filter(([, v]) => !!v)
      .map(([k]) => Number(k))
      .filter((n) => Number.isFinite(n))

    let target = 0
    if (profile.projects.length === 1) {
      target = 0
    } else if (selectedIdx.length === 1) {
      target = selectedIdx[0]
    } else {
      alert('Select exactly one Project (checkbox) first, then click “Import from Business Bank”.')
      return
    }
    await openProjectImportModal(target)
  }

  async function openIntroVideoModal() {
    setIntroModalOpen(true)
    setIsImporting(true)
    setImportError(null)
    setIntroPreviewUrl(null)
    try {
      const uid = await getUserId()
      await log('intro video modal open', 'P_LAYOUT', { hasUser: !!uid })
      if (!uid) {
        setImportError('Please sign in to pick an intro video.')
        return
      }
      const { data, error } = await supabase
        .from('business_bank_items')
        .select('id,item_type,title,metadata,file_path,file_url,file_type,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      await log('intro video fetch business_bank_items', 'P_LAYOUT', {
        hasError: !!error,
        rowCount: Array.isArray(data) ? data.length : 0,
        errorMessage: (error as any)?.message ?? null,
      })

      if (error) {
        setImportError((error as any)?.message ?? 'Failed to load Business Bank items')
        return
      }
      
      // Filter for video items: business_introduction items, or items with file_path (video files) or file_url (linked videos)
      const vids = (data ?? []).filter((i: any) => {
        // Include business_introduction items (they can have file_path, file_url, or both)
        if (i.item_type === 'business_introduction') return true
        // Include items with video file_path
        if (i.file_path && (i.file_type?.startsWith?.('video') ?? false)) return true
        // Include items with file_url (linked videos)
        if (i.file_url) return true
        return false
      })
      
      setIntroItems(vids)
      const current = typeof profile.introVideoId === 'number' ? profile.introVideoId : null
      setIntroPickId(current)
      if (current) {
        const found = vids.find((v: any) => v.id === current)
        if (found) {
          // For uploaded/recorded videos, use file_path to get signed URL
          if (found.file_path) {
            const { data: urlData } = await supabase.storage.from('business-bank').createSignedUrl(found.file_path, 60 * 30)
            if (urlData?.signedUrl) {
              setIntroPreviewUrl(urlData.signedUrl)
              introPreviewVideoIdRef.current = current
            }
          }
          // For linked videos, use file_url directly
          else if (found.file_url) {
            setIntroPreviewUrl(found.file_url)
            introPreviewVideoIdRef.current = current
          }
        }
      }
    } finally {
      setIsImporting(false)
    }
  }

  async function applyIntroVideo() {
    console.log('[BusinessProfileEditor] Applying intro video:', { introVideoId: introPickId, hasPreviewUrl: !!introPreviewUrl })
    
    // Ensure preview URL is set if we have a video ID but no preview URL yet
    if (introPickId && (!introPreviewUrl || introPreviewVideoIdRef.current !== introPickId)) {
      const uid = await getUserId()
      if (uid) {
        const { data: item } = await supabase
          .from('business_bank_items')
          .select('id,file_path,file_url')
          .eq('user_id', uid)
          .eq('id', introPickId)
          .maybeSingle()
        
        if (item) {
          if (item.file_path) {
            const { data: urlData } = await supabase.storage.from('business-bank').createSignedUrl(item.file_path, 60 * 30)
            if (urlData?.signedUrl) {
              setIntroPreviewUrl(urlData.signedUrl)
              introPreviewVideoIdRef.current = introPickId
            }
          } else if (item.file_url) {
            setIntroPreviewUrl(item.file_url)
            introPreviewVideoIdRef.current = introPickId
          }
        }
      }
    }
    
    setProfile((prev) => {
      const updated = { ...prev, introVideoId: introPickId }
      console.log('[BusinessProfileEditor] Updated profile with introVideoId:', { introVideoId: updated.introVideoId })
      return updated
    })
    await log('intro video applied', 'P_LAYOUT', { introVideoId: introPickId })
    setIntroModalOpen(false)
    // Save the profile after applying the video
    await savePortfolio({ redirect: false, source: 'intro-video-apply' })
  }

  async function applyProjectImport() {
    try {
      if (activeProjectIndex == null) {
        setProjectImportOpen(false)
        return
      }
      const selected = availableItems.filter((i) => projectSelectedIds[i.id])
      const ids = selected.map((x) => x.id)
      await log('project import apply', 'P_PROJ', { index: activeProjectIndex, selectedCount: ids.length })
      setProfile((prev) => {
        const updated = [...prev.projects]
        const cur = updated[activeProjectIndex]
        if (!cur) return prev
        updated[activeProjectIndex] = { ...cur, attachmentIds: ids }
        return { ...prev, projects: updated }
      })
      setProjectImportOpen(false)
    } catch (e: any) {
      await log('project import apply exception', 'P_PROJ', { message: e?.message ?? String(e) })
      setImportError(e?.message ?? 'Failed to import')
    }
  }


  async function openEducationImportModal(index: number) {
    setEducationImportOpen(true)
    setActiveEducationIndex(index)
    setIsImporting(true)
    setImportError(null)
    try {
      const uid = await getUserId()
      if (!uid) {
        setImportError('Please sign in to import from Business Bank.')
        return
      }

      const { data, error } = await supabase
        .from('business_bank_items')
        .select('id,item_type,title,metadata,file_path,file_type,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (error) {
        setImportError((error as any)?.message ?? 'Failed to load Business Bank items')
        return
      }

      // For Education, only allow attaching file-based Business Bank items (documents, PDFs, etc.)
      const filtered = (data ?? [])
        .filter((i: any) => i.item_type !== 'profile')
        .filter((i: any) => !!i.file_path)

      setAvailableItems(filtered as any)

      const pre = new Set<number>(Array.isArray(profile.education[index]?.attachmentIds) ? (profile.education[index].attachmentIds as any) : [])
      const nextSel: Record<number, boolean> = {}
      for (const it of filtered as any[]) {
        nextSel[it.id] = pre.has(it.id)
      }
      setEducationSelectedIds(nextSel)
    } finally {
      setIsImporting(false)
    }
  }

  async function applyEducationImport() {
    try {
      if (activeEducationIndex == null) {
        setEducationImportOpen(false)
        return
      }
      const selected = availableItems.filter((i) => educationSelectedIds[i.id])
      const ids = selected.map((x) => x.id)
      setProfile((prev) => {
        const updated = [...prev.education]
        const cur = updated[activeEducationIndex]
        if (!cur) return prev
        updated[activeEducationIndex] = { ...cur, attachmentIds: ids }
        return { ...prev, education: updated }
      })
      setEducationImportOpen(false)
    } catch (e: any) {
      setImportError(e?.message ?? 'Failed to import')
    }
  }

  async function openRefereeImportModal(index: number) {
    setRefereeImportOpen(true)
    setActiveRefereeIndex(index)
    setIsImporting(true)
    setImportError(null)
    try {
      const uid = await getUserId()
      if (!uid) {
        setImportError('Please sign in to import from Business Bank.')
        return
      }

      const { data, error } = await supabase
        .from('business_bank_items')
        .select('id,item_type,title,metadata,file_path,file_type,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (error) {
        setImportError((error as any)?.message ?? 'Failed to load Business Bank items')
        return
      }

      // For Referees, only allow attaching file-based Business Bank items (documents, PDFs, etc.)
      const filtered = (data ?? [])
        .filter((i: any) => i.item_type !== 'profile')
        .filter((i: any) => !!i.file_path)

      setAvailableItems(filtered as any)

      const pre = new Set<number>(Array.isArray(profile.referees[index]?.attachmentIds) ? (profile.referees[index].attachmentIds as any) : [])
      const nextSel: Record<number, boolean> = {}
      for (const it of filtered as any[]) {
        nextSel[it.id] = pre.has(it.id)
      }
      setRefereeSelectedIds(nextSel)
    } finally {
      setIsImporting(false)
    }
  }

  async function applyRefereeImport() {
    try {
      if (activeRefereeIndex == null) {
        setRefereeImportOpen(false)
        return
      }
      const selected = availableItems.filter((i) => refereeSelectedIds[i.id])
      const ids = selected.map((x) => x.id)
      setProfile((prev) => {
        const updated = [...prev.referees]
        const cur = updated[activeRefereeIndex]
        if (!cur) return prev
        updated[activeRefereeIndex] = { ...cur, attachmentIds: ids }
        return { ...prev, referees: updated }
      })
      setRefereeImportOpen(false)
    } catch (e: any) {
      setImportError(e?.message ?? 'Failed to import')
    }
  }

  const savePortfolio = async (opts?: { redirect?: boolean; source?: string; sectionVisibilityOverride?: typeof sectionVisibility }) => {
    try {
      const uid = await getUserId()
      await log('savePortfolio start', 'P_SAVE', { hasUser: !!uid, redirect: !!opts?.redirect, source: opts?.source ?? null })
      if (!uid) {
        alert('Please sign in to save your profile.')
        return false
      }
      const trimmedIndustry = typeof profile.title === 'string' ? profile.title.trim() : ''
      if (trimmedIndustry && !INDUSTRY_SET.has(trimmedIndustry)) {
        alert('Please select a valid industry from the list.')
        return false
      }

      const usersRowExists = await ensureUsersRow(uid)
      if (!usersRowExists) {
        const errorMsg = 'Cannot save profile: Your user account is not properly set up in the database. Please contact support or ensure migration 2025122208_users_self_row.sql has been run.'
        console.error('[BusinessProfileEditor] CRITICAL: Could not ensure users row exists. Aborting save.')
        console.error('[BusinessProfileEditor] Migration 2025122208_users_self_row.sql must be run in Supabase.')
        alert(errorMsg)
        return false
      }

      // Sync basic business profile fields to business_profiles (used by discovery/search).
      // This is a best-effort sync to avoid breaking save when schemas differ across envs.
      const saveBusinessProfileBasics = async () => {
        const rawName = typeof profile.name === 'string' ? profile.name.trim() : ''
        const rawTitle = typeof profile.title === 'string' ? profile.title.trim() : ''
        const rawBio = typeof profile.bio === 'string' ? profile.bio.trim() : ''
        const basePayload: Record<string, any> = { user_id: uid }
        let fields: Record<string, any> = {
          business_name: rawName || null,
          name: rawName || null,
          description: rawBio || null,
          category: rawTitle || null,
          industry: rawTitle || null,
        }

        for (let i = 0; i < 6; i += 1) {
          const payload = { ...basePayload, ...fields }
          const res = await supabase
            .from('business_profiles')
            .upsert(payload as any, { onConflict: 'user_id' })
            .select('id')
            .maybeSingle()
          if (!res.error) {
            if (res.data?.id) setBusinessProfileId(res.data.id)
            return true
          }

          const msg = String(res.error.message || '')
          const missingColMatch =
            msg.match(/Could not find the '(.+?)' column/i) ||
            msg.match(/column \"?([a-zA-Z0-9_]+)\"? does not exist/i)
          const missingCol = missingColMatch?.[1]
          if (missingCol && Object.prototype.hasOwnProperty.call(fields, missingCol)) {
            delete fields[missingCol]
            continue
          }

          console.warn('[BusinessProfileEditor] business_profiles upsert failed:', res.error)
          return false
        }
        return false
      }

      await saveBusinessProfileBasics()

      // Update existing profile item if present; otherwise insert a new one.
      const existing = await supabase
        .from('business_bank_items')
        .select('id,metadata')
        .eq('user_id', uid)
        .eq('item_type', 'profile')
        .order('created_at', { ascending: false })
        .limit(1)

      const existingId = existing.data?.[0]?.id ?? null
      const existingMeta = (existing.data?.[0] as any)?.metadata ?? {}
      const keepSelections = Array.isArray(existingMeta?.profileSelections) ? existingMeta.profileSelections : []
      
      // Explicitly preserve attachmentIds for education, projects, and referees
      // Explicitly ensure skills array is included
      // Use override if provided (for immediate state updates), otherwise use current state
      const visibilityToSave = opts?.sectionVisibilityOverride ?? sectionVisibility
      const payloadMeta = {
        ...profile,
        profileSelections: keepSelections,
        sectionVisibility: visibilityToSave, // Save section visibility settings
        itemVisibility: itemVisibility, // Save individual item visibility settings
        skills: Array.isArray(profile.skills) ? profile.skills : [],
        education: Array.isArray(profile.education)
          ? profile.education.map((e) => ({
              ...e,
              attachmentIds: Array.isArray(e.attachmentIds) ? e.attachmentIds : []
            }))
          : profile.education,
        projects: Array.isArray(profile.projects)
          ? profile.projects.map((p) => ({
              ...p,
              attachmentIds: Array.isArray(p.attachmentIds) ? p.attachmentIds : []
            }))
          : profile.projects,
        referees: Array.isArray(profile.referees)
          ? profile.referees.map((r) => ({
              ...r,
              attachmentIds: Array.isArray(r.attachmentIds) ? r.attachmentIds : []
            }))
          : profile.referees,
      }
      
      // Debug: Log skills being saved
      console.log('[BusinessProfileEditor] Saving skills:', {
        skillsCount: Array.isArray(payloadMeta.skills) ? payloadMeta.skills.length : 0,
        skills: Array.isArray(payloadMeta.skills) ? payloadMeta.skills : [],
        skillsType: typeof payloadMeta.skills,
        skillsIsArray: Array.isArray(payloadMeta.skills),
      })
      
      // Debug: Log education attachmentIds being saved
      if (Array.isArray(payloadMeta.education) && payloadMeta.education.length > 0) {
        console.log('[BusinessProfileEditor] Saving education with attachmentIds:', payloadMeta.education.map((e: any, i: number) => ({
          index: i,
          institution: e?.institution,
          degree: e?.degree,
          attachmentIds: e?.attachmentIds,
          attachmentIdsType: typeof e?.attachmentIds,
          attachmentIdsIsArray: Array.isArray(e?.attachmentIds),
        })))
      }
      
      await log('savePortfolio projects summary', 'P_PROJ', {
        projectCount: Array.isArray((payloadMeta as any)?.projects) ? (payloadMeta as any).projects.length : 0,
        projectsWithAttachments: Array.isArray((payloadMeta as any)?.projects)
          ? (payloadMeta as any).projects.filter((p: any) => Array.isArray(p?.attachmentIds) && p.attachmentIds.length).length
          : 0,
        totalProjectAttachmentIds: Array.isArray((payloadMeta as any)?.projects)
          ? (payloadMeta as any).projects.reduce((n: number, p: any) => n + (Array.isArray(p?.attachmentIds) ? p.attachmentIds.length : 0), 0)
          : 0,
      })
      await log('savePortfolio layout summary', 'P_LAYOUT', {
        sectionOrderLen: Array.isArray((payloadMeta as any)?.sectionOrder) ? (payloadMeta as any).sectionOrder.length : 0,
        introVideoId: (payloadMeta as any)?.introVideoId ?? null,
      })
      console.log('[BusinessProfileEditor] Saving profile with introVideoId:', {
        introVideoId: (payloadMeta as any)?.introVideoId,
        introVideoIdType: typeof (payloadMeta as any)?.introVideoId,
        payloadMetaKeys: Object.keys(payloadMeta),
      })

      if (existingId) {
        // Log what we're about to save
        const educationWithAttachments = Array.isArray(payloadMeta.education) 
          ? payloadMeta.education.filter((e: any) => Array.isArray(e?.attachmentIds) && e.attachmentIds.length > 0)
          : []
        const projectsWithAttachments = Array.isArray(payloadMeta.projects)
          ? payloadMeta.projects.filter((p: any) => Array.isArray(p?.attachmentIds) && p.attachmentIds.length > 0)
          : []
        console.log('[BusinessProfileEditor] Updating profile with:', {
          educationEntriesWithAttachments: educationWithAttachments.length,
          projectEntriesWithAttachments: projectsWithAttachments.length,
          totalEducationEntries: Array.isArray(payloadMeta.education) ? payloadMeta.education.length : 0,
          totalProjectEntries: Array.isArray(payloadMeta.projects) ? payloadMeta.projects.length : 0,
        })
        
        const { error, data } = await supabase
          .from('business_bank_items')
          .update({ title: 'Profile', metadata: payloadMeta })
          .eq('id', existingId)
          .eq('user_id', uid)
          .select('id, metadata')
        await log('savePortfolio update', 'P_SAVE', {
          hasError: !!error,
          errorCode: (error as any)?.code ?? null,
          errorMessage: (error as any)?.message ?? null,
          errorDetails: (error as any)?.details ?? null,
          httpStatus: (error as any)?.status ?? null,
        })
        if (error) {
          console.error('[BusinessProfileEditor] Save failed:', error)
          // Check for 403/RLS errors specifically
          const status = (error as any)?.status ?? (error as any)?.code
          if (status === 403 || String(error?.message || '').includes('policy') || String(error?.message || '').includes('RLS')) {
            alert('Cannot save profile: Database permissions error. Your account may not have the required permissions. Please contact support.')
            return false
          }
          throw error
        }
        // CRITICAL: Verify the save actually succeeded by checking the response
        if (!data || !data[0]) {
          console.error('[BusinessProfileEditor] Save returned no data - save may have failed silently')
          alert('Portfolio save may have failed. Please refresh and try again.')
          return false
        }
        // Verify what was actually saved
        const savedMeta = data[0].metadata as any
        const savedEducationWithAttachments = Array.isArray(savedMeta?.education)
          ? savedMeta.education.filter((e: any) => Array.isArray(e?.attachmentIds) && e.attachmentIds.length > 0)
          : []
        console.log('[BusinessProfileEditor] Portfolio updated successfully. Saved education entries with attachments:', savedEducationWithAttachments.length)
        
        // Reload profile from database to ensure UI reflects saved state
        // Skip reload for visibility-only and intro video saves since we already have the correct state
        const isVisibilityOnlySave = opts?.source?.startsWith('visibility:')
        const isIntroVideoSave = opts?.source?.startsWith('intro-video')
        if (!isVisibilityOnlySave && !isIntroVideoSave) {
          await loadSavedPortfolio()
        } else {
          console.log('[BusinessProfileEditor] Skipping reload for', isVisibilityOnlySave ? 'visibility-only' : 'intro-video', 'save')
        }
      } else {
        // Log what we're about to insert
        const educationWithAttachments = Array.isArray(payloadMeta.education) 
          ? payloadMeta.education.filter((e: any) => Array.isArray(e?.attachmentIds) && e.attachmentIds.length > 0)
          : []
        const projectsWithAttachments = Array.isArray(payloadMeta.projects)
          ? payloadMeta.projects.filter((p: any) => Array.isArray(p?.attachmentIds) && p.attachmentIds.length > 0)
          : []
        console.log('[BusinessProfileEditor] Inserting new profile with:', {
          educationEntriesWithAttachments: educationWithAttachments.length,
          projectEntriesWithAttachments: projectsWithAttachments.length,
        })
        
        // Log the payload before insert to debug
        console.log('[BusinessProfileEditor] Inserting with payload:', {
          user_id: uid,
          user_id_type: typeof uid,
          item_type: 'profile',
          title: 'Profile',
          metadata_keys: Object.keys(payloadMeta),
          metadata_size: JSON.stringify(payloadMeta).length,
        })
        
        const { error, data } = await supabase.from('business_bank_items').insert({
          user_id: uid,
          item_type: 'profile',
          title: 'Profile',
          metadata: payloadMeta,
        }).select('id, metadata')
        
        await log('savePortfolio insert', 'P_SAVE', {
          hasError: !!error,
          errorCode: (error as any)?.code ?? null,
          errorMessage: (error as any)?.message ?? null,
          errorDetails: (error as any)?.details ?? null,
          errorHint: (error as any)?.hint ?? null,
          httpStatus: (error as any)?.status ?? null,
          user_id: uid,
          user_id_type: typeof uid,
        })
        if (error) {
          console.error('[BusinessProfileEditor] Insert failed:', error)
          // Check for 403/RLS errors specifically
          const status = (error as any)?.status ?? (error as any)?.code
          if (status === 403 || String(error?.message || '').includes('policy') || String(error?.message || '').includes('RLS')) {
            alert('Cannot save profile: Database permissions error. Your account may not have the required permissions. Please contact support.')
            return false
          }
          throw error
        }
        // CRITICAL: Verify the insert actually succeeded
        if (!data || !data[0]) {
          console.error('[BusinessProfileEditor] Insert returned no data - save may have failed silently')
          alert('Portfolio save may have failed. Please refresh and try again.')
          return false
        }
        // Verify what was actually saved
        const savedMeta = data[0].metadata as any
        const savedEducationWithAttachments = Array.isArray(savedMeta?.education)
          ? savedMeta.education.filter((e: any) => Array.isArray(e?.attachmentIds) && e.attachmentIds.length > 0)
          : []
        console.log('[BusinessProfileEditor] Portfolio inserted successfully. Saved education entries with attachments:', savedEducationWithAttachments.length)
        
        // Reload profile from database to ensure UI reflects saved state
        // Skip reload for visibility-only and intro video saves since we already have the correct state
        const isVisibilityOnlySave = opts?.source?.startsWith('visibility:')
        const isIntroVideoSave = opts?.source?.startsWith('intro-video')
        if (!isVisibilityOnlySave && !isIntroVideoSave) {
          await loadSavedPortfolio()
        } else {
          console.log('[BusinessProfileEditor] Skipping reload for', isVisibilityOnlySave ? 'visibility-only' : 'intro-video', 'save')
        }
      }

      if (opts?.redirect) {
        alert('Portfolio saved successfully!')
        router.push('/dashboard/business?tab=profile')
      } else {
        // Silent save - no alert for section saves or top-level save
      }
      return true
    } catch (error: any) {
      console.error('Error:', error)
      await log('savePortfolio exception', 'P_SAVE', {
        message: error?.message ?? String(error),
        code: error?.code ?? null,
        details: error?.details ?? null,
      })
      const msg = String(error?.message ?? '')
      if (msg.includes('business_bank_items_user_id_fkey') || msg.toLowerCase().includes('violates foreign key constraint')) {
        alert(
          'Error saving profile: your database requires a matching row in public.users for this account before writing to business_bank_items.\n\n' +
            'Fix:\n' +
            '- Run Supabase migration `2025122208_users_self_row.sql` (then refresh schema cache)\n' +
            '- Sign out + sign in again\n' +
            '- Retry saving the profile.'
        )
      } else {
        alert(error?.message ? `Error saving profile: ${error.message}` : 'Error saving profile')
      }
      return false
    }
  }

  async function saveSection(sectionKey: string) {
    setSavingSection(sectionKey)
    await log('section save clicked', 'P_UI', { section: sectionKey })
    const ok = await savePortfolio({ redirect: false, source: `section:${sectionKey}` })
    if (ok) setSectionEdit((prev) => ({ ...prev, [sectionKey]: false }))
    setSavingSection(null)
  }


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold truncate pr-4">{preview.title}</div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
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
                <video src={preview.url} controls className="max-h-[75vh] w-auto object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 backdrop-blur bg-slate-950/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link href="/dashboard/business" className="text-slate-300 hover:text-blue-400">← Back</Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/business/view" className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 border border-purple-500/50 font-semibold">
              View Profile
            </Link>
            <button
              type="button"
              onClick={async () => {
                await savePortfolio({ redirect: false, source: 'top-save-all' })
              }}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 font-semibold"
            >
              Save
            </button>
          </div>
        </div>
        {/* Section Navigation Menu */}
        <div className="max-w-7xl mx-auto px-8 py-3 border-t border-white/10 bg-slate-950/90">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap mr-2">Jump to:</span>
            {[
              { id: 'section-basic', label: 'Basic Information' },
              { id: 'section-intro', label: 'Introduction Video' },
              { id: 'section-social', label: 'Social' },
              { id: 'section-products', label: 'Products & Services' },
              { id: 'section-culture', label: 'Culture & Values' },
              { id: 'section-attachments', label: 'Attachments' },
              { id: 'section-projects', label: 'Projects' },
              { id: 'section-layout', label: 'Layout' },
            ].map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  const element = document.getElementById(section.id)
                  if (element) {
                    const headerOffset = 120 // Account for sticky header
                    const elementPosition = element.getBoundingClientRect().top
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset
                    window.scrollTo({
                      top: offsetPosition,
                      behavior: 'smooth'
                    })
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 text-xs text-slate-300 hover:text-white whitespace-nowrap transition-colors"
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </header>


      <main className="max-w-4xl mx-auto px-8 py-10 space-y-6">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <div className="text-xs text-slate-400">
            Tip: Use section Save buttons to save as you go.
          </div>
        </div>

        {/* Basic Information */}
        <section id="section-basic" className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Basic Information</h2>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer" title="Show in public profile">
                <input
                  type="checkbox"
                  checked={sectionVisibility.basic ?? true}
                  onChange={(e) => {
                    setSectionVisibility(prev => ({ ...prev, basic: e.target.checked }))
                    setTimeout(() => savePortfolio({ redirect: false, source: 'visibility:basic' }), 100)
                  }}
                  className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span>Public</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                className="text-sm underline text-blue-300 disabled:opacity-60"
                disabled={websiteImportLoading}
                onClick={handleWebsiteImport}
              >
                {websiteImportLoading ? 'Importing…' : 'Import from website'}
              </button>
              {!sectionEdit.basic ? (
                <button className="text-sm underline text-blue-300" onClick={() => setSectionEdit((p) => ({ ...p, basic: true }))}>
                  Edit
                </button>
              ) : (
                <button
                  className="text-sm underline text-blue-300 disabled:opacity-60"
                  disabled={savingSection === 'basic'}
                  onClick={() => saveSection('basic')}
                >
                  {savingSection === 'basic' ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
          </div>
          <div className="mb-5 grid md:grid-cols-2 gap-4">
            <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-900/40">
              <div className="h-28 w-full bg-slate-900 relative">
                {bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    No banner yet
                  </div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-200 font-medium">Banner</div>
                <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-sm cursor-pointer">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!sectionEdit.basic}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadPortfolioImage('banner', f)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-900/40">
              <div className="p-3 flex items-center gap-4">
                <div className="w-40 h-40 rounded-full border border-white/10 bg-slate-900 overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-xs text-slate-400">No photo</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-200 font-medium">Company Logo</div>
                </div>
                <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-sm cursor-pointer">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!sectionEdit.basic}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadPortfolioImage('avatar', f)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Company Name"
              value={profile.name}
              onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
              disabled={!sectionEdit.basic}
              className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
            />
            <div className="relative">
              <input
                type="text"
                placeholder="Industry"
                value={profile.title}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setProfile((prev) => ({ ...prev, title: nextValue }))
                  setIndustryOpen(true)
                  setIndustryActiveIdx(0)
                }}
                onFocus={() => {
                  if (industrySuggestions.length > 0) setIndustryOpen(true)
                }}
                onBlur={() => setTimeout(() => setIndustryOpen(false), 150)}
                onKeyDown={(e) => {
                  if (!industryOpen || industrySuggestions.length === 0) return
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setIndustryActiveIdx((i) => Math.min(industrySuggestions.length - 1, i + 1))
                    return
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setIndustryActiveIdx((i) => Math.max(0, i - 1))
                    return
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const pick = industrySuggestions[industryActiveIdx]
                    if (pick) {
                      setProfile((prev) => ({ ...prev, title: pick }))
                      setIndustryOpen(false)
                    }
                  }
                }}
                disabled={!sectionEdit.basic}
                className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={industryOpen}
              />
              {industryOpen && industrySuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 rounded-lg border border-slate-800 bg-slate-950 shadow-lg overflow-hidden z-20">
                  {industrySuggestions.map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        idx === industryActiveIdx ? 'bg-slate-800 text-white' : 'bg-slate-950 text-slate-200 hover:bg-slate-900'
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setProfile((prev) => ({ ...prev, title: opt }))
                        setIndustryOpen(false)
                      }}
                      role="option"
                      aria-selected={idx === industryActiveIdx}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <CollapsibleTextarea
              value={profile.bio}
              onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder="About the Company"
              disabled={!sectionEdit.basic}
              className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
              expandKey="bio"
              expanded={!!expandedTextareas['bio']}
              onToggle={toggleTextarea}
              defaultRows={5}
            />
          </div>
        </section>

        {/* Introduction Video */}
        <section id="section-intro" className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Introduction Video</h2>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer" title="Show in public profile">
                <input
                  type="checkbox"
                  checked={sectionVisibility.intro ?? true}
                  onChange={async (e) => {
                    const newValue = e.target.checked
                    const updatedVisibility = { ...sectionVisibility, intro: newValue }
                    setSectionVisibility(updatedVisibility)
                    setTimeout(async () => {
                      await savePortfolio({ 
                        redirect: false, 
                        source: 'visibility:intro',
                        sectionVisibilityOverride: updatedVisibility
                      })
                    }, 100)
                  }}
                  className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span>Public</span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  await openIntroVideoModal()
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
              >
                {profile.introVideoId ? 'Change Video' : 'Select Video'}
              </button>
            </div>
          </div>

          {profile.introVideoId ? (
            <div className="mt-4">
              {introPreviewUrl ? (
                <div className="mx-auto max-w-3xl">
                  <div className="rounded-3xl p-[1px] bg-gradient-to-br from-white/15 via-white/5 to-transparent shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                    <div className="rounded-3xl overflow-hidden bg-slate-950/60 border border-white/10">
                      <div className="bg-black">
                        {(() => {
                          // Check if it's a YouTube URL
                          const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
                          const youtubeMatch = introPreviewUrl.match(youtubeRegex)
                          if (youtubeMatch) {
                            const videoId = youtubeMatch[1]
                            return (
                              <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                className="w-full aspect-video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            )
                          }
                          // Check if it's a Vimeo URL
                          const vimeoRegex = /(?:vimeo\.com\/)(\d+)/
                          const vimeoMatch = introPreviewUrl.match(vimeoRegex)
                          if (vimeoMatch) {
                            const videoId = vimeoMatch[1]
                            return (
                              <iframe
                                src={`https://player.vimeo.com/video/${videoId}`}
                                className="w-full aspect-video"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                              />
                            )
                          }
                          // Regular video URL
                          return (
                            <video src={introPreviewUrl} controls playsInline className="w-full aspect-video object-contain" />
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-sm py-8 text-center">
                  Loading video preview...
                </div>
              )}
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setProfile((prev) => ({ ...prev, introVideoId: null }))
                    setIntroPreviewUrl(null)
                    introPreviewVideoIdRef.current = null
                    await savePortfolio({ redirect: false, source: 'intro-video-remove' })
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm font-medium border border-red-500/30"
                >
                  Remove Video
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-8 border-2 border-dashed border-white/10 rounded-xl text-center">
              <p className="text-slate-400 text-sm mb-4">No introduction video selected</p>
              <p className="text-slate-500 text-xs mb-4">
                Select a video from your Business Bank or upload a new one. Keep your intro under 60-90 seconds and speak to your strongest work examples.
              </p>
              <button
                type="button"
                onClick={async () => {
                  await openIntroVideoModal()
                }}
                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
              >
                Select Video from Business Bank
              </button>
            </div>
          )}
        </section>

        {/* Social */}
        <section id="section-social" className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Social</h2>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer" title="Show in public profile">
                <input
                  type="checkbox"
                  checked={sectionVisibility.social ?? true}
                  onChange={(e) => {
                    setSectionVisibility(prev => ({ ...prev, social: e.target.checked }))
                    setTimeout(() => savePortfolio({ redirect: false, source: 'visibility:social' }), 100)
                  }}
                  className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span>Public</span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              {!sectionEdit.social ? (
                <button className="text-sm underline text-blue-300" onClick={() => setSectionEdit((p) => ({ ...p, social: true }))}>
                  Edit
                </button>
              ) : (
                <button
                  className="text-sm underline text-blue-300 disabled:opacity-60"
                  disabled={savingSection === 'social'}
                  onClick={() => saveSection('social')}
                >
                  {savingSection === 'social' ? 'Saving…' : 'Save'}
                </button>
              )}
              <button
                type="button"
                onClick={addSocialLink}
                disabled={!sectionEdit.social}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-60"
              >
                Add social link
              </button>
              <button
                type="button"
                onClick={saveSocialLinksToTalentBank}
                disabled={!sectionEdit.social || (profile.socialLinks || []).filter((s) => String(s?.url || '').trim()).length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-60"
              >
                Save to Business Bank
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 mb-4">
            Pick a platform and paste your profile link. Supported top platforms: {SOCIAL_PLATFORMS.join(', ')}.
          </div>

          {profile.socialLinks.length === 0 ? (
            <div className="text-sm text-slate-400">No social links added yet.</div>
          ) : (
            <div className="space-y-3">
              {profile.socialLinks.map((s, idx) => (
                <div key={idx} className="p-4 border border-white/10 rounded-xl bg-slate-900/40">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer" title="Show this social link in public profile">
                      <input
                        type="checkbox"
                        checked={itemVisibility.social?.[idx] ?? true}
                        onChange={(e) => {
                          setItemVisibility(prev => ({
                            ...prev,
                            social: { ...prev.social, [idx]: e.target.checked }
                          }))
                          setTimeout(() => savePortfolio({ redirect: false, source: 'visibility:social-item' }), 100)
                        }}
                        className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
                      />
                      <span>Public</span>
                    </label>
                  </div>
                  <div className="grid md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-3">
                      <select
                        value={s.platform}
                        onChange={(e) => updateSocialLink(idx, 'platform', e.target.value)}
                        disabled={!sectionEdit.social}
                        className="w-full p-3 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                      >
                        {SOCIAL_PLATFORMS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-8">
                      <input
                        type="url"
                        placeholder="https://…"
                        value={s.url}
                        onChange={(e) => updateSocialLink(idx, 'url', e.target.value)}
                        disabled={!sectionEdit.social}
                        className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeSocialLink(idx)}
                        disabled={!sectionEdit.social}
                        className="text-xs text-red-300 underline disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Products & Services */}
        <section id="section-products" className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Products & Services</h2>
            </div>
            <div className="flex items-center gap-3">
              {!sectionEdit.products_services ? (
                <button className="text-sm underline text-blue-300" onClick={() => setSectionEdit((p) => ({ ...p, products_services: true }))}>
                  Edit
                </button>
              ) : (
                <button
                  className="text-sm underline text-blue-300 disabled:opacity-60"
                  disabled={productSaving}
                  onClick={saveProductsServices}
                >
                  {productSaving ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
          </div>

          {productError ? <div className="mb-4 text-sm text-red-400">{productError}</div> : null}

          {/* Overview Editor */}
          <div className="border border-white/10 rounded-xl p-4 bg-slate-900/30 mb-6">
            <div className="text-sm text-slate-300 font-semibold mb-3">Overview</div>
            <div className="grid gap-3">
              <input
                type="text"
                placeholder="Short headline"
                value={productsOverview.short_headline}
                onChange={(e) => setProductsOverview((prev) => ({ ...prev, short_headline: e.target.value }))}
                disabled={!sectionEdit.products_services}
                className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
              />
              <CollapsibleTextarea
                value={productsOverview.summary}
                onChange={(e) => setProductsOverview((prev) => ({ ...prev, summary: e.target.value }))}
                placeholder="Summary (2–3 sentences)"
                disabled={!sectionEdit.products_services}
                className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                expandKey="products-summary"
                expanded={!!expandedTextareas['products-summary']}
                onToggle={toggleTextarea}
                defaultRows={4}
                showVoiceButtons
              />
              <div>
                <div className="text-xs text-slate-400 mb-2">Primary industries</div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add industry"
                    value={productInputs['overview-industry'] || ''}
                    onChange={(e) => setProductInput('overview-industry', e.target.value)}
                    disabled={!sectionEdit.products_services}
                    className="flex-1 p-2 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={!sectionEdit.products_services}
                    className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
                    onClick={() =>
                      setProductsOverview((prev) => ({
                        ...prev,
                        primary_industries: pushTag(prev.primary_industries, productInputs['overview-industry'] || ''),
                      }))
                    }
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {productsOverview.primary_industries.map((i) => (
                    <span key={i} className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-200">
                      {i}
                      {sectionEdit.products_services && (
                        <button
                          type="button"
                          className="ml-2 text-red-400"
                          onClick={() =>
                            setProductsOverview((prev) => ({ ...prev, primary_industries: removeTag(prev.primary_industries, i) }))
                          }
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <select
                  value={productsOverview.business_model}
                  onChange={(e) => setProductsOverview((prev) => ({ ...prev, business_model: e.target.value }))}
                  disabled={!sectionEdit.products_services}
                  className="p-2 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                >
                  {BUSINESS_MODEL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={productsOverview.is_public}
                    onChange={(e) => setProductsOverview((prev) => ({ ...prev, is_public: e.target.checked }))}
                    disabled={!sectionEdit.products_services}
                  />
                  Public overview
                </label>
              </div>
            </div>
          </div>

          {/* Product/Service Card Manager */}
          <div className="border border-white/10 rounded-xl p-4 bg-slate-900/30 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-slate-300 font-semibold">Product / Service Cards</div>
              <button
                type="button"
                className="px-3 py-1.5 bg-green-600 text-white rounded disabled:opacity-60"
                disabled={!sectionEdit.products_services}
                onClick={addProductCard}
              >
                Add Card
              </button>
            </div>
            {productLoading ? (
              <div className="text-sm text-slate-400">Loading products…</div>
            ) : productCards.length === 0 ? (
              <div className="text-sm text-slate-400">No products or services added yet.</div>
            ) : (
              <div className="space-y-4">
                {productCards.map((card, index) => (
                  <div
                    key={card.id ?? `new-${index}`}
                    className="border border-white/10 rounded-xl p-4 bg-slate-950/40"
                    draggable
                    onDragStart={() => setProductDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (productDragIndex == null) return
                      moveProductCard(productDragIndex, index)
                      setProductDragIndex(null)
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-slate-400">Drag to reorder</div>
                      <button
                        type="button"
                        className="text-xs text-red-300 underline"
                        disabled={!sectionEdit.products_services}
                        onClick={() => removeProductCard(index)}
                      >
                        Delete
                      </button>
                    </div>
                    <div className="grid gap-3">
                      <input
                        type="text"
                        placeholder="Name"
                        value={card.name}
                        onChange={(e) => updateProductCard(index, { name: e.target.value })}
                        disabled={!sectionEdit.products_services}
                        className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                      />
                      <div className="grid sm:grid-cols-2 gap-3">
                        <select
                          value={card.category}
                          onChange={(e) => updateProductCard(index, { category: e.target.value })}
                          disabled={!sectionEdit.products_services}
                          className="p-2 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                        >
                          {PRODUCT_CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <select
                          value={card.lifecycle_stage}
                          onChange={(e) => updateProductCard(index, { lifecycle_stage: e.target.value })}
                          disabled={!sectionEdit.products_services}
                          className="p-2 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                        >
                          <option value="">Lifecycle stage</option>
                          {LIFECYCLE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <select
                          value={card.visibility_level}
                          onChange={(e) => updateProductCard(index, { visibility_level: e.target.value })}
                          disabled={!sectionEdit.products_services}
                          className="p-2 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                        >
                          {VISIBILITY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={card.is_published}
                            onChange={(e) => updateProductCard(index, { is_published: e.target.checked })}
                            disabled={!sectionEdit.products_services}
                          />
                          Published
                        </label>
                      </div>
                      <CollapsibleTextarea
                        value={card.short_description}
                        onChange={(e) => updateProductCard(index, { short_description: e.target.value })}
                        placeholder="Short description"
                        disabled={!sectionEdit.products_services}
                        className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                        expandKey={`product-short-${index}`}
                        expanded={!!expandedTextareas[`product-short-${index}`]}
                        onToggle={toggleTextarea}
                        defaultRows={3}
                        showVoiceButtons
                      />
                      <CollapsibleTextarea
                        value={card.who_it_is_for}
                        onChange={(e) => updateProductCard(index, { who_it_is_for: e.target.value })}
                        placeholder="Who it is for"
                        disabled={!sectionEdit.products_services}
                        className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                        expandKey={`product-for-${index}`}
                        expanded={!!expandedTextareas[`product-for-${index}`]}
                        onToggle={toggleTextarea}
                        defaultRows={3}
                        showVoiceButtons
                      />
                      <CollapsibleTextarea
                        value={card.problem_it_solves}
                        onChange={(e) => updateProductCard(index, { problem_it_solves: e.target.value })}
                        placeholder="Problem it solves"
                        disabled={!sectionEdit.products_services}
                        className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                        expandKey={`product-problem-${index}`}
                        expanded={!!expandedTextareas[`product-problem-${index}`]}
                        onToggle={toggleTextarea}
                        defaultRows={3}
                        showVoiceButtons
                      />

                      <div className="grid sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Explainer video URL"
                          value={card.explainer_video_url}
                          onChange={(e) => updateProductCard(index, { explainer_video_url: e.target.value })}
                          disabled={!sectionEdit.products_services}
                          className="p-2 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                        />
                        <input
                          type="text"
                          placeholder="External link"
                          value={card.external_link}
                          onChange={(e) => updateProductCard(index, { external_link: e.target.value })}
                          disabled={!sectionEdit.products_services}
                          className="p-2 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 mb-2">Logo / Icon</div>
                        {card.logo_or_icon ? (
                          <div className="mb-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumbUrls[card.logo_or_icon] || card.logo_or_icon}
                              alt="Logo"
                              className="h-16 w-16 rounded bg-white/5 border border-white/10 object-contain"
                            />
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text"
                            placeholder="Logo URL or storage path"
                            value={card.logo_or_icon}
                            onChange={(e) => updateProductCard(index, { logo_or_icon: e.target.value })}
                            disabled={!sectionEdit.products_services}
                            className="flex-1 p-2 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                          />
                          <input
                            type="file"
                            accept="image/*"
                            disabled={!sectionEdit.products_services}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) uploadProductLogo(index, file)
                              e.currentTarget.value = ''
                            }}
                            className="text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 mb-2">Media</div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <input
                            type="file"
                            multiple
                            accept="image/*,video/*,application/pdf"
                            disabled={!sectionEdit.products_services}
                            onChange={(e) => {
                              const files = Array.from(e.target.files || [])
                              if (files.length) uploadProductMedia(index, files)
                              e.currentTarget.value = ''
                            }}
                            className="text-xs"
                          />
                          <button
                            type="button"
                            disabled={!sectionEdit.products_services}
                            className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs"
                            onClick={() => {
                              const link = window.prompt('Enter a media link')
                              if (link) addProductMediaLink(index, link)
                            }}
                          >
                            Add Link
                          </button>
                        </div>
                        {card.media.length ? (
                          <div className="space-y-2">
                            {card.media.map((m, mIndex) => (
                              <div key={`${m.media_type}-${mIndex}`} className="flex items-center justify-between gap-3 text-xs text-slate-300">
                                <div className="truncate">{m.title || m.file_url || m.file_path || m.media_type}</div>
                                <button
                                  type="button"
                                  className="text-red-300 underline"
                                  onClick={() => removeProductMedia(index, mIndex)}
                                  disabled={!sectionEdit.products_services}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">No media attached.</div>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-slate-400 mb-2">Teams involved</div>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Add team"
                              value={productInputs[`team-${index}`] || ''}
                              onChange={(e) => setProductInput(`team-${index}`, e.target.value)}
                              disabled={!sectionEdit.products_services}
                              className="flex-1 p-2 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                            />
                            <button
                              type="button"
                              disabled={!sectionEdit.products_services}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                              onClick={() => commitProductTag(index, 'teams', `team-${index}`)}
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {card.teams.map((t) => (
                              <span key={t} className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
                                {t}
                                <button
                                  type="button"
                                  className="ml-2 text-red-400"
                                  onClick={() => updateProductListField(index, 'teams', removeTag(card.teams, t))}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-2">Typical roles</div>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Add role"
                              value={productInputs[`role-${index}`] || ''}
                              onChange={(e) => setProductInput(`role-${index}`, e.target.value)}
                              disabled={!sectionEdit.products_services}
                              className="flex-1 p-2 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                            />
                            <button
                              type="button"
                              disabled={!sectionEdit.products_services}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                              onClick={() => commitProductTag(index, 'roles', `role-${index}`)}
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {card.roles.map((r) => (
                              <span key={r} className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
                                {r}
                                <button
                                  type="button"
                                  className="ml-2 text-red-400"
                                  onClick={() => updateProductListField(index, 'roles', removeTag(card.roles, r))}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-2">Skills used</div>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Add skill"
                              value={productInputs[`skill-${index}`] || ''}
                              onChange={(e) => setProductInput(`skill-${index}`, e.target.value)}
                              disabled={!sectionEdit.products_services}
                              className="flex-1 p-2 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                            />
                            <button
                              type="button"
                              disabled={!sectionEdit.products_services}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                              onClick={() => commitProductTag(index, 'skills', `skill-${index}`)}
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {card.skills.map((s) => (
                              <span key={s} className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
                                {s}
                                <button
                                  type="button"
                                  className="ml-2 text-red-400"
                                  onClick={() => updateProductListField(index, 'skills', removeTag(card.skills, s))}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-2">Growth areas</div>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Add growth area"
                              value={productInputs[`growth-${index}`] || ''}
                              onChange={(e) => setProductInput(`growth-${index}`, e.target.value)}
                              disabled={!sectionEdit.products_services}
                              className="flex-1 p-2 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                            />
                            <button
                              type="button"
                              disabled={!sectionEdit.products_services}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                              onClick={() => commitProductTag(index, 'growth_areas', `growth-${index}`)}
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {card.growth_areas.map((g) => (
                              <span key={g} className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
                                {g}
                                <button
                                  type="button"
                                  className="ml-2 text-red-400"
                                  onClick={() => updateProductListField(index, 'growth_areas', removeTag(card.growth_areas, g))}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                        <CollapsibleTextarea
                          value={card.impact.who_it_helps}
                          onChange={(e) => updateProductCard(index, { impact: { ...card.impact, who_it_helps: e.target.value } })}
                          placeholder="Who it helps"
                          disabled={!sectionEdit.products_services}
                          className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                          expandKey={`impact-helps-${index}`}
                          expanded={!!expandedTextareas[`impact-helps-${index}`]}
                          onToggle={toggleTextarea}
                          defaultRows={3}
                          showVoiceButtons
                        />
                        <CollapsibleTextarea
                          value={card.impact.what_it_improves}
                          onChange={(e) => updateProductCard(index, { impact: { ...card.impact, what_it_improves: e.target.value } })}
                          placeholder="What it improves"
                          disabled={!sectionEdit.products_services}
                          className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                          expandKey={`impact-improves-${index}`}
                          expanded={!!expandedTextareas[`impact-improves-${index}`]}
                          onToggle={toggleTextarea}
                          defaultRows={3}
                          showVoiceButtons
                        />
                        <CollapsibleTextarea
                          value={card.impact.real_world_outcomes}
                          onChange={(e) => updateProductCard(index, { impact: { ...card.impact, real_world_outcomes: e.target.value } })}
                          placeholder="Real world outcomes"
                          disabled={!sectionEdit.products_services}
                          className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                          expandKey={`impact-outcomes-${index}`}
                          expanded={!!expandedTextareas[`impact-outcomes-${index}`]}
                          onToggle={toggleTextarea}
                          defaultRows={3}
                          showVoiceButtons
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={card.signals.we_are_hiring_for_this}
                            onChange={(e) => updateProductCard(index, { signals: { ...card.signals, we_are_hiring_for_this: e.target.checked } })}
                            disabled={!sectionEdit.products_services}
                          />
                          We are hiring for this
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={card.signals.open_to_partnerships}
                            onChange={(e) => updateProductCard(index, { signals: { ...card.signals, open_to_partnerships: e.target.checked } })}
                            disabled={!sectionEdit.products_services}
                          />
                          Open to partnerships
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={card.signals.in_research_and_development}
                            onChange={(e) => updateProductCard(index, { signals: { ...card.signals, in_research_and_development: e.target.checked } })}
                            disabled={!sectionEdit.products_services}
                          />
                          In research & development
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={card.signals.currently_scaling}
                            onChange={(e) => updateProductCard(index, { signals: { ...card.signals, currently_scaling: e.target.checked } })}
                            disabled={!sectionEdit.products_services}
                          />
                          Currently scaling
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Roadmap / Future Plans */}
          <div className="border border-white/10 rounded-xl p-4 bg-slate-900/30">
            <div className="text-sm text-slate-300 font-semibold mb-3">Roadmap / Future Plans</div>
            <div className="grid gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-2">Upcoming products</div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add upcoming product"
                    value={productInputs['roadmap-upcoming'] || ''}
                    onChange={(e) => setProductInput('roadmap-upcoming', e.target.value)}
                    disabled={!sectionEdit.products_services}
                    className="flex-1 p-2 rounded bg-slate-900 border border-slate-700 text-white disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={!sectionEdit.products_services}
                    className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
                    onClick={() =>
                      setProductsRoadmap((prev) => ({
                        ...prev,
                        upcoming_products: pushTag(prev.upcoming_products, productInputs['roadmap-upcoming'] || ''),
                      }))
                    }
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {productsRoadmap.upcoming_products.map((u) => (
                    <span key={u} className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-200">
                      {u}
                      {sectionEdit.products_services && (
                        <button
                          type="button"
                          className="ml-2 text-red-400"
                          onClick={() =>
                            setProductsRoadmap((prev) => ({ ...prev, upcoming_products: removeTag(prev.upcoming_products, u) }))
                          }
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <CollapsibleTextarea
                value={productsRoadmap.roadmap_ideas}
                onChange={(e) => setProductsRoadmap((prev) => ({ ...prev, roadmap_ideas: e.target.value }))}
                placeholder="Roadmap ideas"
                disabled={!sectionEdit.products_services}
                className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                expandKey="roadmap-ideas"
                expanded={!!expandedTextareas['roadmap-ideas']}
                onToggle={toggleTextarea}
                defaultRows={4}
                showVoiceButtons
              />
              <CollapsibleTextarea
                value={productsRoadmap.expansion_plans}
                onChange={(e) => setProductsRoadmap((prev) => ({ ...prev, expansion_plans: e.target.value }))}
                placeholder="Expansion plans"
                disabled={!sectionEdit.products_services}
                className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                expandKey="roadmap-expansion"
                expanded={!!expandedTextareas['roadmap-expansion']}
                onToggle={toggleTextarea}
                defaultRows={4}
                showVoiceButtons
              />
              <CollapsibleTextarea
                value={productsRoadmap.new_markets}
                onChange={(e) => setProductsRoadmap((prev) => ({ ...prev, new_markets: e.target.value }))}
                placeholder="New markets"
                disabled={!sectionEdit.products_services}
                className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                expandKey="roadmap-markets"
                expanded={!!expandedTextareas['roadmap-markets']}
                onToggle={toggleTextarea}
                defaultRows={4}
                showVoiceButtons
              />
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={productsRoadmap.is_public}
                  onChange={(e) => setProductsRoadmap((prev) => ({ ...prev, is_public: e.target.checked }))}
                  disabled={!sectionEdit.products_services}
                />
                Public roadmap
              </label>
            </div>
          </div>
        </section>

        {/* Experience */}
        <section id="section-culture" className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Culture & Values</h2>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer" title="Show in public profile">
                <input
                  type="checkbox"
                  checked={sectionVisibility.experience ?? true}
                  onChange={async (e) => {
                    const newValue = e.target.checked
                    // Update state immediately
                    const updatedVisibility = { ...sectionVisibility, experience: newValue }
                    setSectionVisibility(updatedVisibility)
                    // Save with the new value directly to avoid race conditions
                    setTimeout(async () => {
                      await savePortfolio({ 
                        redirect: false, 
                        source: 'visibility:experience',
                        sectionVisibilityOverride: updatedVisibility
                      })
                    }, 100)
                  }}
                  className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span>Public</span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              {!sectionEdit.experience ? (
                <button className="text-sm underline text-blue-300" onClick={() => setSectionEdit((p) => ({ ...p, experience: true }))}>
                  Edit
                </button>
              ) : (
                <button
                  className="text-sm underline text-blue-300 disabled:opacity-60"
                  disabled={savingSection === 'experience'}
                  onClick={() => saveSection('experience')}
                >
                  {savingSection === 'experience' ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <div className="text-sm text-slate-300 mb-2">How decisions are made</div>
              <CollapsibleTextarea
                value={profile.cultureDecisions}
                onChange={(e) => setProfile((prev) => ({ ...prev, cultureDecisions: e.target.value }))}
                placeholder="Describe how decisions are made"
                disabled={!sectionEdit.experience}
                className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                expandKey="culture-decisions"
                expanded={!!expandedTextareas['culture-decisions']}
                onToggle={toggleTextarea}
                defaultRows={4}
                showVoiceButtons
              />
            </div>
            <div>
              <div className="text-sm text-slate-300 mb-2">How feedback works</div>
              <CollapsibleTextarea
                value={profile.cultureFeedback}
                onChange={(e) => setProfile((prev) => ({ ...prev, cultureFeedback: e.target.value }))}
                placeholder="Describe how feedback works"
                disabled={!sectionEdit.experience}
                className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                expandKey="culture-feedback"
                expanded={!!expandedTextareas['culture-feedback']}
                onToggle={toggleTextarea}
                defaultRows={4}
                showVoiceButtons
              />
            </div>
            <div>
              <div className="text-sm text-slate-300 mb-2">How conflict is handled</div>
              <CollapsibleTextarea
                value={profile.cultureConflict}
                onChange={(e) => setProfile((prev) => ({ ...prev, cultureConflict: e.target.value }))}
                placeholder="Describe how conflict is handled"
                disabled={!sectionEdit.experience}
                className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                expandKey="culture-conflict"
                expanded={!!expandedTextareas['culture-conflict']}
                onToggle={toggleTextarea}
                defaultRows={4}
                showVoiceButtons
              />
            </div>
            <div>
              <div className="text-sm text-slate-300 mb-2">How success is celebrated</div>
              <CollapsibleTextarea
                value={profile.cultureSuccess}
                onChange={(e) => setProfile((prev) => ({ ...prev, cultureSuccess: e.target.value }))}
                placeholder="Describe how success is celebrated"
                disabled={!sectionEdit.experience}
                className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                expandKey="culture-success"
                expanded={!!expandedTextareas['culture-success']}
                onToggle={toggleTextarea}
                defaultRows={4}
                showVoiceButtons
              />
            </div>
          </div>
        </section>

        {/* Attachments imported from Business Bank */}
        <section id="section-attachments" className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Business Bank Attachments</h2>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer" title="Show in public profile">
                <input
                  type="checkbox"
                  checked={sectionVisibility.attachments ?? true}
                  onChange={(e) => {
                    setSectionVisibility(prev => ({ ...prev, attachments: e.target.checked }))
                    // Auto-save visibility when changed
                    setTimeout(() => savePortfolio({ redirect: false, source: 'visibility:attachments' }), 100)
                  }}
                  className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span>Public</span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              {!sectionEdit.attachments ? (
                <button className="text-sm underline text-blue-300" onClick={() => setSectionEdit((p) => ({ ...p, attachments: true }))}>
                  Edit
                </button>
              ) : (
                <button
                  className="text-sm underline text-blue-300 disabled:opacity-60"
                  disabled={savingSection === 'attachments'}
                  onClick={() => saveSection('attachments')}
                >
                  {savingSection === 'attachments' ? 'Saving…' : 'Save'}
                </button>
              )}
              <button
                type="button"
                onClick={openImportModal}
                disabled={isImporting || !sectionEdit.attachments}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-60"
              >
                {isImporting ? 'Importing…' : 'Import from Business Bank'}
              </button>
            </div>
          </div>
          {sectionEdit.attachments && (
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={bulkIsAllSelected(profile.attachments.map((a) => String(a.id)), bulkSel.attachments)}
                  onChange={(e) => bulkSetAll('attachments', profile.attachments.map((a) => String(a.id)), e.target.checked)}
                  disabled={profile.attachments.length === 0}
                />
                Select all
              </label>
              <button
                type="button"
                disabled={bulkCount(bulkSel.attachments) === 0}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs disabled:opacity-50"
                onClick={() => bulkDeleteSelected('attachments')}
              >
                Delete selected ({bulkCount(bulkSel.attachments)})
              </button>
            </div>
          )}

          {profile.attachments.length === 0 ? (
            <p className="text-slate-400 text-sm">
              No attachments imported yet. Use “Import from Business Bank” to select files.
            </p>
          ) : (
            <ul className="space-y-2">
              {profile.attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 border border-white/10 rounded-xl p-3 bg-slate-900/40">
                  <div className="flex items-center gap-3 min-w-0">
                    {sectionEdit.attachments && (
                      <input
                        type="checkbox"
                        checked={!!bulkSel.attachments[String(a.id)]}
                        onChange={(e) => bulkToggleKey('attachments', String(a.id), e.target.checked)}
                      />
                    )}
                    {renderAttachmentThumb(a)}
                    <div className="min-w-0">
                      <div className="font-medium truncate text-white">{a.title}</div>
                      <div className="text-xs text-slate-400">
                        {a.item_type}
                        {a.file_type ? ` • ${a.file_type}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.url && (
                      <a className="text-blue-300 text-sm underline" href={a.url} target="_blank">
                        Open
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={!sectionEdit.attachments}
                      className="text-red-300 text-sm underline disabled:opacity-60"
                      onClick={() =>
                        setProfile((prev) => ({
                          ...prev,
                          attachments: prev.attachments.filter((x) => x.id !== a.id),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Projects */}
        <section id="section-projects" className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Projects</h2>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer" title="Show in public profile">
                <input
                  type="checkbox"
                  checked={sectionVisibility.projects ?? true}
                  onChange={(e) => {
                    setSectionVisibility(prev => ({ ...prev, projects: e.target.checked }))
                    // Auto-save visibility when changed
                    setTimeout(() => savePortfolio({ redirect: false, source: 'visibility:projects' }), 100)
                  }}
                  className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span>Public</span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              {!sectionEdit.projects ? (
                <button className="text-sm underline text-blue-300" onClick={() => setSectionEdit((p) => ({ ...p, projects: true }))}>
                  Edit
                </button>
              ) : (
                <button
                  className="text-sm underline text-blue-300 disabled:opacity-60"
                  disabled={savingSection === 'projects'}
                  onClick={() => saveSection('projects')}
                >
                  {savingSection === 'projects' ? 'Saving…' : 'Save'}
                </button>
              )}
              <button
                type="button"
                onClick={openProjectImportFromHeader}
                disabled={isImporting || !sectionEdit.projects}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-60"
              >
                {isImporting ? 'Importing…' : 'Import from Business Bank'}
              </button>
              <button
                type="button"
                onClick={addProject}
                disabled={!sectionEdit.projects}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-60"
              >
                Add Project
              </button>
            </div>
          </div>
          {sectionEdit.projects && (
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={bulkIsAllSelected(profile.projects.map((_, i) => String(i)), bulkSel.projects)}
                  onChange={(e) => bulkSetAll('projects', profile.projects.map((_, i) => String(i)), e.target.checked)}
                  disabled={profile.projects.length === 0}
                />
                Select all
              </label>
              <button
                type="button"
                disabled={bulkCount(bulkSel.projects) === 0}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs disabled:opacity-50"
                onClick={() => bulkDeleteSelected('projects')}
              >
                Delete selected ({bulkCount(bulkSel.projects)})
              </button>
            </div>
          )}

          {profile.projects.length === 0 ? (
            <div className="text-sm text-slate-400">No projects added yet.</div>
          ) : (
            <div className="space-y-4">
              {profile.projects.map((p, index) => (
                <div key={index} className="p-4 border border-white/10 rounded-xl bg-slate-900/40">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {sectionEdit.projects && (
                        <input
                          type="checkbox"
                          checked={!!bulkSel.projects[String(index)]}
                          onChange={(e) => bulkToggleKey('projects', String(index), e.target.checked)}
                        />
                      )}
                      <div className="text-sm font-semibold text-slate-200">Project {index + 1}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer" title="Show this project in public profile">
                        <input
                          type="checkbox"
                          checked={itemVisibility.projects?.[index] ?? true}
                          onChange={(e) => {
                            setItemVisibility(prev => ({
                              ...prev,
                              projects: { ...prev.projects, [index]: e.target.checked }
                            }))
                            setTimeout(() => savePortfolio({ redirect: false, source: 'visibility:project-item' }), 100)
                          }}
                          className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
                        />
                        <span>Public</span>
                      </label>
                      <button
                        type="button"
                        disabled={!sectionEdit.projects}
                        className="text-xs text-red-300 underline disabled:opacity-60"
                        onClick={() => removeProject(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Project name"
                      value={p.name}
                      onChange={(e) => updateProject(index, 'name', e.target.value)}
                      disabled={!sectionEdit.projects}
                      className="p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                    />
                    <input
                      type="text"
                      placeholder="URL"
                      value={p.url}
                      onChange={(e) => updateProject(index, 'url', e.target.value)}
                      disabled={!sectionEdit.projects}
                      className="p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                    />
                    <div className="md:col-span-2">
                      <CollapsibleTextarea
                        value={p.description}
                        onChange={(e) => updateProject(index, 'description', e.target.value)}
                        placeholder="Description"
                        disabled={!sectionEdit.projects}
                        className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                        expandKey={`project-${index}`}
                        expanded={!!expandedTextareas[`project-${index}`]}
                        onToggle={toggleTextarea}
                        defaultRows={5}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-400">
                      Project files from Business Bank: <span className="text-slate-200 font-semibold">{Array.isArray(p.attachmentIds) ? p.attachmentIds.length : 0}</span>
                    </div>
                    <button
                      type="button"
                      disabled={!sectionEdit.projects}
                      className="text-xs text-blue-300 underline disabled:opacity-60"
                      onClick={() => openProjectImportModal(index)}
                    >
                      Pick from Business Bank
                    </button>
                  </div>

                  {Array.isArray(p.attachmentIds) && p.attachmentIds.length > 0 ? (
                    <div className="mt-3 grid md:grid-cols-2 gap-2">
                      {p.attachmentIds.slice(0, 6).map((id) => (
                        <ProjectAttachmentChip
                          key={id}
                          id={id}
                          onRemove={() => {
                            if (!sectionEdit.projects) return
                            setProfile((prev) => {
                              const updated = [...prev.projects]
                              const cur = updated[index]
                              if (!cur) return prev
                              const nextIds = (Array.isArray(cur.attachmentIds) ? cur.attachmentIds : []).filter((x) => x !== id)
                              updated[index] = { ...cur, attachmentIds: nextIds }
                              return { ...prev, projects: updated }
                            })
                          }}
                        />
                      ))}
                      {p.attachmentIds.length > 6 ? (
                        <div className="text-xs text-slate-400 px-2 py-2">+{p.attachmentIds.length - 6} more attached…</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Layout - Moved to bottom, collapsible */}
        <section id="section-layout" className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <button
            type="button"
            className="w-full flex items-center justify-between mb-4"
            onClick={() => setLayoutExpanded((prev) => !prev)}
          >
            <h2 className="text-xl font-semibold">Layout (drag to reorder)</h2>
            <span>{layoutExpanded ? '▼' : '▶'}</span>
          </button>
          {layoutExpanded && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-slate-400">
                  Business users will see sections in this order. Keep the most important sections at the top.
                </div>
                <button type="button" className="text-sm underline text-blue-300" onClick={openIntroVideoModal}>
                  Pick Intro Video
                </button>
              </div>
              <ul className="space-y-2">
                {(Array.isArray(profile.sectionOrder) ? profile.sectionOrder : []).map((k, idx) => (
                  <li
                    key={`${k}-${idx}`}
                    draggable
                    onDragStart={() => setLayoutDragIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (layoutDragIndex == null) return
                      moveSection(layoutDragIndex, idx)
                      setLayoutDragIndex(null)
                    }}
                    className="border border-white/10 rounded-xl p-3 bg-slate-900/40 flex items-center justify-between gap-3 cursor-move"
                    title="Drag to reorder"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg border border-white/10 bg-slate-900 flex items-center justify-center text-xs font-semibold">
                        ↕
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold capitalize">
                          {k === 'intro' 
                            ? 'Business Introduction' 
                            : k === 'skills'
                              ? 'Products and Services'
                              : k}
                        </div>
                        <div className="text-xs text-slate-400">
                          {k === 'intro'
                            ? 'Optional: video introduction near the start'
                            : k === 'skills'
                              ? 'Provide a detailed description of what you offer, including customer testimonials or case studies'
                            : k === 'attachments'
                              ? 'Business Bank items in profile'
                              : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs disabled:opacity-50"
                        onClick={() => moveSection(idx, idx - 1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        disabled={idx === (profile.sectionOrder?.length ?? 0) - 1}
                        className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs disabled:opacity-50"
                        onClick={() => moveSection(idx, idx + 1)}
                      >
                        Down
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

      </main>

      {/* Import modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setImportOpen(false)}>
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Import from Business Bank</div>
              <button className="text-sm underline" onClick={() => setImportOpen(false)}>Close</button>
            </div>

            {importError && (
              <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
                {importError}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {(['upload', 'link', 'bank'] as ImportTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`px-3 py-1.5 rounded-full border text-sm ${
                    importTab === tab ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-gray-200'
                  }`}
                  onClick={() => setImportTab(tab)}
                >
                  {tab === 'upload' ? 'Upload' : tab === 'link' ? 'Add Link' : 'Business Bank'}
                </button>
              ))}
            </div>

            {importTab === 'upload' && (
              <div className="mb-4 space-y-3">
                <div
                  className={`rounded-lg border-2 border-dashed p-4 ${
                    importDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setImportDragActive(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    setImportDragActive(false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setImportDragActive(false)
                    const files = Array.from(e.dataTransfer.files || [])
                    uploadImportFiles(files)
                  }}
                >
                  <div className="text-sm text-gray-700">Drag and drop files here</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded border border-gray-200 bg-white text-sm"
                      onClick={() => imageUploadRef.current?.click()}
                    >
                      Upload Images
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded border border-gray-200 bg-white text-sm"
                      onClick={() => videoUploadRef.current?.click()}
                    >
                      Upload Videos
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded border border-gray-200 bg-white text-sm"
                      onClick={() => docUploadRef.current?.click()}
                    >
                      Upload Documents
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Supported: JPG, PNG, WEBP, MP4, WEBM, PDF, DOC, DOCX
                  </div>
                </div>
              </div>
            )}

            {importTab === 'link' && (
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="Paste a URL (YouTube, website, portfolio, etc.)"
                    className="flex-1 px-3 py-2 rounded border border-gray-200 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addLinkItem}
                    disabled={linkBusy || !linkInput.trim()}
                    className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
                  >
                    {linkBusy ? 'Adding…' : 'Add Link'}
                  </button>
                </div>
                {linkError && <div className="mt-2 text-xs text-red-600">{linkError}</div>}
              </div>
            )}

            <input
              ref={imageUploadRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                if (files.length) uploadImportFiles(files, undefined, 'image')
                e.currentTarget.value = ''
              }}
            />
            <input
              ref={videoUploadRef}
              type="file"
              accept="video/mp4,video/webm"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                if (files.length) uploadImportFiles(files, undefined, 'video')
                e.currentTarget.value = ''
              }}
            />
            <input
              ref={docUploadRef}
              type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                if (files.length) uploadImportFiles(files, undefined, 'doc')
                e.currentTarget.value = ''
              }}
            />
            <input
              ref={replaceUploadRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file && replaceTargetId) {
                  uploadImportFiles([file], replaceTargetId)
                }
                setReplaceTargetId(null)
                e.currentTarget.value = ''
              }}
            />

            <div className="border rounded max-h-[60vh] overflow-auto">
              {importTab === 'bank' ? (
                availableItems.length === 0 ? (
                  <div className="p-4 text-sm text-gray-600">No Business Bank items found.</div>
                ) : (
                  <ul className="divide-y">
                    {availableItems.map((item) => (
                      <li key={item.id} className="p-3 flex items-center justify-between gap-3">
                        <label className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!selectedIds[bankKey(item.id)]}
                            onChange={(e) =>
                              setSelectedIds((prev) => ({ ...prev, [bankKey(item.id)]: e.target.checked }))
                            }
                          />
                          {renderImportThumb(item)}
                          <div className="min-w-0">
                            <div className="font-medium truncate">{item.title}</div>
                            <div className="text-xs text-gray-500">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 border border-gray-200 mr-2">
                                {item.item_type}
                              </span>
                              <span className="text-gray-600">{itemSummary(item)}</span>
                            </div>
                          </div>
                        </label>
                        <div className="text-xs text-gray-400 shrink-0">
                          {item.file_type || ''}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : (importTab === 'upload' ? localUploadItems : localLinkItems).length === 0 ? (
                <div className="p-4 text-sm text-gray-600">
                  {importTab === 'upload' ? 'No uploads yet.' : 'No links added yet.'}
                </div>
              ) : (
                <ul className="divide-y">
                  {(importTab === 'upload' ? localUploadItems : localLinkItems).map((item) => (
                    <li key={item.id} className="p-3 flex items-start justify-between gap-3">
                      <label className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={!!selectedIds[localKey(item.id)]}
                          onChange={(e) =>
                            setSelectedIds((prev) => ({ ...prev, [localKey(item.id)]: e.target.checked }))
                          }
                        />
                        {renderLocalImportThumb(item)}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          <div className="text-xs text-gray-500">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 border border-gray-200 mr-2">
                              {item.item_type}
                            </span>
                            {item.file_type ? <span className="text-gray-600">{item.file_type}</span> : null}
                          </div>
                          {item.source === 'link' && item.url ? (
                            <div className="text-xs text-gray-400 truncate">{item.url}</div>
                          ) : null}
                          {item.status === 'uploading' ? (
                            <div className="mt-2">
                              <div className="text-xs text-blue-600">Uploading…</div>
                              <div className="mt-1 h-1.5 w-32 rounded bg-gray-200 overflow-hidden">
                                <div
                                  className="h-full bg-blue-600"
                                  style={{ width: `${Math.min(100, uploadProgress[item.id] || 10)}%` }}
                                />
                              </div>
                            </div>
                          ) : null}
                          {item.status === 'error' ? (
                            <div className="mt-1 text-xs text-red-600">{item.error}</div>
                          ) : null}
                        </div>
                      </label>
                      <div className="flex flex-col items-end gap-1 text-xs">
                        {item.source === 'upload' ? (
                          <button
                            type="button"
                            className="text-blue-600 underline disabled:opacity-60"
                            onClick={() => {
                              setReplaceTargetId(item.id)
                              replaceUploadRef.current?.click()
                            }}
                            disabled={item.status === 'uploading'}
                          >
                            Replace
                          </button>
                        ) : (
                          <button type="button" className="text-blue-600 underline" onClick={() => replaceLinkItem(item)}>
                            Replace
                          </button>
                        )}
                        <button type="button" className="text-red-600 underline" onClick={() => removeLocalItem(item.id)}>
                          Remove
                        </button>
                        <button
                          type="button"
                          className="text-slate-600 underline disabled:opacity-60"
                          disabled={item.savedToBank || item.status !== 'ready'}
                          onClick={() => saveLocalItemToBusinessBank(item)}
                        >
                          {item.savedToBank ? 'Saved to Business Bank' : 'Save to Business Bank'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setImportOpen(false)}>
                Cancel
              </button>
              <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={applyImport} disabled={!hasSelectedImportItems}>
                Import selected
          </button>
        </div>
      </div>
        </div>
      )}

      {/* Website import modal */}
      {websiteImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setWebsiteImportOpen(false)}>
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Import from Website</div>
              <button className="text-sm underline" onClick={() => setWebsiteImportOpen(false)}>Close</button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              This fills your draft only. You still need to save the section to update the live profile.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={websiteImportUrl}
                  onChange={(e) => setWebsiteImportUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-900"
                />
                <button
                  type="button"
                  onClick={handleWebsiteImport}
                  disabled={websiteImportLoading}
                  className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                >
                  {websiteImportLoading ? 'Importing…' : 'Fetch'}
                </button>
              </div>
              {websiteImportError && (
                <p className="text-sm text-red-600 mt-2">{websiteImportError}</p>
              )}
            </div>

            {websiteImportResult && (
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">About</p>
                  <p className="text-gray-700">{websiteImportResult.description || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Services</p>
                  <p className="text-gray-700">
                    {Array.isArray(websiteImportResult.services) && websiteImportResult.services.length > 0
                      ? websiteImportResult.services.join(', ')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Logo</p>
                  <p className="text-gray-700">{websiteImportResult.logo || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Banner</p>
                  <p className="text-gray-700">{websiteImportResult.banner || '—'}</p>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setWebsiteImportOpen(false)}>
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                onClick={applyWebsiteImport}
                disabled={!websiteImportResult}
              >
                Apply to Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project import modal */}
      {projectImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setProjectImportOpen(false)}>
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Pick Project Files (from Business Bank)</div>
              <button className="text-sm underline" onClick={() => setProjectImportOpen(false)}>Close</button>
            </div>

            {importError && (
              <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
                {importError}
              </div>
            )}

            <div className="border rounded max-h-[60vh] overflow-auto">
              {availableItems.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No Business Bank files found.</div>
              ) : (
                <ul className="divide-y">
                  {availableItems.map((item) => (
                    <li key={item.id} className="p-3 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={!!projectSelectedIds[item.id]}
                          onChange={(e) =>
                            setProjectSelectedIds((prev) => ({ ...prev, [item.id]: e.target.checked }))
                          }
                        />
                        {renderImportThumb(item)}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          <div className="text-xs text-gray-500">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 border border-gray-200 mr-2">
                              {item.item_type}
                            </span>
                            <span className="text-gray-600">{itemSummary(item)}</span>
                          </div>
                        </div>
                      </label>
                      <div className="text-xs text-gray-400 shrink-0">
                        {item.file_type || ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setProjectImportOpen(false)}>
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                onClick={applyProjectImport}
                disabled={!Object.values(projectSelectedIds).some(Boolean)}
              >
                Apply to Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Education import modal */}
      {educationImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setEducationImportOpen(false)}>
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Pick Degree Document (from Business Bank)</div>
              <button className="text-sm underline" onClick={() => setEducationImportOpen(false)}>Close</button>
            </div>

            {importError && (
              <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
                {importError}
              </div>
            )}

            <div className="border rounded max-h-[60vh] overflow-auto">
              {availableItems.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No Business Bank files found.</div>
              ) : (
                <ul className="divide-y">
                  {availableItems.map((item) => (
                    <li key={item.id} className="p-3 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={!!educationSelectedIds[item.id]}
                          onChange={(e) =>
                            setEducationSelectedIds((prev) => ({ ...prev, [item.id]: e.target.checked }))
                          }
                        />
                        {renderImportThumb(item)}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          <div className="text-xs text-gray-500">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 border border-gray-200 mr-2">
                              {item.item_type}
                            </span>
                            <span className="text-gray-600">{itemSummary(item)}</span>
                          </div>
                        </div>
                      </label>
                      <div className="text-xs text-gray-400 shrink-0">
                        {item.file_type || ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setEducationImportOpen(false)}>
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                onClick={applyEducationImport}
                disabled={!Object.values(educationSelectedIds).some(Boolean)}
              >
                Apply to Education
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Referee import modal */}
      {refereeImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setRefereeImportOpen(false)}>
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Pick Referee Document (from Business Bank)</div>
              <button className="text-sm underline" onClick={() => setRefereeImportOpen(false)}>Close</button>
            </div>

            {importError && (
              <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
                {importError}
              </div>
            )}

            <div className="border rounded max-h-[60vh] overflow-auto">
              {availableItems.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No Business Bank files found.</div>
              ) : (
                <ul className="divide-y">
                  {availableItems.map((item) => (
                    <li key={item.id} className="p-3 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={!!refereeSelectedIds[item.id]}
                          onChange={(e) =>
                            setRefereeSelectedIds((prev) => ({ ...prev, [item.id]: e.target.checked }))
                          }
                        />
                        {renderImportThumb(item)}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          <div className="text-xs text-gray-500">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 border border-gray-200 mr-2">
                              {item.item_type}
                            </span>
                            <span className="text-gray-600">{itemSummary(item)}</span>
                          </div>
                        </div>
                      </label>
                      <div className="text-xs text-gray-400 shrink-0">
                        {item.file_type || ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setRefereeImportOpen(false)}>
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                onClick={applyRefereeImport}
                disabled={!Object.values(refereeSelectedIds).some(Boolean)}
              >
                Apply to Referee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Configuration Section */}
      {businessProfileId && userId && (
        <div className="mt-8">
          <BusinessProfileShareConfig
            businessProfileId={businessProfileId}
            userId={userId}
            avatarPath={profile.avatar_path}
            bannerPath={profile.banner_path}
            introVideoId={profile.introVideoId}
            onConfigChange={(config) => setShareConfig(config)}
          />
        </div>
      )}



      {/* Intro video modal */}
      {introModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setIntroModalOpen(false)}>
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Select Business Introduction Video</div>
              <button className="text-sm underline" onClick={() => setIntroModalOpen(false)}>Close</button>
            </div>

            {importError && (
              <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
                {importError}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded max-h-[55vh] overflow-auto">
                {introItems.length === 0 ? (
                  <div className="p-4 text-sm text-gray-600">No video items found in Business Bank yet.</div>
                ) : (
                  <ul className="divide-y">
                    {introItems.map((item) => (
                      <li key={item.id} className="p-3 flex items-center justify-between gap-3">
                        <label className="flex items-center gap-3 min-w-0">
                          <input
                            type="radio"
                            name="introVideo"
                            checked={introPickId === item.id}
                            onChange={async () => {
                              setIntroPickId(item.id)
                              // For uploaded/recorded videos, use file_path to get signed URL
                              if (item.file_path) {
                                const { data: urlData } = await supabase.storage.from('business-bank').createSignedUrl(item.file_path, 60 * 30)
                                if (urlData?.signedUrl) {
                                  setIntroPreviewUrl(urlData.signedUrl)
                                  introPreviewVideoIdRef.current = item.id
                                }
                              }
                              // For linked videos, use file_url directly
                              else if (item.file_url) {
                                setIntroPreviewUrl(item.file_url)
                                introPreviewVideoIdRef.current = item.id
                              }
                            }}
                          />
                          {renderImportThumb(item)}
                          <div className="min-w-0">
                            <div className="font-medium truncate">{item.title}</div>
                            <div className="text-xs text-gray-500">{item.file_type || item.item_type}</div>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border rounded bg-black flex items-center justify-center min-h-[240px]">
                {introPreviewUrl ? (() => {
                  // Check if it's a YouTube URL
                  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
                  const youtubeMatch = introPreviewUrl.match(youtubeRegex)
                  if (youtubeMatch) {
                    const videoId = youtubeMatch[1]
                    return (
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        className="w-full max-h-[55vh] aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )
                  }
                  // Check if it's a Vimeo URL
                  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/
                  const vimeoMatch = introPreviewUrl.match(vimeoRegex)
                  if (vimeoMatch) {
                    const videoId = vimeoMatch[1]
                    return (
                      <iframe
                        src={`https://player.vimeo.com/video/${videoId}`}
                        className="w-full max-h-[55vh] aspect-video"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    )
                  }
                  // Regular video URL
                  return (
                    <video src={introPreviewUrl} controls className="w-full max-h-[55vh] object-contain" />
                  )
                })() : (
                  <div className="text-sm text-gray-500 p-6">Select a video to preview.</div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                className="text-sm underline text-gray-700"
                onClick={() => {
                  setIntroPickId(null)
                  setIntroPreviewUrl(null)
                  introPreviewVideoIdRef.current = null
                  setProfile((prev) => ({ ...prev, introVideoId: null }))
                  log('intro video cleared', 'P_LAYOUT', {}).catch(() => {})
                }}
              >
                Clear intro video
              </button>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded border" onClick={() => setIntroModalOpen(false)}>
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                  onClick={applyIntroVideo}
                  disabled={!introPickId}
                >
                  Use as Intro Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



