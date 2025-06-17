'use client'

import { useState, useEffect } from 'react'
import { MultiModelBenchmarkGrid } from './MultiModelBenchmarkGrid'
import { SessionSummary, ModelResult } from '@/lib/database'

type BenchmarkSession = SessionSummary

interface BenchmarkDetailViewProps {
  benchmark: BenchmarkSession
  onBack: () => void
}

export function BenchmarkDetailView({ benchmark, onBack }: BenchmarkDetailViewProps) {
  const [statusMessages, setStatusMessages] = useState<string[]>([
    'Benchmark initialized',
    'Loading website...',
    'Starting AI models...',
    'Processing tasks...'
  ])

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

  // Extract model data from the benchmark session results
  const isSuccessful = benchmark.status === 'completed' && benchmark.successful_models > 0
  
  // Get model results directly from benchmark session
  const models: ModelResult[] = benchmark.model_results || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Benchmark Details</h1>
              <p className="text-gray-600 text-sm">{formatTimeAgo(benchmark.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isSuccessful ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isSuccessful ? 'Success' : 'Failed'}
            </div>
          </div>
        </div>
        
        {/* Benchmark Info */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Task Description</p>
            <p className="text-gray-900 font-medium">{benchmark.task_description}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Website URL</p>
            <p className="text-gray-900 font-medium">{benchmark.website_url}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="grid lg:grid-cols-3 gap-8 h-full">
          {/* Models Grid - 2/3 width */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Model Results</h2>
            <div className="grid md:grid-cols-2 gap-6 h-full">
              {models.map((model: ModelResult, index: number) => (
                <div
                  key={model.model_id}
                  className="bg-white rounded-xl border-2 border-gray-200 p-6 flex flex-col"
                >
                  {/* Model Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        model.status === 'completed' ? 'bg-green-400' :
                        model.status === 'failed' ? 'bg-red-400' :
                        'bg-gray-400'
                      }`}></div>
                      <h3 className="font-semibold text-gray-900">
                        benchmark {index + 1}
                      </h3>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(model.status)}`}>
                      {model.status}
                    </div>
                  </div>

                  {/* Model Info */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 font-medium">{model.model_name}</p>
                  </div>

                  {/* Results */}
                  <div className="flex-1 bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600">
                        {model.success ? 
                          '✅ Task completed successfully' : 
                          '❌ Task failed to complete'
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        Duration: {Math.round(model.execution_time_ms / 1000)}s
                      </div>
                      {model.success && (
                        <div className="text-xs text-green-600">
                          🎯 Target element found and interacted with
                        </div>
                      )}
                      {model.error_message && (
                        <div className="text-xs text-red-600">
                          💥 Error: {model.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Updates - 1/3 width */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Status Updates</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
              <div className="space-y-4">
                {statusMessages.map((message, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm text-gray-700">{message}</p>
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(benchmark.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Final status */}
                                 <div className="border-t border-gray-200 pt-4">
                   <div className="flex items-start space-x-3">
                     <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                       isSuccessful ? 'bg-green-400' : 'bg-red-400'
                     }`}></div>
                     <div>
                       <p className="text-sm font-medium text-gray-900">
                         {isSuccessful ? 'Benchmark completed successfully' : 'Benchmark failed'}
                       </p>
                       <p className="text-xs text-gray-500">
                         {formatTimeAgo(benchmark.created_at)}
                       </p>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 