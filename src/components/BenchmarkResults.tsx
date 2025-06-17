'use client'

import { useState } from 'react'
import { formatDuration } from '@/lib/utils'
import { Database } from '@/lib/supabase'

type Benchmark = Database['public']['Tables']['benchmarks']['Row']

interface BenchmarkResultsProps {
  benchmarks: Benchmark[]
  loading: boolean
}

export function BenchmarkResults({ benchmarks, loading }: BenchmarkResultsProps) {
  const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null)

  const getModelDisplayName = (provider: string, model: string) => {
    if (!provider || !model) return 'Unknown Model'
    
    if (provider === 'openai') {
      switch (model) {
        case 'gpt-4o': return 'GPT-4o'
        case 'gpt-4o-mini': return 'GPT-4o Mini'
        case 'gpt-4-turbo': return 'GPT-4 Turbo'
        case 'gpt-3.5-turbo': return 'GPT-3.5 Turbo'
        default: return model
      }
    } else if (provider === 'anthropic') {
      switch (model) {
        case 'claude-3-5-sonnet-20241022': return 'Claude 3.5 Sonnet'
        case 'claude-3-haiku-20240307': return 'Claude 3 Haiku'
        case 'claude-3-opus-20240229': return 'Claude 3 Opus'
        default: return model
      }
    }
    return model
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (benchmarks.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-500">No benchmarks yet</p>
        <p className="text-sm text-gray-400 mt-1">Run your first test to see results here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {benchmarks.map((benchmark) => (
        <div
          key={benchmark.id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
          onClick={() => setSelectedBenchmark(benchmark)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  benchmark.success ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className={`text-sm font-medium ${
                  benchmark.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {benchmark.success ? 'Success' : 'Failed'}
                </span>
                <span className="text-sm text-gray-500">
                  {formatDuration(benchmark.execution_time_ms)}
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {getModelDisplayName(benchmark.llm_provider || 'openai', benchmark.model || 'gpt-4o')}
                </span>
              </div>
              
              <p className="text-sm font-medium text-gray-900 truncate mb-1">
                {benchmark.task_description}
              </p>
              
              <p className="text-xs text-gray-500 truncate">
                {benchmark.website_url}
              </p>
              
              <p className="text-xs text-gray-400 mt-2">
                {new Date(benchmark.created_at).toLocaleString()}
              </p>
            </div>
            
            <svg className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}

      {/* Modal for detailed view */}
      {selectedBenchmark && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Benchmark Details
                </h3>
                <button
                  onClick={() => setSelectedBenchmark(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedBenchmark.success ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <span className={`text-sm font-medium ${
                        selectedBenchmark.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {selectedBenchmark.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">AI Model</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                        {getModelDisplayName(selectedBenchmark.llm_provider || 'openai', selectedBenchmark.model || 'gpt-4o')}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({selectedBenchmark.llm_provider || 'openai'})
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Execution Time</h4>
                    <p className="text-sm text-gray-900">
                      {formatDuration(selectedBenchmark.execution_time_ms)}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Website URL</h4>
                    <a
                      href={selectedBenchmark.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 break-all"
                    >
                      {selectedBenchmark.website_url}
                    </a>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Task Description</h4>
                    <p className="text-sm text-gray-900">
                      {selectedBenchmark.task_description}
                    </p>
                  </div>

                  {selectedBenchmark.error_message && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Error Message</h4>
                      <p className="text-sm text-red-600 bg-red-50 p-3 rounded">
                        {selectedBenchmark.error_message}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Timestamp</h4>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedBenchmark.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedBenchmark.screenshot_url && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Screenshot</h4>
                      <img
                        src={selectedBenchmark.screenshot_url}
                        alt="Benchmark screenshot"
                        className="w-full rounded border border-gray-200"
                      />
                    </div>
                  )}

                  {selectedBenchmark.browser_logs && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Browser Logs</h4>
                      <div className="bg-gray-50 rounded p-3 max-h-64 overflow-auto">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(selectedBenchmark.browser_logs, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 