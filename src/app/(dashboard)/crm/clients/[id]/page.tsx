'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Printer, Phone, Mail, MapPin, Building2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { addTransactionPayment } from '../../../billing/history/actions'

export default function ClientDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Payment modal state
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [submittingPayment, setSubmittingPayment] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/clients/${id}`)
      if (!res.ok) throw new Error('Failed to fetch client details')
      const d = await res.json()
      setData(d.data)

      const itemsRes = await fetch('/api/v1/items')
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json()
        setItems(itemsData.data || [])
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading client detail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchData()
    }
  }, [id])

  const formatCurrency = (p: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p / 100)

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

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading client ledger details...</div>
  }

  if (!data || !data.client) {
    return (
      <div className="p-8 text-center text-zinc-500 space-y-4">
        <p>Client not found or deleted.</p>
        <Link href="/crm/clients" className="text-blue-600 hover:underline">Back to Clients</Link>
      </div>
    )
  }

  const { client, transactions, summary } = data
  const outstanding = summary.outstanding

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 print-content">
      {/* Header - Hidden on Print */}
      <div className="flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <Link href="/crm/clients" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{client.name}</h1>
            <p className="text-sm text-zinc-500">Client Account Ledger & Transaction Statement</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm">
          <Printer className="w-4 h-4" />
          Print Statement
        </button>
      </div>

      {/* Print Only Header */}
      <div className="hidden print-only mb-8">
        <div className="border-b-2 border-black pb-4 flex justify-between items-end text-black">
          <div>
            <h1 className="text-3xl font-bold text-black">{client.name}</h1>
            <p className="text-sm text-gray-500">Client Ledger Account Statement</p>
            {client.address && <p className="text-xs text-gray-400 mt-1">{client.address}</p>}
            {client.phone && <p className="text-xs text-gray-400">Phone: {client.phone}</p>}
            {client.gstin && <p className="text-xs text-gray-400">GSTIN: {client.gstin}</p>}
          </div>
          <div className="text-right">
            <h3 className="text-lg font-bold text-red-600">Outstanding: {formatCurrency(outstanding)}</h3>
            <p className="text-xs text-gray-400">As of: {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Outstanding Balance</p>
          <p className={`text-2xl font-bold mt-2 ${outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {formatCurrency(outstanding)}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Sales Invoiced</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {formatCurrency(summary.totalInvoiced)}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Amount Paid</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
            {formatCurrency(summary.totalPaid)}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Previous Opening Balance</p>
          <p className="text-2xl font-bold text-zinc-500 mt-2">
            {formatCurrency(summary.openingBalance)}
          </p>
        </div>
      </div>

      {/* Client Detail Info Card */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b pb-2">Contact Details</h3>
          {client.phone && (
            <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400 text-sm">
              <Phone className="w-4 h-4 text-zinc-400" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400 text-sm">
              <Mail className="w-4 h-4 text-zinc-400" />
              <span>{client.email}</span>
            </div>
          )}
          {client.address && (
            <div className="flex items-start gap-2.5 text-zinc-600 dark:text-zinc-400 text-sm">
              <MapPin className="w-4 h-4 text-zinc-400 mt-0.5" />
              <span>{client.address}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b pb-2">Business Details</h3>
          {client.gstin && (
            <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400 text-sm">
              <span className="font-semibold text-zinc-400">GSTIN:</span>
              <span className="font-mono">{client.gstin}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400 text-sm">
            <span className="font-semibold text-zinc-400">Client Type:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase">
              {client.client_type}
            </span>
          </div>
          {client.branch && (
            <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400 text-sm">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <span>Branch: <span className="font-semibold">{client.branch.name}</span></span>
            </div>
          )}
        </div>
      </div>

      {client.product_prices && client.product_prices.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm no-print">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b pb-2 mb-4">Custom Product Billing Rates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {client.product_prices.map((pp: any) => {
              const matchedItem = items.find(i => i.id === pp.item_id);
              if (!matchedItem) return null;
              return (
                <div key={pp.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg flex justify-between items-center text-sm border border-zinc-200/50 dark:border-zinc-700/50">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{matchedItem.name}</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatCurrency(pp.price)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ageing Summary Table (no-print) */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm no-print">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b pb-2 mb-4">Receivables Ageing</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg">
            <p className="text-xs text-zinc-500 font-semibold uppercase">0 - 30 Days</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">{formatCurrency(summary.ageing.bucket0to30)}</p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg">
            <p className="text-xs text-zinc-500 font-semibold uppercase">31 - 60 Days</p>
            <p className="text-sm font-bold text-yellow-600 mt-1">{formatCurrency(summary.ageing.bucket31to60)}</p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg">
            <p className="text-xs text-zinc-500 font-semibold uppercase">61 - 90 Days</p>
            <p className="text-sm font-bold text-orange-600 mt-1">{formatCurrency(summary.ageing.bucket61to90)}</p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg">
            <p className="text-xs text-zinc-500 font-semibold uppercase">90+ Days</p>
            <p className="text-sm font-bold text-red-600 mt-1">{formatCurrency(summary.ageing.bucket90plus)}</p>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center no-print">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Reference / Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Items (Qty)</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 font-medium text-zinc-700 dark:text-zinc-300">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">No transactions recorded for this client.</td>
                </tr>
              ) : (
                transactions.map((tx: any) => {
                  const balance = tx.total - tx.amount_paid
                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-500">
                        {new Date(tx.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {tx.transaction_no}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5 uppercase tracking-wider">
                          {tx.type.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-500 max-w-[200px] truncate" title={tx.items?.map((item: any) => `${item.item_name} (x${item.quantity})`).join(', ')}>
                        {tx.items?.map((item: any) => `${item.item_name} (x${item.quantity})`).join(', ') || '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(tx.total)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-green-600 dark:text-green-400">
                        {formatCurrency(tx.amount_paid)}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          tx.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          balance > 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {tx.status === 'CANCELLED' ? 'Cancelled' : balance > 0 ? 'Partial' : 'Paid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center no-print">
                        <div className="flex gap-2.5 justify-center items-center">
                          <Link href={`/billing/${tx.id}`} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold underline">View</Link>
                          <Link href={`/billing/${tx.id}/edit`} className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 font-semibold underline">Edit</Link>
                          <button onClick={() => handleDeleteTx(tx.id, tx.transaction_no)} className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold underline">Delete</button>
                          {balance > 0 && tx.status !== 'CANCELLED' && tx.type === 'SALES_INVOICE' && (
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Payment Modal (no-print) */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Collect Credit Payment</h3>
              <button onClick={() => setSelectedTx(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold text-lg">✕</button>
            </div>
            <div className="mb-4 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl text-xs space-y-1.5 text-zinc-600 dark:text-zinc-300">
              <p><strong>Invoice No:</strong> {selectedTx.transaction_no}</p>
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
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                </select>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setSelectedTx(null)} className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
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

      {/* Styled Statement CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; border: none; padding: 0; text-color: black !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
      ` }} />
    </div>
  )
}
