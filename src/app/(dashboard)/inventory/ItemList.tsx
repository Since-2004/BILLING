'use client'

import { useState, useEffect } from 'react'
import { createItemRecord } from './actions'
import { Plus, Search, Tag, Package, Edit, Settings, Trash2, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

export default function ItemList({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isStockOpen, setIsStockOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Current selected item for modals
  const [selectedItem, setSelectedItem] = useState<any>(null)
  
  // Stock adjustment state
  const [stockType, setStockType] = useState<'IN' | 'OUT'>('IN')
  const [stockQty, setStockQty] = useState('1')
  const [stockReason, setStockReason] = useState('Manual adjustment')

  // Branch & Stock states
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [stockMap, setStockMap] = useState<Record<string, number>>({})

  // Fetch branches on mount
  useEffect(() => {
    fetch('/api/v1/branches')
      .then(res => res.json())
      .then(data => {
        const list = data.data || []
        setBranches(list)
        if (list.length > 0) {
          const def = list.find((b: any) => b.is_default) || list[0]
          setSelectedBranch(def.id)
        }
      })
  }, [])

  // Fetch stock levels for selected branch
  const fetchStock = (branchId: string) => {
    if (!branchId) return
    fetch(`/api/v1/stock?branch_id=${branchId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStockMap(data.data || {})
        }
      })
  }

  useEffect(() => {
    if (selectedBranch) {
      fetchStock(selectedBranch)
    }
  }, [selectedBranch])

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.code && i.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (i.barcode && i.barcode.includes(searchTerm))
  )

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
  }

  // CREATE ITEM
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    try {
      const newItem = await createItemRecord(data)
      setItems([newItem, ...items])
      setIsAddOpen(false)
      toast.success("Item created successfully!")
    } catch (err) {
      toast.error("Error creating item")
    } finally {
      setLoading(false)
    }
  }

  // UPDATE ITEM
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedItem) return
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    try {
      const res = await fetch(`/api/v1/items/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setItems(items.map(i => i.id === selectedItem.id ? json.data : i))
        setIsEditOpen(false)
        toast.success("Item updated successfully!")
      } else {
        toast.error(json.error || "Failed to update item")
      }
    } catch (err) {
      toast.error("Error updating item")
    } finally {
      setLoading(false)
    }
  }

  // STOCK ADJUSTMENT
  const handleStockSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedItem) return
    setLoading(true)

    try {
      const res = await fetch(`/api/v1/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: selectedItem.id,
          branch_id: selectedBranch || undefined,
          type: stockType,
          quantity: Number(stockQty),
          reason: stockReason
        })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success(`Stock adjusted successfully (${stockType} ${stockQty} units)`)
        setIsStockOpen(false)
        setStockQty('1')
        setStockReason('Manual adjustment')
        if (selectedBranch) {
          fetchStock(selectedBranch)
        }
      } else {
        toast.error(json.error || "Failed to adjust stock")
      }
    } catch (err) {
      toast.error("Error adjusting stock")
    } finally {
      setLoading(false)
    }
  }

  // SOFT DELETE
  const handleDeleteConfirm = async () => {
    if (!selectedItem) return
    setLoading(true)

    try {
      const res = await fetch(`/api/v1/items/${selectedItem.id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setItems(items.filter(i => i.id !== selectedItem.id))
        setIsDeleteOpen(false)
        toast.success("Item deleted successfully!")
      } else {
        const json = await res.json()
        toast.error(json.error || "Failed to delete item")
      }
    } catch (err) {
      toast.error("Error deleting item")
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (item: any) => {
    setSelectedItem(item)
    setIsEditOpen(true)
  }

  const openStockModal = (item: any) => {
    setSelectedItem(item)
    setIsStockOpen(true)
  }

  const openDeleteModal = (item: any) => {
    setSelectedItem(item)
    setIsDeleteOpen(true)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="relative flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search items by name, code, barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          {branches.length > 0 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 font-semibold min-w-[160px]"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap shadow"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Item Details</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Stock Quantity</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Purchase Price</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sale Price</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">MRP</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tax Rate</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{item.name}</p>
                          {item.item_type && item.item_type !== 'PRODUCT' && (
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                              item.item_type === 'RAW_MATERIAL' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' :
                              item.item_type === 'SERVICE' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>
                              {item.item_type.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-0.5 text-xs text-zinc-500 font-mono">
                          <span>SKU: {item.code || '-'}</span>
                          {item.barcode && <span>• Barcode: {item.barcode}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      (stockMap[item.id] || 0) <= 0 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                        : (stockMap[item.id] || 0) <= (item.reorder_level || 5)
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {stockMap[item.id] || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono whitespace-nowrap text-zinc-500 font-medium">
                    {formatCurrency(item.purchase_price || 0)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(item.sale_price_1 || 0)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono whitespace-nowrap text-zinc-500">
                    {item.mrp ? formatCurrency(item.mrp) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300">
                      {item.tax_rate}% GST
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(item)}
                        className="text-xs px-2.5 py-1 text-blue-600 border border-blue-200 hover:bg-blue-50 dark:border-blue-900/50 dark:hover:bg-blue-950/20 rounded font-semibold transition-colors flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button 
                        onClick={() => openStockModal(item)}
                        className="text-xs px-2.5 py-1 text-green-600 border border-green-200 hover:bg-green-50 dark:border-green-900/50 dark:hover:bg-green-950/20 rounded font-semibold transition-colors flex items-center gap-1"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Stock
                      </button>
                      <button 
                        onClick={() => openDeleteModal(item)}
                        className="text-xs px-2.5 py-1 text-red-600 border border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/20 rounded font-semibold transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    No items found. Add your first inventory item!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Add New Item
            </h2>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Item Name *</label>
                    <input required name="name" type="text" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Item Type *</label>
                    <select name="item_type" defaultValue="PRODUCT" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100">
                      <option value="PRODUCT">Product</option>
                      <option value="RAW_MATERIAL">Raw Material</option>
                      <option value="SERVICE">Service</option>
                      <option value="COMPOSITE">Composite</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Item Code / SKU</label>
                  <input name="code" type="text" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm uppercase font-mono text-zinc-900 dark:text-zinc-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Barcode</label>
                  <input name="barcode" type="text" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">HSN Code</label>
                  <input name="hsn_code" type="text" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Tax Rate / GST (%)</label>
                  <select name="tax_rate" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100">
                    <option value="0">0% (Tax Free)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18" selected>18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Purchase Price (₹)</label>
                  <input required name="purchase_price" type="number" step="0.01" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono text-zinc-900 dark:text-zinc-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Sale Price (₹)</label>
                  <input required name="sale_price_1" type="number" step="0.01" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono text-zinc-900 dark:text-zinc-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">MRP (₹)</label>
                  <input name="mrp" type="number" step="0.01" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono text-zinc-900 dark:text-zinc-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Reorder Level</label>
                  <input name="reorder_level" type="number" defaultValue="0" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono text-zinc-900 dark:text-zinc-100" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">Cancel</button>
                <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow">
                  {loading ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-500" />
              Edit Item: {selectedItem.name}
            </h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Item Name *</label>
                    <input required name="name" type="text" defaultValue={selectedItem.name} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Item Type *</label>
                    <select name="item_type" defaultValue={selectedItem.item_type || "PRODUCT"} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100">
                      <option value="PRODUCT">Product</option>
                      <option value="RAW_MATERIAL">Raw Material</option>
                      <option value="SERVICE">Service</option>
                      <option value="COMPOSITE">Composite</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Item Code / SKU</label>
                  <input name="code" type="text" defaultValue={selectedItem.code || ''} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm uppercase font-mono text-zinc-900 dark:text-zinc-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Barcode</label>
                  <input name="barcode" type="text" defaultValue={selectedItem.barcode || ''} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">HSN Code</label>
                  <input name="hsn_code" type="text" defaultValue={selectedItem.hsn_code || ''} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Tax Rate / GST (%)</label>
                  <select name="tax_rate" defaultValue={selectedItem.tax_rate || 0} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100">
                    <option value="0">0% (Tax Free)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Purchase Price (₹)</label>
                  <input required name="purchase_price" type="number" step="0.01" defaultValue={((selectedItem.purchase_price || 0) / 100).toFixed(2)} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono text-zinc-900 dark:text-zinc-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Sale Price (₹)</label>
                  <input required name="sale_price_1" type="number" step="0.01" defaultValue={((selectedItem.sale_price_1 || 0) / 100).toFixed(2)} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono text-zinc-900 dark:text-zinc-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">MRP (₹)</label>
                  <input name="mrp" type="number" step="0.01" defaultValue={selectedItem.mrp ? ((selectedItem.mrp || 0) / 100).toFixed(2) : ''} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono text-zinc-900 dark:text-zinc-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Reorder Level</label>
                  <input name="reorder_level" type="number" defaultValue={selectedItem.reorder_level || 0} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono text-zinc-900 dark:text-zinc-100" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">Cancel</button>
                <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isStockOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Stock Adjustment: {selectedItem.name}
            </h2>
            <form onSubmit={handleStockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button 
                    type="button"
                    onClick={() => setStockType('IN')}
                    className={`py-2 px-4 text-sm font-bold border rounded-lg transition-colors ${stockType === 'IN' ? 'bg-green-600 text-white border-green-600' : 'bg-transparent text-zinc-600 border-zinc-300 dark:border-zinc-700'}`}
                  >
                    IN (Add Stock)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStockType('OUT')}
                    className={`py-2 px-4 text-sm font-bold border rounded-lg transition-colors ${stockType === 'OUT' ? 'bg-red-600 text-white border-red-600' : 'bg-transparent text-zinc-600 border-zinc-300 dark:border-zinc-700'}`}
                  >
                    OUT (Remove Stock)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Adjustment Quantity</label>
                <input required type="number" min="1" value={stockQty} onChange={e => setStockQty(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono text-zinc-900 dark:text-zinc-100" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Reason / Remarks</label>
                <input type="text" value={stockReason} onChange={e => setStockReason(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100" placeholder="e.g. Manual adjustment, Audited physical inventory" />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsStockOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">Cancel</button>
                <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow">
                  {loading ? 'Saving...' : 'Submit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Soft Delete Confirmation Modal (Shadcn Alert Dialog styled) */}
      {isDeleteOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Delete Inventory Item</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              Are you sure you want to delete <b>{selectedItem.name}</b>? This action will remove the item from library listings.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsDeleteOpen(false)} 
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
              <button 
                disabled={loading} 
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors shadow"
              >
                {loading ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
