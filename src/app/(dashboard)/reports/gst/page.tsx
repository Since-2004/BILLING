'use client'

import { getGSTSummary } from '../actions'
import Link from 'next/link'
import { ArrowLeft, Printer, Download, Filter } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function GSTReportPage() {
  const [data, setData] = useState({ outputTax: 0, inputTax: 0, netPayable: 0, totalTaxableSales: 0, totalTaxablePurchases: 0 })
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('from', startDate)
      if (endDate) params.append('to', endDate)
      const res = await fetch(`/api/v1/reports/gst?${params}`)
      const json = await res.json()
      if (json.success) {
        setData({
          outputTax: json.data.outwardTax,
          inputTax: json.data.cgstCredit + json.data.sgstCredit,
          netPayable: json.data.netTaxPayable,
          totalTaxableSales: json.data.outwardTaxableValue,
          totalTaxablePurchases: json.data.inwardTaxableValue
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
      ['Account', 'Taxable Value', 'Tax Amount'],
      ['Outward Supplies (Sales)', (data.totalTaxableSales / 100).toFixed(2), (data.outputTax / 100).toFixed(2)],
      ['Inward Supplies (Purchases)', (data.totalTaxablePurchases / 100).toFixed(2), (data.inputTax / 100).toFixed(2)],
      ['Net GST Payable', '', (data.netPayable / 100).toFixed(2)]
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "gst_summary_report.csv")
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const { outputTax, inputTax, netPayable, totalTaxableSales, totalTaxablePurchases } = data

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 print-content">
      {/* Header - Hidden on Print */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Link href="/reports" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">GSTR-3B Summary</h1>
            <p className="text-sm text-zinc-500">Summary of outward supplies and input tax credit.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="hidden print-only mb-8">
        <h1 className="text-3xl font-bold text-black">GSTR-3B Summary Report</h1>
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
        <div className="text-center py-12 text-zinc-500">Loading GST data...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Output Tax (Collected)</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{formatCurrency(outputTax)}</p>
              <p className="text-xs text-zinc-400 mt-1">Taxable Value: {formatCurrency(totalTaxableSales)}</p>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Input Tax Credit (ITC)</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{formatCurrency(inputTax)}</p>
              <p className="text-xs text-zinc-400 mt-1">Taxable Value: {formatCurrency(totalTaxablePurchases)}</p>
            </div>

            <div className={`p-6 rounded-xl border shadow-sm ${netPayable >= 0 ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-900/50' : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50'}`}>
              <p className={`text-sm font-medium uppercase tracking-wider ${netPayable >= 0 ? 'text-orange-800 dark:text-orange-300' : 'text-green-800 dark:text-green-300'}`}>
                {netPayable >= 0 ? 'Net GST Payable' : 'Net GST Refundable'}
              </p>
              <p className={`text-3xl font-bold mt-2 ${netPayable >= 0 ? 'text-orange-700 dark:text-orange-400' : 'text-green-700 dark:text-green-400'}`}>
                {formatCurrency(Math.abs(netPayable))}
              </p>
              <p className={`text-xs mt-1 ${netPayable >= 0 ? 'text-orange-600/70 dark:text-orange-400/70' : 'text-green-600/70 dark:text-green-400/70'}`}>
                Output Tax minus ITC
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">3.1 Details of Outward Supplies & 4. Eligible ITC</h2>
            </div>
            
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Nature of Supplies</th>
                    <th className="px-6 py-4 text-right">Total Taxable Value</th>
                    <th className="px-6 py-4 text-right">Integrated / Central / State Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">(a) Outward taxable supplies (other than zero rated, nil rated and exempted)</td>
                    <td className="px-6 py-4 text-right text-zinc-900 dark:text-zinc-100">{formatCurrency(totalTaxableSales)}</td>
                    <td className="px-6 py-4 text-right text-purple-600">{formatCurrency(outputTax)}</td>
                  </tr>
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">(A) ITC Available (whether in full or part)</td>
                    <td className="px-6 py-4 text-right text-zinc-900 dark:text-zinc-100">{formatCurrency(totalTaxablePurchases)}</td>
                    <td className="px-6 py-4 text-right text-blue-600">{formatCurrency(inputTax)}</td>
                  </tr>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 font-bold">
                    <td className="px-6 py-4 text-zinc-900 dark:text-zinc-100 text-right" colSpan={2}>Net Tax Payable</td>
                    <td className={`px-6 py-4 text-right ${netPayable >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(netPayable)}
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
