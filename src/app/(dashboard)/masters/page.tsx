'use client'

import { useEffect, useState } from 'react'

export default function MastersPage() {
  const [companies, setCompanies] = useState([])
  const [branches, setBranches] = useState([])

  useEffect(() => {
    fetch('/api/v1/companies')
      .then(res => res.json())
      .then(data => setCompanies(data.data || []))

    fetch('/api/v1/branches')
      .then(res => res.json())
      .then(data => setBranches(data.data || []))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Master Data</h1>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Companies List */}
        <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Companies</h2>
          <div className="space-y-3">
            {companies.map((c: any) => (
              <div key={c.id} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</p>
                {c.gstin && <p className="text-sm text-zinc-500">GSTIN: {c.gstin}</p>}
              </div>
            ))}
            {companies.length === 0 && <p className="text-sm text-zinc-500">No companies found.</p>}
          </div>
        </div>

        {/* Branches List */}
        <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Branches</h2>
          <div className="space-y-3">
            {branches.map((b: any) => (
              <div key={b.id} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {b.name} {b.is_default && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Default</span>}
                </p>
                {b.address && <p className="text-sm text-zinc-500 truncate">{b.address}</p>}
              </div>
            ))}
            {branches.length === 0 && <p className="text-sm text-zinc-500">No branches found.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
