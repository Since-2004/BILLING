'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ShoppingCart, History, RotateCcw, Package, ClipboardList, CalendarDays, ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function EditBillingPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Master Data
  const [clients, setClients] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})

  // Form States
  const [txType, setTxType] = useState('SALES_INVOICE')
  const [selectedParty, setSelectedParty] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [cart, setCart] = useState<any[]>([])
  const [billDiscount, setBillDiscount] = useState(0)
  const [billDiscountType, setBillDiscountType] = useState<'PCT' | 'AMT'>('PCT')
  const [isTaxBilling, setIsTaxBilling] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [billingDate, setBillingDate] = useState('')
  const [notes, setNotes] = useState('')

  // UI States
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const isFirstLoad = useRef(true)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isPurchaseType = txType === 'PURCHASE_BILL' || txType === 'PURCHASE_RETURN'

  // Fetch Master Data
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [clientsRes, suppliersRes, itemsRes, companiesRes, branchesRes, txRes] = await Promise.all([
          fetch('/api/v1/clients').then(r => r.json()),
          fetch('/api/v1/suppliers').then(r => r.json()),
          fetch('/api/v1/items').then(r => r.json()),
          fetch('/api/v1/companies').then(r => r.json()),
          fetch('/api/v1/branches').then(r => r.json()),
          fetch(`/api/v1/transactions/${id}`).then(r => r.json())
        ])

        const sortedClients = (clientsRes.data || []).sort((a: any, b: any) => a.name.localeCompare(b.name))
        setClients(sortedClients)
        setSuppliers(suppliersRes.data || [])
        setItems(itemsRes.data || [])
        setBranches(branchesRes.data || [])

        const company = companiesRes.data?.[0]
        if (company) {
          setIsTaxBilling(company.billing_mode !== 'NON_TAX')
        }

        // Load Transaction Details
        if (txRes.success && txRes.data) {
          const tx = txRes.data
          setTxType(tx.type)
          setSelectedBranch(tx.branch_id)
          setSelectedParty(tx.party_id || '')
          setPaymentMode(tx.payments?.[0]?.mode || 'CASH')
          setBillingDate(new Date(tx.date).toISOString().split('T')[0])
          setNotes(tx.notes || '')
          
          // Discount: Store as AMT (Rupees) since database stores flat paise
          setBillDiscount(tx.discount / 100)
          setBillDiscountType('AMT')

          const formattedCart = tx.items.map((item: any) => ({
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            rate: item.rate,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            total: item.total
          }))
          setCart(formattedCart)
        } else {
          toast.error('Failed to load transaction details')
          router.push('/billing/history')
        }
      } catch (err) {
        console.error(err)
        toast.error('Failed to load edit workspace')
      } finally {
        setLoading(false)
        if (searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }
    }

    loadMasterData()
  }, [id])

  // Fetch Stock when branch changes
  useEffect(() => {
    if (selectedBranch) {
      fetch(`/api/v1/stock?branch_id=${selectedBranch}`)
        .then(r => r.json())
        .then(d => {
          setStockMap(d.data || {})
          
          // Only clear cart/party if NOT the initial load
          if (isFirstLoad.current) {
            isFirstLoad.current = false
          } else {
            setSelectedParty('')
            setCart([])
          }
        })
    }
  }, [selectedBranch])

  // Automatically update cart items' prices when the selected customer changes (Sales only)
  useEffect(() => {
    if (isPurchaseType || loading) return

    const client = clients.find(c => c.id === selectedParty)

    if (client) {
      if (client.client_type === 'CREDIT') {
        setPaymentMode('CREDIT')
      } else {
        setPaymentMode('CASH')
      }
    } else {
      setPaymentMode('CASH')
    }

    if (cart.length === 0) return

    setCart(prevCart => 
      prevCart.map(c => {
        const originalItem = items.find(it => it.id === c.item_id)
        if (!originalItem) return c

        const customPrice = client?.product_prices?.find((pp: any) => pp.item_id === c.item_id)
        const newRate = customPrice ? customPrice.price : (originalItem.sale_price_1 || 0)

        if (c.rate === newRate) return c

        const newTaxAmount = Math.round(c.quantity * newRate * c.tax_rate / 100)
        return {
          ...c,
          rate: newRate,
          tax_amount: newTaxAmount,
          total: c.quantity * newRate + newTaxAmount
        }
      })
    )
  }, [selectedParty, clients, items, isPurchaseType, loading])

  // Add Item to Cart
  const addItemToCart = (item: any) => {
    const stock = stockMap[item.id] || 0
    if (!isPurchaseType && stock <= 0) {
      toast.error(`${item.name} is out of stock!`)
      return
    }

    let rate = 0
    if (isPurchaseType) {
      rate = item.purchase_price || 0
    } else {
      const client = clients.find(c => c.id === selectedParty)
      const customPrice = client?.product_prices?.find((pp: any) => pp.item_id === item.id)
      rate = customPrice ? customPrice.price : (item.sale_price_1 || 0)
    }

    const tax_rate = item.tax_rate || 0
    const tax_amount = Math.round(rate * tax_rate / 100)
    const item_total = rate + tax_amount

    const existing = cart.find(c => c.item_id === item.id)
    if (existing) {
      if (!isPurchaseType && existing.quantity >= stock) {
        toast.error(`Cannot add more. Only ${stock} units in stock.`)
        return
      }
      const newQty = existing.quantity + 1
      const newTaxAmount = Math.round(newQty * existing.rate * tax_rate / 100)
      setCart(cart.map(c => c.item_id === item.id ? {
        ...c,
        quantity: newQty,
        tax_amount: newTaxAmount,
        total: newQty * existing.rate + newTaxAmount
      } : c))
    } else {
      setCart([...cart, {
        item_id: item.id,
        item_name: item.name,
        quantity: 1,
        rate: rate,
        tax_rate: tax_rate,
        tax_amount: tax_amount,
        total: item_total
      }])
    }
  }

  const updateQty = (i: number, qty: number) => {
    if (qty < 1) return
    const item = cart[i]
    const stock = stockMap[item.item_id] || 0
    if (!isPurchaseType && qty > stock) {
      toast.error(`Only ${stock} units available in stock.`)
      return
    }
    setCart(cart.map((c, idx) => idx !== i ? c : {
      ...c,
      quantity: qty,
      total: qty * c.rate + Math.round(qty * c.rate * c.tax_rate / 100)
    }))
  }

  const updateRate = (i: number, rate: number) => {
    setCart(cart.map((c, idx) => idx !== i ? c : {
      ...c,
      rate,
      total: c.quantity * rate + Math.round(c.quantity * rate * c.tax_rate / 100)
    }))
  }

  const removeItem = (i: number) => setCart(cart.filter((_, idx) => idx !== i))

  // Filter products based on search
  const filteredItems = items.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(search.toLowerCase())) ||
      (item.barcode && item.barcode.includes(search))
    if (selectedType === 'ALL') return matchesSearch
    return (item.item_type || 'PRODUCT') === selectedType && matchesSearch
  })

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredItems.length === 1) {
      addItemToCart(filteredItems[0])
      setSearch('')
    }
  }

  // Totals calculations
  const subtotal = cart.reduce((acc, c) => acc + (c.quantity * c.rate), 0)
  const discountAmt = billDiscountType === 'PCT'
    ? Math.round(subtotal * billDiscount / 100)
    : billDiscount * 100
  const taxableAmt = subtotal - discountAmt

  const cgstTotal = isTaxBilling
    ? cart.reduce((acc, c) => acc + Math.round(c.quantity * c.rate * (c.tax_rate / 2) / 100), 0)
    : 0
  const sgstTotal = cgstTotal
  const grandTotal = taxableAmt + cgstTotal + sgstTotal
  const roundOff = Math.round(grandTotal / 100) * 100 - grandTotal
  const finalTotal = grandTotal + roundOff

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
  }

  const handleSave = async () => {
    if (cart.length === 0) return toast.error('Cart is empty')
    setSaving(true)
    
    let partyName = 'Walk-in Customer'
    if (isPurchaseType) {
      partyName = suppliers.find((c: any) => c.id === selectedParty)?.name || 'Walk-in Supplier'
    } else {
      partyName = clients.find((c: any) => c.id === selectedParty)?.name || 'Walk-in Customer'
    }

    const payload = {
      type: txType,
      branch_id: selectedBranch,
      party_id: selectedParty || null,
      party_name: partyName,
      date: billingDate,
      subtotal,
      discount: discountAmt,
      tax_amount: cgstTotal + sgstTotal,
      total: finalTotal,
      amount_paid: paymentMode === 'CREDIT' ? 0 : finalTotal,
      payment_mode: paymentMode,
      notes: notes,
      items: cart.map(c => {
        const rate = c.rate
        const qty = c.quantity
        const taxRate = isTaxBilling ? c.tax_rate : 0
        const taxAmt = isTaxBilling ? Math.round(qty * rate * taxRate / 100) : 0
        return {
          item_id: c.item_id,
          item_name: c.item_name,
          quantity: qty,
          rate: rate,
          tax_rate: taxRate,
          tax_amount: taxAmt,
          total: qty * rate + taxAmt
        }
      })
    }

    try {
      const res = await fetch(`/api/v1/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Transaction updated successfully!')
        router.push(`/billing/${id}`)
      } else {
        toast.error(data.error || 'Failed to update transaction')
      }
    } catch (e) {
      toast.error('Failed to update transaction')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading transaction workspace...</div>

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <Link href={`/billing/${id}`} className="p-1.5 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Edit Transaction Type: <span className="text-blue-600 dark:text-blue-400 uppercase">{txType.replace('_', ' ')}</span>
            </h1>
            <p className="text-xs text-zinc-500">Modify items, pricing, date, and other transaction parameters.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/billing/${id}`} className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Cancel
          </Link>
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-md"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left side: Items Library */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Products Library
            </h2>
          </div>
          
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, SKU or scan barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'PRODUCT', label: 'Products' },
                { id: 'RAW_MATERIAL', label: 'Raw Materials' },
                { id: 'SERVICE', label: 'Services' },
                { id: 'COMPOSITE', label: 'Composites' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                    selectedType === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 auto-rows-max">
            {filteredItems.map((item: any) => {
              const stock = stockMap[item.id] ?? 0
              let displayPrice = 0
              if (isPurchaseType) {
                displayPrice = item.purchase_price || 0
              } else {
                const client = clients.find(c => c.id === selectedParty)
                const customPrice = client?.product_prices?.find((pp: any) => pp.item_id === item.id)
                displayPrice = customPrice ? customPrice.price : (item.sale_price_1 || 0)
              }

              return (
                <button
                  key={item.id}
                  onClick={() => addItemToCart(item)}
                  className="p-4 text-left border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-blue-500 hover:shadow-md transition-all bg-zinc-50 dark:bg-zinc-800/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                      {item.item_type && item.item_type !== 'PRODUCT' && (
                        <span className="text-[8px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase border border-zinc-200 dark:border-zinc-700 px-1 rounded whitespace-nowrap">
                          {item.item_type.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">{item.code || 'NO SKU'}</p>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-bold">
                      {formatCurrency(displayPrice)}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${stock > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {stock} units
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right side: Cart & checkout properties */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm justify-between">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-500" />
                Cart Items ({cart.length})
              </h2>
            </div>
            
            {/* Form Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Branch</label>
                <select
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className="w-full px-2 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Date</label>
                <input
                  type="date"
                  value={billingDate}
                  onChange={e => setBillingDate(e.target.value)}
                  className="w-full px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                  {isPurchaseType ? 'Supplier / Vendor' : 'Customer / Party'}
                </label>
                <select
                  value={selectedParty}
                  onChange={e => setSelectedParty(e.target.value)}
                  className="w-full px-2 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="">{isPurchaseType ? '-- Select Supplier --' : '-- Walk-in Customer --'}</option>
                  {isPurchaseType ? (
                    suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  ) : (
                    clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                  className="w-full px-2 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                  <option value="CREDIT">CREDIT (PAY LATER)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cart Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-zinc-100 dark:bg-zinc-800/40 text-zinc-500 font-semibold sticky top-0">
                <tr>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-center w-20">Qty</th>
                  <th className="p-3 text-right w-24">Rate (Rs)</th>
                  <th className="p-3 text-right w-24">Total (Rs)</th>
                  <th className="p-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {cart.map((c, i) => (
                  <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 font-medium">
                    <td className="p-3">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{c.item_name}</p>
                      {c.tax_rate > 0 && <p className="text-[10px] text-zinc-400 mt-0.5">GST Included: {c.tax_rate}%</p>}
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={c.quantity}
                        onChange={e => updateQty(i, Number(e.target.value))}
                        className="w-14 px-1.5 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded text-center font-mono font-bold bg-transparent"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        value={(c.rate / 100).toFixed(2)}
                        onChange={e => updateRate(i, Math.round(parseFloat(e.target.value) * 100) || 0)}
                        className="w-20 px-1 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded text-right font-mono bg-transparent"
                      />
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(c.total)}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-zinc-500 italic">Cart is empty. Add products from the library.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Checkout Totals details */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-3.5">
            {/* Notes field */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Notes / Remarks</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Enter references, delivery notes, terms..."
                className="w-full px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>

            <div className="flex justify-between items-start gap-4">
              <div className="w-1/2 flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Discount</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={billDiscount || ''}
                    onChange={e => setBillDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-semibold focus:outline-none"
                  />
                </div>
                <div className="mt-5">
                  <select
                    value={billDiscountType}
                    onChange={e => setBillDiscountType(e.target.value as any)}
                    className="px-2 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-semibold focus:outline-none"
                  >
                    <option value="PCT">%</option>
                    <option value="AMT">Rs.</option>
                  </select>
                </div>
              </div>

              <div className="w-1/2 space-y-1.5 text-xs text-zinc-650 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-red-500 font-bold">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(discountAmt)}</span>
                  </div>
                )}
                {isTaxBilling && cgstTotal > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>CGST (Central Tax)</span>
                      <span className="font-mono">{formatCurrency(cgstTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST (State Tax)</span>
                      <span className="font-mono">{formatCurrency(sgstTotal)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-base font-extrabold text-blue-600 dark:text-blue-400 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                  <span>Total Amount</span>
                  <span className="font-mono">{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
