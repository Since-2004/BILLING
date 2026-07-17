'use client'

import { useEffect, useState } from 'react'

export default function ShiftPage() {
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
  }

  useEffect(() => {
    fetch('/api/v1/shifts').then(r => r.json()).then(d => {
      setShifts(d.data || [])
      setLoading(false)
    })
  }, [])

  const activeShift = shifts.find((s: any) => s.status === 'ACTIVE')

  async function handleOpenShift(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const res = await fetch('/api/v1/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'OPEN', opening_cash: formData.get('opening_cash') })
    })
    const data = await res.json()
    if (data.success) {
      setShifts([data.data, ...shifts] as any)
    }
  }

  async function handleCloseShift(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const res = await fetch('/api/v1/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CLOSE', shift_id: activeShift?.id, closing_cash: formData.get('closing_cash') })
    })
    const data = await res.json()
    if (data.success) {
      setShifts(shifts.map((s: any) => s.id === activeShift?.id ? data.data : s) as any)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Shift Management</h1>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        {activeShift ? (
          <div>
            <h2 className="text-xl font-semibold text-green-600 mb-4">🟢 Shift is Active</h2>
            <p className="text-sm text-zinc-500 mb-6">Started at: {new Date(activeShift.start_time).toLocaleString()}</p>
            <form onSubmit={handleCloseShift} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Closing Cash Amount (₹)</label>
                <input required type="number" name="closing_cash" className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent" />
              </div>
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                End Shift
              </button>
            </form>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Start a New Shift</h2>
            <form onSubmit={handleOpenShift} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Opening Cash Till (₹)</label>
                <input required type="number" name="opening_cash" defaultValue="0" className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent" />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Open Shift
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <h2 className="p-4 font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800">Shift History</h2>
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold uppercase text-xs text-zinc-500">Opened</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase text-xs text-zinc-500">Closed</th>
                  <th className="px-4 py-3 text-right font-semibold uppercase text-xs text-zinc-500">Opening Cash</th>
                  <th className="px-4 py-3 text-right font-semibold uppercase text-xs text-zinc-500">Closing Cash</th>
                  <th className="px-4 py-3 text-right font-semibold uppercase text-xs text-zinc-500">Variance</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase text-xs text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                {shifts.map((s: any) => (
                  <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-900 dark:text-zinc-100">{new Date(s.created_at || s.opened_at || s.start_time).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-500">{s.closed_at || s.end_time ? new Date(s.closed_at || s.end_time).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-zinc-600 dark:text-zinc-400">{formatCurrency(s.opening_cash || 0)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-zinc-900 dark:text-zinc-100">{s.closing_cash != null ? formatCurrency(s.closing_cash) : '—'}</td>
                    <td className={`px-4 py-3 text-right whitespace-nowrap font-semibold ${s.closing_cash != null && s.closing_cash < s.opening_cash ? 'text-red-600' : 'text-green-600'}`}>
                      {s.closing_cash != null ? formatCurrency((s.closing_cash || 0) - (s.opening_cash || 0)) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.status === 'ACTIVE' || s.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-700'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {shifts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No shifts recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
