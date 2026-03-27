'use client'

import { useState } from 'react'
import { X, FileText, Briefcase, Users, MessageCircle, ChevronRight, Loader2, Check } from 'lucide-react'

interface Business {
  id: string
  name: string
  business_name?: string | null
  industry?: string | null
  city?: string | null
}

interface Props {
  connections: { id: string; business_profiles: Business | null }[]
  token: string
  onClose: () => void
  onSent: () => void
}

const TYPES = [
  {
    id: 'rfq',
    label: 'Request a Quote',
    icon: FileText,
    color: 'blue',
    ring: 'ring-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    desc: 'Request pricing for goods or services',
  },
  {
    id: 'job',
    label: 'Job Opportunity',
    icon: Briefcase,
    color: 'violet',
    ring: 'ring-violet-500',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    desc: 'Share a role or contract with a contact',
  },
  {
    id: 'partnership',
    label: 'Partnership',
    icon: Users,
    color: 'emerald',
    ring: 'ring-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    desc: 'Propose a business collaboration',
  },
  {
    id: 'enquiry',
    label: 'General Enquiry',
    icon: MessageCircle,
    color: 'amber',
    ring: 'ring-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    desc: 'Open-ended message or enquiry',
  },
] as const

type OppType = (typeof TYPES)[number]['id']

export default function OpportunityModal({ connections, token, onClose, onSent }: Props) {
  const [step, setStep]               = useState<1 | 2 | 3>(1)
  const [type, setType]               = useState<OppType | null>(null)
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget]           = useState('')
  const [deadline, setDeadline]       = useState('')
  const [selectedBizIds, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy]               = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const businesses = connections
    .map(c => c.business_profiles)
    .filter((b): b is Business => !!b)
    .filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i)

  function toggleBiz(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function canProceedStep2() {
    return !!type && !!title.trim()
  }

  async function handleSubmit() {
    if (!type || !title.trim() || selectedBizIds.size === 0) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/customer/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          title:       title.trim(),
          description: description.trim() || null,
          budget:      budget.trim() || null,
          deadline:    deadline || null,
          business_ids: Array.from(selectedBizIds),
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Failed to send')
      }
      onSent()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const selectedType = TYPES.find(t => t.id === type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Send Opportunity</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Step {step} of 3 — {step === 1 ? 'Choose type' : step === 2 ? 'Add details' : 'Select recipients'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1 — type selection */}
        {step === 1 && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3">
              {TYPES.map(t => {
                const Icon = t.icon
                const active = type === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`text-left rounded-xl border-2 p-4 transition-all ${
                      active
                        ? `${t.border} ${t.bg} ring-2 ${t.ring} ring-offset-1`
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-2.5 ${active ? t.bg : 'bg-gray-100'}`}>
                      <Icon className={`h-4 w-4 ${active ? t.text : 'text-gray-500'}`} />
                    </div>
                    <p className={`font-semibold text-sm ${active ? t.text : 'text-gray-800'}`}>{t.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.desc}</p>
                  </button>
                )
              })}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={!type}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — details */}
        {step === 2 && selectedType && (
          <div className="p-6 space-y-4">
            <div className={`inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full ${selectedType.bg} ${selectedType.text}`}>
              <selectedType.icon className="h-3 w-3" />
              {selectedType.label}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={
                  type === 'rfq' ? 'e.g. Quote for office furniture supply' :
                  type === 'job' ? 'e.g. Senior Developer — 6 month contract' :
                  type === 'partnership' ? 'e.g. Co-marketing partnership proposal' :
                  'e.g. Quick question about your services'
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the opportunity in more detail..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Budget (optional)</label>
                <input
                  type="text"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  placeholder="e.g. $5,000–$10,000"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deadline (optional)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-between pt-1">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">Back</button>
              <button
                type="button"
                disabled={!canProceedStep2()}
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — recipient selection */}
        {step === 3 && (
          <div className="p-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Select businesses to receive this opportunity</p>
            {businesses.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">
                No connected businesses yet. Connect with businesses first.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {businesses.map(biz => {
                  const checked = selectedBizIds.has(biz.id)
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => toggleBiz(biz.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        checked ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        checked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {checked ? <Check className="h-4 w-4" /> : (biz.name || biz.business_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{biz.name || biz.business_name}</p>
                        <p className="text-xs text-gray-400 truncate">{[biz.industry, biz.city].filter(Boolean).join(' · ')}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <div className="flex justify-between items-center mt-4">
              <button type="button" onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700">Back</button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={busy || selectedBizIds.size === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : `Send to ${selectedBizIds.size} business${selectedBizIds.size !== 1 ? 'es' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
