'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function PurchaseReturnPage() {
  const [billNo, setBillNo] = useState('')
  const [originalTx, setOriginalTx] = useState<any>(null)
  const [returnItems, setReturnItems] = useState<any[]>([])
  const [reason, setReason] = useState('Defective')
  const [loading, setLoading] = useState(false)

  const searchBill = async () => {
    if (!billNo.trim()) return toast.error('Please enter a purchase bill number')
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/transactions?search=${encodeURIComponent(billNo)}&type=PURCHASE_BILL`)
      const data = await res.json()
      const tx = data.data?.[0]
      if (!tx) {
        toast.error('Purchase Bill not found')
        setOriginalTx(null)
        setReturnItems([])
        return
      }
      setOriginalTx(tx)
      setReturnItems(tx.items.map((item: any) => ({ ...item, return_qty: item.quantity })))
    } catch (e) {
      toast.error('Failed to query purchase bill')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!originalTx) return
    const activeReturns = returnItems.filter(i => i.return_qty > 0)
    if (activeReturns.length === 0) {
      return toast.error('Please select at least one item to return')
    }
    
    setLoading(true)
    const items = activeReturns.map(i => ({
      item_id: i.item_id,
      item_name: i.item_name,
      quantity: i.return_qty,
      rate: i.rate,
      tax_rate: i.tax_rate,
      tax_amount: Math.round(i.return_qty * i.rate * i.tax_rate / 100),
      total: i.return_qty * i.rate + Math.round(i.return_qty * i.rate * i.tax_rate / 100)
    }))
    const total = items.reduce((acc, i) => acc + i.total, 0)
    const payload = {
      type: 'PURCHASE_RETURN', 
      party_id: originalTx.party_id,
      party_name: originalTx.party_name,
      ref_invoice_id: originalTx.id,
      subtotal: items.reduce((acc, i) => acc + i.quantity * i.rate, 0),
      tax_amount: items.reduce((acc, i) => acc + i.tax_amount, 0),
      total, 
      amount_paid: 0, 
      payment_mode: 'CREDIT',
      notes: `Purchase Return against ${originalTx.transaction_no}. Reason: ${reason}`,
      items
    }

    try {
      const res = await fetch('/api/v1/transactions', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        toast.success('Purchase return processed successfully')
        setOriginalTx(null)
        setReturnItems([])
        setBillNo('')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to process return')
      }
    } catch (e) {
      toast.error('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (p: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p / 100)

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Purchase Return / Debit Note</h1>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <label className="block text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">
          Search Original Purchase Bill Number
        </label>
        <div className="flex gap-3">
          <input 
            type="text" 
            value={billNo} 
            onChange={e => setBillNo(e.target.value)}
            placeholder="e.g. PUR/24-25/00001"
            className="flex-1 px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            onKeyDown={e => e.key === 'Enter' && searchBill()} 
          />
          <button onClick={searchBill} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow">
            Find Purchase Bill
          </button>
        </div>
      </div>

      {originalTx && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-zinc-900 dark:text-zinc-100 text-base">Original Bill: {originalTx.transaction_no}</p>
              <p className="text-sm text-zinc-500 mt-0.5">{originalTx.party_name} • {new Date(originalTx.date).toLocaleDateString('en-IN')}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Reason for Return</label>
              <select 
                value={reason} 
                onChange={e => setReason(e.target.value)}
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Defective</option>
                <option>Wrong Item</option>
                <option>Seller Request</option>
                <option>Quality Issue</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs font-semibold">
                  <th className="px-4 py-3 text-left">Item Name</th>
                  <th className="px-4 py-3 text-center">Original Qty</th>
                  <th className="px-4 py-3 text-center">Return Qty</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {returnItems.map((item, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-850/50">
                    <td className="px-4 py-4 font-medium text-zinc-900 dark:text-zinc-100">{item.item_name}</td>
                    <td className="px-4 py-4 text-center text-zinc-500 font-mono">{item.quantity}</td>
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="number" 
                        min="0" 
                        max={item.quantity}
                        value={item.return_qty}
                        onChange={e => setReturnItems(returnItems.map((r, idx) =>
                          idx !== i ? r : { ...r, return_qty: Math.min(Number(e.target.value), item.quantity) }
                        ))}
                        className="w-20 text-center border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1 bg-transparent text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(item.return_qty * item.rate + Math.round(item.return_qty * item.rate * item.tax_rate / 100))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Return Value: <span className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">
                {formatCurrency(returnItems.reduce((acc, i) => acc + i.return_qty * i.rate + Math.round(i.return_qty * i.rate * i.tax_rate / 100), 0))}
              </span>
            </p>
            <button 
              onClick={handleSubmit} 
              disabled={loading || returnItems.reduce((acc, i) => acc + i.return_qty, 0) === 0}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shadow"
            >
              {loading ? 'Processing...' : 'Process Return & Issue Debit Note'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
