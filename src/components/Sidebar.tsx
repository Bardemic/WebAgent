'use client'

import { User } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'

type Benchmark = Database['public']['Tables']['benchmarks']['Row']

interface SidebarProps {
  benchmarks: Benchmark[]
  isOpen: boolean
  onToggle: () => void
  onNewChat: () => void
  onBenchmarkSelect: (benchmark: Benchmark) => void
  user: User
}

export function Sidebar({ benchmarks, isOpen, onToggle, onNewChat, onBenchmarkSelect, user }: SidebarProps) {
  const getModelDisplayName = (provider: string, model: string) => {
    if (!provider || !model) return 'Unknown'
    
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

  if (!isOpen) {
    return (
      <div className="w-12 bg-slate-50 border-r border-slate-200 flex flex-col items-center py-4">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors mb-4 text-slate-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-slate-800">
            History
          </h2>
        </div>
        
        <button
          onClick={onNewChat}
          className="btn-primary w-full py-2.5 flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Benchmark</span>
        </button>
      </div>

      {/* Benchmark History */}
      <div className="flex-1 overflow-y-auto">
        {benchmarks.length === 0 ? (
          <div className="p-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm text-slate-600">
              No benchmarks yet
            </p>
            <p className="text-xs mt-1 text-slate-500">
              Start your first test!
            </p>
          </div>
        ) : (
          <div className="p-2">
            {benchmarks.map((benchmark) => (
              <div
                key={benchmark.id}
                className="p-3 mb-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => onBenchmarkSelect(benchmark)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    benchmark.success ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-slate-500">
                    {formatDuration(benchmark.execution_time_ms)}
                  </span>
                </div>
                
                <h3 className="text-sm font-medium mb-1 line-clamp-2 text-slate-800">
                  {benchmark.task_description}
                </h3>
                
                <p className="text-xs line-clamp-1 mb-2 text-slate-600">
                  {benchmark.website_url}
                </p>
                
                {/* Model information */}
                <div className="mb-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {getModelDisplayName(benchmark.llm_provider || 'openai', benchmark.model || 'gpt-4o')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    benchmark.success 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {benchmark.success ? 'Success' : 'Failed'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(benchmark.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-medium text-white">
            {user.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-slate-800">
              {user.email}
            </p>
            <p className="text-xs text-slate-600">
              {benchmarks.length} {benchmarks.length === 1 ? 'benchmark' : 'benchmarks'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 