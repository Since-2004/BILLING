'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer, Filter, CalendarDays, Receipt, Search, Edit2, Trash2, Undo2, Save, FileText } from 'lucide-react'
import { getMonthlyDailyEntries, saveConsolidatedInvoice, getConsolidatedInvoiceForEdit, updateConsolidatedInvoice } from './actions'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'

function convertNumberToWords(amount: number): string {
  const sglDigit = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'],
    dblDigit = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'],
    tensPlace = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (num: number): string => {
    let str = '';
    if (num >= 10000000) {
      str += convert(Math.floor(num / 10000000)) + ' Crore';
      num %= 10000000;
    }
    if (num >= 100000) {
      str += (str ? ' ' : '') + convert(Math.floor(num / 100000)) + ' Lakh';
      num %= 100000;
    }
    if (num >= 1000) {
      str += (str ? ' ' : '') + convert(Math.floor(num / 1000)) + ' Thousand';
      num %= 1000;
    }
    if (num >= 100) {
      str += (str ? ' ' : '') + sglDigit[Math.floor(num / 100)] + ' Hundred';
      num %= 100;
    }
    if (num > 0) {
      if (str) str += ' and';
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      if (tens === 0) {
        str += ' ' + sglDigit[ones];
      } else if (tens === 1) {
        str += ' ' + dblDigit[ones];
      } else {
        str += ' ' + tensPlace[tens] + (ones > 0 ? ' ' + sglDigit[ones] : '');
      }
    }
    return str.trim();
  };

  const integerPart = Math.floor(amount);
  if (integerPart === 0) return 'ZERO RUPEES ONLY';
  return (convert(integerPart) + ' Only').toUpperCase();
}

// formatTransactionNumbers function removed

