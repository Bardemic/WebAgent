'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BenchmarkDetailView } from '@/components/BenchmarkDetailView'
import { SessionSummary } from '@/lib/database'

type BenchmarkSession = SessionSummary

export default function BenchmarkDetailPage() {
  const params = useParams()
  const router = useRouter()
  const benchmarkId = params.benchmarkId as string
  
  const [benchmark, setBenchmark] = useState<BenchmarkSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBenchmark = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/benchmark/${benchmarkId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Benchmark not found')
        } else {
          setError('Failed to fetch benchmark details')
        }
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        setBenchmark(data.data)
      } else {
        setError('Invalid benchmark data received')
      }
    } catch (err) {
      console.error('Error fetching benchmark:', err)
      setError('Failed to load benchmark details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (benchmarkId) {
      fetchBenchmark()
    }
  }, [benchmarkId])

  const handleBack = () => {
    router.push('/')
  }

  const handleRefresh = () => {
    fetchBenchmark()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading benchmark details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Benchmarks
          </button>
        </div>
      </div>
    )
  }

  if (!benchmark) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Benchmark Not Found</h1>
          <p className="text-gray-600 mb-6">The requested benchmark could not be found.</p>
          <button
            onClick={handleBack}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Benchmarks
          </button>
        </div>
      </div>
    )
  }

  return <BenchmarkDetailView benchmark={benchmark} onBack={handleBack} onRefresh={handleRefresh} />
} 