'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Tag } from 'lucide-react'

export default function PromotionsPage() {
  const [schemes, setSchemes] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/v1/promotions').then(r => r.json()).then(d => setSchemes(d.data || []))
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    const res = await fetch('/api/v1/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (res.ok) {
      const d = await res.json()
      setSchemes([d.data, ...schemes])
      setIsOpen(false)
      toast.success('Scheme created')
    } else {
      toast.error('Failed to create scheme')
    }
    setLoading(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/v1/promotions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current })
    })
    setSchemes(schemes.map(s => s.id === id ? { ...s, is_active: !current } : s))
  }

  const typeLabels: Record<string, string> = {
    BILL: 'Bill-level Discount',
    ITEM: 'Item Discount',
    QTY_BASED: 'Quantity Pricing',
    FREE_ITEM: 'Free Item Scheme',
    BUNDLE: 'Bundle Discount'
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Promotions & Discounts</h1>
          <p className="text-sm text-zinc-500">{schemes.length} schemes configured</p>
        </div>
        <button onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Scheme
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schemes.map(scheme => (
          <div key={scheme.id} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{scheme.name}</span>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {typeLabels[scheme.type] || scheme.type}
                </span>
                <p className="text-sm text-zinc-500 mt-2">
                  Discount: {scheme.is_percentage ? `${scheme.discount_value}%` : `₹${(scheme.discount_value / 100).toFixed(2)}`}
                  {scheme.min_bill_value > 0 && ` • Min bill: ₹${(scheme.min_bill_value / 100).toFixed(2)}`}
                </p>
                {scheme.start_date && (
                  <p className="text-xs text-zinc-400 mt-1">
                    {new Date(scheme.start_date).toLocaleDateString('en-IN')} – {scheme.end_date ? new Date(scheme.end_date).toLocaleDateString('en-IN') : 'No expiry'}
                  </p>
                )}
              </div>
              <button onClick={() => toggleActive(scheme.id, scheme.is_active)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  scheme.is_active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}>
                {scheme.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        ))}
        {schemes.length === 0 && (
          <div className="col-span-2 py-16 text-center text-zinc-400 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No promotion schemes yet</p>
            <p className="text-sm mt-1">Add a scheme to start applying discounts automatically at billing</p>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">New Promotion Scheme</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Scheme Name *</label>
                <input required name="name" type="text" placeholder="e.g. Diwali Sale 10% Off"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Type</label>
                  <select name="type" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent">
                    <option value="BILL">Bill-level Discount</option>
                    <option value="ITEM">Item Discount</option>
                    <option value="QTY_BASED">Quantity Pricing</option>
                    <option value="FREE_ITEM">Free Item Scheme</option>
                    <option value="BUNDLE">Bundle Discount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Discount Type</label>
                  <select name="is_percentage" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent">
                    <option value="true">Percentage (%)</option>
                    <option value="false">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Discount Value</label>
                  <input required name="discount_value" type="number" step="0.01" placeholder="e.g. 10"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Min Bill Value (₹)</label>
                  <input name="min_bill_value" type="number" step="0.01" placeholder="0"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Start Date</label>
                  <input name="start_date" type="date"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">End Date (optional)</label>
                  <input name="end_date" type="date"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900">Cancel</button>
                <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Saving...' : 'Create Scheme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
