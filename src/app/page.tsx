'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { BenchmarkList } from '@/components/BenchmarkList'
import { BenchmarkForm } from '@/components/BenchmarkForm'
import { AuthModal } from '@/components/AuthModal'
import { Header } from '@/components/Header'
import { SessionSummary } from '@/lib/database'

type BenchmarkSession = SessionSummary

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [benchmarks, setBenchmarks] = useState<BenchmarkSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [currentView, setCurrentView] = useState<'list' | 'form'>('list')
  
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
    setCurrentView('list') // Return to list after completion
  }

  const handleNewBenchmark = () => {
    setCurrentView('form')
  }

  const handleBackToList = () => {
    setCurrentView('list')
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-blue-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Header user={null} onAuthClick={() => setShowAuthModal(true)} />
        
        {/* Landing Page */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-6xl font-bold mb-6 text-gradient">
                BenchMark My Website
              </h1>
              <p className="text-xl mb-8 text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Test how AI agents interact with your website. Get detailed performance metrics and insights to improve your user experience.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="card p-8 hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-800">
                  Lightning Fast
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Get comprehensive test results in seconds with our optimized AI testing infrastructure
                </p>
              </div>
              
              <div className="card p-8 hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-800">
                  Rich Analytics
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Detailed insights with execution metrics, error analysis, and actionable recommendations
                </p>
              </div>
              
              <div className="card p-8 hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-800">
                  Easy to Use
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Simple chat interface makes testing any website intuitive and accessible
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-primary text-lg px-10 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Get Started Free
                </span>
              </button>
              <p className="text-sm text-slate-500">No credit card required • Start testing immediately</p>
            </div>
          </div>
        </div>
        
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </div>
    )
  }

  // Render different views based on current state
  const renderCurrentView = () => {
    switch (currentView) {
      case 'list':
        return (
          <BenchmarkList
            benchmarks={benchmarks}
            onNewBenchmark={handleNewBenchmark}
          />
        )
      case 'form':
        return (
          <div className="max-w-4xl mx-auto p-8">
            <div className="flex items-center space-x-4 mb-8">
              <button
                onClick={handleBackToList}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Create New Benchmark</h1>
            </div>
            <BenchmarkForm
              userId={user!.id}
              onBenchmarkComplete={handleBenchmarkComplete}
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header 
        user={user} 
        onAuthClick={() => setShowAuthModal(true)}
      />
      
      {renderCurrentView()}
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  )
}
