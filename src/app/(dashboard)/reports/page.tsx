'use client'
import Link from 'next/link'
export default function ReportsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Financial Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/reports/pnl" className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer block">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xl mb-4">
            📈
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Profit & Loss</h2>
          <p className="text-sm text-zinc-500 mt-2">View income, expenses, and net profit over a selected time period.</p>
        </Link>

        <Link href="/reports/balance-sheet" className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer block">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xl mb-4">
            ⚖️
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Balance Sheet</h2>
          <p className="text-sm text-zinc-500 mt-2">Snapshot of your company's assets, liabilities, and equity.</p>
        </Link>

        <Link href="/reports/gst" className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer block">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xl mb-4">
            📝
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">GST Reports</h2>
          <p className="text-sm text-zinc-500 mt-2">GSTR-3B ready reports for tax filing.</p>
        </Link>

        <Link href="/reports/inventory-valuation" className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer block">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-xl mb-4">
            📦
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Inventory Valuation</h2>
          <p className="text-sm text-zinc-500 mt-2">Current stock value based on standard purchase price.</p>
        </Link>

        <Link href="/reports/outstanding" className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer block">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center text-xl mb-4">
            💸
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Outstanding Receivables</h2>
          <p className="text-sm text-zinc-500 mt-2">View outstanding bills, collections, and ageing buckets for clients.</p>
        </Link>
      </div>
      
      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Note on Reports Generation</h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          In this MVP, the reporting engine UI acts as a placeholder hub. The underlying Double-Entry ledger schema supports these aggregations. Connect to a BI tool like Metabase or hook up the API routes to generate full PDFs!
        </p>
      </div>
    </div>
  )
}
