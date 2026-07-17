'use client'

import Link from 'next/link'
import { FileText, FilePlus, Truck } from 'lucide-react'

export default function PurchaseHubPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Purchases & GRN</h1>
        <p className="text-sm text-zinc-500">Manage vendor bills, goods receipt, and purchase orders.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <Link href="/purchase/grn" className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer block">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xl mb-4">
            <FilePlus className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">New Purchase (GRN)</h2>
          <p className="text-sm text-zinc-500 mt-2">Create a new Goods Receipt Note / Purchase Bill.</p>
        </Link>

        <Link href="/crm/suppliers" className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer block">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-xl mb-4">
            <Truck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Suppliers</h2>
          <p className="text-sm text-zinc-500 mt-2">Manage your vendors and distributors.</p>
        </Link>

        <Link href="/purchase/orders" className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer block">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xl mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Purchase Orders</h2>
          <p className="text-sm text-zinc-500 mt-2">Manage POs and track their fulfillment.</p>
        </Link>

      </div>
    </div>
  )
}
