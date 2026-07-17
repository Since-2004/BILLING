'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'

export default function OutstandingPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalOutstanding, setTotalOutstanding] = useState(0)

  useEffect(() => {
    fetch('/api/v1/reports/outstanding')
      .then(r => r.json())
      .then(d => {
        setData(d.data || [])
        setTotalOutstanding(d.data?.reduce((acc: number, c: any) => acc + c.outstanding, 0) || 0)
        setLoading(false)
      })
  }, [])

  const formatCurrency = (p: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p / 100)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print-content">
      {/* Header - Hidden on Print */}
      <div className="flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <Link href="/reports" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Outstanding Receivables</h1>
            <p className="text-sm text-zinc-500">Total outstanding receivables: <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(totalOutstanding)}</span></p>
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm">
          <Printer className="w-4 h-4" />
          Print Report
        </button>
      </div>

      {/* Print Only Header */}
      <div className="hidden print-only mb-8">
        <h1 className="text-3xl font-bold text-black">Outstanding Receivables Ageing Report</h1>
        <p className="text-gray-600">Total Outstanding: {formatCurrency(totalOutstanding)}</p>
        <p className="text-xs text-gray-400 mt-1">Generated Date: {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                {['Client','Total Invoiced','Collected','Outstanding','0-30 days','31-60','61-90','90+'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-zinc-500">Loading outstanding report data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-zinc-500">No outstanding receivables found.</td></tr>
              ) : data.filter(c => c.outstanding > 0).map(client => (
                <tr key={client.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{client.name}</td>
                  <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">{formatCurrency(client.totalInvoiced)}</td>
                  <td className="px-4 py-3 font-mono text-green-600 dark:text-green-400">{formatCurrency(client.totalPaid)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-red-600 dark:text-red-400">{formatCurrency(client.outstanding)}</td>
                  <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">{formatCurrency(client.bucket0to30)}</td>
                  <td className="px-4 py-3 font-mono text-yellow-600 dark:text-yellow-500">{formatCurrency(client.bucket31to60)}</td>
                  <td className="px-4 py-3 font-mono text-orange-600 dark:text-orange-500">{formatCurrency(client.bucket61to90)}</td>
                  <td className="px-4 py-3 font-mono text-red-600 dark:text-red-500 font-semibold">{formatCurrency(client.bucket90plus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; border: none; padding: 0; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
      ` }} />
    </div>
  )
}
