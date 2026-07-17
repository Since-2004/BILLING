'use client'

import { useEffect, useState } from 'react'

export default function HRPage() {
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/hr').then(r => r.json()).then(d => {
      setAttendance(d.data || [])
      setLoading(false)
    })
  }, [])

  const todaysRecord = attendance.find((a: any) => 
    new Date(a.date).toDateString() === new Date().toDateString()
  )

  async function handleClockIn() {
    const res = await fetch('/api/v1/hr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CLOCK_IN' })
    })
    const data = await res.json()
    if (data.success) {
      setAttendance([data.data, ...attendance] as any)
    }
  }

  async function handleClockOut() {
    const res = await fetch('/api/v1/hr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CLOCK_OUT', attendance_id: todaysRecord?.id })
    })
    const data = await res.json()
    if (data.success) {
      setAttendance(attendance.map((a: any) => a.id === todaysRecord?.id ? data.data : a) as any)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">HR & Attendance</h1>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Today's Attendance</h2>
          <p className="text-sm text-zinc-500 mt-1">{new Date().toLocaleDateString()}</p>
        </div>
        <div>
          {!todaysRecord ? (
            <button onClick={handleClockIn} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Clock In
            </button>
          ) : !todaysRecord.clock_out ? (
            <div className="flex items-center gap-4">
              <span className="text-green-600 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span> Clocked In
              </span>
              <button onClick={handleClockOut} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Clock Out
              </button>
            </div>
          ) : (
            <span className="text-zinc-500 font-medium bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-lg">Shift Completed</span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <h2 className="p-4 font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800">Attendance History</h2>
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Clock In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Clock Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
              {attendance.map((a: any) => (
                <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">{new Date(a.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{new Date(a.clock_in).toLocaleTimeString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{a.clock_out ? new Date(a.clock_out).toLocaleTimeString() : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
