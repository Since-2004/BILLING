'use client'

import { logout } from '@/src/app/auth/actions'
import { LogOut, User, Menu } from 'lucide-react'

export function Topbar({ user, onMenuClick }: { user: any; onMenuClick: () => void }) {
  return (
    <header className="flex-shrink-0 h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4 flex-1">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-650 dark:text-zinc-400 dark:hover:text-zinc-300 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
          title="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[180px] sm:max-w-none">
          {user.user_branch_access?.[0]?.branch?.name || 'Main Branch'}
        </h1>
      </div>
      
      <div className="ml-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{user.name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 capitalize">{user.role.toLowerCase()}</p>
          </div>
        </div>
        
        <form action={logout}>
          <button 
            type="submit"
            className="p-2 text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </form>
      </div>
    </header>
  )
}
