'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  FileText, 
  Settings,
  Building2,
  Boxes,
  Tag,
  ChevronDown,
  ChevronRight,
  Receipt,
  X
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Billing', href: '/billing', icon: ShoppingCart },
]

const mainNavItems = [
  { name: 'Purchases', href: '/purchase', icon: Package },
  { name: 'Inventory', href: '/inventory', icon: Boxes },
  { name: 'CRM', href: '/crm', icon: Users },
  { name: 'Promotions', href: '/promotions', icon: Tag },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Master Data', href: '/masters', icon: Building2 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const invoiceSubItems = [
  { name: 'Sales Invoices', href: '/invoices?tab=sales' },
  { name: 'Purchase Bills', href: '/invoices?tab=purchase' },
  { name: 'Sale Returns', href: '/invoices?tab=sales-returns' },
  { name: 'Purchase Returns', href: '/invoices?tab=purchase-returns' },
  { name: 'Quotations', href: '/invoices?tab=quotations' },
  { name: 'Daily Entries', href: '/invoices?tab=daily-entries' },
  { name: 'Monthly Register', href: '/billing/daily-entry/monthly?view=detailed' },
  { name: 'Consolidated Invoices', href: '/invoices?tab=consolidated' },
]

export function Sidebar({ 
  user,
  open,
  setOpen
}: { 
  user: any
  open?: boolean
  setOpen?: (open: boolean) => void
}) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  
  const isInvoiceRoute = pathname.startsWith('/invoices') || pathname.startsWith('/billing/daily-entry')
  const [invoicesOpen, setInvoicesOpen] = useState(isInvoiceRoute)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isInvoiceRoute) {
      setInvoicesOpen(true)
    }
  }, [pathname, isInvoiceRoute])

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (setOpen) {
      setOpen(false)
    }
  }, [pathname])

  const sidebarContent = (
    <div className="flex flex-col w-full bg-zinc-900 border-r border-zinc-800 h-full relative">
      <div className="flex flex-col h-0 flex-1">
        <div className="flex items-center justify-between h-16 flex-shrink-0 px-4 bg-zinc-950">
          <span className="text-xl font-bold text-white truncate">
            {user.company?.name || 'ERP'}
          </span>
          {setOpen && (
            <button
              onClick={() => setOpen(false)}
              className="md:hidden flex items-center justify-center h-8 w-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none"
              title="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {/* First part of main navigation */}
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive 
                      ? 'bg-zinc-800 text-white' 
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 flex-shrink-0 h-5 w-5
                      ${isActive ? 'text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-300'}
                    `}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}

            {/* Collapsible Invoices Block */}
            <div>
              <button
                onClick={() => setInvoicesOpen(!invoicesOpen)}
                className={`
                  w-full group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-colors
                  ${isInvoiceRoute 
                    ? 'text-white bg-zinc-900/50 border border-zinc-800' 
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center">
                  <Receipt
                    className={`
                      mr-3 flex-shrink-0 h-5 w-5
                      ${isInvoiceRoute ? 'text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-300'}
                    `}
                    aria-hidden="true"
                  />
                  <span>Invoices</span>
                </div>
                {invoicesOpen ? (
                  <ChevronDown className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
                )}
              </button>
              
              {invoicesOpen && (
                <div className="mt-1 pl-4 space-y-1">
                  {invoiceSubItems.map((subItem) => {
                    const searchStr = mounted ? (typeof window !== 'undefined' ? window.location.search : '') : ''
                    const isActive = pathname + searchStr === subItem.href || 
                                     (subItem.href.startsWith('/invoices') && pathname === '/invoices' && 
                                      searchStr.includes(subItem.href.split('?')[1] || '')) ||
                                     (subItem.href.startsWith('/billing/daily-entry/monthly') && pathname === '/billing/daily-entry/monthly' &&
                                      searchStr.includes(subItem.href.split('?')[1] || ''))
                    
                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={`
                          group flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                          ${isActive
                            ? 'bg-zinc-800 text-blue-400 font-semibold'
                            : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
                          }
                        `}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-650 mr-2.5 group-hover:bg-zinc-400 transition-colors" />
                        {subItem.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Rest of the main navigation */}
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive 
                      ? 'bg-zinc-800 text-white' 
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 flex-shrink-0 h-5 w-5
                      ${isActive ? 'text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-300'}
                    `}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0 h-full">
        <div className="w-64 h-full">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity duration-300 ease-out"
            onClick={() => setOpen?.(false)}
          />
          {/* Drawer Body */}
          <div className="relative flex-1 flex flex-col max-w-[280px] w-full bg-zinc-900 shadow-xl animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
