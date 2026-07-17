'use client'

import { useEffect, useState } from 'react'
import { getInventoryValuation } from '../actions'
import { Package } from 'lucide-react'

function formatCurrency(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
}

export default function InventoryValuationPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInventoryValuation().then(res => {
      setData(res)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-8 text-center">Loading Inventory Valuation...</div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Inventory Valuation</h1>
          <p className="text-sm text-zinc-500">Current stock value based on standard purchase price</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Total Stock Value</h2>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {formatCurrency(data?.totalValue || 0)}
          </p>
        </div>

        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Item Name</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Qty in Hand</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Avg Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Value</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
            {data?.items?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 text-sm">
                  No inventory data available.
                </td>
              </tr>
            )}
            {data?.items?.map((item: any, i: number) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.item_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 text-right">{item.quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 text-right">{formatCurrency(item.purchase_price)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100 text-right">{formatCurrency(item.total_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
