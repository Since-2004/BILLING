'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCompanyData, updateCompanyProfile, addBranch, updateBranch } from './actions'
import { toast } from 'sonner'
import { Sun, Moon, Monitor } from 'lucide-react'

export default function SettingsPage() {
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [logoUrl, setLogoUrl] = useState('')
  const [addBranchSignUrl, setAddBranchSignUrl] = useState('')
  const [editBranchSignUrl, setEditBranchSignUrl] = useState('')

  const [editCompany, setEditCompany] = useState(false)
  const [showAddBranch, setShowAddBranch] = useState(false)
  const [showBillingConfig, setShowBillingConfig] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any>(null)

  const [theme, setTheme] = useState<string>('system')

  useEffect(() => {
    if (editingBranch) {
      setEditBranchSignUrl(editingBranch.digital_sign_url || '')
    } else {
      setEditBranchSignUrl('')
    }
  }, [editingBranch])

  useEffect(() => {
    getCompanyData().then(data => {
      setCompany(data)
      setLogoUrl(data?.logo_url || '')
      setLoading(false)
    })
    if (typeof window !== 'undefined') {
      setTheme(localStorage.getItem('theme') || 'system')
    }
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else if (newTheme === 'light') {
      root.classList.remove('dark')
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    toast.success(`Theme set to ${newTheme.toUpperCase()}`)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event: any) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 300
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)
          setLogoUrl(compressedBase64)
          toast.success('Logo uploaded and optimized!')
        }
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleUpdateCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    const res = await updateCompanyProfile({ ...data, logo_url: logoUrl })
    if (res.success) {
      setCompany({ ...company, ...res.data })
      setEditCompany(false)
      toast.success('Company profile updated successfully!')
    } else {
      toast.error('Failed to update company profile')
    }
  }

  const handleAddBranchSignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event: any) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 300
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const compressedBase64 = canvas.toDataURL('image/png', 0.85)
          setAddBranchSignUrl(compressedBase64)
          toast.success('Signature uploaded and optimized!')
        }
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleEditBranchSignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event: any) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 300
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const compressedBase64 = canvas.toDataURL('image/png', 0.85)
          setEditBranchSignUrl(compressedBase64)
          toast.success('Signature uploaded and optimized!')
        }
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleAddBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    const res = await addBranch({ ...data, digital_sign_url: addBranchSignUrl })
    if (res.success) {
      setCompany({ ...company, branches: [...(company?.branches || []), res.data] })
      setShowAddBranch(false)
      setAddBranchSignUrl('')
      toast.success('Branch added successfully!')
    } else {
      toast.error('Failed to add branch')
    }
  }

  const handleUpdateBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingBranch) return
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    const res = await updateBranch(editingBranch.id, { ...data, digital_sign_url: editBranchSignUrl })
    if (res.success) {
      setCompany({
        ...company,
        branches: company.branches.map((b: any) => b.id === editingBranch.id ? res.data : b)
      })
      setEditingBranch(null)
      setEditBranchSignUrl('')
      toast.success('Branch details updated successfully!')
    } else {
      toast.error('Failed to update branch details')
    }
  }

  if (loading) return <div className="p-8 text-center">Loading settings...</div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500">Manage your company profile, branches, and system preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Company Profile */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Company Profile</h2>
            <button onClick={() => setEditCompany(!editCompany)} className="text-sm text-blue-600 hover:underline">
              {editCompany ? 'Cancel' : 'Edit'}
            </button>
          </div>
          
          {editCompany ? (
            <form onSubmit={handleUpdateCompany} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500">Company Name</label>
                <input type="text" name="name" defaultValue={company?.name} className="w-full px-3 py-2 border rounded text-sm bg-transparent" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">Owner's Name</label>
                <input type="text" name="owner_name" defaultValue={company?.owner_name} className="w-full px-3 py-2 border rounded text-sm bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">GSTIN</label>
                <input type="text" name="gstin" defaultValue={company?.gstin} className="w-full px-3 py-2 border rounded text-sm bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">Address</label>
                <textarea name="address" defaultValue={company?.address} className="w-full px-3 py-2 border rounded text-sm bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">Billing Mode</label>
                <select name="billing_mode" defaultValue={company?.billing_mode || 'BOTH'} className="w-full px-3 py-2 border rounded text-sm bg-transparent dark:bg-zinc-800">
                  <option value="BOTH">Tax and Non-Tax Billing (Selectable on POS)</option>
                  <option value="TAX">Tax Billing Only (GST mandatory)</option>
                  <option value="NON_TAX">Non-Tax Billing Only (No GST)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Company Logo</label>
                {logoUrl && (
                  <div className="mb-2 relative w-20 h-20 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-zinc-50 flex items-center justify-center">
                    <img src={logoUrl} alt="Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl hover:bg-red-700 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full text-xs text-zinc-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-zinc-800 dark:file:text-zinc-300"
                />
              </div>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm mt-2">Save</button>
            </form>
          ) : (
            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {company?.logo_url && (
                <div className="mb-4 w-20 h-20 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-zinc-50 flex items-center justify-center">
                  <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <p><strong className="text-zinc-900 dark:text-zinc-100">Name:</strong> {company?.name}</p>
              <p><strong className="text-zinc-900 dark:text-zinc-100">Owner's Name:</strong> {company?.owner_name || 'Not provided'}</p>
              <p><strong className="text-zinc-900 dark:text-zinc-100">GSTIN:</strong> {company?.gstin || 'Not provided'}</p>
              <p><strong className="text-zinc-900 dark:text-zinc-100">Address:</strong> {company?.address || 'Not provided'}</p>
              <p><strong className="text-zinc-900 dark:text-zinc-100">Billing Mode:</strong> {
                company?.billing_mode === 'TAX' ? 'Tax Billing Only (GST)' :
                company?.billing_mode === 'NON_TAX' ? 'Non-Tax Billing Only' :
                'Both Tax & Non-Tax Billing (Selectable)'
              }</p>
            </div>
          )}
        </div>

        {/* Branches */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Branches & Locations</h2>
            <button onClick={() => setShowAddBranch(!showAddBranch)} className="text-sm text-blue-600 hover:underline">
              {showAddBranch ? 'Cancel' : '+ Add Branch'}
            </button>
          </div>

          {showAddBranch && (
            <form onSubmit={handleAddBranch} className="space-y-3 mb-4 pb-4 border-b">
              <div>
                <label className="block text-xs font-medium text-zinc-500">Branch Name</label>
                <input type="text" name="name" placeholder="e.g. Main Warehouse" className="w-full px-3 py-2 border rounded text-sm bg-transparent" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">Branch Address</label>
                <textarea name="address" placeholder="Enter branch address" className="w-full px-3 py-2 border rounded text-sm bg-transparent" rows={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">GSTIN (Optional)</label>
                <input type="text" name="gstin" className="w-full px-3 py-2 border rounded text-sm bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">Mobile / Phone Number (Optional)</label>
                <input type="text" name="phone" placeholder="e.g. +91 9876543210" className="w-full px-3 py-2 border rounded text-sm bg-transparent" />
              </div>
              
              <div className="border-t pt-2 mt-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2">Bank Details</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500">Bank Name</label>
                    <input type="text" name="bank_name" placeholder="e.g. HDFC Bank" className="w-full px-3 py-2 border rounded text-sm bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500">Account Number</label>
                    <input type="text" name="bank_account_no" placeholder="e.g. 501002938192" className="w-full px-3 py-2 border rounded text-sm bg-transparent font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500">IFSC Code</label>
                    <input type="text" name="bank_ifsc" placeholder="e.g. HDFC0000123" className="w-full px-3 py-2 border rounded text-sm bg-transparent font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500">Bank Branch Name</label>
                    <input type="text" name="bank_branch" placeholder="e.g. MG Road Branch" className="w-full px-3 py-2 border rounded text-sm bg-transparent" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-2 mt-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2">Digital Signature</h4>
                {addBranchSignUrl && (
                  <div className="mb-2 relative w-36 h-16 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-zinc-50 flex items-center justify-center">
                    <img src={addBranchSignUrl} alt="Signature Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setAddBranchSignUrl('')}
                      className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl hover:bg-red-700 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAddBranchSignUpload}
                  className="w-full text-xs text-zinc-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-zinc-800 dark:file:text-zinc-300"
                />
              </div>

              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm mt-2">Create Branch</button>
            </form>
          )}

          <ul className="space-y-3">
            {company?.branches?.map((b: any) => (
              <li key={b.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-sm flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {b.name}
                    {b.is_default && <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Default</span>}
                  </div>
                  {b.address && <div className="text-xs text-zinc-500 mt-0.5">{b.address}</div>}
                  <div className="flex gap-3 text-xs text-zinc-500">
                    {b.phone && <div>Phone: {b.phone}</div>}
                    {b.gstin && <div>GST: {b.gstin}</div>}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5">
                    {b.bank_name && (
                      <div className="text-[10px] text-zinc-400 italic font-semibold">
                        Bank: {b.bank_name} | A/C: {b.bank_account_no} | IFSC: {b.bank_ifsc}
                      </div>
                    )}
                    {b.digital_sign_url && (
                      <div className="h-6 w-14 border border-zinc-200 dark:border-zinc-700 bg-white rounded overflow-hidden p-0.5 flex items-center justify-center" title="Digital Signature Uploaded">
                        <img src={b.digital_sign_url} alt="Sign" className="h-full w-full object-contain" />
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setEditingBranch(b)}
                  className="text-xs text-blue-600 hover:underline px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 font-semibold"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Theme Preferences */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Theme Preferences</h2>
            <p className="text-sm text-zinc-500 mb-4">Choose how Nucleus looks on your device.</p>
            
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => handleThemeChange('light')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                  theme === 'light' 
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600' 
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span>Light</span>
              </button>
              
              <button 
                onClick={() => handleThemeChange('dark')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                  theme === 'dark' 
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600' 
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span>Dark</span>
              </button>
              
              <button 
                onClick={() => handleThemeChange('system')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                  theme === 'system' 
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600' 
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Monitor className="w-5 h-5" />
                <span>System</span>
              </button>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 mt-4">System theme will automatically sync with your operating system settings.</p>
        </div>

        {/* Action Modules */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">System Settings</h2>
          
          <Link href="/settings/users" className="block w-full py-3 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium transition-colors text-sm text-center">
            User Management (RBAC) &rarr;
          </Link>
          
          <button onClick={() => setShowBillingConfig(true)} className="w-full py-3 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium transition-colors text-sm text-center">
            Billing & Invoice Configuration
          </button>
          
          <Link href="/settings/import" className="block w-full py-3 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium transition-colors text-sm text-center">
            Bulk Import Utilities &rarr;
          </Link>
        </div>

      </div>

      {/* Billing & Invoice Configuration Modal */}
      {showBillingConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Billing & Invoice Configuration</h3>
              <button onClick={() => setShowBillingConfig(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold text-lg">✕</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const data = Object.fromEntries(formData.entries())
              const res = await updateCompanyProfile({
                ...company,
                billing_mode: data.billing_mode,
                financial_year_start: data.financial_year_start ? new Date(data.financial_year_start as string).toISOString() : null,
                invoice_use_branch_name: !!formData.get('invoice_use_branch_name')
              })
              if (res.success) {
                setCompany({ ...company, ...res.data })
                setShowBillingConfig(false)
                toast.success('Billing preferences saved!')
              } else {
                toast.error('Failed to save billing preferences')
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Billing Mode Selection</label>
                <select name="billing_mode" defaultValue={company?.billing_mode || 'BOTH'} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent dark:bg-zinc-800">
                  <option value="BOTH">Tax and Non-Tax Billing (Selectable on POS)</option>
                  <option value="TAX">Tax Billing Only (GST mandatory)</option>
                  <option value="NON_TAX">Non-Tax Billing Only (No GST)</option>
                </select>
                <p className="text-[10px] text-zinc-400 mt-1">Configures whether the checkout system operates in Tax, Non-Tax, or both modes.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Financial Year Start</label>
                <input
                  type="date"
                  name="financial_year_start"
                  defaultValue={company?.financial_year_start ? new Date(company.financial_year_start).toISOString().split('T')[0] : ''}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent"
                />
                <p className="text-[10px] text-zinc-400 mt-1">Used to group and format sequential invoice numbering (INV/YY-YY/XXXXX).</p>
              </div>

              <div className="flex items-start gap-3 py-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <input
                  type="checkbox"
                  id="invoice_use_branch_name"
                  name="invoice_use_branch_name"
                  defaultChecked={company?.invoice_use_branch_name}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                />
                <div>
                  <label htmlFor="invoice_use_branch_name" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase cursor-pointer">
                    Use Branch Name on Invoices
                  </label>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    If checked, the branch name and details will be printed on the invoice footer and header instead of the company profile name.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl space-y-2 text-xs text-zinc-500">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">Active Rule System Summary:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Tax Mode:</strong> CGST/SGST splitting is computed automatically per line, and invoices are generated with a "TAX INVOICE" header.</li>
                  <li><strong>Non-Tax Mode:</strong> Invoices are titled "BILL", and all tax percentage & amount columns are hidden from the customer layout.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button type="button" onClick={() => setShowBillingConfig(false)} className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-md">
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingBranch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Edit Branch: {editingBranch.name}</h3>
              <button onClick={() => setEditingBranch(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold text-lg">✕</button>
            </div>
            <form onSubmit={handleUpdateBranch} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Branch Name</label>
                <input type="text" name="name" defaultValue={editingBranch.name} className="w-full px-3 py-2 border rounded text-sm bg-transparent" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Branch Address</label>
                <textarea name="address" defaultValue={editingBranch.address || ''} className="w-full px-3 py-2 border rounded text-sm bg-transparent" rows={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">GSTIN (Optional)</label>
                <input type="text" name="gstin" defaultValue={editingBranch.gstin || ''} className="w-full px-3 py-2 border rounded text-sm bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Mobile / Phone Number (Optional)</label>
                <input type="text" name="phone" defaultValue={editingBranch.phone || ''} placeholder="e.g. +91 9876543210" className="w-full px-3 py-2 border rounded text-sm bg-transparent" />
              </div>
              
              <div className="border-t pt-3 mt-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">Bank Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Bank Name</label>
                    <input type="text" name="bank_name" defaultValue={editingBranch.bank_name || ''} placeholder="e.g. HDFC Bank" className="w-full px-3 py-2 border rounded text-sm bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Account Number</label>
                    <input type="text" name="bank_account_no" defaultValue={editingBranch.bank_account_no || ''} placeholder="e.g. 501002938192" className="w-full px-3 py-2 border rounded text-sm bg-transparent font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">IFSC Code</label>
                    <input type="text" name="bank_ifsc" defaultValue={editingBranch.bank_ifsc || ''} placeholder="e.g. HDFC0000123" className="w-full px-3 py-2 border rounded text-sm bg-transparent font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Bank Branch Name</label>
                    <input type="text" name="bank_branch" defaultValue={editingBranch.bank_branch || ''} placeholder="e.g. MG Road Branch" className="w-full px-3 py-2 border rounded text-sm bg-transparent" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-3 mt-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">Digital Signature</h4>
                {editBranchSignUrl && (
                  <div className="mb-2 relative w-36 h-16 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-zinc-50 flex items-center justify-center">
                    <img src={editBranchSignUrl} alt="Signature Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setEditBranchSignUrl('')}
                      className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl hover:bg-red-700 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditBranchSignUpload}
                  className="w-full text-xs text-zinc-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-zinc-800 dark:file:text-zinc-300"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t">
                <button type="button" onClick={() => setEditingBranch(null)} className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-md">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
