'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  ChevronLeft, Plus, Pencil, Trash2, Loader2, Check,
  Package, Wrench, Tag, DollarSign, ToggleLeft, ToggleRight, X,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Product {
  id: string
  name: string
  description: string | null
  category: string | null
  price_from: number | null
  price_to: number | null
  price_unit: string
  is_service: boolean
  is_active: boolean
}

const PRICE_UNITS = ['flat', 'hour', 'day', 'week', 'month', 'unit', 'project']
const CATEGORIES  = [
  'Consulting', 'Design', 'Development', 'Legal', 'Finance', 'Marketing',
  'HR & Recruitment', 'Real Estate', 'Construction', 'Retail', 'Manufacturing',
  'Logistics', 'Healthcare', 'Education', 'Hospitality', 'Other',
]

const emptyForm = {
  name: '', description: '', category: '', price_from: '', price_to: '',
  price_unit: 'flat', is_service: false,
}

export default function BusinessProductsPage() {
  const router = useRouter()

  const [token, setToken]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [tab, setTab]           = useState<'product' | 'service'>('product')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ ...emptyForm })
  const [editId, setEditId]     = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.replace('/login/business'); return }
      const meta = session.user.user_metadata || {}
      if (meta.registration_type !== 'business') {
        router.replace(`/login/${meta.registration_type || 'business'}`); return
      }
      setToken(session.access_token)
      const res = await fetch('/api/business/products', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) { const j = await res.json(); setProducts(j.products || []) }
      setLoading(false)
    }).catch(() => router.replace('/login/business'))
  }, [router])

  function startAdd(isService: boolean) {
    setForm({ ...emptyForm, is_service: isService })
    setEditId(null)
    setShowForm(true)
    setError(null)
  }

  function startEdit(p: Product) {
    setForm({
      name:        p.name,
      description: p.description || '',
      category:    p.category    || '',
      price_from:  p.price_from  != null ? String(p.price_from) : '',
      price_to:    p.price_to    != null ? String(p.price_to)   : '',
      price_unit:  p.price_unit  || 'flat',
      is_service:  p.is_service,
    })
    setEditId(p.id)
    setShowForm(true)
    setError(null)
  }

  async function saveProduct() {
    if (!token || !form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim() || null,
        category:    form.category    || null,
        price_from:  form.price_from  ? parseFloat(form.price_from)  : null,
        price_to:    form.price_to    ? parseFloat(form.price_to)    : null,
        price_unit:  form.price_unit,
        is_service:  form.is_service,
      }

      if (editId) {
        const res = await fetch('/api/business/products', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ id: editId, ...payload }),
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error)
        setProducts(prev => prev.map(p => p.id === editId ? j.product : p))
      } else {
        const res = await fetch('/api/business/products', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify(payload),
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error)
        setProducts(prev => [...prev, j.product])
      }
      setShowForm(false)
      setEditId(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(p: Product) {
    if (!token) return
    const res = await fetch('/api/business/products', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ id: p.id, is_active: !p.is_active }),
    })
    if (res.ok) {
      const j = await res.json()
      setProducts(prev => prev.map(x => x.id === p.id ? j.product : x))
    }
  }

  async function deleteProduct(id: string) {
    if (!token || !confirm('Delete this item?')) return
    const res = await fetch(`/api/business/products?id=${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setProducts(prev => prev.filter(p => p.id !== id))
  }

  function formatPrice(p: Product) {
    if (p.price_from == null) return null
    const from = `$${p.price_from.toLocaleString()}`
    const to   = p.price_to != null ? `–$${p.price_to.toLocaleString()}` : ''
    const unit = p.price_unit !== 'flat' ? `/${p.price_unit}` : ''
    return `${from}${to}${unit}`
  }

  const shown = products.filter(p => p.is_service === (tab === 'service'))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10">

        <Link href="/dashboard/business"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products &amp; Services</h1>
            <p className="text-gray-500 text-sm mt-0.5">Define your catalogue — customers can enquire about specific items when sending opportunities.</p>
          </div>
          <button type="button" onClick={() => startAdd(tab === 'service')}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" /> Add {tab === 'service' ? 'Service' : 'Product'}
          </button>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 mb-6 w-fit shadow-sm">
          <button type="button" onClick={() => setTab('product')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === 'product' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Package className="h-4 w-4" /> Products
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === 'product' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {products.filter(p => !p.is_service).length}
            </span>
          </button>
          <button type="button" onClick={() => setTab('service')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === 'service' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Wrench className="h-4 w-4" /> Services
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === 'service' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {products.filter(p => p.is_service).length}
            </span>
          </button>
        </div>

        {/* Add / Edit form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">{editId ? 'Edit' : 'New'} {form.is_service ? 'Service' : 'Product'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={form.is_service ? 'e.g. Legal Consultation, Web Development' : 'e.g. Standing Desk, Office Chair'}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of what's included..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price Unit</label>
                <select value={form.price_unit} onChange={e => setForm(f => ({ ...f, price_unit: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {PRICE_UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price From ($)</label>
                <input type="number" min="0" value={form.price_from} onChange={e => setForm(f => ({ ...f, price_from: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price To ($) <span className="text-gray-400 font-normal">optional</span></label>
                <input type="number" min="0" value={form.price_to} onChange={e => setForm(f => ({ ...f, price_to: e.target.value }))}
                  placeholder="Leave blank for fixed price"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
              <button type="button" onClick={saveProduct} disabled={saving || !form.name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editId ? 'Save Changes' : `Add ${form.is_service ? 'Service' : 'Product'}`}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {shown.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            {tab === 'service' ? <Wrench className="mx-auto h-10 w-10 text-gray-300 mb-3" /> : <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />}
            <p className="text-gray-500 font-medium">No {tab}s yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Add your first {tab} to let customers enquire about specific items.</p>
            <button type="button" onClick={() => startAdd(tab === 'service')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" /> Add {tab === 'service' ? 'Service' : 'Product'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {shown.map(p => (
                <div key={p.id} className={`flex items-center gap-4 px-6 py-4 transition-colors ${p.is_active ? 'hover:bg-gray-50' : 'bg-gray-50/50 opacity-60'}`}>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${p.is_service ? 'bg-violet-50' : 'bg-blue-50'}`}>
                    {p.is_service ? <Wrench className="h-5 w-5 text-violet-600" /> : <Package className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                      {!p.is_active && <span className="text-[11px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      {p.category && <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{p.category}</span>}
                      {formatPrice(p) && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatPrice(p)}</span>}
                      {p.description && <span className="truncate max-w-xs">{p.description}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => toggleActive(p)} className="text-gray-400 hover:text-gray-600 transition-colors" title={p.is_active ? 'Deactivate' : 'Activate'}>
                      {p.is_active ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button type="button" onClick={() => startEdit(p)} className="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => deleteProduct(p.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
