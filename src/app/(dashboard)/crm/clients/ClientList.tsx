'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClientRecord, updateClientRecord, deleteClientRecord } from '../actions'
import { Plus, Search, Mail, Phone, MapPin, Edit, Building2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ClientList({ initialClients, branches = [], items = [] }: { initialClients: any[], branches?: any[], items?: any[] }) {
  const [clients, setClients] = useState(() => {
    return [...initialClients].sort((a, b) => a.name.localeCompare(b.name))
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.phone && c.phone.includes(searchTerm))
    const matchesBranch = selectedBranchFilter === 'ALL' || c.branch_id === selectedBranchFilter
    return matchesSearch && matchesBranch
  })

  const filteredProducts = items.filter(item =>
    item.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (item.code && item.code.toLowerCase().includes(productSearch.toLowerCase()))
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    try {
      const newClient = await createClientRecord(data)
      setClients([...clients, newClient].sort((a, b) => a.name.localeCompare(b.name)))
      setIsModalOpen(false)
      setProductSearch('')
      toast.success("Client created successfully!")
    } catch (err) {
      toast.error("Error creating client")
    } finally {
      setLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingClient) return
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    try {
      const updated = await updateClientRecord(editingClient.id, data)
      setClients(clients.map(c => c.id === editingClient.id ? updated : c).sort((a, b) => a.name.localeCompare(b.name)))
      setEditingClient(null)
      setProductSearch('')
      toast.success("Client details updated successfully!")
    } catch (err) {
      toast.error("Error updating client details")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete client "${name}"?`)) {
      return
    }
    try {
      await deleteClientRecord(id)
      setClients(clients.filter(c => c.id !== id))
      toast.success(`Client "${name}" deleted successfully!`)
    } catch (err) {
      toast.error("Error deleting client")
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="relative flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search clients by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 min-w-[160px]"
          >
            <option value="ALL">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(client => (
          <div key={client.id} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                <Link href={`/crm/clients/${client.id}`} className="hover:text-blue-600 hover:underline transition-colors">
                  {client.name}
                </Link>
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditingClient(client)}
                  className="text-zinc-400 hover:text-blue-500 transition-colors p-1"
                  title="Edit Client"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleDelete(client.id, client.name)}
                  className="text-zinc-400 hover:text-red-550 transition-colors p-1"
                  title="Delete Client"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {client.product_prices && client.product_prices.length > 0 && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded font-bold">
                    {client.product_prices.length} Rates
                  </span>
                )}
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                  client.client_type === 'WHOLESALE' 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                    : client.client_type === 'EXPORT'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : client.client_type === 'CREDIT'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {client.client_type}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-zinc-500">
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.gstin && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>GST: {client.gstin}</span>
                </div>
              )}
              {client.branch && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Branch: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{client.branch.name}</span></span>
                </div>
              )}
              {client.opening_balance && client.opening_balance > 0 ? (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                  <span>Prev Outstanding: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(client.opening_balance / 100)}</span>
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {filteredClients.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            No clients found. Add your first client!
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add New Client</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Company / Name *</label>
                <input required name="name" type="text" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Phone</label>
                  <input name="phone" type="text" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Client Type</label>
                  <select name="client_type" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm">
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="EXPORT">Export</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">GSTIN</label>
                <input name="gstin" type="text" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Home Branch</label>
                  <select name="branch_id" defaultValue={selectedBranchFilter !== 'ALL' ? selectedBranchFilter : ''} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 bg-transparent">
                    <option value="">No Specific Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Previous Outstanding (Rs.)</label>
                  <input name="opening_balance" type="number" step="any" placeholder="0.00" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Address</label>
                <textarea name="address" rows={2} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"></textarea>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">Custom Product Billing Rates</h3>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search products to set rate..."
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => setProductSearch(e.target.value)}
                    value={productSearch}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-zinc-100 dark:border-zinc-800 rounded-lg p-2 bg-zinc-50/50 dark:bg-zinc-900/30">
                  {filteredProducts.map(item => {
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-zinc-800 dark:text-zinc-200">{item.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">Regular: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((item.sale_price_1 || 0) / 100)}</p>
                        </div>
                        <input
                          name={`product_price_${item.id}`}
                          type="number"
                          step="0.01"
                          placeholder="Default"
                          className="w-24 px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-right font-mono"
                        />
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <p className="text-[10px] text-zinc-400 text-center py-2">No products found</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setIsModalOpen(false); setProductSearch(''); }} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900">Cancel</button>
                <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Edit Client Details</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Company / Name *</label>
                <input required name="name" type="text" defaultValue={editingClient.name} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Phone</label>
                  <input name="phone" type="text" defaultValue={editingClient.phone || ''} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Client Type</label>
                  <select name="client_type" defaultValue={editingClient.client_type || 'RETAIL'} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm">
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="EXPORT">Export</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">GSTIN</label>
                <input name="gstin" type="text" defaultValue={editingClient.gstin || ''} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Home Branch</label>
                  <select name="branch_id" defaultValue={editingClient.branch_id || ''} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm">
                    <option value="">No Specific Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Previous Outstanding (Rs.)</label>
                  <input name="opening_balance" type="number" step="any" defaultValue={editingClient.opening_balance ? (editingClient.opening_balance / 100) : ''} placeholder="0.00" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Address</label>
                <textarea name="address" rows={2} defaultValue={editingClient.address || ''} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"></textarea>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">Custom Product Billing Rates</h3>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search products to set rate..."
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => setProductSearch(e.target.value)}
                    value={productSearch}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-zinc-100 dark:border-zinc-800 rounded-lg p-2 bg-zinc-50/50 dark:bg-zinc-900/30">
                  {filteredProducts.map(item => {
                    const existingPrice = editingClient?.product_prices?.find((pp: any) => pp.item_id === item.id)?.price;
                    const defaultValue = existingPrice ? (existingPrice / 100).toFixed(2) : '';
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-zinc-800 dark:text-zinc-200">{item.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">Regular: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((item.sale_price_1 || 0) / 100)}</p>
                        </div>
                        <input
                          name={`product_price_${item.id}`}
                          type="number"
                          step="0.01"
                          placeholder="Default"
                          defaultValue={defaultValue}
                          className="w-24 px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-right font-mono"
                        />
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <p className="text-[10px] text-zinc-400 text-center py-2">No products found</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setEditingClient(null); setProductSearch(''); }} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900">Cancel</button>
                <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
