'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Printer, ArrowLeft, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Suspense, useEffect } from 'react'

function PrintButtonContent({ id, transactionNo }: { id: string; transactionNo: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (from === 'daily-entry') {
          router.push('/billing/daily-entry')
        } else {
          router.push('/billing')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [from, router])

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete transaction ${transactionNo}? This will also delete all associated stock ledgers, journal entries, and restore stock.`)) {
      return
    }

    try {
      const res = await fetch(`/api/v1/transactions/${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Transaction ${transactionNo} deleted successfully`)
        if (from === 'daily-entry') {
          router.push('/billing/daily-entry')
        } else {
          router.push('/billing/history')
        }
      } else {
        toast.error(data.error || 'Failed to delete transaction')
      }
    } catch (err) {
      toast.error('Failed to delete transaction')
    }
  }

  const isFromDailyEntry = from === 'daily-entry'

  return (
    <div className="print:hidden flex flex-wrap gap-3 p-4 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 items-center justify-between">
      <div className="flex gap-3">
        <button 
          onClick={() => window.print()} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Invoice
        </button>
        {isFromDailyEntry ? (
          <>
            <Link 
              href="/billing/daily-entry" 
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 bg-white dark:bg-zinc-950 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Daily Entry
            </Link>
            <Link 
              href="/billing/history" 
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              Invoice History
            </Link>
          </>
        ) : (
          <Link 
            href="/billing/history" 
            className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </Link>
        )}
      </div>

      <div className="flex gap-3">
        <Link 
          href={`/billing/${id}/edit`}
          className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-sm font-medium"
        >
          <Edit2 className="w-4 h-4" />
          Edit Transaction
        </Link>
        <button 
          onClick={handleDelete}
          className="px-4 py-2 text-sm bg-red-650 hover:bg-red-700 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  )
}

export default function PrintButton({ id, transactionNo }: { id: string; transactionNo: string }) {
  return (
    <Suspense fallback={<div className="h-16 bg-zinc-100 animate-pulse" />}>
      <PrintButtonContent id={id} transactionNo={transactionNo} />
    </Suspense>
  )
}
