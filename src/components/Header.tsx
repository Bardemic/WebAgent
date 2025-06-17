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
    <header 
      className="border-b px-4 py-3 flex items-center justify-between"
      style={{ 
        background: 'var(--background)',
        borderColor: 'var(--border)'
      }}
    >
      <div className="flex items-center space-x-3">
        {showSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--foreground)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        
        <div className="flex items-center space-x-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--primary)' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            BenchMark My Website
          </h1>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {user ? (
          <>
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--secondary)' }}>
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                style={{ background: 'var(--primary)' }}
              >
                {user.email?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                {user.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm px-4 py-2"
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            onClick={onAuthClick}
            className="btn-primary text-sm px-4 py-2"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  )
} 