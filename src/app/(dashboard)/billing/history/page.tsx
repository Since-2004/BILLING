'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Plus, Download, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { addTransactionPayment } from './actions'

export default function BillingHistoryPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, pages: 1 })
  const [filters, setFilters] = useState({ type: 'SALES_INVOICE', from: '', to: '' })

  // Log Payment modal states
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [submittingPayment, setSubmittingPayment] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      type: filters.type,
      page: String(page),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
      ...(search && { search })
    })
    const res = await fetch(`/api/v1/transactions?${params}`)
    const data = await res.json()
    setTransactions(data.data || [])
    setMeta(data.meta || { total: 0, pages: 1 })
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [page, filters])

  const formatCurrency = (p: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p / 100)

  // Export to Excel CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return toast.error('No transactions to export')
    const headers = ['Invoice No', 'Date', 'Customer/Vendor', 'Total (Rs)', 'Paid (Rs)', 'Balance (Rs)', 'Status', 'DC Number']
    const rows = transactions.map(tx => {
      const balance = tx.total - tx.amount_paid
      const dcNumber = tx.notes && tx.notes.startsWith('DC No:') ? tx.notes.replace('DC No:', '').split('\n')[0].trim() : '-'
      return [
        tx.transaction_no,
        new Date(tx.date).toLocaleDateString('en-IN'),
        tx.party_name || 'Walk-in',
        (tx.total / 100).toFixed(2),
        (tx.amount_paid / 100).toFixed(2),
        (balance / 100).toFixed(2),
        tx.status,
        dcNumber
      ]
    })

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `sales_history_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Excel-compatible CSV exported successfully!')
  }

  // Credit payment submit handler
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTx) return
    const amtPaise = Math.round(parseFloat(paymentAmount) * 100)
    if (isNaN(amtPaise) || amtPaise <= 0) return toast.error('Please enter a valid amount')

    const remaining = selectedTx.total - selectedTx.amount_paid
    if (amtPaise > remaining) return toast.error('Amount exceeds remaining balance')

    setSubmittingPayment(true)
    const res = await addTransactionPayment(selectedTx.id, amtPaise, paymentMode)
    if (res.success) {
      toast.success('Payment logged successfully!')
      setSelectedTx(null)
      setPaymentAmount('')
      fetchData()
    } else {
      toast.error(res.error || 'Failed to log payment')
    }
    setSubmittingPayment(false)
  }

  const handleDeleteTx = async (id: string, no: string) => {
    if (!window.confirm(`Are you sure you want to delete transaction ${no}? This will also delete any related payments, journal entries, and restore stock.`)) {
      return
    }
    try {
      const res = await fetch(`/api/v1/transactions/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success(`Transaction ${no} deleted successfully`)
        fetchData()
      } else {
        toast.error(data.error || 'Failed to delete transaction')
      }
    } catch (err) {
      toast.error('Failed to delete transaction')
    }
  }

  const totalValue = transactions.reduce((acc, t) => acc + t.total, 0)
  const totalPaid = transactions.reduce((acc, t) => acc + t.amount_paid, 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Transaction History</h1>
          <p className="text-sm text-zinc-500">{meta.total} transactions found</p>
        </div>
        <Link href="/billing" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow">
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search invoice no or customer..."
            value={search} 
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
            className="w-full pl-9 pr-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
          />
        </div>
        <select 
          value={filters.type} 
          onChange={e => {
            setPage(1)
            setFilters({ ...filters, type: e.target.value })
          }}
          className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="SALES_INVOICE">Sales Invoices</option>
          <option value="PURCHASE_BILL">Purchase Bills</option>
          <option value="QUOTATION">Quotations</option>
          <option value="SALES_RETURN">Sale Returns</option>
          <option value="PURCHASE_RETURN">Purchase Returns</option>
        </select>
        <input 
          type="date" 
          value={filters.from} 
          onChange={e => {
            setPage(1)
            setFilters({ ...filters, from: e.target.value })
          }}
          className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
        <input 
          type="date" 
          value={filters.to} 
          onChange={e => {
            setPage(1)
            setFilters({ ...filters, to: e.target.value })
          }}
          className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
        <button onClick={fetchData} className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow">Apply</button>
        
        <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow">
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                {['Invoice No','Date','Customer/Vendor','Items (Qty)','Total','Paid','Balance','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-zinc-500">Loading transactions...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-zinc-500">No transactions found.</td></tr>
              ) : transactions.map(tx => {
                const balance = tx.total - tx.amount_paid
                return (
                  <tr key={tx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-blue-600">{tx.transaction_no}</td>
                    <td className="px-4 py-3 text-zinc-500">{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{tx.party_name || 'Walk-in'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-650 dark:text-zinc-400 max-w-[200px] truncate" title={tx.items?.map((item: any) => `${item.item_name} (x${item.quantity})`).join(', ')}>
                      {tx.items?.map((item: any) => `${item.item_name} (x${item.quantity})`).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{formatCurrency(tx.total)}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600">{formatCurrency(tx.amount_paid)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(balance)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        tx.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        balance > 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {tx.status === 'CANCELLED' ? 'Cancelled' : balance > 0 ? 'Partial' : 'Paid'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2.5 items-center">
                        <Link href={`/billing/${tx.id}`} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold underline">View</Link>
                        <Link href={`/billing/${tx.id}`} target="_blank" className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-semibold underline">Print</Link>
                        <Link href={`/billing/${tx.id}/edit`} className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 font-semibold underline">Edit</Link>
                        <button onClick={() => handleDeleteTx(tx.id, tx.transaction_no)} className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold underline">Delete</button>
                        {balance > 0 && tx.status !== 'CANCELLED' && (
                          <button
                            onClick={() => {
                              setSelectedTx(tx)
                              setPaymentAmount((balance / 100).toString())
                            }}
                            className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-bold flex items-center gap-0.5 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
                          >
                            <CreditCard className="w-3 h-3" />
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {transactions.length > 0 && (
              <tfoot className="bg-zinc-50 dark:bg-zinc-900/50 font-bold border-t border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-zinc-500 font-medium">Page Total ({transactions.length} records)</td>
                  <td className="px-4 py-4 text-right font-mono">{formatCurrency(totalValue)}</td>
                  <td className="px-4 py-4 text-right font-mono text-green-600">{formatCurrency(totalPaid)}</td>
                  <td className="px-4 py-4 text-right font-mono text-red-600">{formatCurrency(totalValue - totalPaid)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm text-zinc-500">Page {page} of {meta.pages}</span>
          <button 
            disabled={page >= meta.pages} 
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* Log Payment Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Collect Credit Payment</h3>
              <button onClick={() => setSelectedTx(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold text-lg">✕</button>
            </div>
            <div className="mb-4 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl text-xs space-y-1.5 text-zinc-600 dark:text-zinc-300">
              <p><strong>Invoice No:</strong> {selectedTx.transaction_no}</p>
              <p><strong>Customer:</strong> {selectedTx.party_name || 'Walk-in Customer'}</p>
              <p><strong>Total Bill:</strong> {formatCurrency(selectedTx.total)}</p>
              <p><strong>Paid So Far:</strong> {formatCurrency(selectedTx.amount_paid)}</p>
              <p className="text-red-600 font-bold"><strong>Remaining Balance:</strong> {formatCurrency(selectedTx.total - selectedTx.amount_paid)}</p>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Amount Received (in Rs.)</label>
                <input
                  required
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                </select>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setSelectedTx(null)} className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  Cancel
                </button>
                <button type="submit" disabled={submittingPayment} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded text-xs font-bold shadow-md">
                  {submittingPayment ? 'Saving...' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
