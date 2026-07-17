'use client'

import { getProfitAndLoss } from '../actions'
import Link from 'next/link'
import { ArrowLeft, Printer, Download, Filter } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function ProfitAndLossPage() {
  const [data, setData] = useState({ income: 0, expenses: 0, netProfit: 0 })
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('from', startDate)
      if (endDate) params.append('to', endDate)
      const res = await fetch(`/api/v1/reports/pnl?${params}`)
      const json = await res.json()
      if (json.success) {
        setData({
          income: json.data.totalSales,
          expenses: json.data.totalPurchases,
          netProfit: json.data.grossProfit
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount / 100)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    const csvContent = [
      ['Account', 'Amount'],
      ['Operating Revenue (Sales)', (data.income / 100).toFixed(2)],
      ['Cost of Goods Sold', (data.expenses / 100).toFixed(2)],
      ['Gross Profit', (data.netProfit / 100).toFixed(2)]
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "profit_and_loss.csv")
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const { income, expenses, netProfit } = data

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 print-content">
      {/* Header - Hidden on Print */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Link href="/reports" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Profit & Loss</h1>
            <p className="text-sm text-zinc-500">Trading profit calculation based on sales and purchases.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="hidden print-only mb-8">
        <h1 className="text-3xl font-bold text-black">Profit & Loss Statement</h1>
        <p className="text-gray-600">
          Period: {startDate ? new Date(startDate).toLocaleDateString() : 'All Time'} to {endDate ? new Date(endDate).toLocaleDateString() : 'Present'}
        </p>
      </div>

      {/* Date Filters - Hidden on Print */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-end gap-4 no-print">
        <div className="flex items-center gap-2 mb-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filter Period:</span>
        </div>
        <div className="flex-1 md:flex-none">
          <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
          />
        </div>
        <div className="flex-1 md:flex-none">
          <label className="block text-xs text-zinc-500 mb-1">End Date</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading report data...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Total Revenue</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{formatCurrency(income)}</p>
              <p className="text-xs text-zinc-400 mt-1">From Sales Invoices</p>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Cost of Goods (COGS)</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{formatCurrency(expenses)}</p>
              <p className="text-xs text-zinc-400 mt-1">From Purchase Bills</p>
            </div>

            <div className={`p-6 rounded-xl border shadow-sm ${netProfit >= 0 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/50'}`}>
              <p className={`text-sm font-medium uppercase tracking-wider ${netProfit >= 0 ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                Net Profit
              </p>
              <p className={`text-3xl font-bold mt-2 ${netProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {formatCurrency(netProfit)}
              </p>
              <p className={`text-xs mt-1 ${netProfit >= 0 ? 'text-green-600/70 dark:text-green-400/70' : 'text-red-600/70 dark:text-red-400/70'}`}>
                Revenue minus COGS
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Summary Statement</h2>
            </div>
            
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Account</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">Operating Revenue (Sales)</td>
                    <td className="px-6 py-4 text-right text-zinc-900 dark:text-zinc-100">{formatCurrency(income)}</td>
                  </tr>
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 pl-10 text-zinc-500">Less: Cost of Goods Sold</td>
                    <td className="px-6 py-4 text-right text-orange-600">-{formatCurrency(expenses)}</td>
                  </tr>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 font-bold">
                    <td className="px-6 py-4 text-zinc-900 dark:text-zinc-100">Gross Profit</td>
                    <td className={`px-6 py-4 text-right ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(netProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
