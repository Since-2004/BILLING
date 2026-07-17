'use client'

import { useEffect, useState } from 'react'
import { getBalanceSheet } from '../actions'
import { Scale } from 'lucide-react'

function formatCurrency(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
}

export default function BalanceSheetPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBalanceSheet().then(res => {
      setData(res)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-8 text-center">Loading Balance Sheet...</div>

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
          <Scale className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Balance Sheet</h1>
          <p className="text-sm text-zinc-500">Statement of Assets, Liabilities, and Equity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100">Assets</h2>
          </div>
          <div className="p-6 flex flex-col justify-center min-h-[150px]">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 text-center">
              {formatCurrency(data?.assets || 0)}
            </p>
          </div>
        </div>

        {/* Liabilities + Equity */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100">Liabilities & Equity</h2>
          </div>
          <div className="p-6 flex flex-col justify-center min-h-[150px] space-y-4">
            <div className="flex justify-between items-center text-lg">
              <span className="text-zinc-600 dark:text-zinc-400">Liabilities</span>
              <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(data?.liabilities || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="text-zinc-600 dark:text-zinc-400">Equity</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(data?.equity || 0)}</span>
            </div>
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">Total L & E</span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency((data?.liabilities || 0) + (data?.equity || 0))}</span>
            </div>
          </div>
        </div>
      </div>

      {!data?.isBalanced && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-900/50">
          <strong>Warning:</strong> The balance sheet is not balanced. Check your journal entries for missing or incorrect records.
        </div>
      )}
    </div>
  )
}
