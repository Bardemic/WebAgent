'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { ChatInterface } from '@/components/ChatInterface'
import { Sidebar } from '@/components/Sidebar'
import { AuthModal } from '@/components/AuthModal'
import { Header } from '@/components/Header'
import { Database } from '@/lib/supabase'

type Benchmark = Database['public']['Tables']['benchmarks']['Row']

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchBenchmarks(session.user.id)
          setShowAuthModal(false)
        } else {
          setBenchmarks([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  useEffect(() => {
    if (user) {
      fetchBenchmarks(user.id)
    }
  }, [user])

  const fetchBenchmarks = async (userId: string) => {
    try {
      const response = await fetch(`/api/benchmark?userId=${userId}&limit=50`)
      const data = await response.json()
      
      if (data.success) {
        setBenchmarks(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch benchmarks:', error)
    }
  }

  const handleBenchmarkComplete = (newBenchmark: any) => {
    setBenchmarks(prev => [newBenchmark, ...prev])
  }

  const handleNewChat = () => {
    // Reset chat state - this will be handled by ChatInterface
    setSelectedBenchmark(null)
  }

  const handleBenchmarkSelect = (benchmark: Benchmark) => {
    setSelectedBenchmark(benchmark)
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p style={{ color: 'var(--muted)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col">
        <Header user={null} onAuthClick={() => setShowAuthModal(true)} />
        
        {/* Landing Page */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <h1 className="text-5xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>
                BenchMark My Website
              </h1>
              <p className="text-xl mb-8" style={{ color: 'var(--muted)' }}>
                Test how AI agents interact with your website. Get detailed performance metrics and insights.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="p-6 rounded-2xl border" style={{ 
                borderColor: 'var(--border)',
                background: 'var(--secondary)'
              }}>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                  Fast Testing
                </h3>
                <p style={{ color: 'var(--muted)' }}>
                  Get results in seconds with our optimized AI testing infrastructure
                </p>
              </div>
              
              <div className="p-6 rounded-2xl border" style={{ 
                borderColor: 'var(--border)',
                background: 'var(--secondary)'
              }}>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                  Rich Analytics
                </h3>
                <p style={{ color: 'var(--muted)' }}>
                  Detailed insights with execution metrics and error analysis
                </p>
              </div>
              
              <div className="p-6 rounded-2xl border" style={{ 
                borderColor: 'var(--border)',
                background: 'var(--secondary)'
              }}>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                  Easy to Use
                </h3>
                <p style={{ color: 'var(--muted)' }}>
                  Simple chat interface for testing any website
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowAuthModal(true)}
              className="btn-primary text-lg px-8 py-3"
            >
              Get Started Free
            </button>
          </div>
        </div>
        
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </div>
    )
  }

  return (
    <div className="h-screen flex" style={{ background: 'var(--background)' }}>
      <Sidebar
        benchmarks={benchmarks}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={handleNewChat}
        onBenchmarkSelect={handleBenchmarkSelect}
        user={user}
      />
      
      <div className="flex-1 flex flex-col">
        <Header 
          user={user} 
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          showSidebarToggle={!sidebarOpen}
        />
        
        <ChatInterface
          user={user}
          onBenchmarkComplete={handleBenchmarkComplete}
          selectedBenchmark={selectedBenchmark}
          onClearSelection={() => setSelectedBenchmark(null)}
        />
      </div>
    </div>
  )
}
