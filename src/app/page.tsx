'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { BenchmarkForm } from '@/components/BenchmarkForm'
import { BenchmarkResults } from '@/components/BenchmarkResults'
import { AuthSection } from '@/components/AuthSection'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Database } from '@/lib/supabase'

type Benchmark = Database['public']['Tables']['benchmarks']['Row']

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
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
    setRefreshing(true)
    try {
      const response = await fetch(`/api/benchmark?userId=${userId}&limit=20`)
      const data = await response.json()
      
      if (data.success) {
        setBenchmarks(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch benchmarks:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleBenchmarkComplete = (newBenchmark: any) => {
    setBenchmarks(prev => [newBenchmark, ...prev])
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-100">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent bg-gradient-primary rounded-full animate-pulse-glow mx-auto"></div>
            <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-white rounded-full"></div>
          </div>
          <p className="mt-4 text-lg font-medium text-gray-600 animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      
      <main className="flex-1">
        {!user ? (
          <div className="relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
              <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-tertiary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
              <div className="absolute top-40 left-1/2 w-80 h-80 bg-gradient-quaternary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{animationDelay: '4s'}}></div>
            </div>

            <div className="relative container mx-auto px-6 py-16">
              <div className="max-w-6xl mx-auto">
                {/* Hero Section */}
                <div className="text-center mb-20">
                  <div className="animate-shimmer inline-block">
                    <h1 className="text-7xl md:text-8xl font-black mb-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent leading-tight">
                      BenchMark
                      <br />
                      <span className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 bg-clip-text text-transparent">
                        My Website
                      </span>
                    </h1>
                  </div>
                  
                  <p className="text-2xl text-gray-600 mb-12 max-w-4xl mx-auto font-light leading-relaxed">
                    Discover how AI agents experience your website with 
                    <span className="font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> lightning-fast performance testing</span>, 
                    detailed analytics, and actionable insights.
                  </p>
                  
                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20">
                    <button className="btn-primary px-10 py-4 text-lg font-bold text-white rounded-full hover:scale-105 transition-all duration-300">
                      Start Testing Now
                    </button>
                    <button className="px-10 py-4 text-lg font-semibold text-gray-700 bg-white/70 hover:bg-white border border-white/30 rounded-full hover:shadow-xl transition-all duration-300">
                      Watch Demo
                    </button>
                  </div>
                </div>
                
                {/* Feature Cards */}
                <div className="grid md:grid-cols-3 gap-8 mb-20">
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                    <div className="relative glass rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                      <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Lightning Fast</h3>
                      <p className="text-gray-600 text-center leading-relaxed">Get comprehensive benchmark results in seconds with our optimized AI agent testing infrastructure.</p>
                    </div>
                  </div>
                  
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-secondary rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                    <div className="relative glass rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                      <div className="w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Rich Analytics</h3>
                      <p className="text-gray-600 text-center leading-relaxed">Deep insights including execution metrics, success rates, browser interactions, and detailed error analysis.</p>
                    </div>
                  </div>
                  
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-tertiary rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                    <div className="relative glass rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                      <div className="w-16 h-16 bg-gradient-tertiary rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Developer Friendly</h3>
                      <p className="text-gray-600 text-center leading-relaxed">Intuitive interface with powerful customization options for testing any website or web application.</p>
                    </div>
                  </div>
                </div>
                
                <AuthSection />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-primary rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float"></div>
              <div className="absolute bottom-20 left-10 w-72 h-72 bg-gradient-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float" style={{animationDelay: '3s'}}></div>
            </div>

            <div className="relative container mx-auto px-6 py-16">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                  <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Welcome back, {user.email?.split('@')[0]}! 🚀
                  </h1>
                  <p className="text-xl text-gray-600 font-light">
                    Ready to benchmark your website's AI compatibility? Let's dive in.
                  </p>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-12">
                  <div className="group">
                    <div className="glass rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 border border-white/20">
                      <div className="flex items-center mb-8">
                        <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                          </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">Run New Benchmark</h2>
                      </div>
                      <BenchmarkForm 
                        userId={user.id}
                        onBenchmarkComplete={handleBenchmarkComplete}
                      />
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="glass rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 border border-white/20">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gradient-secondary rounded-2xl flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <h2 className="text-3xl font-bold text-gray-900">Recent Results</h2>
                        </div>
                        <button
                          onClick={() => fetchBenchmarks(user.id)}
                          disabled={refreshing}
                          className="px-6 py-2.5 text-sm font-semibold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-gradient-primary rounded-full border border-indigo-200 hover:border-transparent transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                      </div>
                      <BenchmarkResults 
                        benchmarks={benchmarks}
                        loading={refreshing}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  )
}
