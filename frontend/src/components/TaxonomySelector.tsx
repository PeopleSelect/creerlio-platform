'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, X, Loader2 } from 'lucide-react'

interface TaxonomyItem {
  id: string
  name: string
}

export interface TaxonomyValue {
  industry_id:     string | null
  industry_name:   string | null
  sector_id:       string | null
  sector_name:     string | null
  profession_id:   string | null
  profession_name: string | null
}

interface Props {
  value:    TaxonomyValue
  onChange: (val: TaxonomyValue) => void
  /** If true, only industry + sector are shown (no profession layer) */
  maxLayer?: 1 | 2 | 3
  required?: boolean
  className?: string
}

const EMPTY: TaxonomyValue = {
  industry_id: null, industry_name: null,
  sector_id:   null, sector_name:   null,
  profession_id: null, profession_name: null,
}

export default function TaxonomySelector({
  value,
  onChange,
  maxLayer = 3,
  required = false,
  className = '',
}: Props) {
  const [industries, setIndustries] = useState<TaxonomyItem[]>([])
  const [sectors,    setSectors]    = useState<TaxonomyItem[]>([])
  const [professions, setProfessions] = useState<TaxonomyItem[]>([])

  const [loadingInd,  setLoadingInd]  = useState(true)
  const [loadingSec,  setLoadingSec]  = useState(false)
  const [loadingProf, setLoadingProf] = useState(false)

  // Load industries once
  useEffect(() => {
    fetch('/api/taxonomy/industries')
      .then(r => r.json())
      .then(j => setIndustries(j.industries || []))
      .catch(() => {})
      .finally(() => setLoadingInd(false))
  }, [])

  // Load sectors when industry changes
  useEffect(() => {
    if (!value.industry_id) { setSectors([]); setProfessions([]); return }
    setLoadingSec(true)
    fetch(`/api/taxonomy/sectors?industry_id=${value.industry_id}`)
      .then(r => r.json())
      .then(j => setSectors(j.sectors || []))
      .catch(() => setSectors([]))
      .finally(() => setLoadingSec(false))
  }, [value.industry_id])

  // Load professions when sector changes
  useEffect(() => {
    if (!value.sector_id || maxLayer < 3) { setProfessions([]); return }
    setLoadingProf(true)
    fetch(`/api/taxonomy/professions?sector_id=${value.sector_id}`)
      .then(r => r.json())
      .then(j => setProfessions(j.professions || []))
      .catch(() => setProfessions([]))
      .finally(() => setLoadingProf(false))
  }, [value.sector_id, maxLayer])

  const handleIndustry = useCallback((id: string, name: string) => {
    onChange({ ...EMPTY, industry_id: id, industry_name: name })
  }, [onChange])

  const handleSector = useCallback((id: string, name: string) => {
    onChange({
      ...value,
      sector_id: id, sector_name: name,
      profession_id: null, profession_name: null,
    })
  }, [onChange, value])

  const handleProfession = useCallback((id: string, name: string) => {
    onChange({ ...value, profession_id: id, profession_name: name })
  }, [onChange, value])

  const clear = useCallback(() => onChange({ ...EMPTY }), [onChange])

  const selectClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 ' +
    'disabled:bg-gray-50 disabled:text-gray-400'

  return (
    <div className={`space-y-3 ${className}`}>

      {/* Layer 1: Industry */}
      <div className="relative">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Industry {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          {loadingInd ? (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading industries…
            </div>
          ) : (
            <select
              required={required}
              value={value.industry_id || ''}
              onChange={e => {
                const opt = industries.find(i => i.id === e.target.value)
                if (opt) handleIndustry(opt.id, opt.name)
                else onChange({ ...EMPTY })
              }}
              className={selectClass}
            >
              <option value="">Select industry…</option>
              {industries.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          )}
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Layer 2: Sector */}
      {maxLayer >= 2 && value.industry_id && (
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">Sector</label>
          <div className="relative">
            {loadingSec ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading sectors…
              </div>
            ) : (
              <select
                value={value.sector_id || ''}
                onChange={e => {
                  const opt = sectors.find(s => s.id === e.target.value)
                  if (opt) handleSector(opt.id, opt.name)
                  else onChange({ ...value, sector_id: null, sector_name: null, profession_id: null, profession_name: null })
                }}
                className={selectClass}
              >
                <option value="">Select sector…</option>
                {sectors.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
      )}

      {/* Layer 3: Profession */}
      {maxLayer >= 3 && value.sector_id && (
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">Profession / Role</label>
          <div className="relative">
            {loadingProf ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading professions…
              </div>
            ) : (
              <select
                value={value.profession_id || ''}
                onChange={e => {
                  const opt = professions.find(p => p.id === e.target.value)
                  if (opt) handleProfession(opt.id, opt.name)
                  else onChange({ ...value, profession_id: null, profession_name: null })
                }}
                className={selectClass}
              >
                <option value="">Select profession…</option>
                {professions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
      )}

      {/* Clear button — shown once at least an industry is selected */}
      {value.industry_id && (
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="h-3 w-3" /> Clear selection
        </button>
      )}
    </div>
  )
}
