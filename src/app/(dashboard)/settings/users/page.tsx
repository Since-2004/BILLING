'use client'

import { useState, useEffect } from 'react'
import { getUsers, updateUserRole } from '../actions'
import { toast } from 'sonner'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUsers().then(data => {
      setUsers(data)
      setLoading(false)
    })
  }, [])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await updateUserRole(userId, newRole)
      if (res.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
        toast.success("Role updated successfully!")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update role")
    }
  }

  if (loading) return <div className="p-8 text-center">Loading users...</div>

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">User Management</h1>
        <p className="text-sm text-zinc-500">Manage employee access and roles (RBAC).</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">{u.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{u.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <select 
                    value={u.role} 
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={u.role === 'OWNER'} // Cannot change owner's role directly
                    className="border border-zinc-300 dark:border-zinc-700 rounded bg-transparent px-2 py-1 text-sm disabled:opacity-50"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
