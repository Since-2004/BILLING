'use client'

import { useEffect, useState } from 'react'
import { getAccounts, getAccountLedger } from '../actions'

export default function LedgerPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [ledger, setLedger] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLedger, setLoadingLedger] = useState(false)

  useEffect(() => {
    getAccounts().then(data => {
      setAccounts(data)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (selectedAccountId) {
      setLoadingLedger(true)
      getAccountLedger(selectedAccountId).then(data => {
        setLedger(data)
        setLoadingLedger(false)
      }).catch(err => {
        console.error(err)
        setLoadingLedger(false)
      })
    } else {
      setLedger([])
    }
  }, [selectedAccountId])

  const formatCurrency = (paise: number) => {
    if (paise === 0) return '-'
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.abs(paise) / 100)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Account Ledger</h1>
          <p className="text-sm text-zinc-500">View journal entries and running balances for any account.</p>
        </div>
        <div className="w-64">
          <select 
            value={selectedAccountId} 
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900"
          >
            <option value="">-- Select Account --</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {loading || loadingLedger ? (
          <div className="p-8 text-center text-zinc-500">Loading ledger...</div>
        ) : !selectedAccountId ? (
          <div className="p-8 text-center text-zinc-500">Select an account to view its ledger.</div>
        ) : (
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Narration</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Debit (Dr)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Credit (Cr)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
              {ledger.map((line) => (
                <tr key={line.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                    {new Date(line.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {line.narration}
                    <div className="text-xs text-zinc-400 mt-1">Ref: {line.reference}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(line.debit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(line.credit)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${line.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(line.balance)} {line.balance >= 0 ? 'Dr' : 'Cr'}
                  </td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-zinc-500">No journal entries found for this account.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
