'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function TransfersPage() {
  const [transfers, setTransfers] = useState([])
  const [items, setItems] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    fetch('/api/v1/transfers').then(res => res.json()).then(data => {
      setTransfers(data.data || [])
      setLoading(false)
    })
    fetch('/api/v1/items').then(res => res.json()).then(data => setItems(data.data || []))
    fetch('/api/v1/branches').then(res => res.json()).then(data => setBranches(data.data || []))
  }, [])

  async function handleAddTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const to_branch_id = formData.get('to_branch_id') as string
    const item_id = formData.get('item_id') as string
    const quantity = formData.get('quantity') as string

    if (!to_branch_id || !item_id || !quantity) return toast.error('All fields are required')

    const payload = {
      to_branch_id,
      items: [{ item_id, quantity: Number(quantity) }]
    }

    const res = await fetch('/api/v1/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    const data = await res.json()
    if (data.success) {
      setTransfers([data.data, ...transfers] as any)
      setShowAdd(false)
      toast.success('Transfer initiated successfully!')
    } else {
      toast.error(data.error || 'Failed to initiate transfer')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Location Transfers</h1>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showAdd ? 'Cancel' : '+ New Transfer'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Initiate Transfer</h2>
          <form onSubmit={handleAddTransfer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">To Branch *</label>
                <select required name="to_branch_id" className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent">
                  <option value="">Select Branch</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Item *</label>
                <select required name="item_id" className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent">
                  <option value="">Select Item</option>
                  {items.map((item: any) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Quantity *</label>
                <input required type="number" name="quantity" min="1" className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium">Send Transfer</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading transfers...</div>
        ) : (
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Transfer No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
              {transfers.map((trf: any) => (
                <tr key={trf.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">{trf.transfer_no}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{new Date(trf.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {trf.status}
                    </span>
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-sm text-zinc-500">No location transfers yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
