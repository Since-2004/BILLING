'use client'

import { useEffect, useState } from 'react'
import { getPayrollRecords, generateSalarySlip } from './actions'
import { toast } from 'sonner'

export default function PayrollPage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    getPayrollRecords().then(data => {
      setRecords(data)
      setLoading(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    const res = await generateSalarySlip(data)
    if (res.success) {
      setRecords([res.data, ...records])
      setShowAdd(false)
      toast.success("Salary slip generated successfully!")
    }
  }

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
  }

  const getMonthName = (m: number) => {
    const date = new Date()
    date.setMonth(m - 1)
    return date.toLocaleString('default', { month: 'long' })
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Payroll & Salary Slips</h1>
          <p className="text-sm text-zinc-500">Generate and manage employee salary slips.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showAdd ? 'Cancel' : '+ Generate Payslip'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Generate Salary Slip</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Month</label>
                <select name="month" className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent" required defaultValue={new Date().getMonth() + 1}>
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{getMonthName(m)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Year</label>
                <input type="number" name="year" defaultValue={new Date().getFullYear()} className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Basic Salary (₹)</label>
                <input type="number" step="0.01" name="basic_salary" className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Allowances (₹)</label>
                <input type="number" step="0.01" name="allowances" defaultValue="0" className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Deductions (₹)</label>
                <input type="number" step="0.01" name="deductions" defaultValue="0" className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium">Generate Payslip</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading payroll...</div>
        ) : (
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Basic Salary</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Net Payable</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {getMonthName(r.month)} {r.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-zinc-500">
                    {formatCurrency(r.basic_salary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(r.net_payable)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-500">No salary slips found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
