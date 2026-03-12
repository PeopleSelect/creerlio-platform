'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type LocSuggestion = { id: string; label: string }

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

const INDUSTRY_OPTIONS = [
  'Technology', 'Finance', 'Healthcare', 'Marketing', 'Sales',
  'Engineering', 'Design', 'Legal', 'Education', 'Consulting',
  'Media', 'Logistics', 'Retail', 'Manufacturing', 'Non-profit',
]

interface Snapshot {
  id?: string
  snapshot_title: string
  headline: string
  experience_years: number | ''
  location: string
  skills: string[]
  industry_tags: string[]
  summary: string
  is_active: boolean
}

interface SnapshotBuilderProps {
  initial?: Partial<Snapshot> & { id?: string }
  onSaved?: (snapshot: any) => void
  onCancel?: () => void
}

const EMPTY: Snapshot = {
  snapshot_title: '',
  headline: '',
  experience_years: '',
  location: '',
  skills: [],
  industry_tags: [],
  summary: '',
  is_active: false,
}

export default function SnapshotBuilder({ initial, onSaved, onCancel }: SnapshotBuilderProps) {
  const [form, setForm] = useState<Snapshot>({
    ...EMPTY,
    ...initial,
    skills: initial?.skills ?? [],
    industry_tags: initial?.industry_tags ?? [],
  })
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Location autocomplete
  const [locQuery, setLocQuery] = useState(initial?.location || '')
  const [locSuggestions, setLocSuggestions] = useState<LocSuggestion[]>([])
  const [locOpen, setLocOpen] = useState(false)
  const [locBusy, setLocBusy] = useState(false)
  const locDebounced = useDebouncedValue(locQuery, 300)
  const locAbort = useRef<AbortController | null>(null)

  const isEdit = !!initial?.id

  useEffect(() => {
    if (locAbort.current) locAbort.current.abort()
    if (!locDebounced.trim()) { setLocSuggestions([]); setLocOpen(false); return }
    const ac = new AbortController()
    locAbort.current = ac
    setLocBusy(true)
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
    if (!token) { setLocBusy(false); return }
    ;(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locDebounced)}.json?access_token=${token}&limit=6&types=place,locality,neighborhood,postcode,region`
        const res = await fetch(url, { signal: ac.signal })
        if (ac.signal.aborted) return
        const json: any = await res.json()
        const feats = Array.isArray(json?.features) ? json.features : []
        setLocSuggestions(feats.map((f: any) => ({ id: String(f?.id || ''), label: String(f?.place_name || '').trim() })))
        setLocOpen(true)
      } catch {
        // ignore aborts/network errors
      } finally {
        if (!ac.signal.aborted) setLocBusy(false)
      }
    })()
  }, [locDebounced])

  const set = (field: keyof Snapshot, value: any) =>
    setForm((f) => ({ ...f, [field]: value }))

  const addSkill = () => {
    const s = skillInput.trim()
    if (!s || form.skills.includes(s)) return
    set('skills', [...form.skills, s])
    setSkillInput('')
  }

  const removeSkill = (skill: string) =>
    set('skills', form.skills.filter((s) => s !== skill))

  const toggleIndustry = (tag: string) =>
    set(
      'industry_tags',
      form.industry_tags.includes(tag)
        ? form.industry_tags.filter((t) => t !== tag)
        : [...form.industry_tags, tag]
    )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('You must be logged in.')
        return
      }

      const payload: Record<string, any> = {
        snapshot_title: form.snapshot_title || 'My Snapshot',
        headline: form.headline,
        experience_years: form.experience_years !== '' ? Number(form.experience_years) : null,
        location: form.location || null,
        skills: form.skills,
        industry_tags: form.industry_tags,
        summary: form.summary || null,
        is_active: form.is_active,
      }
      if (isEdit) payload.snapshot_id = initial!.id

      const res = await fetch('/api/snapshots/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to save snapshot.')
        return
      }

      onSaved?.(json.snapshot)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Privacy notice */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-blue-300">
          Snapshots are fully anonymous. Your name, photo, contact details, and employer names will never be revealed without your explicit approval.
        </p>
      </div>

      {/* Internal title */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Snapshot name <span className="text-slate-500 text-xs">(only you see this)</span>
        </label>
        <input
          type="text"
          value={form.snapshot_title}
          onChange={(e) => set('snapshot_title', e.target.value)}
          placeholder="e.g. Startup roles, Consulting projects"
          className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Headline */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Professional headline <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.headline}
          onChange={(e) => set('headline', e.target.value)}
          placeholder="e.g. Senior Full Stack Developer | 8 years exp. | Remote-first"
          required
          maxLength={200}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <p className="text-xs text-slate-600 mt-1">{form.headline.length}/200</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Years experience */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Years of experience</label>
          <input
            type="number"
            value={form.experience_years}
            onChange={(e) => set('experience_years', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            placeholder="8"
            min={0}
            max={60}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Location */}
        <div className="relative">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Location <span className="text-slate-500 text-xs">(city / region)</span>
          </label>
          <input
            type="text"
            value={locQuery}
            onChange={(e) => {
              setLocQuery(e.target.value)
              set('location', e.target.value)
            }}
            onBlur={() => setTimeout(() => setLocOpen(false), 150)}
            onFocus={() => { if (locSuggestions.length > 0) setLocOpen(true) }}
            placeholder="Dublin, Ireland"
            autoComplete="off"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {locBusy && (
            <div className="absolute right-3 top-[2.1rem] w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          )}
          {locOpen && locSuggestions.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-xl overflow-hidden">
              {locSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setLocQuery(s.label)
                    set('location', s.label)
                    setLocOpen(false)
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Skills</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
            placeholder="Type a skill and press Enter"
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="button"
            onClick={addSkill}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
        {form.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.skills.map((skill) => (
              <span
                key={skill}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-300 text-sm rounded-full border border-emerald-500/30"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="text-emerald-400 hover:text-red-400 transition-colors leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Industry tags */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Industry</label>
        <div className="flex flex-wrap gap-2">
          {INDUSTRY_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleIndustry(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                form.industry_tags.includes(tag)
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Anonymous summary <span className="text-slate-500 text-xs">(no name, company, or contact info)</span>
        </label>
        <textarea
          value={form.summary}
          onChange={(e) => set('summary', e.target.value)}
          placeholder="A results-driven professional with deep expertise in scaling SaaS products across EMEA markets…"
          rows={4}
          maxLength={1500}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
        />
        <p className="text-xs text-slate-600 mt-1">{form.summary.length}/1500</p>
      </div>

      {/* Activate toggle */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800 border border-slate-700">
        <div>
          <p className="text-sm font-medium text-white">Visible in discovery</p>
          <p className="text-xs text-slate-500">When active, recruiters can find this snapshot</p>
        </div>
        <button
          type="button"
          onClick={() => set('is_active', !form.is_active)}
          className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`}
          />
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {isEdit ? 'Saving…' : 'Creating…'}
            </span>
          ) : (
            isEdit ? 'Save changes' : 'Create snapshot'
          )}
        </button>
      </div>
    </form>
  )
}
