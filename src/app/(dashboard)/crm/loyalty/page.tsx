'use client'

import { useEffect, useState } from 'react'
import { Gift } from 'lucide-react'
import { getLoyaltyRewards } from './actions'

export default function LoyaltyPage() {
  const [loyalty, setLoyalty] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLoyaltyRewards().then(data => {
      setLoyalty(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-8 text-center">Loading loyalty data...</div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Customer Loyalty & Rewards</h1>
          <p className="text-sm text-zinc-500">Track and manage customer reward points.</p>
        </div>
      </div>

      {loyalty.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full flex items-center justify-center mb-4">
            <Gift className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">No loyalty points awarded yet</h3>
          <p className="text-sm text-zinc-500 max-w-md">
            Once you start generating sales invoices, eligible customers will automatically earn points based on their spend (1 point per ₹100).
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Customer Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Tier</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Points Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
              {loyalty.map((l: any) => (
                <tr key={l.client_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">{l.client.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{l.client.email || l.client.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-1 rounded text-xs font-semibold">{l.tier}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-pink-600 dark:text-pink-400 text-right">{l.points} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
