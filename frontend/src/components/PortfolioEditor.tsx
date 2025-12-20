'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface PortfolioData {
  name: string
  title: string
  bio: string
  avatar_path?: string | null
  banner_path?: string | null
  sectionOrder?: string[]
  introVideoId?: number | null
  skills: string[]
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

interface TalentBankItem {
  id: number
  item_type: string
  title: string
  metadata?: any
  file_path?: string | null
  file_type?: string | null
  created_at?: string
}

export default function PortfolioEditor() {
  const router = useRouter()
  const DEFAULT_SECTION_ORDER = ['intro', 'social', 'skills', 'experience', 'education', 'projects', 'attachments'] as const
  type SectionKey = (typeof DEFAULT_SECTION_ORDER)[number]
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    name: '',
    title: '',
    bio: '',
    avatar_path: null,
    banner_path: null,
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    introVideoId: null,
    skills: [],
    experience: [],
    education: [],
    attachments: [],
    projects: []
  })

  const [newSkill, setNewSkill] = useState('')
  const [sectionEdit, setSectionEdit] = useState<Record<string, boolean>>({
    basic: true,
    skills: true,
    experience: true,
    education: true,
    attachments: true,
    projects: true,
  })
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [savingExit, setSavingExit] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [availableItems, setAvailableItems] = useState<TalentBankItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({})
  const [importError, setImportError] = useState<string | null>(null)
  const [projectImportOpen, setProjectImportOpen] = useState(false)
  const [activeProjectIndex, setActiveProjectIndex] = useState<number | null>(null)
  const [projectSelectedIds, setProjectSelectedIds] = useState<Record<number, boolean>>({})
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<
    | { kind: 'image'; url: string; title: string }
    | { kind: 'video'; url: string; title: string }
    | null
  >(null)

  const [layoutDragIndex, setLayoutDragIndex] = useState<number | null>(null)
  const [introModalOpen, setIntroModalOpen] = useState(false)
  const [introItems, setIntroItems] = useState<TalentBankItem[]>([])
  const [introPickId, setIntroPickId] = useState<number | null>(null)
  const [introPreviewUrl, setIntroPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    // Load existing saved portfolio (if present)
    loadSavedPortfolio()
  }, [])

  async function log(message: string, hypothesisId: string, data: any) {
    fetch('/api/debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'run-portfolio',
        hypothesisId,
        location: 'src/components/PortfolioEditor.tsx',
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

  async function ensureUsersRow(userId: string) {
    // Talent Bank schema FK requires public.users(id) exist with a non-null role.
    try {
      await supabase.from('users').upsert({ id: userId, role: 'talent', email: null } as any)
    } catch {
      // ignore
    }
  }

  function fileExt(title: string) {
    const m = title.toLowerCase().match(/\.([a-z0-9]+)$/)
    return m?.[1] ?? ''
  }

  async function ensureSignedUrl(path: string) {
    if (!path) return
    if (thumbUrls[path]) return
    const { data } = await supabase.storage.from('talent-bank').createSignedUrl(path, 60 * 30)
    if (data?.signedUrl) setThumbUrls((prev) => ({ ...prev, [path]: data.signedUrl }))
  }

  function moveSection(from: number, to: number) {
    setPortfolio((prev) => {
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
    const { data, error } = await supabase.storage.from('talent-bank').createSignedUrl(path, 60 * 30)
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
    const { data } = await supabase.storage.from('talent-bank').createSignedUrl(path, 60 * 30)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
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

  function renderAttachmentThumb(a: PortfolioData['attachments'][number]) {
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

  function renderImportThumb(item: TalentBankItem) {
    const isImg = item.file_type?.startsWith('image') || item.item_type === 'image'
    const isVid = item.file_type?.startsWith('video') || item.item_type === 'video'
    const ext = fileExt(item.title)
    const label = isImg ? 'IMG' : isVid ? 'VID' : ext ? ext.toUpperCase().slice(0, 4) : 'FILE'

    const path = item.file_path || ''
    if (path && (isImg || isVid) && !thumbUrls[path]) {
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

  async function loadSavedPortfolio() {
    try {
      const uid = await getUserId()
      await log('loadSavedPortfolio start', 'P_LOAD', { hasUser: !!uid })
      if (!uid) return

      const { data, error } = await supabase
        .from('talent_bank_items')
        .select('id, metadata')
        .eq('user_id', uid)
        .eq('item_type', 'portfolio')
        .order('created_at', { ascending: false })
        .limit(1)

      await log('loadSavedPortfolio result', 'P_LOAD', { hasError: !!error, rowCount: data?.length ?? 0 })
      if (error) return

      const saved = data?.[0]?.metadata
      if (saved && typeof saved === 'object') {
        setPortfolio((prev) => ({
          ...prev,
          ...saved,
          // ensure required fields exist
          skills: Array.isArray(saved.skills) ? saved.skills : prev.skills,
          experience: Array.isArray(saved.experience) ? saved.experience : prev.experience,
          education: Array.isArray(saved.education) ? saved.education : prev.education,
          attachments: Array.isArray(saved.attachments) ? saved.attachments : prev.attachments,
          projects: Array.isArray(saved.projects)
            ? saved.projects.map((p: any) => ({
                name: p?.name ?? '',
                description: p?.description ?? '',
                url: p?.url ?? '',
                attachmentIds: Array.isArray(p?.attachmentIds) ? p.attachmentIds : [],
              }))
            : prev.projects,
          sectionOrder: Array.isArray(saved.sectionOrder) ? saved.sectionOrder : prev.sectionOrder,
          introVideoId: typeof saved.introVideoId === 'number' ? saved.introVideoId : (saved.introVideoId == null ? null : prev.introVideoId),
        }))
      }

      await ensureMediaUrl('avatar', (saved as any)?.avatar_path)
      await ensureMediaUrl('banner', (saved as any)?.banner_path)

      // Also load portfolioSelections (set in Talent Bank) and render as attachments automatically.
      const selections: number[] = Array.isArray(saved?.portfolioSelections) ? saved.portfolioSelections : []
      if (selections.length) {
        const { data: selItems, error: selErr } = await supabase
          .from('talent_bank_items')
          .select('id,item_type,title,file_path,file_type')
          .eq('user_id', uid)
          .in('id', selections)

        await log('load portfolioSelections', 'P_LOAD', {
          hasError: !!selErr,
          selectedCount: selections.length,
          rowCount: Array.isArray(selItems) ? selItems.length : 0,
        })

        if (!selErr && Array.isArray(selItems)) {
          const attachments: any[] = []
          for (const it of selItems) {
            if (!it.file_path) continue
            const { data: urlData } = await supabase.storage.from('talent-bank').createSignedUrl(it.file_path, 60 * 30)
            attachments.push({
              id: it.id,
              title: it.title,
              item_type: it.item_type,
              file_path: it.file_path,
              file_type: it.file_type ?? null,
              url: urlData?.signedUrl ?? null,
            })
          }
          setPortfolio((prev) => ({ ...prev, attachments }))
        }
      }
    } catch (e: any) {
      await log('loadSavedPortfolio exception', 'P_LOAD', { message: e?.message ?? String(e) })
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

    const path = `${uid}/portfolio/${kind}-${crypto.randomUUID()}-${file.name}`
    const { error } = await supabase.storage.from('talent-bank').upload(path, file, { upsert: true, contentType: file.type })
    await log('uploadPortfolioImage result', 'P_MEDIA', {
      kind,
      hasError: !!error,
      errorMessage: (error as any)?.message ?? null,
    })
    if (error) {
      alert((error as any)?.message ?? 'Upload failed')
      return
    }

    setPortfolio((prev) => ({ ...prev, [`${kind}_path`]: path } as any))
    await ensureMediaUrl(kind, path)
  }

  async function openImportModal() {
    setImportOpen(true)
      setIsImporting(true)
    setImportError(null)
    try {
      const uid = await getUserId()
      await log('import modal open', 'P_IMPORT', { hasUser: !!uid })
      if (!uid) {
        setImportError('Please sign in to import from Talent Bank.')
        return
      }

      const { data, error } = await supabase
        .from('talent_bank_items')
        .select('id,item_type,title,metadata,file_path,file_type,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      await log('fetch talent_bank_items', 'P_IMPORT', {
        hasError: !!error,
        rowCount: Array.isArray(data) ? data.length : 0,
        errorMessage: (error as any)?.message ?? null,
      })

      if (error) {
        setImportError((error as any)?.message ?? 'Failed to load Talent Bank items')
        return
      }

      setAvailableItems((data ?? []).filter((i: any) => i.item_type !== 'portfolio'))
      setSelectedIds({})
    } finally {
      setIsImporting(false)
    }
  }

  async function applyImport() {
    try {
      const selected = availableItems.filter((i) => selectedIds[i.id])
      await log('apply import', 'P_IMPORT_APPLY', { selectedCount: selected.length })
      if (!selected.length) {
        setImportOpen(false)
        return
      }

      // Build attachments (for any item that has a file_path)
      const attachmentsToAdd: PortfolioData['attachments'] = []
      for (const item of selected) {
        if (!item.file_path) continue
        const { data, error } = await supabase.storage.from('talent-bank').createSignedUrl(item.file_path, 60 * 30)
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

      const mappedExperience = selected
        .filter((i) => i.item_type === 'experience')
        .map((item) => ({
        company: item.metadata?.company || item.title,
        title: item.metadata?.title || '',
        startDate: item.metadata?.startDate || '',
        endDate: item.metadata?.endDate || '',
          description: item.metadata?.description || item.metadata?.summary || '',
      }))

      const mappedEducation = selected
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

      setPortfolio((prev) => ({
        ...prev,
        experience: mappedExperience.length ? [...prev.experience, ...mappedExperience] : prev.experience,
        education: mappedEducation.length ? [...prev.education, ...mappedEducation] : prev.education,
        attachments: attachmentsToAdd.length ? [...prev.attachments, ...attachmentsToAdd] : prev.attachments,
      }))

      setImportOpen(false)
    } catch (e: any) {
      await log('applyImport exception', 'P_IMPORT_APPLY', { message: e?.message ?? String(e) })
      setImportError(e?.message ?? 'Failed to import')
    }
  }

  const addSkill = () => {
    if (!sectionEdit.skills) return
    if (newSkill.trim()) {
      setPortfolio({
        ...portfolio,
        skills: [...portfolio.skills, newSkill.trim()]
      })
      setNewSkill('')
    }
  }

  const removeSkill = (index: number) => {
    if (!sectionEdit.skills) return
    setPortfolio({
      ...portfolio,
      skills: portfolio.skills.filter((_, i) => i !== index)
    })
  }

  const addExperience = () => {
    if (!sectionEdit.experience) return
    setPortfolio({
      ...portfolio,
      experience: [
        ...portfolio.experience,
        { company: '', title: '', startDate: '', endDate: '', description: '' }
      ]
    })
  }

  const updateExperience = (index: number, field: string, value: string) => {
    if (!sectionEdit.experience) return
    const updated = [...portfolio.experience]
    updated[index] = { ...updated[index], [field]: value }
    setPortfolio({ ...portfolio, experience: updated })
  }

  const addEducation = () => {
    if (!sectionEdit.education) return
    setPortfolio({
      ...portfolio,
      education: [
        ...portfolio.education,
        { institution: '', degree: '', field: '', year: '' }
      ]
    })
  }

  const updateEducation = (index: number, field: string, value: string) => {
    if (!sectionEdit.education) return
    const updated = [...portfolio.education]
    updated[index] = { ...updated[index], [field]: value }
    setPortfolio({ ...portfolio, education: updated })
  }

  const removeEducation = (index: number) => {
    if (!sectionEdit.education) return
    setPortfolio({ ...portfolio, education: portfolio.education.filter((_, i) => i !== index) })
  }

  const addProject = () => {
    if (!sectionEdit.projects) return
    setPortfolio({
      ...portfolio,
      projects: [...portfolio.projects, { name: '', description: '', url: '', attachmentIds: [] }]
    })
  }

  const updateProject = (index: number, field: string, value: string) => {
    if (!sectionEdit.projects) return
    const updated = [...portfolio.projects]
    updated[index] = { ...updated[index], [field]: value }
    setPortfolio({ ...portfolio, projects: updated })
  }

  const removeProject = (index: number) => {
    if (!sectionEdit.projects) return
    setPortfolio({ ...portfolio, projects: portfolio.projects.filter((_, i) => i !== index) })
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
        setImportError('Please sign in to import from Talent Bank.')
        return
      }

      const { data, error } = await supabase
        .from('talent_bank_items')
        .select('id,item_type,title,metadata,file_path,file_type,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      await log('project import fetch talent_bank_items', 'P_PROJ', {
        hasError: !!error,
        rowCount: Array.isArray(data) ? data.length : 0,
        errorMessage: (error as any)?.message ?? null,
      })

      if (error) {
        setImportError((error as any)?.message ?? 'Failed to load Talent Bank items')
        return
      }

      const filtered = (data ?? [])
        .filter((i: any) => i.item_type !== 'portfolio')
        .filter((i: any) => !!i.file_path) // only files/media for projects

      setAvailableItems(filtered as any)

      const pre = new Set<number>(Array.isArray(portfolio.projects[index]?.attachmentIds) ? (portfolio.projects[index].attachmentIds as any) : [])
      const nextSel: Record<number, boolean> = {}
      for (const it of filtered as any[]) {
        nextSel[it.id] = pre.has(it.id)
      }
      setProjectSelectedIds(nextSel)
    } finally {
      setIsImporting(false)
    }
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
        .from('talent_bank_items')
        .select('id,item_type,title,metadata,file_path,file_type,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      await log('intro video fetch talent_bank_items', 'P_LAYOUT', {
        hasError: !!error,
        rowCount: Array.isArray(data) ? data.length : 0,
        errorMessage: (error as any)?.message ?? null,
      })

      if (error) {
        setImportError((error as any)?.message ?? 'Failed to load Talent Bank items')
        return
      }
      const vids = (data ?? []).filter((i: any) => !!i.file_path && (i.file_type?.startsWith?.('video') ?? false))
      setIntroItems(vids)
      const current = typeof portfolio.introVideoId === 'number' ? portfolio.introVideoId : null
      setIntroPickId(current)
      if (current) {
        const found = vids.find((v: any) => v.id === current)
        if (found?.file_path) {
          const { data: urlData } = await supabase.storage.from('talent-bank').createSignedUrl(found.file_path, 60 * 30)
          if (urlData?.signedUrl) setIntroPreviewUrl(urlData.signedUrl)
        }
      }
    } finally {
      setIsImporting(false)
    }
  }

  async function applyIntroVideo() {
    setPortfolio((prev) => ({ ...prev, introVideoId: introPickId }))
    await log('intro video applied', 'P_LAYOUT', { introVideoId: introPickId })
    setIntroModalOpen(false)
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
      setPortfolio((prev) => {
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

  const savePortfolio = async (opts?: { redirect?: boolean; source?: string }) => {
    try {
      const uid = await getUserId()
      await log('savePortfolio start', 'P_SAVE', { hasUser: !!uid, redirect: !!opts?.redirect, source: opts?.source ?? null })
      if (!uid) {
        alert('Please sign in to save your portfolio.')
        return false
      }

      await ensureUsersRow(uid)

      // Update existing portfolio item if present; otherwise insert a new one.
      const existing = await supabase
        .from('talent_bank_items')
        .select('id,metadata')
        .eq('user_id', uid)
        .eq('item_type', 'portfolio')
        .order('created_at', { ascending: false })
        .limit(1)

      const existingId = existing.data?.[0]?.id ?? null
      const existingMeta = (existing.data?.[0] as any)?.metadata ?? {}
      const keepSelections = Array.isArray(existingMeta?.portfolioSelections) ? existingMeta.portfolioSelections : []
      const payloadMeta = { ...portfolio, portfolioSelections: keepSelections }
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

      if (existingId) {
        const { error } = await supabase
          .from('talent_bank_items')
          .update({ title: 'Portfolio', metadata: payloadMeta })
          .eq('id', existingId)
          .eq('user_id', uid)
        await log('savePortfolio update', 'P_SAVE', {
          hasError: !!error,
          errorCode: (error as any)?.code ?? null,
          errorMessage: (error as any)?.message ?? null,
          errorDetails: (error as any)?.details ?? null,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from('talent_bank_items').insert({
          user_id: uid,
          item_type: 'portfolio',
          title: 'Portfolio',
          metadata: payloadMeta,
          is_public: false,
        })
        await log('savePortfolio insert', 'P_SAVE', {
          hasError: !!error,
          errorCode: (error as any)?.code ?? null,
          errorMessage: (error as any)?.message ?? null,
          errorDetails: (error as any)?.details ?? null,
        })

        if (error) {
          const msg = ((error as any)?.message ?? '').toLowerCase()
          const isTypeConstraint =
            (error as any)?.code === '23514' ||
            msg.includes('check constraint') ||
            msg.includes('enum') ||
            msg.includes('invalid input value')

          if (isTypeConstraint) {
            const fallback = await supabase.from('talent_bank_items').insert({
              user_id: uid,
              item_type: 'document',
              title: 'Portfolio',
              metadata: portfolio,
              file_type: 'application/json',
              is_public: false,
            } as any)
            await log('savePortfolio insert fallback', 'P_SAVE', {
              hasError: !!fallback.error,
              errorCode: (fallback.error as any)?.code ?? null,
              errorMessage: (fallback.error as any)?.message ?? null,
              errorDetails: (fallback.error as any)?.details ?? null,
            })
            if (fallback.error) throw fallback.error
      } else {
            throw error
          }
        }
      }

      alert('Portfolio saved successfully!')
      if (opts?.redirect) {
        router.push('/dashboard/talent?tab=profile')
      }
      return true
    } catch (error: any) {
      console.error('Error:', error)
      await log('savePortfolio exception', 'P_SAVE', {
        message: error?.message ?? String(error),
        code: error?.code ?? null,
        details: error?.details ?? null,
      })
      alert(error?.message ? `Error saving portfolio: ${error.message}` : 'Error saving portfolio')
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

  async function saveAndExit() {
    setSavingExit(true)
    await log('save & exit clicked', 'P_UI', { anySectionEditing })
    await savePortfolio({ redirect: true, source: 'top-save-exit' })
    setSavingExit(false)
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
          <Link href="/dashboard/talent" className="text-slate-300 hover:text-blue-400">← Back</Link>
          <div className="flex items-center gap-3">
            <Link href="/portfolio/view" className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 font-semibold">
              View Portfolio
            </Link>
            <button
              type="button"
              onClick={saveAndExit}
              disabled={savingExit}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 font-semibold"
            >
              {savingExit ? 'Saving…' : 'Save & Exit'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10 space-y-6">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-3xl font-bold">Edit Portfolio</h1>
          <div className="text-xs text-slate-400">
            Tip: Use section Save buttons to save as you go. “Save & Exit” returns you to Profile for review.
          </div>
        </div>

        {/* Layout */}
        <section className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Layout (drag to reorder)</h2>
            <button type="button" className="text-sm underline text-blue-300" onClick={openIntroVideoModal}>
              Pick Intro Video
            </button>
          </div>
          <div className="text-xs text-slate-400 mb-3">
            Business users will see sections in this order. Keep the most important sections at the top.
          </div>
          <ul className="space-y-2">
            {(Array.isArray(portfolio.sectionOrder) ? portfolio.sectionOrder : []).map((k, idx) => (
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
                    <div className="font-semibold capitalize">{k === 'intro' ? 'Talent Introduction' : k}</div>
                    <div className="text-xs text-slate-400">
                      {k === 'intro'
                        ? 'Optional: video introduction near the start'
                        : k === 'attachments'
                          ? 'Talent Bank items in portfolio'
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
                    disabled={idx === (portfolio.sectionOrder?.length ?? 0) - 1}
                    className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs disabled:opacity-50"
                    onClick={() => moveSection(idx, idx + 1)}
                  >
                    Down
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Basic Information */}
        <section className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Basic Information</h2>
            <div className="flex gap-2">
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
                <div className="w-20 h-20 rounded-full border border-white/10 bg-slate-900 overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-xs text-slate-400">No photo</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-200 font-medium">Avatar</div>
                  <div className="text-xs text-slate-400">Square headshot works best</div>
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
              placeholder="Full Name"
              value={portfolio.name}
              onChange={(e) => setPortfolio({ ...portfolio, name: e.target.value })}
              disabled={!sectionEdit.basic}
              className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
            />
            <input
              type="text"
              placeholder="Professional Title"
              value={portfolio.title}
              onChange={(e) => setPortfolio({ ...portfolio, title: e.target.value })}
              disabled={!sectionEdit.basic}
              className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
            />
            <textarea
              placeholder="Bio / Summary"
              value={portfolio.bio}
              onChange={(e) => setPortfolio({ ...portfolio, bio: e.target.value })}
              disabled={!sectionEdit.basic}
              className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
              rows={4}
            />
          </div>
        </section>

        {/* Skills */}
        <section className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Skills</h2>
            <div className="flex gap-2">
              {!sectionEdit.skills ? (
                <button className="text-sm underline text-blue-300" onClick={() => setSectionEdit((p) => ({ ...p, skills: true }))}>
                  Edit
                </button>
              ) : (
                <button
                  className="text-sm underline text-blue-300 disabled:opacity-60"
                  disabled={savingSection === 'skills'}
                  onClick={() => saveSection('skills')}
                >
                  {savingSection === 'skills' ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Add skill"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              disabled={!sectionEdit.skills}
              className="flex-1 p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
            />
            <button
              onClick={addSkill}
              disabled={!sectionEdit.skills}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {portfolio.skills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-500/20 text-blue-200 rounded-full flex items-center gap-2 text-sm"
              >
                {skill}
                <button
                  onClick={() => removeSkill(index)}
                  disabled={!sectionEdit.skills}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>

        {/* Experience */}
        <section className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Work Experience</h2>
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
            <button
              type="button"
              onClick={addExperience}
                disabled={!sectionEdit.experience}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-60"
            >
              Add Experience
            </button>
            <button
              type="button"
                onClick={openImportModal}
                disabled={isImporting || !sectionEdit.experience}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-60"
              >
                {isImporting ? 'Importing…' : 'Import from Talent Bank'}
            </button>
            </div>
          </div>
          {portfolio.experience.map((exp, index) => (
            <div key={index} className="mb-4 p-4 border border-white/10 rounded-xl bg-slate-900/40">
              <input
                type="text"
                placeholder="Company"
                value={exp.company}
                onChange={(e) => updateExperience(index, 'company', e.target.value)}
                disabled={!sectionEdit.experience}
                className="w-full mb-2 p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
              />
              <input
                type="text"
                placeholder="Job Title"
                value={exp.title}
                onChange={(e) => updateExperience(index, 'title', e.target.value)}
                disabled={!sectionEdit.experience}
                className="w-full mb-2 p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
              />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Start Date"
                  value={exp.startDate}
                  onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                  disabled={!sectionEdit.experience}
                  className="p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                />
                <input
                  type="text"
                  placeholder="End Date"
                  value={exp.endDate}
                  onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                  disabled={!sectionEdit.experience}
                  className="p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                />
              </div>
              <textarea
                placeholder="Description"
                value={exp.description}
                onChange={(e) => updateExperience(index, 'description', e.target.value)}
                disabled={!sectionEdit.experience}
                className="w-full p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                rows={3}
              />
            </div>
          ))}
        </section>

        {/* Education */}
        <section className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Education</h2>
            <div className="flex items-center gap-3">
              {!sectionEdit.education ? (
                <button className="text-sm underline text-blue-300" onClick={() => setSectionEdit((p) => ({ ...p, education: true }))}>
                  Edit
                </button>
              ) : (
          <button
                  className="text-sm underline text-blue-300 disabled:opacity-60"
                  disabled={savingSection === 'education'}
                  onClick={() => saveSection('education')}
                >
                  {savingSection === 'education' ? 'Saving…' : 'Save'}
                </button>
              )}
              <button
                type="button"
                onClick={addEducation}
                disabled={!sectionEdit.education}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-60"
              >
                Add Education
              </button>
              <button
                type="button"
                onClick={openImportModal}
                disabled={isImporting || !sectionEdit.education}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-60"
              >
                {isImporting ? 'Importing…' : 'Import from Talent Bank'}
          </button>
        </div>
      </div>

          {portfolio.education.length === 0 ? (
            <div className="text-sm text-slate-400">No education added yet.</div>
          ) : (
            <div className="space-y-4">
              {portfolio.education.map((edu, index) => (
                <div key={index} className="p-4 border border-white/10 rounded-xl bg-slate-900/40">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm font-semibold text-slate-200">Education entry {index + 1}</div>
                    <button
                      type="button"
                      disabled={!sectionEdit.education}
                      className="text-xs text-red-300 underline disabled:opacity-60"
                      onClick={() => removeEducation(index)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Institution"
                      value={edu.institution}
                      onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                      disabled={!sectionEdit.education}
                      className="p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                    />
                    <input
                      type="text"
                      placeholder="Degree / Qualification"
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                      disabled={!sectionEdit.education}
                      className="p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                    />
                    <input
                      type="text"
                      placeholder="Field of Study"
                      value={edu.field}
                      onChange={(e) => updateEducation(index, 'field', e.target.value)}
                      disabled={!sectionEdit.education}
                      className="p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                    />
                    <input
                      type="text"
                      placeholder="Year (or date range)"
                      value={edu.year}
                      onChange={(e) => updateEducation(index, 'year', e.target.value)}
                      disabled={!sectionEdit.education}
                      className="p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-xs text-slate-400">
            Tip: Upload certificates in Talent Bank under “Education” then import them here.
          </div>
        </section>

        {/* Attachments imported from Talent Bank */}
        <section className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Talent Bank Attachments</h2>
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
                {isImporting ? 'Importing…' : 'Import from Talent Bank'}
              </button>
            </div>
          </div>

          {portfolio.attachments.length === 0 ? (
            <p className="text-slate-400 text-sm">
              No attachments imported yet. Use “Import from Talent Bank” to select files.
            </p>
          ) : (
            <ul className="space-y-2">
              {portfolio.attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 border border-white/10 rounded-xl p-3 bg-slate-900/40">
                  <div className="flex items-center gap-3 min-w-0">
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
                        setPortfolio((prev) => ({
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
        <section className="border border-white/10 bg-slate-950/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Projects</h2>
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
                onClick={addProject}
                disabled={!sectionEdit.projects}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-60"
              >
                Add Project
              </button>
            </div>
          </div>

          {portfolio.projects.length === 0 ? (
            <div className="text-sm text-slate-400">No projects added yet.</div>
          ) : (
            <div className="space-y-4">
              {portfolio.projects.map((p, index) => (
                <div key={index} className="p-4 border border-white/10 rounded-xl bg-slate-900/40">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm font-semibold text-slate-200">Project {index + 1}</div>
                    <button
                      type="button"
                      disabled={!sectionEdit.projects}
                      className="text-xs text-red-300 underline disabled:opacity-60"
                      onClick={() => removeProject(index)}
                    >
                      Remove
                    </button>
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
                    <textarea
                      placeholder="Description"
                      value={p.description}
                      onChange={(e) => updateProject(index, 'description', e.target.value)}
                      disabled={!sectionEdit.projects}
                      className="md:col-span-2 p-3 rounded bg-slate-900 border border-slate-700 !text-white !placeholder:text-slate-500 disabled:opacity-60"
                      rows={3}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-400">
                      Project files from Talent Bank: <span className="text-slate-200 font-semibold">{Array.isArray(p.attachmentIds) ? p.attachmentIds.length : 0}</span>
                    </div>
                    <button
                      type="button"
                      disabled={!sectionEdit.projects}
                      className="text-xs text-blue-300 underline disabled:opacity-60"
                      onClick={() => openProjectImportModal(index)}
                    >
                      Pick from Talent Bank
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Import modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setImportOpen(false)}>
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Import from Talent Bank</div>
              <button className="text-sm underline" onClick={() => setImportOpen(false)}>Close</button>
            </div>

            {importError && (
              <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
                {importError}
              </div>
            )}

            <div className="border rounded max-h-[60vh] overflow-auto">
              {availableItems.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No Talent Bank items found.</div>
              ) : (
                <ul className="divide-y">
                  {availableItems.map((item) => (
                    <li key={item.id} className="p-3 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={!!selectedIds[item.id]}
                          onChange={(e) =>
                            setSelectedIds((prev) => ({ ...prev, [item.id]: e.target.checked }))
                          }
                        />
                        {renderImportThumb(item)}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          <div className="text-xs text-gray-500">{item.item_type}</div>
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
              <button className="px-4 py-2 rounded border" onClick={() => setImportOpen(false)}>
                Cancel
              </button>
              <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={applyImport} disabled={!Object.values(selectedIds).some(Boolean)}>
                Import selected
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
              <div className="text-lg font-semibold">Pick Project Files (from Talent Bank)</div>
              <button className="text-sm underline" onClick={() => setProjectImportOpen(false)}>Close</button>
            </div>

            {importError && (
              <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
                {importError}
              </div>
            )}

            <div className="border rounded max-h-[60vh] overflow-auto">
              {availableItems.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No Talent Bank files found.</div>
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
                          <div className="text-xs text-gray-500">{item.item_type}</div>
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

      {/* Intro video modal */}
      {introModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setIntroModalOpen(false)}>
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Select Talent Introduction Video</div>
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
                  <div className="p-4 text-sm text-gray-600">No video items found in Talent Bank yet.</div>
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
                              if (item.file_path) {
                                const { data: urlData } = await supabase.storage.from('talent-bank').createSignedUrl(item.file_path, 60 * 30)
                                setIntroPreviewUrl(urlData?.signedUrl ?? null)
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
                {introPreviewUrl ? (
                  <video src={introPreviewUrl} controls className="w-full max-h-[55vh] object-contain" />
                ) : (
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
                  setPortfolio((prev) => ({ ...prev, introVideoId: null }))
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



