'use client'

import { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

interface HeaderProps {
  user: User | null
}

export function Header({ user }: HeaderProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/20 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg animate-pulse-glow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-secondary rounded-full animate-ping"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                BenchMark My Website
              </h1>
              <p className="text-sm text-gray-500 font-medium">AI Agent Performance Testing</p>
            </div>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 px-4 py-2 bg-white/50 rounded-full border border-white/20">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {user.email?.[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-6 py-2.5 text-sm font-semibold text-gray-700 hover:text-white bg-white/70 hover:bg-gradient-primary rounded-full border border-white/30 transition-all duration-300 hover:shadow-lg hover:scale-105"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
} 