function MonthlyReportContent() {
  const searchParams = useSearchParams()
  const viewParam = searchParams?.get('view')

  const router = useRouter()
  const editIdParam = searchParams?.get('editId')
  const [editId, setEditId] = useState(editIdParam || '')
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  
  const [transactions, setTransactions] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reportView, setReportView] = useState<'detailed' | 'consolidated'>(() => {
    return viewParam === 'consolidated' ? 'consolidated' : 'detailed'
  })

  useEffect(() => {
    if (viewParam === 'consolidated') {
      setReportView('consolidated')
    } else if (viewParam === 'detailed') {
      setReportView('detailed')
    }
  }, [viewParam])
  
  // Filter settings
  const [dailyEntriesOnly, setDailyEntriesOnly] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState('ALL')
  const [consolidatedInvoiceNo, setConsolidatedInvoiceNo] = useState('')

  // Consolidated invoice additional states
  const [consolidatedInvoices, setConsolidatedInvoices] = useState<any[]>([])
  const [nextInvoiceNo, setNextInvoiceNo] = useState('')
  const [consolidatedItems, setConsolidatedItems] = useState<any[]>([])
  const [isEditingMode, setIsEditingMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // Find if there is an existing saved consolidated invoice for the selected customer
  const existingInvoice = consolidatedInvoices.find(tx => 
    customerSearch ? (tx.party_name === customerSearch) : false
  )

  useEffect(() => {
    if (editId || isEditingMode) return // Skip if editing
    
    if (existingInvoice) {
      setConsolidatedInvoiceNo(existingInvoice.transaction_no)
      const formattedItems = existingInvoice.items.map((item: any) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount || 0,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        total: item.total
      }))
      setConsolidatedItems(formattedItems)
    } else {
      setConsolidatedInvoiceNo(nextInvoiceNo)
      // Generate consolidatedItems dynamically from selectedTx
      const productSummary: Record<string, any> = {}
      selectedTx.forEach(tx => {
        tx.items?.forEach((item: any) => {
          const rate = item.rate || 0
          const key = `${item.item_name}_${rate}`
          if (!productSummary[key]) {
            productSummary[key] = {
              item_id: item.item_id || null,
              item_name: item.item_name,
              quantity: 0,
              rate,
              discount: 0,
              tax_rate: item.tax_rate || 0,
              tax_amount: 0,
              total: 0
            }
          }
          productSummary[key].quantity += item.quantity
          productSummary[key].tax_amount += item.tax_amount || 0
          productSummary[key].total += item.total
        })
      })
      setConsolidatedItems(Object.values(productSummary))
    }
  }, [selectedMonth, customerSearch, existingInvoice, nextInvoiceNo, selectedIds, editId, isEditingMode])

  useEffect(() => {
    fetch('/api/v1/clients')
      .then(r => r.json())
      .then(d => {
        const sorted = (d.data || []).sort((a: any, b: any) => a.name.localeCompare(b.name))
        setClients(sorted)
      })

    fetch('/api/v1/branches')
      .then(r => r.json())
      .then(d => setBranches(d.data || []))
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    if (editId) {
      const editRes = await getConsolidatedInvoiceForEdit(editId)
      if (editRes.success && editRes.data) {
        const tx = editRes.data
        const txDate = new Date(tx.date)
        setSelectedMonth(`${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`)
        setCustomerSearch(tx.party_name || '')
        setConsolidatedInvoiceNo(tx.transaction_no)
        
        const formattedItems = tx.items.map((item: any) => ({
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount || 0,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          total: item.total
        }))
        setConsolidatedItems(formattedItems)
        setCompany(editRes.company)
        setIsEditingMode(true) // Automatically set editing mode when redirected from edit button
        
        // Fetch other transactions in case they want options
        const res = await getMonthlyDailyEntries(`${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`)
        if (res.success) {
          setTransactions(res.data || [])
          setConsolidatedInvoices(res.consolidatedInvoices || [])
          setNextInvoiceNo(res.nextInvoiceNo || '')
        }
      } else {
        toast.error(editRes.error || 'Failed to load consolidated invoice for editing')
      }
    } else {
      const res = await getMonthlyDailyEntries(selectedMonth)
      if (res.success) {
        setTransactions(res.data || [])
        setConsolidatedInvoices(res.consolidatedInvoices || [])
        setNextInvoiceNo(res.nextInvoiceNo || '')
        setCompany(res.company)
      } else {
        toast.error(res.error || 'Failed to load monthly sales data')
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth, editId])

  // Parse notes for DC Number
  const getDcNumber = (notes: string | null) => {
    if (!notes) return '-'
    if (notes.startsWith('DC No:')) {
      return notes.replace('DC No:', '').split('\n')[0].trim()
    }
    return '-'
  }

  // Filter transactions
  const filteredTx = transactions.filter(tx => {
    // 1. Daily entry filter
    if (dailyEntriesOnly) {
      const isDaily = (tx.notes && tx.notes.startsWith('DC No:')) || tx.party_name === 'Daily Sales Customer'
      if (!isDaily) return false
    }

    // 2. Customer dropdown filter
    if (customerSearch !== '') {
      const txPartyName = tx.party_name || 'Walk-in Customer'
      if (txPartyName !== customerSearch) return false
    }

    // 3. Branch filter
    if (selectedBranch !== 'ALL') {
      if (tx.branch_id !== selectedBranch) return false
    }

    return true
  })

  // Check if any filtered transactions have tax
  const hasTaxColumns = filteredTx.some(tx => tx.tax_amount > 0)

  // Sync selectedIds when transactions load or filters toggle
  useEffect(() => {
    setSelectedIds(filteredTx.map(t => t.id))
  }, [transactions, dailyEntriesOnly])

  // Format currency helpers
  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
  }

  const format2Dec = (paise: number) => {
    return (paise / 100).toFixed(2)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN')
  }

  // Get month name label (e.g. "June 2026")
  const getMonthLabel = () => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const getReportHeaderDetails = () => {
    if (selectedBranch !== 'ALL') {
      const activeBr = branches.find(b => b.id === selectedBranch)
      if (activeBr) {
        const useBr = company?.invoice_use_branch_name || activeBr.name?.toLowerCase() !== 'head office'
        if (useBr) {
          return {
            name: activeBr.name,
            address: activeBr.address || company?.address || '',
            gstin: activeBr.gstin || company?.gstin || '',
            phone: activeBr.phone || ''
          }
        }
      }
    }
    return {
      name: company?.invoice_use_branch_name 
        ? (branches.find((b: any) => b.is_default)?.name || company?.name || 'Head Office')
        : (company?.name || 'Head Office'),
      address: company?.address || '',
      gstin: company?.gstin || '',
      phone: ''
    }
  }

  const reportHeader = getReportHeaderDetails()
  const activeClient = clients.find(c => c.name === customerSearch)
  const activeBr = selectedBranch !== 'ALL'
    ? branches.find(b => b.id === selectedBranch)
    : (branches.find(b => b.is_default) || branches.find(b => b.bank_name) || branches[0])

  // Selected transactions only
  const selectedTx = filteredTx.filter(tx => selectedIds.includes(tx.id))

  // Consolidated invoice metrics (dynamically switched based on view/items state)
  const totalSubtotal = reportView === 'detailed'
    ? selectedTx.reduce((sum, tx) => sum + tx.subtotal, 0)
    : consolidatedItems.reduce((sum, item) => sum + Math.round(item.quantity * item.rate), 0)
    
  const totalTax = reportView === 'detailed'
    ? selectedTx.reduce((sum, tx) => sum + tx.tax_amount, 0)
    : consolidatedItems.reduce((sum, item) => sum + item.tax_amount, 0)
    
  const totalGrand = reportView === 'detailed'
    ? selectedTx.reduce((sum, tx) => sum + tx.total, 0)
    : totalSubtotal + totalTax

  const handleItemChange = (index: number, field: 'quantity' | 'rate', value: number) => {
    setConsolidatedItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        const quantity = field === 'quantity' ? value : item.quantity
        const rate = field === 'rate' ? Math.round(value * 100) : item.rate
        const subtotal = Math.round(quantity * rate)
        const tax_amount = Math.round(subtotal * item.tax_rate / 100)
        const total = subtotal + tax_amount
        return {
          ...item,
          quantity,
          rate,
          tax_amount,
          total
        }
      }
      return item
    }))
  }

  const handleSaveConsolidated = async () => {
    if (!customerSearch) {
      return toast.error('Please select a specific customer to save a consolidated invoice')
    }
    if (consolidatedItems.length === 0) {
      return toast.error('No items to save')
    }
    
    setSaving(true)
    try {
      const payload = {
        monthStr: selectedMonth,
        partyName: customerSearch,
        partyId: activeClient?.id || null,
        subtotal: totalSubtotal,
        discount: 0,
        taxAmount: totalTax,
        total: totalGrand,
        branchId: activeBr?.id || company?.branches?.[0]?.id || '',
        items: consolidatedItems.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount || 0,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          total: item.total
        }))
      }
      
      const res = await saveConsolidatedInvoice(payload)
      if (res.success) {
        toast.success('Consolidated invoice saved successfully!')
        setIsEditingMode(false)
        fetchData()
      } else {
        toast.error(res.error || 'Failed to save consolidated invoice')
      }
    } catch (e: any) {
      toast.error('An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateConsolidated = async () => {
    const targetId = editId || existingInvoice?.id
    if (!targetId) return toast.error('No invoice to update')

    setSaving(true)
    try {
      const payload = {
        subtotal: totalSubtotal,
        taxAmount: totalTax,
        total: totalGrand,
        items: consolidatedItems.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount || 0,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          total: item.total
        }))
      }

      const res = await updateConsolidatedInvoice(targetId, payload)
      if (res.success) {
        toast.success('Consolidated invoice updated successfully!')
        setIsEditingMode(false)
        setEditId('') // Clear URL edit id state
        router.push('/invoices?tab=consolidated')
      } else {
        toast.error(res.error || 'Failed to update consolidated invoice')
      }
    } catch (e: any) {
      toast.error('An error occurred while updating')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConsolidated = async () => {
    const targetId = editId || existingInvoice?.id
    const targetNo = consolidatedInvoiceNo
    if (!targetId) return

    if (!window.confirm(`Are you sure you want to delete consolidated invoice ${targetNo}? This cannot be undone.`)) {
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/v1/transactions/${targetId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success(`Invoice ${targetNo} deleted successfully`)
        setIsEditingMode(false)
        if (editId) {
          router.push('/invoices?tab=consolidated')
        } else {
          fetchData()
        }
      } else {
        toast.error(data.error || 'Failed to delete invoice')
      }
    } catch (err) {
      toast.error('Failed to delete invoice')
    } finally {
      setSaving(false)
    }
  }

  // Calculate CGST, SGST, and IGST splits
  const isInterstate = (() => {
    if (!activeClient) return false
    const clientState = activeClient.state_code || activeClient.gstin?.slice(0, 2)
    const companyState = company?.state_code || company?.gstin?.slice(0, 2) || reportHeader.gstin?.slice(0, 2)
    if (clientState && companyState) {
      return clientState !== companyState
    }
    return false
  })()

  const totalCgst = isInterstate ? 0 : Math.round(totalTax / 2)
  const totalSgst = isInterstate ? 0 : (totalTax - totalCgst)
  const totalIgst = isInterstate ? totalTax : 0

  // Product sales aggregations
  const productSummary: Record<string, { name: string, quantity: number, rate: number, total: number }> = {}
  selectedTx.forEach(tx => {
    tx.items?.forEach((item: any) => {
      const rate = item.rate || 0
      const key = `${item.item_name}_${rate}`
      if (!productSummary[key]) {
        productSummary[key] = { name: item.item_name, quantity: 0, rate, total: 0 }
      }
      productSummary[key].quantity += item.quantity
      productSummary[key].total += item.total
    })
  })

  const sortedProducts = Object.values(productSummary).sort((a, b) => b.quantity - a.quantity)

  // Helpers and header resolved above

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Control panel - hidden during print */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/billing/daily-entry" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-500" />
              Monthly Sales Summary
            </h1>
            <p className="text-xs text-zinc-500">View and print consolidated daily sales entries for any month</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Month input */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => {
                if (e.target.value) setSelectedMonth(e.target.value)
              }}
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Branch filter selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Branch:</span>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 text-zinc-900 dark:text-zinc-100 font-semibold"
            >
              <option value="ALL">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Customer Search input */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Customer:</span>
            <select
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 text-zinc-900 dark:text-zinc-100"
            >
              <option value="">All Customers</option>
              <option value="Daily Sales Customer">Daily Sales Customer</option>
              <option value="Walk-in Customer">Walk-in Customer</option>
              {clients.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Report View Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase">View:</span>
            <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-50 dark:bg-zinc-900">
              <button
                onClick={() => setReportView('detailed')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  reportView === 'detailed'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Detailed
              </button>
              <button
                onClick={() => setReportView('consolidated')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  reportView === 'consolidated'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Consolidated
              </button>
            </div>
          </div>

          {/* Consolidated Invoice No input */}
          {reportView === 'consolidated' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase">Inv No:</span>
              <input
                type="text"
                value={consolidatedInvoiceNo}
                readOnly
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed w-44 text-zinc-900 dark:text-zinc-100 font-mono font-bold"
              />
            </div>
          )}

          {/* Daily Entry Toggle */}
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dailyEntriesOnly}
              onChange={e => setDailyEntriesOnly(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-zinc-300"
            />
            <span className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              Daily Entries Only
            </span>
          </label>

          {/* Print trigger */}
          <button
            onClick={() => window.print()}
            disabled={filteredTx.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>

          {/* Save/Edit/Delete/Update Buttons */}
          {reportView === 'consolidated' && customerSearch && (
            <div className="flex items-center border-l border-zinc-200 pl-3 gap-2">
              {existingInvoice || editId ? (
                <>
                  {isEditingMode ? (
                    <>
                      <button
                        onClick={handleUpdateConsolidated}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Update Invoice
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingMode(false)
                          fetchData() // Reload original data
                        }}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 rounded-lg text-xs font-bold shadow-sm transition-colors"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditingMode(true)}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Items
                      </button>
                      <button
                        onClick={handleDeleteConsolidated}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Invoice
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {isEditingMode ? (
                    <>
                      <button
                        onClick={handleSaveConsolidated}
                        disabled={saving || consolidatedItems.length === 0}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Invoice
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingMode(false)
                          fetchData()
                        }}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 rounded-lg text-xs font-bold shadow-sm transition-colors"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        Cancel Edit
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveConsolidated}
                        disabled={saving || consolidatedItems.length === 0}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Invoice
                      </button>
                      <button
                        onClick={() => setIsEditingMode(true)}
                        disabled={saving || consolidatedItems.length === 0}
                        className="flex items-center gap-1 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 rounded-lg text-xs font-bold shadow-sm transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Items
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-500 dark:text-zinc-400">
          Loading monthly sales summaries...
        </div>
      ) : (
        <div className="space-y-6" id="report-container">
          {/* Printable Report Document Card */}
          <div className="bg-white border border-zinc-200 dark:border-zinc-800 shadow rounded-xl p-8 print:shadow-none print:border-none print:p-0 text-zinc-950">
            
            {/* Document Header details */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-zinc-100">
              <div className="flex items-start gap-4">
                {company?.logo_url && (
                  <img src={company.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-zinc-200 p-1" />
                )}
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">{reportHeader.name}</h2>
                  <p className="text-xs text-zinc-500 max-w-md whitespace-pre-line mt-1">{reportHeader.address}</p>
                  <div className="flex gap-4 mt-0.5 text-xs text-zinc-500 font-semibold">
                    {reportHeader.phone && <p>Mobile: {reportHeader.phone}</p>}
                    {reportHeader.gstin && <p>GSTIN: {reportHeader.gstin}</p>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-xl font-extrabold text-blue-600 tracking-wider flex items-center justify-end gap-1.5">
                  {reportView === 'detailed' ? 'MONTHLY SALES REGISTER' : 'BILL'}
                  {reportView === 'consolidated' && (existingInvoice || editId) && (
                    <span className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-normal">Saved</span>
                  )}
                  {reportView === 'consolidated' && isEditingMode && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-normal">Editing</span>
                  )}
                </h1>
                <p className="text-sm text-zinc-600 font-bold mt-1">{getMonthLabel()}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Report Type: {dailyEntriesOnly ? 'Daily Entry Batches Only' : 'All Sales Invoices'}</p>
              </div>
            </div>

            {/* Consignee and Invoice Meta Box */}
            <div className="grid grid-cols-2 border border-zinc-300 text-xs mb-6">
              {/* Left Column: Name & Address of Consignee */}
              <div className="p-3 border-r border-zinc-300">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">NAME & ADDRESS OF CONSIGNEE</p>
                {activeClient ? (
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-zinc-900">{activeClient.name}</p>
                    <p className="text-zinc-600 whitespace-pre-line text-[11px] leading-relaxed">{activeClient.address || 'Address not provided'}</p>
                    {activeClient.phone && <p className="text-zinc-500 font-medium">Mobile: {activeClient.phone}</p>}
                    {activeClient.gstin && <p className="text-zinc-500 font-semibold">GSTIN: {activeClient.gstin}</p>}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-zinc-900">{customerSearch || 'ALL CUSTOMERS'}</p>
                    {customerSearch ? (
                      <p className="text-zinc-400 italic">No specific address registered</p>
                    ) : (
                      <p className="text-zinc-500 text-[11px] leading-relaxed">Consolidated report for all sales in {getMonthLabel()}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Invoice/Report details */}
              <div className="p-3 space-y-2">
                <div>
                  <span className="font-bold text-zinc-500">INVOICE NO:</span>{' '}
                  <span className="font-mono font-bold text-zinc-900">
                    {reportView === 'detailed' ? 'MONTHLY REGISTER' : consolidatedInvoiceNo}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-zinc-500">Dated:</span>{' '}
                  <span className="font-bold text-zinc-900">{getMonthLabel()}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-500">DESPATCH:</span>{' '}
                  <span className="font-mono text-zinc-900">-</span>
                </div>
              </div>
            </div>

            {/* Invoices List Section */}
            {reportView === 'detailed' ? (
              <div className="space-y-3 mb-8">
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider mb-2">Invoice Summary Register</h3>
                <div className="overflow-hidden border border-zinc-200 rounded-lg">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-900 text-white text-left font-semibold">
                        <th className="px-3 py-2.5 print:hidden w-8">
                          <input
                            type="checkbox"
                            checked={filteredTx.length > 0 && selectedIds.length === filteredTx.length}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedIds(filteredTx.map(t => t.id))
                              } else {
                                setSelectedIds([])
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-zinc-300 cursor-pointer"
                          />
                        </th>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Invoice No</th>
                        <th className="px-3 py-2.5">DC Number</th>
                        <th className="px-3 py-2.5">Client Customer</th>
                        <th className="px-3 py-2.5">Items (Qty)</th>
                        <th className="px-3 py-2.5 text-center">Payment</th>
                        <th className="px-3 py-2.5 text-right">Subtotal</th>
                        {hasTaxColumns && (
                          <>
                            <th className="px-3 py-2.5 text-right">CGST</th>
                            <th className="px-3 py-2.5 text-right">SGST</th>
                          </>
                        )}
                        <th className="px-3 py-2.5 text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {filteredTx.map((tx, idx) => {
                        const isSelected = selectedIds.includes(tx.id)
                        return (
                          <tr key={tx.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'} ${!isSelected ? 'opacity-40 print:hidden' : ''}`}>
                            <td className="px-3 py-2.5 print:hidden">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedIds(selectedIds.filter(id => id !== tx.id))
                                  } else {
                                    setSelectedIds([...selectedIds, tx.id])
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-zinc-300 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2.5 font-medium">{formatDate(tx.date)}</td>
                            <td className="px-3 py-2.5 font-mono text-blue-600 print:text-zinc-950">
                              <Link href={`/billing/${tx.id}`} className="hover:underline font-bold print:no-underline">
                                {tx.transaction_no}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 font-mono">{getDcNumber(tx.notes)}</td>
                            <td className="px-3 py-2.5 truncate max-w-[120px]">{tx.party_name || 'Walk-in Customer'}</td>
                            <td className="px-3 py-2.5 text-xs text-zinc-500 max-w-[150px] truncate" title={tx.items?.map((item: any) => `${item.item_name} (x${item.quantity})`).join(', ')}>
                              {tx.items?.map((item: any) => `${item.item_name} (x${item.quantity})`).join(', ') || '-'}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold">{tx.payments?.[0]?.mode || 'CASH'}</td>
                            <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(tx.subtotal)}</td>
                            {hasTaxColumns && (
                              <>
                                <td className="px-3 py-2.5 text-right font-mono text-zinc-500">
                                  {tx.tax_amount > 0 ? formatCurrency(Math.round(tx.tax_amount / 2)) : '₹0.00'}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-zinc-500">
                                  {tx.tax_amount > 0 ? formatCurrency(tx.tax_amount - Math.round(tx.tax_amount / 2)) : '₹0.00'}
                                </td>
                              </>
                            )}
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-zinc-900">{formatCurrency(tx.total)}</td>
                          </tr>
                        )
                      })}
                      {filteredTx.length === 0 && (
                        <tr>
                          <td colSpan={hasTaxColumns ? 11 : 9} className="px-3 py-8 text-center text-zinc-400">
                            No sales entries recorded for this month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-8">
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider mb-2">Consolidated Product Sales Summary</h3>
                <div className="overflow-hidden border border-zinc-200 rounded-lg">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-900 text-white text-left font-semibold">
                        <th className="px-4 py-2.5 w-16">S.No.</th>
                        <th className="px-4 py-2.5">Description of Goods</th>
                        <th className="px-4 py-2.5 text-right w-32">Quantity</th>
                        <th className="px-4 py-2.5 text-right w-32">Rate</th>
                        <th className="px-4 py-2.5 text-right w-40">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {consolidatedItems.map((p, idx) => (
                        <tr key={`${p.item_name}_${p.rate}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}>
                          <td className="px-4 py-2.5 font-bold font-mono">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-medium">{p.item_name}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold">
                            {isEditingMode ? (
                              <input
                                type="number"
                                step="any"
                                value={p.quantity}
                                onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded text-right bg-white dark:bg-zinc-950 font-mono font-bold text-zinc-950 dark:text-zinc-50"
                              />
                            ) : (
                              p.quantity
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold">
                            {isEditingMode ? (
                              <input
                                type="number"
                                step="0.01"
                                value={p.rate / 100}
                                onChange={e => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded text-right bg-white dark:bg-zinc-950 font-mono font-bold text-zinc-950 dark:text-zinc-50"
                              />
                            ) : (
                              formatCurrency(p.rate)
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-zinc-900">{formatCurrency(p.total)}</td>
                        </tr>
                      ))}
                      {consolidatedItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                            No product sales recorded for this month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {consolidatedItems.length > 0 && (
                      <tfoot className="bg-zinc-50 font-bold border-t border-zinc-200 text-zinc-900">
                        <tr>
                          <td colSpan={2} className="px-4 py-3 font-semibold text-zinc-500">Total</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            {consolidatedItems.reduce((sum, p) => sum + p.quantity, 0)}
                          </td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-right font-mono text-blue-600 font-bold">
                            {formatCurrency(totalSubtotal)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* Consolidated Totals block */}
            <div className="grid grid-cols-2 gap-8 items-start mb-8 p-4 bg-zinc-50 border border-zinc-200/50 rounded-xl">
              <div className="space-y-4">
                {reportView === 'detailed' && (
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">Itemized Product Sales Total</h4>
                    <div className="space-y-1.5 text-xs mb-6">
                      {sortedProducts.map(p => (
                        <div key={`${p.name}_${p.rate}`} className="flex justify-between items-center text-zinc-600 pb-1 border-b border-dashed border-zinc-200">
                          <span className="font-medium truncate max-w-[180px]">{p.name} (Rate: {formatCurrency(p.rate)})</span>
                          <span className="font-mono font-bold text-zinc-800">{p.quantity} units</span>
                        </div>
                      ))}
                      {sortedProducts.length === 0 && (
                        <p className="text-zinc-400 text-xs italic">No items sold.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Bank details for monthly report */}
                {(() => {
                  const bankName = activeBr?.bank_name
                  const accountNo = activeBr?.bank_account_no
                  const ifsc = activeBr?.bank_ifsc
                  const bankBranch = activeBr?.bank_branch

                  if (!bankName) return null

                  return (
                    <div className="text-[11px] text-zinc-500 bg-white p-3 rounded-lg border border-zinc-200/80 space-y-1">
                      <p className="font-bold text-zinc-700 uppercase tracking-wide mb-1 text-[9px]">Bank Account Details</p>
                      <p><span className="font-semibold text-zinc-600">Bank:</span> {bankName}</p>
                      <p><span className="font-semibold text-zinc-600">A/C No:</span> <span className="font-mono font-bold text-zinc-800">{accountNo}</span></p>
                      {ifsc && <p><span className="font-semibold text-zinc-600">IFSC:</span> <span className="font-mono text-zinc-800">{ifsc}</span></p>}
                      {bankBranch && <p><span className="font-semibold text-zinc-600">Branch:</span> {bankBranch}</p>}
                    </div>
                  )
                })()}

                {/* Capitalized Amount in Words */}
                <div className="text-[11px] text-zinc-500 bg-white p-3 rounded-lg border border-zinc-200/80 space-y-1">
                  <p className="font-bold text-zinc-700 uppercase tracking-wide mb-1 text-[9px]">Amount in Words</p>
                  <p className="font-mono font-bold text-zinc-900 uppercase leading-relaxed font-semibold">
                    RUPEES {convertNumberToWords(totalGrand / 100)}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-zinc-600 pt-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3 text-right">Consolidated Ledger Summary</h4>
                
                <div className="flex justify-between border-b pb-1 font-medium font-semibold">
                  <span>TOTAL (Pre-Tax)</span>
                  <span className="font-mono text-zinc-900">{format2Dec(totalSubtotal)}</span>
                </div>
                <div className="flex justify-between border-b pb-1 font-medium font-semibold">
                  <span>CGST</span>
                  <span className="font-mono text-zinc-900">{format2Dec(totalCgst)}</span>
                </div>
                <div className="flex justify-between border-b pb-1 font-medium font-semibold">
                  <span>SGST</span>
                  <span className="font-mono text-zinc-900">{format2Dec(totalSgst)}</span>
                </div>
                <div className="flex justify-between border-b pb-1 font-medium font-semibold">
                  <span>IGST</span>
                  <span className="font-mono text-zinc-900">{format2Dec(totalIgst)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-900 pt-2 text-sm font-bold text-zinc-900">
                  <span>G.TOTAL</span>
                  <span className="font-mono text-blue-600 text-base">{format2Dec(totalGrand)}</span>
                </div>
              </div>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-8 mt-16 mb-8 pt-8 text-xs font-semibold text-zinc-700 font-semibold">
              <div className="text-left space-y-16">
                <div className="border-t border-zinc-300 w-56 pt-2 text-center font-semibold">
                  Customer&apos;s seal and signature
                </div>
              </div>
              <div className="text-right flex flex-col items-end space-y-2">
                <div className="font-semibold">
                  FOR <span className="font-bold uppercase">{reportHeader.name}</span>
                </div>
                <div className="h-16 flex items-center justify-center">
                  {activeBr?.digital_sign_url ? (
                    <img src={activeBr.digital_sign_url} alt="Authorised Signature" className="h-16 object-contain" />
                  ) : (
                    <div className="h-12" />
                  )}
                </div>
                <div className="border-t border-zinc-300 w-56 pt-2 text-center font-semibold">
                  Authorised Signatory
                </div>
              </div>
            </div>

            {/* Print Footer details */}
            <div className="border-t border-zinc-200 pt-6 text-center text-[10px] text-zinc-400 flex justify-between items-center">
              <p>Generated on: {new Date().toLocaleString('en-IN')}</p>
              <p className="font-semibold text-zinc-500">Monthly Sales Record Summary Report</p>
              <p className="font-mono">Page 1 of 1</p>
            </div>
          </div>
        </div>
      )}

      {/* Print media CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          body * { visibility: hidden; }
          #report-container, #report-container * { visibility: visible; }
          #report-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; border: none; padding: 0; }
        }
      ` }} />
    </div>
  )
}

export default function MonthlyReportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading report...</div>}>
      <MonthlyReportContent />
    </Suspense>
  )
}
