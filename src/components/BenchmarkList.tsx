'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SessionSummary } from '@/lib/database'

type BenchmarkSession = SessionSummary

interface BenchmarkListProps {
  benchmarks: BenchmarkSession[]
  onNewBenchmark: () => void
}

export function BenchmarkList({ benchmarks, onNewBenchmark }: BenchmarkListProps) {
  const router = useRouter()
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const getBenchmarkTitle = (benchmark: BenchmarkSession, index: number) => {
    // Use a more descriptive title based on the task or a simple numbered format
    return `benchmark ${benchmarks.length - index}`
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Benchmarks</h1>
          <p className="text-gray-600">Select a benchmark to view detailed results</p>
        </div>
        <button
          onClick={onNewBenchmark}
          className="btn-primary px-6 py-3 text-sm font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Benchmark
          </span>
        </button>
      </div>

      {/* Benchmarks List */}
      <div className="space-y-4">
        {benchmarks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No benchmarks yet</h3>
            <p className="text-gray-600 mb-4">Create your first benchmark to get started</p>
            <button
              onClick={onNewBenchmark}
              className="btn-primary px-6 py-3 text-sm font-medium rounded-xl"
            >
              Create Benchmark
            </button>
          </div>
        ) : (
          benchmarks.map((benchmark, index) => (
            <div
              key={benchmark.id}
              onClick={() => router.push(`/benchmark/${benchmark.id}`)}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {getBenchmarkTitle(benchmark, index)}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        benchmark.status === 'completed' && benchmark.successful_models > 0 ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <span className={`text-xs font-medium ${
                        benchmark.status === 'completed' && benchmark.successful_models > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {benchmark.status === 'completed' && benchmark.successful_models > 0 ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      <span className="font-medium">Task:</span> {benchmark.task_description}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Website:</span> {benchmark.website_url}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {formatTimeAgo(benchmark.created_at)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round(benchmark.execution_time_ms / 1000)}s duration
                  </div>
                  <div className="mt-2">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 