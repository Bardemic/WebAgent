'use client'

import { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

interface HeaderProps {
  user: User | null
  onSidebarToggle?: () => void
  showSidebarToggle?: boolean
  onAuthClick?: () => void
}

export function Header({ user, onSidebarToggle, showSidebarToggle = false, onAuthClick }: HeaderProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-4">
        {showSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            BenchMark
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-700">
                {user.email}
              </p>
              <p className="text-xs text-slate-500">
                Signed in
              </p>
            </div>
            
            <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={onAuthClick}
            className="btn-primary px-6 py-2 text-sm font-semibold"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  )
} 