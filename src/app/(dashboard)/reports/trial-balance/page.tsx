'use client'

import { useEffect, useState } from 'react'
import { getTrialBalance } from '../actions'
import Link from 'next/link'
import { FileSpreadsheet } from 'lucide-react'

export default function TrialBalancePage() {
  const [trialBalance, setTrialBalance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTrialBalance().then(data => {
      setTrialBalance(data)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const formatCurrency = (paise: number) => {
    if (paise === 0) return '-'
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.abs(paise) / 100)
  }

  const totalDebit = trialBalance.reduce((sum, acc) => sum + (acc.balance > 0 ? acc.balance : 0), 0)
  const totalCredit = trialBalance.reduce((sum, acc) => sum + (acc.balance < 0 ? Math.abs(acc.balance) : 0), 0)

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Trial Balance</h1>
          <p className="text-sm text-zinc-500">Summary of all account balances to ensure debits equal credits.</p>
        </div>
        <button className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
          <FileSpreadsheet className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading trial balance...</div>
        ) : (
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Account Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Debit Balance (Dr)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Credit Balance (Cr)</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
              {trialBalance.map((acc) => (
                <tr key={acc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    <Link href={`/reports/ledger?account=${acc.id}`} className="hover:underline hover:text-blue-600">
                      {acc.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {acc.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {acc.balance > 0 ? formatCurrency(acc.balance) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {acc.balance < 0 ? formatCurrency(Math.abs(acc.balance)) : '-'}
                  </td>
                </tr>
              ))}
              {trialBalance.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-500">No accounting entries found.</td>
                </tr>
              )}
            </tbody>
            {trialBalance.length > 0 && (
              <tfoot className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800">
                <tr>
                  <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right">
                    Total
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${totalDebit === totalCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(totalDebit)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${totalDebit === totalCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(totalCredit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  )
}
