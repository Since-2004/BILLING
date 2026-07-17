'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

export default function QuotationPage() {
  const [items, setItems] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState('')
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
    const existing = cart.find(c => c.item_id === item.id)
    if (existing) {
      setCart(cart.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.rate } : c))
    } else {
      setCart([...cart, {
        item_id: item.id,
        item_name: item.name,
        quantity: 1,
        rate: item.sale_price_1,
        tax_rate: item.tax_rate,
        total: item.sale_price_1
      }])
    }
  }

  const subtotal = cart.reduce((acc, c) => acc + c.total, 0)
  const tax = cart.reduce((acc, c) => acc + (c.total * (c.tax_rate / 100)), 0)
  const total = subtotal + tax

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
  }

  async function handleCheckout() {
    if (cart.length === 0) return toast.error('Cart is empty')
    if (!selectedSupplier) return toast.error('Please select a supplier for the Purchase Order')
    setLoading(true)
    
    const payload = {
      type: 'ORDER',
      party_id: selectedSupplier || null,
      party_name: suppliers.find((c: any) => c.id === selectedSupplier)?.name || 'Walk-in Vendor',
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
        toast.success('Purchase Order Generated Successfully!')
        setCart([])
        setSelectedSupplier('')
      } else {
        const data = await res.json()
        toast.error('Failed to generate Purchase Order: ' + (data.error || 'Something went wrong'))
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
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Items Library (PO)</h2>
          </div>
          {/* Search bar */}
          <input
            type="text"
            placeholder="Search items for order..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                    ? 'bg-pink-600 text-white'
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
              className="p-4 text-left border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-pink-500 hover:shadow-md transition-all bg-zinc-50 dark:bg-zinc-800/50 flex flex-col justify-between min-h-[100px]"
            >
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                {item.item_type && item.item_type !== 'PRODUCT' && (
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mt-0.5 block">
                    {item.item_type.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-sm text-pink-600 dark:text-pink-400 font-bold mt-2">{formatCurrency(item.sale_price_1)}</p>
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
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)] w-1/2">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            New Purchase Order
          </h2>
        </div>

        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Supplier</label>
              <select 
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm"
              >
                <option value="">Select Supplier...</option>
                {suppliers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
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
            {loading ? 'Processing...' : `Save Purchase Order • ${formatCurrency(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
