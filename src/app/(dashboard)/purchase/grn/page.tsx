'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function GRNPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [paymentMode, setPaymentMode] = useState('CREDIT')
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredItems = items.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase()));
    if (selectedType === 'ALL') return matchesSearch;
    return (item.item_type || 'PRODUCT') === selectedType && matchesSearch;
  })

  useEffect(() => {
    fetch('/api/v1/suppliers').then(r => r.json()).then(d => setSuppliers(d.data || []))
    fetch('/api/v1/items').then(r => r.json()).then(d => setItems(d.data || []))
  }, [])

  const addItemToCart = (item: any) => {
    const rate = item.purchase_price || 0
    const tax_rate = item.tax_rate || 0
    const tax_amount = Math.round(rate * tax_rate / 100)
    const item_total = rate + tax_amount

    const existing = cart.find(c => c.item_id === item.id)
    if (existing) {
      const newQty = existing.quantity + 1
      const newTaxAmount = Math.round(newQty * existing.rate * tax_rate / 100)
      setCart(cart.map(c => c.item_id === item.id ? {
        ...c,
        quantity: newQty,
        qtyInput: String(newQty),
        total: newQty * existing.rate + newTaxAmount
      } : c))
    } else {
      setCart([...cart, {
        item_id: item.id,
        item_name: item.name,
        quantity: 1,
        qtyInput: '1',
        rate: rate,
        rateInput: (rate / 100).toFixed(2),
        tax_rate: tax_rate,
        total: item_total
      }])
    }
  }

  const updateQty = (i: number, qtyStr: string) => {
    const qty = parseInt(qtyStr) || 0
    if (qty < 0) return
    setCart(cart.map((c, idx) => idx !== i ? c : {
      ...c,
      quantity: qty,
      qtyInput: qtyStr,
      total: qty * c.rate + Math.round(qty * c.rate * c.tax_rate / 100)
    }))
  }

  const updateRate = (i: number, rateStr: string) => {
    const rateRupees = parseFloat(rateStr) || 0
    if (rateRupees < 0) return
    const ratePaise = Math.round(rateRupees * 100)
    setCart(cart.map((c, idx) => idx !== i ? c : {
      ...c,
      rate: ratePaise,
      rateInput: rateStr,
      total: c.quantity * ratePaise + Math.round(c.quantity * ratePaise * c.tax_rate / 100)
    }))
  }

  const removeItem = (i: number) => setCart(cart.filter((_, idx) => idx !== i))

  const subtotal = cart.reduce((acc, c) => acc + (c.quantity * c.rate), 0)
  const tax = cart.reduce((acc, c) => acc + Math.round(c.quantity * c.rate * c.tax_rate / 100), 0)
  const total = subtotal + tax

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('Cart is empty')
    if (!selectedSupplier) return toast.error('Please select a supplier for the Purchase Bill')

    const hasInvalidQty = cart.some(c => !c.quantity || c.quantity < 1)
    if (hasInvalidQty) {
      toast.error('Please enter a valid quantity of 1 or more for all items')
      return
    }

    const hasInvalidRate = cart.some(c => c.rate < 0)
    if (hasInvalidRate) {
      toast.error('Rate cannot be negative')
      return
    }

    setLoading(true)
    
    const payload = {
      type: 'PURCHASE_BILL',
      party_id: selectedSupplier,
      party_name: suppliers.find((c:any) => c.id === selectedSupplier)?.name,
      subtotal,
      tax_amount: tax,
      total,
      amount_paid: paymentMode === 'CREDIT' ? 0 : total,
      payment_mode: paymentMode,
      items: cart.map(c => ({
        item_id: c.item_id,
        item_name: c.item_name,
        quantity: c.quantity,
        rate: c.rate,
        tax_rate: c.tax_rate,
        tax_amount: Math.round(c.quantity * c.rate * c.tax_rate / 100),
        total: c.quantity * c.rate + Math.round(c.quantity * c.rate * c.tax_rate / 100)
      }))
    }

    try {
      const res = await fetch('/api/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        toast.success('Invoice saved successfully!')
        setCart([])
        setSelectedSupplier('')
        setPaymentMode('CREDIT')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Something went wrong')
      }
    } catch (e) {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6">
      {/* Left side: Items Library */}
      <div className="w-1/2 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Items Library (Purchase)</h2>
          </div>
          {/* Search bar */}
          <input
            type="text"
            placeholder="Search items to purchase..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {/* Category Tabs */}
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
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 auto-rows-max">
          {filteredItems.map((item: any) => (
            <button
              key={item.id}
              onClick={() => addItemToCart(item)}
              className="p-4 text-left border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all bg-zinc-50 dark:bg-zinc-800/50 flex flex-col justify-between min-h-[100px]"
            >
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                {item.item_type && item.item_type !== 'PRODUCT' && (
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mt-0.5 block">
                    {item.item_type.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold mt-2">{formatCurrency(item.purchase_price)}</p>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <p className="text-sm text-zinc-500 col-span-2 text-center py-8">
              No items found.
            </p>
          )}
        </div>
      </div>

      {/* Right side: Cart / Invoice */}
      <div className="w-1/2 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">New GRN / Purchase Bill</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Select Supplier *</label>
              <select 
                value={selectedSupplier} 
                onChange={e => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Payment Status</label>
              <select 
                value={paymentMode} 
                onChange={e => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
              >
                <option value="CREDIT">Unpaid / Credit</option>
                <option value="CASH">Paid (Cash)</option>
                <option value="BANK">Paid (Bank)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/20">
          {cart.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.item_name}</p>
                <p className="text-xs text-zinc-400">{item.tax_rate}% GST</p>
              </div>
              <input
                type="number" min="0" value={item.qtyInput ?? item.quantity}
                onChange={e => updateQty(i, e.target.value)}
                className="w-16 text-center border border-zinc-300 dark:border-zinc-600 rounded px-1 py-1 text-sm bg-transparent"
              />
              <input
                type="number" step="0.01" value={item.rateInput ?? (item.rate / 100).toFixed(2)}
                onChange={e => updateRate(i, e.target.value)}
                className="w-24 text-right border border-zinc-300 dark:border-zinc-600 rounded px-1 py-1 text-sm bg-transparent"
              />
              <span className="w-24 text-right text-sm font-semibold">{formatCurrency(item.total)}</span>
              <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 p-1 rounded">✕</button>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
              No items received yet. Click products to add.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Subtotal</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Tax</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <span className="text-zinc-900 dark:text-zinc-100">Total</span>
            <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(total)}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0 || !selectedSupplier}
            className="w-full py-3 mt-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-md flex justify-center items-center gap-2"
          >
            {loading ? 'Processing...' : `Save Purchase Bill • ${formatCurrency(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
