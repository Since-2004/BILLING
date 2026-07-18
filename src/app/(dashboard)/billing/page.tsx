'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, ShoppingCart, History, RotateCcw, Package, ClipboardList, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'

export default function BillingPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [billDiscount, setBillDiscount] = useState(0)
  const [billDiscountType, setBillDiscountType] = useState<'PCT' | 'AMT'>('PCT')
  const [billingMode, setBillingMode] = useState('BOTH')
  const [isTaxBilling, setIsTaxBilling] = useState(true)
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/v1/clients')
      .then(r => r.json())
      .then(d => {
        const sorted = (d.data || []).sort((a: any, b: any) => a.name.localeCompare(b.name))
        setClients(sorted)
      })
    fetch('/api/v1/items').then(r => r.json()).then(d => setItems(d.data || []))
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
    
    fetch('/api/v1/branches')
      .then(r => r.json())
      .then(d => {
        const list = d.data || []
        setBranches(list)
        const def = list.find((b: any) => b.is_default) || list[0]
        if (def) setSelectedBranch(def.id)
      })

    // Autofocus search on load
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    if (selectedBranch) {
      fetch(`/api/v1/stock?branch_id=${selectedBranch}`)
        .then(r => r.json())
        .then(d => setStockMap(d.data || {}))
      setSelectedClient('')
      setCart([])
    }
  }, [selectedBranch])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return

      const active = document.activeElement as HTMLElement
      if (!active) return

      const billingInput = active.getAttribute('data-billing-input')
      if (!billingInput) return

      // If in search input and text is typed, let search behavior (adding item to cart) run
      if (billingInput === 'search') {
        const searchInput = active as HTMLInputElement
        if (searchInput.value.trim() !== '') {
          return
        }
      }

      e.preventDefault()

      // Find all visible interactive inputs on the page with [data-billing-input]
      const allInputs = Array.from(document.querySelectorAll<HTMLElement>('[data-billing-input]'))
        .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0 && !el.hasAttribute('disabled'))

      const currentIndex = allInputs.indexOf(active)
      if (currentIndex !== -1 && currentIndex + 1 < allInputs.length) {
        const nextEl = allInputs[currentIndex + 1]
        nextEl.focus()
        if (nextEl instanceof HTMLInputElement) nextEl.select()
      } else if (currentIndex === allInputs.length - 1) {
        const checkoutBtn = document.getElementById('checkout-btn') as HTMLElement
        if (checkoutBtn) checkoutBtn.focus()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [cart])

  const addItemToCart = (item: any) => {
    const stock = stockMap[item.id] || 0
    if (stock <= 0) {
      toast.error(`${item.name} is out of stock!`)
      return
    }

    // Find if the selected client has a custom rate for this product
    const client = clients.find(c => c.id === selectedClient)
    const customPrice = client?.product_prices?.find((pp: any) => pp.item_id === item.id)
    const rate = customPrice ? customPrice.price : (item.sale_price_1 || 0)

    const tax_rate = item.tax_rate || 0
    const tax_amount = Math.round(rate * tax_rate / 100)
    const item_total = rate + tax_amount

    const existing = cart.find(c => c.item_id === item.id)
    if (existing) {
      if (existing.quantity >= stock) {
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

  // Automatically update cart items' prices when the selected customer changes
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

    setCart(prevCart => {
      if (prevCart.length === 0) return prevCart
      return prevCart.map(c => {
        // Find the corresponding item from items list to get regular pricing info
        const originalItem = items.find(it => it.id === c.item_id)
        if (!originalItem) return c

        // Check if custom rate exists
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
    })
  }, [selectedClient, clients, items])

  const updateQty = (i: number, qty: number) => {
    if (qty < 1) return
    const item = cart[i]
    const stock = stockMap[item.item_id] || 0
    if (qty > stock) {
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

  // Filter products based on search term and item type
  const filteredItems = items.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(search.toLowerCase())) ||
      (item.barcode && item.barcode.includes(search));
    if (selectedType === 'ALL') return matchesSearch;
    return (item.item_type || 'PRODUCT') === selectedType && matchesSearch;
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

  // Dynamic CGST / SGST split (assuming dynamic 50% split per item rate)
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

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('Cart is empty')
    setLoading(true)
    
    const payload = {
      type: 'SALES_INVOICE',
      branch_id: selectedBranch,
      party_id: selectedClient || null,
      party_name: clients.find((c:any) => c.id === selectedClient)?.name || 'Walk-in Customer',
      subtotal,
      discount: discountAmt,
      tax_amount: cgstTotal + sgstTotal,
      total: finalTotal,
      amount_paid: paymentMode === 'CREDIT' ? 0 : finalTotal,
      payment_mode: paymentMode,
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
      const res = await fetch('/api/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      if (res.ok) {
        toast.success('Invoice saved successfully!')
        setCart([])
        setSelectedClient('')
        setPaymentMode('CASH')
        setBillDiscount(0)
        
        // Auto-redirect to print view
        if (data.data?.id) {
          router.push(`/billing/${data.data.id}`)
        }
      } else {
        toast.error(data.error || 'Something went wrong')
      }
    } catch (e) {
      toast.error('Failed to save invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-6rem)] gap-6">
      {/* Left side: Items Library */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm min-h-[500px] lg:min-h-0">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Products Library
          </h2>
          <div className="flex flex-wrap gap-1.5">
            <Link href="/billing/daily-entry" className="flex items-center gap-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-2.5 py-1.5 rounded-lg font-semibold transition-colors">
              <ClipboardList className="w-3.5 h-3.5" />
              Daily Entry
            </Link>
            <Link href="/billing/daily-entry/monthly" className="flex items-center gap-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-2.5 py-1.5 rounded-lg font-semibold transition-colors">
              <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
              Monthly Report
            </Link>
            <Link href="/billing/history" className="flex items-center gap-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-2.5 py-1.5 rounded-lg font-semibold transition-colors">
              <History className="w-3.5 h-3.5" />
              History
            </Link>
            <Link href="/billing/returns" className="flex items-center gap-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-2.5 py-1.5 rounded-lg font-semibold transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
              Returns
            </Link>
          </div>
        </div>
        
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
          <input
            ref={searchInputRef}
            data-billing-input="search"
            type="text"
            placeholder="Search by name, SKU or scan barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 auto-rows-max">
          {filteredItems.map((item: any) => {
            const stock = stockMap[item.id] ?? 0
            const client = clients.find(c => c.id === selectedClient)
            const customPrice = client?.product_prices?.find((pp: any) => pp.item_id === item.id)
            const displayPrice = customPrice ? customPrice.price : (item.sale_price_1 || 0)

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
                    {customPrice && (
                      <span className="text-[9px] font-bold text-indigo-500 bg-indigo-100 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded ml-1">Custom Rate</span>
                    )}
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    stock > 10 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    stock > 0  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {stock > 0 ? `${stock} left` : 'Out of stock'}
                  </span>
                </div>
              </button>
            )
          })}
          {filteredItems.length === 0 && (
            <p className="text-sm text-zinc-500 col-span-2 text-center py-8">
              No products found matching "{search}".
            </p>
          )}
        </div>
      </div>

      {/* Right side: Cart / Invoice */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm min-h-[500px] lg:min-h-0">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-500" />
            Current Invoice
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Dispatch Location</label>
              <select 
                value={selectedBranch} 
                onChange={e => setSelectedBranch(e.target.value)}
                data-billing-input="branch"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-sm font-semibold text-blue-600 dark:text-blue-400"
              >
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Select Customer</label>
              <select 
                value={selectedClient} 
                onChange={e => setSelectedClient(e.target.value)}
                data-billing-input="customer"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-sm"
              >
                <option value="">Walk-in Customer</option>
                {clients.filter((c: any) => !c.branch_id || c.branch_id === selectedBranch).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {billingMode === 'BOTH' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Invoice Type</label>
                <select 
                  value={isTaxBilling ? 'TAX' : 'NON_TAX'} 
                  onChange={e => setIsTaxBilling(e.target.value === 'TAX')}
                  data-billing-input="invoice-type"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-sm"
                >
                  <option value="TAX">Tax Invoice</option>
                  <option value="NON_TAX">Non-Tax Bill</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Payment Mode</label>
              <select 
                value={paymentMode} 
                onChange={e => setPaymentMode(e.target.value)}
                data-billing-input="payment-mode"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="CREDIT">Credit / Unpaid</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/20">
          {cart.map((item, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="flex-1 min-w-0 flex justify-between items-start sm:block">
                <div>
                  <p className="font-medium text-sm truncate text-zinc-900 dark:text-zinc-100 max-w-[200px] sm:max-w-none">{item.item_name}</p>
                  <p className="text-xs text-zinc-400">{isTaxBilling ? `${item.tax_rate}% GST` : 'Non-taxable'}</p>
                </div>
                <button onClick={() => removeItem(i)} className="sm:hidden text-red-400 hover:text-red-600 p-1.5 rounded-full hover:bg-zinc-105 dark:hover:bg-zinc-700" title="Remove item">✕</button>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2.5 mt-1 sm:mt-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 sm:hidden">Qty</span>
                  <input
                    type="number" min="1" value={item.quantity}
                    onChange={e => updateQty(i, Number(e.target.value))}
                    data-billing-input="qty"
                    data-index={i}
                    className="w-14 sm:w-16 text-center border border-zinc-300 dark:border-zinc-600 rounded px-1 py-1 text-sm bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 sm:hidden">Rate</span>
                  <input
                    type="number" step="0.01" value={(item.rate / 100).toFixed(2)}
                    onChange={e => updateRate(i, Math.round(Number(e.target.value) * 100))}
                    data-billing-input="rate"
                    data-index={i}
                    className="w-20 sm:w-24 text-right border border-zinc-300 dark:border-zinc-600 rounded px-1 py-1 text-sm bg-transparent"
                  />
                </div>
                <span className="min-w-[65px] sm:w-24 text-right text-sm font-semibold">{formatCurrency(item.total)}</span>
                <button onClick={() => removeItem(i)} className="hidden sm:block text-red-400 hover:text-red-600 p-1 rounded" title="Remove item">✕</button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex items-center justify-center text-zinc-400 text-sm py-12">
              Cart is empty. Click products to add.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Discount</span>
            <div className="flex gap-1">
              <select 
                value={billDiscountType} 
                onChange={e => setBillDiscountType(e.target.value as any)} 
                className="text-xs border rounded px-1 bg-transparent"
              >
                <option value="PCT">%</option>
                <option value="AMT">₹</option>
              </select>
              <input 
                type="number" 
                min="0" 
                value={billDiscount} 
                onChange={e => setBillDiscount(Number(e.target.value))} 
                data-billing-input="discount"
                className="w-16 text-right border rounded px-1 text-xs bg-transparent" 
              />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Taxable Amount</span>
            <span>{formatCurrency(taxableAmt)}</span>
          </div>
          {isTaxBilling && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">CGST</span>
                <span>{formatCurrency(cgstTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">SGST</span>
                <span>{formatCurrency(sgstTotal)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Round Off</span>
            <span>{formatCurrency(roundOff)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <span>Grand Total</span>
            <span className="text-blue-600 dark:text-blue-400">{formatCurrency(finalTotal)}</span>
          </div>
          <button
            id="checkout-btn"
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-md flex justify-center items-center gap-2"
          >
            {loading ? 'Processing...' : `Complete Sale • ${formatCurrency(finalTotal)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
