'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function QuotationPage() {
  const [clients, setClients] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState('')
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/v1/clients')
      .then(r => r.json())
      .then(d => {
        const sorted = (d.data || []).sort((a: any, b: any) => a.name.localeCompare(b.name))
        setClients(sorted)
      })
    fetch('/api/v1/items').then(r => r.json()).then(d => setItems(d.data || []))
  }, [])

  // Automatically update cart items' prices when the selected customer changes
  useEffect(() => {
    const client = clients.find(c => c.id === selectedClient)

    setCart(prevCart => {
      if (prevCart.length === 0) return prevCart
      return prevCart.map(c => {
        const originalItem = items.find(it => it.id === c.item_id)
        if (!originalItem) return c

        const customPrice = client?.product_prices?.find((pp: any) => pp.item_id === c.item_id)
        const newRate = customPrice ? customPrice.price : (originalItem.sale_price_1 || 0)

        if (c.rate === newRate) return c

        return {
          ...c,
          rate: newRate,
          total: c.quantity * newRate
        }
      })
    })
  }, [selectedClient, clients, items])

  const addItemToCart = (item: any) => {
    const client = clients.find(c => c.id === selectedClient)
    const customPrice = client?.product_prices?.find((pp: any) => pp.item_id === item.id)
    const rate = customPrice ? customPrice.price : (item.sale_price_1 || 0)

    const existing = cart.find(c => c.item_id === item.id)
    if (existing) {
      const nextQty = existing.quantity + 1
      setCart(cart.map(c => c.item_id === item.id ? { ...c, quantity: nextQty, total: nextQty * c.rate } : c))
    } else {
      setCart([...cart, {
        item_id: item.id,
        item_name: item.name,
        quantity: 1,
        rate: rate,
        tax_rate: item.tax_rate || 0,
        total: rate
      }])
    }
  }

  const subtotal = cart.reduce((acc, c) => acc + c.total, 0)
  const tax = cart.reduce((acc, c) => acc + (c.total * (c.tax_rate / 100)), 0)
  const total = subtotal + tax

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('Cart is empty')
    setLoading(true)
    
    const payload = {
      type: 'QUOTATION',
      party_id: selectedClient || null,
      party_name: clients.find((c:any) => c.id === selectedClient)?.name || 'Walk-in Customer',
      subtotal,
      tax_amount: tax,
      total,
      items: cart
    }

    try {
      const res = await fetch('/api/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        toast.success('Quotation Generated Successfully!')
        setCart([])
        setSelectedClient('')
      } else {
        const err = await res.json()
        toast.error('Failed to generate quotation: ' + (err.error || 'Something went wrong'))
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
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Products</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 auto-rows-max">
          {items.map((item: any) => {
            const client = clients.find(c => c.id === selectedClient)
            const customPrice = client?.product_prices?.find((pp: any) => pp.item_id === item.id)
            const displayPrice = customPrice ? customPrice.price : (item.sale_price_1 || 0)

            return (
              <button
                key={item.id}
                onClick={() => addItemToCart(item)}
                className="p-4 text-left border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-pink-500 hover:shadow-md transition-all bg-zinc-50 dark:bg-zinc-800/50 flex flex-col justify-between"
              >
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-pink-600 dark:text-pink-400 font-bold">
                    {formatCurrency(displayPrice)}
                  </p>
                  {customPrice && (
                    <span className="text-[8px] font-bold text-indigo-500 bg-indigo-100 dark:bg-indigo-950/40 px-1 py-0.5 rounded">Custom Rate</span>
                  )}
                </div>
              </button>
            )
          })}
          {items.length === 0 && <p className="text-sm text-zinc-500 col-span-2 text-center py-8">No products found. Add them in Inventory.</p>}
        </div>
      </div>

      {/* Right side: Cart / Invoice */}
      <div className="w-1/2 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">New Quotation / Estimate</h2>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Select Customer</label>
            <select 
              value={selectedClient} 
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
            >
              <option value="">Walk-in Customer</option>
              {[...clients].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/20">
          {cart.map((c, i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{c.item_name}</p>
                <p className="text-xs text-zinc-500">{formatCurrency(c.rate)} x {c.quantity}</p>
              </div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(c.total)}</p>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
              Estimate is empty. Click products to add.
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
            <span className="text-pink-600 dark:text-pink-400">{formatCurrency(total)}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="w-full py-3 mt-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-pink-600 dark:hover:bg-pink-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-md flex justify-center items-center gap-2"
          >
            {loading ? 'Processing...' : `Save Quotation • ${formatCurrency(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
