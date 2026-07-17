'use client'

import Link from 'next/link'
import { Users, Truck, Gift } from 'lucide-react'

export default function CRMHubPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">CRM & Masters</h1>
        <p className="text-sm text-zinc-500">Manage your business relationships and loyalties.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <Link href="/crm/clients" className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer block">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xl mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Clients</h2>
          <p className="text-sm text-zinc-500 mt-2">Manage retail and wholesale customers.</p>
        </Link>

        <Link href="/crm/suppliers" className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer block">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-xl mb-4">
            <Truck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Suppliers</h2>
          <p className="text-sm text-zinc-500 mt-2">Manage vendors and purchase accounts.</p>
        </Link>

        <Link href="/crm/loyalty" className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer block">
          <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-lg flex items-center justify-center text-xl mb-4">
            <Gift className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Reward Points</h2>
          <p className="text-sm text-zinc-500 mt-2">Manage loyalty programs and redemptions.</p>
        </Link>

      </div>
    </div>
  )
}
