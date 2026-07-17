'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts'
import { 
  DollarSign, 
  Users, 
  Boxes, 
  TrendingUp, 
  AlertTriangle, 
  FileText,
  Plus,
  ArrowUpRight
} from 'lucide-react'

export default function DashboardHome() {
  const [metrics, setMetrics] = useState<any>({
    todaysSales: 0,
    todaysCollection: 0,
    clientsCount: 0,
    productsCount: 0,
    totalOutstanding: 0,
    lowStockCount: 0,
    recentTransactions: [],
    last7days: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.success) setMetrics(d.data)
        setLoading(false)
      })
  }, [])

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      maximumFractionDigits: 0 
    }).format(paise / 100)
  }

  if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading dashboard...</div>

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Overview</h1>
        <p className="text-sm text-zinc-500">Welcome to your billing dashboard. Here is what is happening today.</p>
      </div>

      {/* Grid of 6 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Today's Sales */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-zinc-500">Today's Sales</p>
            <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2 font-mono">{formatCurrency(metrics.todaysSales)}</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Collection */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-zinc-500">Today's Collection</p>
            <p className="text-3xl font-extrabold text-green-600 dark:text-green-400 mt-2 font-mono">{formatCurrency(metrics.todaysCollection)}</p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-zinc-500">Low Stock Items</p>
            <p className={`text-3xl font-extrabold mt-2 font-mono ${metrics.lowStockCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
              {metrics.lowStockCount}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${metrics.lowStockCount > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-zinc-500">Total Outstanding</p>
            <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-2 font-mono">{formatCurrency(metrics.totalOutstanding)}</p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Total Clients */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-zinc-500">Total Clients</p>
            <p className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-2 font-mono">{metrics.clientsCount}</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-zinc-500">Total Products</p>
            <p className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-2 font-mono">{metrics.productsCount}</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Boxes className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4 text-sm uppercase tracking-wider text-zinc-400">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '+ New Invoice', href: '/billing', color: 'bg-blue-600 hover:bg-blue-700' },
            { label: '+ Add Item', href: '/inventory', color: 'bg-green-600 hover:bg-green-700' },
            { label: '+ Add Client', href: '/crm', color: 'bg-purple-600 hover:bg-purple-700' },
            { label: '+ New Purchase', href: '/purchase/grn', color: 'bg-orange-600 hover:bg-orange-700' },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className={`${a.color} text-white text-center py-3 px-4 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow hover:scale-[1.01]`}>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Chart & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart (2/3 width) */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 lg:col-span-2">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Sales — Last 7 Days</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.last7days || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" stroke="#888" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { weekday: 'short' })} 
                  tick={{ fontSize: 11 }}
                  stroke="#888 font-mono"
                />
                <YAxis 
                  tickFormatter={v => `₹${Math.round(v / 100)}`}
                  tick={{ fontSize: 11 }}
                  stroke="#888 font-mono"
                />
                <Tooltip 
                  formatter={(v: any) => [formatCurrency(v), 'Sales']} 
                  labelFormatter={l => new Date(l).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions (1/3 width) */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Recent Transactions</h2>
            <Link href="/billing/history" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
              All History
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 flex-1 overflow-y-auto">
            {metrics.recentTransactions.map((tx: any) => (
              <Link 
                key={tx.id} 
                href={`/billing/${tx.id}`}
                className="p-4 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-colors block"
              >
                <div>
                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-mono">{tx.transaction_no}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{tx.party_name || 'Walk-in'} • {new Date(tx.date).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold font-mono text-sm ${tx.type === 'SALES_INVOICE' ? 'text-green-600 dark:text-green-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {tx.type === 'SALES_INVOICE' ? '+' : ''}{formatCurrency(tx.total)}
                  </p>
                  <span className="text-[9px] uppercase tracking-wide text-zinc-400 font-semibold">{tx.type.replace('_', ' ')}</span>
                </div>
              </Link>
            ))}
            {metrics.recentTransactions.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-sm">No recent transactions found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
