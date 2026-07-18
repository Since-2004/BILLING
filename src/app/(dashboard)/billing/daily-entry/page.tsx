'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Search, ArrowLeft, RotateCcw, Save, Trash2, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'

interface InventoryItem {
  id: string
  name: string
  code: string | null
  barcode: string | null
  sale_price_1: number | null
  tax_rate: number | null
  unit?: { name: string } | null
}

export default function DailyEntryPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('de_selectedBranch') || ''
    }
    return ''
  })
  
  // Form states
  const [billingDate, setBillingDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('de_billingDate')
      if (saved) return saved
    }
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [dcNumber, setDcNumber] = useState('')
  const [selectedClient, setSelectedClient] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('de_selectedClient') || ''
    }
    return ''
  })
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [billingMode, setBillingMode] = useState('BOTH')
  const [isTaxBilling, setIsTaxBilling] = useState(true)

  // Quantities entered for each item ID
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({})
  const [customDiscounts, setCustomDiscounts] = useState<Record<string, number>>({})

  // Global discounts
  const [discountValue, setDiscountValue] = useState(0)
  const [discountType, setDiscountType] = useState<'PCT' | 'AMT'>('PCT')

  useEffect(() => {
    // Fetch settings and master data
    fetch('/api/v1/companies')
      .then(r => r.json())
      .then(d => {
        const company = d.data?.[0]
        if (company) {
          const mode = company.billing_mode || 'BOTH'
          setBillingMode(mode)
          setIsTaxBilling(mode !== 'NON_TAX')
        }
      })
    
    fetch('/api/v1/clients')
      .then(r => r.json())
      .then(d => {
        const sorted = (d.data || []).sort((a: any, b: any) => a.name.localeCompare(b.name))
        setClients(sorted)
      })
    fetch('/api/v1/items').then(r => r.json()).then(d => setItems(d.data || []))
    
    fetch('/api/v1/branches')
      .then(r => r.json())
      .then(d => {
        const list = d.data || []
        setBranches(list)
        const savedBranch = typeof window !== 'undefined' ? localStorage.getItem('de_selectedBranch') : null
        if (savedBranch && list.some((b: any) => b.id === savedBranch)) {
          setSelectedBranch(savedBranch)
        } else {
          const def = list.find((b: any) => b.is_default) || list[0]
          if (def) {
            setSelectedBranch(def.id)
            if (typeof window !== 'undefined') {
              localStorage.setItem('de_selectedBranch', def.id)
            }
          }
        }
      })
  }, [])

  useEffect(() => {
    if (selectedBranch) {
      fetch(`/api/v1/stock?branch_id=${selectedBranch}`)
        .then(r => r.json())
        .then(d => setStockMap(d.data || {}))
    }
  }, [selectedBranch])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return

      const active = document.activeElement as HTMLElement
      if (!active) return

      const deInput = active.getAttribute('data-de-input')
      if (!deInput) return

      e.preventDefault()

      // Find all visible interactive inputs on the page with [data-de-input]
      const allInputs = Array.from(document.querySelectorAll<HTMLElement>('[data-de-input]'))
        .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0 && !el.hasAttribute('disabled'))

      const currentIndex = allInputs.indexOf(active)
      if (currentIndex !== -1 && currentIndex + 1 < allInputs.length) {
        const nextEl = allInputs[currentIndex + 1]
        nextEl.focus()
        if (nextEl instanceof HTMLInputElement) nextEl.select()
      } else if (currentIndex === allInputs.length - 1) {
        const saveBtn = document.getElementById('save-entry-btn') as HTMLElement
        if (saveBtn) saveBtn.focus()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [searchQuery, items, quantities])

  // Automatically update prices when selected client changes
  useEffect(() => {
    const client = clients.find(c => c.id === selectedClient)
    if (client) {
      if (client.client_type === 'CREDIT') {
        setPaymentMode('CREDIT')
      } else {
        setPaymentMode('CASH')
      }
    } else {
      setPaymentMode('CASH')
    }

    const nextCustomPrices: Record<string, number> = {}
    if (client && client.product_prices) {
      client.product_prices.forEach((pp: any) => {
        nextCustomPrices[pp.item_id] = pp.price
      })
    }
    setCustomPrices(nextCustomPrices)
  }, [selectedClient, clients])

  // Format currency helpers
  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
  }

  // Handle manual input changes
  const handleQtyChange = (itemId: string, val: string, stockLimit: number) => {
    const parsed = parseFloat(val)
    if (isNaN(parsed) || parsed < 0) {
      setQuantities(prev => ({ ...prev, [itemId]: 0 }))
      return
    }

    if (parsed > stockLimit) {
      toast.warning(`Quantity exceeds current stock level (${stockLimit} available)`)
    }

    setQuantities(prev => ({ ...prev, [itemId]: parsed }))
  }

  // Increment and Decrement actions
  const adjustQty = (itemId: string, delta: number, stockLimit: number) => {
    const current = quantities[itemId] || 0
    const nextVal = Math.max(0, current + delta)
    if (nextVal > stockLimit && delta > 0) {
      toast.error(`Cannot add more. Only ${stockLimit} units available.`)
      return
    }
    setQuantities(prev => ({ ...prev, [itemId]: nextVal }))
  }

  // Clear quantity for single item
  const clearItemQty = (itemId: string) => {
    setQuantities(prev => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  // Reset entire form quantities
  const handleResetForm = () => {
    setQuantities({})
    setCustomPrices({})
    setCustomDiscounts({})
    setDcNumber('')
    setDiscountValue(0)
    toast.info('Form inputs cleared')
  }

  // Filtered items based on search query
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      item.name.toLowerCase().includes(q) ||
      (item.code && item.code.toLowerCase().includes(q)) ||
      (item.barcode && item.barcode.includes(q))
    )
  })

  // List of items currently sold
  const activeEntries = Object.entries(quantities)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => {
      const item = items.find(i => i.id === id)
      const price = customPrices[id] !== undefined ? customPrices[id] : (item?.sale_price_1 || 0)
      const discount = customDiscounts[id] || 0
      return {
        id,
        qty,
        name: item?.name || 'Unknown Item',
        price,
        discount,
        tax_rate: item?.tax_rate || 0,
      }
    })

  // Calculations
  const subtotal = activeEntries.reduce((sum, entry) => sum + Math.round(entry.qty * entry.price), 0)
  const lineDiscountsTotal = activeEntries.reduce((sum, entry) => sum + entry.discount, 0)
  
  const globalDiscountAmt = discountType === 'PCT'
    ? Math.round((subtotal - lineDiscountsTotal) * discountValue / 100)
    : discountValue * 100
  const discountAmt = lineDiscountsTotal + globalDiscountAmt
  const taxableAmt = Math.max(0, subtotal - discountAmt)

  const taxAmount = isTaxBilling
    ? activeEntries.reduce((sum, entry) => {
        // Calculate tax per item proportional to its share of remaining discounted subtotal
        const itemSubtotal = Math.round(entry.qty * entry.price)
        const itemDiscounted = Math.max(0, itemSubtotal - entry.discount)
        
        const remainingSubtotal = subtotal - lineDiscountsTotal
        const itemShare = remainingSubtotal > 0 ? (itemDiscounted / remainingSubtotal) : 0
        const itemGlobalDiscount = Math.round(globalDiscountAmt * itemShare)
        
        const itemTaxable = Math.max(0, itemDiscounted - itemGlobalDiscount)
        return sum + Math.round(itemTaxable * entry.tax_rate / 100)
      }, 0)
    : 0

  const cgstTotal = Math.round(taxAmount / 2)
  const sgstTotal = taxAmount - cgstTotal
  const grandTotal = taxableAmt + taxAmount
  const roundOff = Math.round(grandTotal / 100) * 100 - grandTotal
  const finalTotal = grandTotal + roundOff

  // Checkout submission
  const handleSaveDailyEntry = async () => {
    if (activeEntries.length === 0) {
      return toast.error('No items have been entered')
    }

    setLoading(true)
    const clientRecord = clients.find(c => c.id === selectedClient)
    
    // DC notes format
    const formattedNotes = dcNumber ? `DC No: ${dcNumber.trim()}` : ''

    const payload = {
      type: 'SALES_INVOICE',
      branch_id: selectedBranch,
      party_id: selectedClient || null,
      party_name: clientRecord?.name || 'Daily Sales Customer',
      date: new Date(billingDate),
      subtotal,
      discount: discountAmt,
      tax_amount: taxAmount,
      total: finalTotal,
      amount_paid: paymentMode === 'CREDIT' ? 0 : finalTotal,
      payment_mode: paymentMode,
      notes: formattedNotes,
      items: activeEntries.map(entry => {
        const itemSubtotal = Math.round(entry.qty * entry.price)
        const itemDiscounted = Math.max(0, itemSubtotal - entry.discount)
        
        const remainingSubtotal = subtotal - lineDiscountsTotal
        const itemShare = remainingSubtotal > 0 ? (itemDiscounted / remainingSubtotal) : 0
        const itemGlobalDiscount = Math.round(globalDiscountAmt * itemShare)
        
        const itemTaxable = Math.max(0, itemDiscounted - itemGlobalDiscount)
        const itemTax = isTaxBilling ? Math.round(itemTaxable * entry.tax_rate / 100) : 0
        return {
          item_id: entry.id,
          item_name: entry.name,
          quantity: entry.qty,
          rate: entry.price,
          discount: entry.discount + itemGlobalDiscount,
          tax_rate: isTaxBilling ? entry.tax_rate : 0,
          tax_amount: itemTax,
          total: itemSubtotal - entry.discount - itemGlobalDiscount + itemTax
        }
      })
    }

    try {
      const res = await fetch('/api/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Daily Sales Entry saved successfully!')
        setQuantities({})
        setCustomPrices({})
        setCustomDiscounts({})
        setDcNumber('')
        setDiscountValue(0)
        
        if (data.data?.id) {
          router.push(`/billing/${data.data.id}?from=daily-entry`)
        }
      } else {
        toast.error(data.error || 'Failed to submit daily entry')
      }
    } catch (e) {
      toast.error('Server error submitting daily entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:h-[calc(100vh-6rem)] h-auto gap-6">
      {/* Header controls bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/billing" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                Daily Sales Entry
              </h1>
              <Link href="/billing/daily-entry/monthly" className="flex items-center gap-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-lg font-bold transition-colors">
                <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                Monthly Report
              </Link>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Record cumulative quantities of products sold for a specific billing date</p>
          </div>
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Date of Billing</label>
            <input 
              type="date" 
              value={billingDate} 
              onChange={e => {
                setBillingDate(e.target.value)
                localStorage.setItem('de_billingDate', e.target.value)
              }}
              data-de-input="date"
              className="w-full px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">DC Number</label>
            <input 
              type="text" 
              placeholder="e.g. DC-987"
              value={dcNumber} 
              onChange={e => setDcNumber(e.target.value)}
              data-de-input="dc-number"
              className="w-full px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Dispatch Location</label>
            <select 
              value={selectedBranch} 
              onChange={e => {
                setSelectedBranch(e.target.value)
                localStorage.setItem('de_selectedBranch', e.target.value)
              }}
              data-de-input="branch"
              className="w-full px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Customer</label>
            <select 
              value={selectedClient} 
              onChange={e => {
                setSelectedClient(e.target.value)
                localStorage.setItem('de_selectedClient', e.target.value)
              }}
              data-de-input="customer"
              className="w-full px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Daily Sales Customer</option>
              {clients.filter(c => !c.branch_id || c.branch_id === selectedBranch).sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Payment Mode</label>
            <select 
              value={paymentMode} 
              onChange={e => setPaymentMode(e.target.value)}
              data-de-input="payment-mode"
              className="w-full px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CASH">CASH</option>
              <option value="UPI">UPI</option>
              <option value="CARD">CARD</option>
              <option value="CREDIT">CREDIT (Outstanding)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden">
        {/* Left pane: Product quantities grid list */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm min-h-[400px] lg:min-h-0">
          {/* Live search input */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search products by name, code, or barcode..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                data-de-input="search"
                className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {billingMode === 'BOTH' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-semibold uppercase">Tax Calc:</span>
                <select
                  value={isTaxBilling ? 'TAX' : 'NON_TAX'}
                  onChange={e => setIsTaxBilling(e.target.value === 'TAX')}
                  className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900"
                >
                  <option value="TAX">Tax Supplies (With GST)</option>
                  <option value="NON_TAX">Non-Tax Bill (Exempt)</option>
                </select>
              </div>
            )}
          </div>

          {/* Desktop Product Table (Visible on desktop) */}
          <div className="hidden lg:block flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-3">Code / Barcode</th>
                  <th className="px-6 py-3">Product Name</th>
                  <th className="px-6 py-3 text-center">Stock</th>
                  <th className="px-6 py-3 text-right">Price (Rs.)</th>
                  <th className="px-6 py-3 text-right">Discount (Rs.)</th>
                  <th className="px-6 py-3 text-center">GST Rate</th>
                  <th className="px-6 py-3 text-center w-48">Quantity Sold</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredItems.map((item, idx) => {
                  const stock = stockMap[item.id] ?? 0
                  const qty = quantities[item.id] || ''
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                        {item.code || '-'}{item.barcode ? ` / ${item.barcode}` : ''}
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-800 dark:text-zinc-200">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          stock > 10 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          stock > 0  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {stock} available
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {quantities[item.id] > 0 ? (
                          <input
                            type="number"
                            step="any"
                            value={customPrices[item.id] !== undefined ? (customPrices[item.id] / 100).toString() : ((item.sale_price_1 || 0) / 100).toString()}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0
                              setCustomPrices(prev => ({ ...prev, [item.id]: Math.round(val * 100) }))
                            }}
                            data-de-input="price"
                            data-index={idx}
                            className="w-24 text-right border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-sm bg-transparent font-mono text-blue-600 dark:text-blue-400 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        ) : (
                          <span className="font-mono text-zinc-500 dark:text-zinc-400">
                            {formatCurrency(customPrices[item.id] !== undefined ? customPrices[item.id] : (item.sale_price_1 || 0))}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {quantities[item.id] > 0 ? (
                          <input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={customDiscounts[item.id] !== undefined ? (customDiscounts[item.id] / 100).toString() : ''}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0
                              setCustomDiscounts(prev => ({ ...prev, [item.id]: Math.round(val * 100) }))
                            }}
                            data-de-input="row-discount"
                            data-index={idx}
                            className="w-20 text-right border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-sm bg-transparent font-mono text-red-600 dark:text-red-400 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        ) : (
                          <span className="font-mono text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-mono">
                        {isTaxBilling ? `${item.tax_rate || 0}%` : '0%'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden w-full bg-zinc-50 dark:bg-zinc-900/40">
                          <button
                            type="button"
                            onClick={() => adjustQty(item.id, -1, stock)}
                            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="any"
                            value={qty}
                            placeholder="0"
                            onChange={e => handleQtyChange(item.id, e.target.value, stock)}
                            data-de-input="qty"
                            data-index={idx}
                            className="w-16 text-center text-sm font-semibold bg-transparent border-none outline-none focus:ring-0 p-1 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => adjustQty(item.id, 1, stock)}
                            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {quantities[item.id] > 0 && (
                          <button 
                            type="button"
                            onClick={() => clearItemQty(item.id)}
                            className="p-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-zinc-400">
                      No products found matching "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Product Card List (Visible on mobile/tablet) */}
          <div className="block lg:hidden flex-1 overflow-y-auto p-4 space-y-4">
            {filteredItems.map((item, idx) => {
              const stock = stockMap[item.id] ?? 0
              const qty = quantities[item.id] || ''
              const hasQty = quantities[item.id] > 0
              
              return (
                <div key={item.id} className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/80 space-y-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</h4>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">
                        {item.code || '-'}{item.barcode ? ` / ${item.barcode}` : ''}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      stock > 10 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      stock > 0  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {stock} available
                    </span>
                  </div>
                  
                  {/* Price, Discount and GST fields */}
                  <div className="grid grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <span className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">Price (Rs.)</span>
                      {hasQty ? (
                        <input
                          type="number"
                          step="any"
                          value={customPrices[item.id] !== undefined ? (customPrices[item.id] / 100).toString() : ((item.sale_price_1 || 0) / 100).toString()}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setCustomPrices(prev => ({ ...prev, [item.id]: Math.round(val * 100) }))
                          }}
                          className="w-full border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 bg-white dark:bg-zinc-950 font-mono text-blue-600 dark:text-blue-400"
                        />
                      ) : (
                        <span className="font-mono text-zinc-600 dark:text-zinc-300">
                          {formatCurrency(customPrices[item.id] !== undefined ? customPrices[item.id] : (item.sale_price_1 || 0))}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">Disc (Rs.)</span>
                      {hasQty ? (
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={customDiscounts[item.id] !== undefined ? (customDiscounts[item.id] / 100).toString() : ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setCustomDiscounts(prev => ({ ...prev, [item.id]: Math.round(val * 100) }))
                          }}
                          className="w-full border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 bg-white dark:bg-zinc-950 font-mono text-red-600 dark:text-red-400"
                        />
                      ) : (
                        <span className="font-mono text-zinc-400">-</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">GST Rate</span>
                      <span className="font-mono block mt-1 text-zinc-600 dark:text-zinc-300">
                        {isTaxBilling ? `${item.tax_rate || 0}%` : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Input and Action Button */}
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-200/60 dark:border-zinc-800/40">
                    <span className="text-xs text-zinc-400 font-medium">Quantity Sold</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                        <button
                          type="button"
                          onClick={() => adjustQty(item.id, -1, stock)}
                          className="px-3 py-1 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold transition-colors text-sm"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="any"
                          value={qty}
                          placeholder="0"
                          onChange={e => handleQtyChange(item.id, e.target.value, stock)}
                          className="w-12 text-center text-xs font-semibold bg-transparent border-none outline-none focus:ring-0 p-1 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => adjustQty(item.id, 1, stock)}
                          className="px-3 py-1 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold transition-colors text-sm"
                        >
                          +
                        </button>
                      </div>
                      {hasQty && (
                        <button 
                          type="button"
                          onClick={() => clearItemQty(item.id)}
                          className="p-1.5 bg-zinc-100 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {filteredItems.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-sm">
                No products found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Entry summary sidebar */}
        <div className="w-full lg:w-80 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm shrink-0">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-xs">Summary Details</h2>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Selected summary */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-zinc-400">Distinct Items Sold:</span>
                  <span className="text-zinc-800 dark:text-zinc-200">{activeEntries.length}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-zinc-400">Total Quantity:</span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {activeEntries.reduce((sum, e) => sum + e.qty, 0)} units
                  </span>
                </div>
              </div>

              {/* Discount inputs */}
              <div className="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <label className="block text-xs font-bold text-zinc-400 uppercase">Apply Discount</label>
                <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountValue || ''}
                    onChange={e => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    data-de-input="discount"
                    className="flex-1 px-3 py-1.5 bg-transparent text-sm focus:outline-none font-mono"
                  />
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as 'PCT' | 'AMT')}
                    className="px-2 py-1.5 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-xs font-bold"
                  >
                    <option value="PCT">%</option>
                    <option value="AMT">₹</option>
                  </select>
                </div>
              </div>

              {/* Prices breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-red-500 font-medium">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(discountAmt)}</span>
                  </div>
                )}
                {isTaxBilling && taxAmount > 0 && (
                  <>
                    <div className="flex justify-between text-zinc-500 text-xs">
                      <span>CGST (Central GST)</span>
                      <span className="font-mono">{formatCurrency(cgstTotal)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 text-xs">
                      <span>SGST (State GST)</span>
                      <span className="font-mono">{formatCurrency(sgstTotal)}</span>
                    </div>
                  </>
                )}
                {roundOff !== 0 && (
                  <div className="flex justify-between text-zinc-400 text-xs font-medium">
                    <span>Round Off</span>
                    <span className="font-mono">{roundOff > 0 ? '+' : ''}{formatCurrency(roundOff)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total checkout and save */}
            <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-zinc-600 dark:text-zinc-400 text-xs uppercase">Grand Total</span>
                <span className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(finalTotal)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear
                </button>
                <button
                  type="button"
                  id="save-entry-btn"
                  disabled={loading}
                  onClick={handleSaveDailyEntry}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {loading ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
