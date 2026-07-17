'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Plus, Download, CreditCard, CalendarDays, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { addTransactionPayment } from './actions'

function InvoicesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'sales'

  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, pages: 1 })
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' })

  // Log Payment modal states
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [submittingPayment, setSubmittingPayment] = useState(false)

  // Map tabs to API Transaction types
  const tabToTypeMap: Record<string, string> = {
    'sales': 'SALES_INVOICE',
    'purchase': 'PURCHASE_BILL',
    'sales-returns': 'SALES_RETURN',
    'purchase-returns': 'PURCHASE_RETURN',
    'quotations': 'QUOTATION',
    'daily-entries': 'DAILY_ENTRY',
    'consolidated': 'CONSOLIDATED_INVOICE',
  }

  const fetchData = async () => {
    setLoading(true)
    const apiType = tabToTypeMap[activeTab] || 'SALES_INVOICE'
    const params = new URLSearchParams({
      type: apiType,
      page: String(page),
      ...(dateFilter.from && { from: dateFilter.from }),
      ...(dateFilter.to && { to: dateFilter.to }),
      ...(search && { search })
    })

    try {
      const res = await fetch(`/api/v1/transactions?${params}`)
      const data = await res.json()
      setTransactions(data.data || [])
      setMeta(data.meta || { total: 0, pages: 1 })
    } catch (e) {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, activeTab, dateFilter])

  const formatCurrency = (p: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p / 100)

  // Handle CSV Export
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
    link.setAttribute('download', `${activeTab}_invoices_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Excel-compatible CSV exported successfully!')
  }

  // Payment receipt submission
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

  // Delete transaction handler
  const handleDeleteTx = async (id: string, no: string) => {
    if (!window.confirm(`Are you sure you want to delete transaction ${no}? This will restore inventory levels, undo double-entry ledgers and remove related payments.`)) {
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

  const tabs = [
    { id: 'sales', name: 'Sales Invoices', creationUrl: '/billing', creationLabel: 'New Invoice' },
    { id: 'purchase', name: 'Purchase Bills', creationUrl: '/purchase/grn', creationLabel: 'New Purchase (GRN)' },
    { id: 'sales-returns', name: 'Sale Returns', creationUrl: '/billing/returns', creationLabel: 'New Sale Return' },
    { id: 'purchase-returns', name: 'Purchase Returns', creationUrl: '/purchase/returns', creationLabel: 'New Purchase Return' },
    { id: 'quotations', name: 'Quotations', creationUrl: '/billing/quotations', creationLabel: 'New Quotation' },
    { id: 'daily-entries', name: 'Daily Entries', creationUrl: '/billing/daily-entry', creationLabel: 'New Daily Entry' },
    { id: 'consolidated', name: 'Consolidated Invoices', creationUrl: '/billing/daily-entry/monthly?view=consolidated', creationLabel: 'New Consolidated Invoice' },
  ]

  const currentTabInfo = tabs.find(t => t.id === activeTab) || tabs[0]

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header and CTA */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Invoices & Bills Hub</h1>
          <p className="text-sm text-zinc-500">Manage, record, and print all invoices, purchases, returns, and daily records.</p>
        </div>
        <Link 
          href={currentTabInfo.creationUrl} 
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          {currentTabInfo.creationLabel}
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 flex gap-2 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                setPage(1)
                router.push(`/invoices?tab=${tab.id}`)
              }}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                isActive 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {tab.name}
            </button>
          )
        })}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm items-center">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search invoice number or Customer/Supplier name..."
            value={search} 
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
            className="w-full pl-9 pr-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-400" 
          />
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-zinc-400" />
          <input 
            type="date" 
            value={dateFilter.from} 
            onChange={e => {
              setPage(1)
              setDateFilter({ ...dateFilter, from: e.target.value })
            }}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
          />
          <span className="text-zinc-400 text-sm">to</span>
          <input 
            type="date" 
            value={dateFilter.to} 
            onChange={e => {
              setPage(1)
              setDateFilter({ ...dateFilter, to: e.target.value })
            }}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
          />
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow">Apply Filters</button>
        
        <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow">
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {/* Unified Invoices Listing Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Number</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Party Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Items Summary</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Total</th>
                {activeTab !== 'quotations' && (
                  <>
                    <th className="px-4 py-3 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Balance</th>
                  </>
                )}
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-zinc-500 font-medium">Loading invoices...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-zinc-500 font-medium">No records found for this category.</td></tr>
              ) : transactions.map(tx => {
                const balance = tx.total - tx.amount_paid
                return (
                  <tr key={tx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-blue-600">{tx.transaction_no}</td>
                    <td className="px-4 py-3 text-zinc-500">{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{tx.party_name || 'Walk-in'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500 max-w-[220px] truncate" title={tx.items?.map((item: any) => `${item.item_name} (x${item.quantity})`).join(', ')}>
                      {tx.items?.map((item: any) => `${item.item_name} (x${item.quantity})`).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{formatCurrency(tx.total)}</td>
                    {activeTab !== 'quotations' && (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-green-600">{formatCurrency(tx.amount_paid)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {formatCurrency(balance)}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        tx.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        activeTab === 'quotations' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        balance > 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {tx.status === 'CANCELLED' ? 'Cancelled' : activeTab === 'quotations' ? 'Active' : balance > 0 ? 'Partial' : 'Paid'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-3 justify-center items-center">
                        <Link href={`/billing/${tx.id}`} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold underline">View</Link>
                        <Link href={`/billing/${tx.id}`} target="_blank" className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-semibold underline">Print</Link>
                        {activeTab === 'consolidated' ? (
                          <Link href={`/billing/daily-entry/monthly?view=consolidated&editId=${tx.id}`} className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 font-semibold underline">Edit</Link>
                        ) : (
                          <Link href={`/billing/${tx.id}/edit`} className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 font-semibold underline">Edit</Link>
                        )}
                        <button onClick={() => handleDeleteTx(tx.id, tx.transaction_no)} className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold underline">Delete</button>
                        {balance > 0 && tx.status !== 'CANCELLED' && activeTab !== 'quotations' && (
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
          </table>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="text-xs text-zinc-500">
              Showing Page <span className="font-semibold text-zinc-700 dark:text-zinc-300">{page}</span> of <span className="font-semibold text-zinc-700 dark:text-zinc-300">{meta.pages}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold rounded hover:bg-zinc-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                disabled={page === meta.pages}
                className="px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold rounded hover:bg-zinc-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Log Payment: {selectedTx.transaction_no}</h3>
              <button onClick={() => setSelectedTx(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold">✕</button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Due Amount</label>
                <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                  {formatCurrency(selectedTx.total - selectedTx.amount_paid)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Payment Amount (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  max={(selectedTx.total - selectedTx.amount_paid) / 100}
                  value={paymentAmount} 
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Payment Mode</label>
                <select 
                  value={paymentMode} 
                  onChange={e => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button type="button" onClick={() => setSelectedTx(null)} className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded text-xs font-bold hover:bg-zinc-55">Cancel</button>
                <button type="submit" disabled={submittingPayment} className="px-4 py-2 bg-blue-650 hover:bg-blue-700 text-white rounded text-xs font-bold disabled:opacity-50">
                  {submittingPayment ? 'Logging...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading portal...</div>}>
      <InvoicesContent />
    </Suspense>
  )
}
