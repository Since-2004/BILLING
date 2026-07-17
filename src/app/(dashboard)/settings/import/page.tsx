'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet } from 'lucide-react'
import Papa from 'papaparse'
import { importData } from './actions'
import { toast } from 'sonner'

export default function ImportUtilityPage() {
  const [loadingItems, setLoadingItems] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>, type: string) => {
    e.preventDefault()
    const form = e.currentTarget
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement
    const file = fileInput?.files?.[0]

    if (!file) return toast.error('Please select a file')
    
    if (type === 'ITEMS') setLoadingItems(true)
    else setLoadingContacts(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const res = await importData(type, results.data)
        if (res.success) {
          toast.success(`Successfully imported ${res.count} records!`)
          form.reset()
        } else {
          toast.error(`Failed to import: ${res.error || 'Something went wrong'}`)
        }
        if (type === 'ITEMS') setLoadingItems(false)
        else setLoadingContacts(false)
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`)
        if (type === 'ITEMS') setLoadingItems(false)
        else setLoadingContacts(false)
      }
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Bulk Import Utilities</h1>
        <p className="text-sm text-zinc-500">Import your legacy data from CSV files.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Item Import */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Import Inventory Items</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Upload a CSV containing: <b>Item Name, SKU, Purchase Price, Sale Price, Tax Rate</b>
          </p>
          <form onSubmit={(e) => handleUpload(e, 'ITEMS')}>
            <input type="file" accept=".csv" className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4 cursor-pointer" required />
            <button type="submit" disabled={loadingItems} className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              <Upload className="w-4 h-4" />
              {loadingItems ? 'Importing...' : 'Upload Items'}
            </button>
          </form>
        </div>

        {/* Client Import */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Import Customers / Suppliers</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Upload a CSV containing: <b>Name, Phone, Email, Address, GSTIN, Type (CLIENT/SUPPLIER)</b>
          </p>
          <form onSubmit={(e) => handleUpload(e, 'CONTACTS')}>
            <input type="file" accept=".csv" className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mb-4 cursor-pointer" required />
            <button type="submit" disabled={loadingContacts} className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              <Upload className="w-4 h-4" />
              {loadingContacts ? 'Importing...' : 'Upload Contacts'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
