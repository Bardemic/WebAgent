'use client'

import { useState, useEffect, useRef } from 'react'

interface LogEntry {
  timestamp: string
  level: string
  message: string
  data?: any
  model_id: string
}

interface ModelResult {
  model_id: string
  model_name: string
  success: boolean
  execution_time_ms: number
  error_message?: string
  screenshot_url?: string
  benchmark_id?: string
  created_at?: string
}

interface MultiModelBenchmarkGridProps {
  sessionId: string | null
  isActive: boolean
  onStatusChange?: (status: string) => void
  onCompletion?: (data: any) => void
}

const MODELS = [
  // OpenAI Models
  { id: "gpt-4o", name: "GPT-4o", color: "bg-blue-50 border-blue-200", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", color: "bg-green-50 border-green-200", provider: "openai" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", color: "bg-purple-50 border-purple-200", provider: "openai" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", color: "bg-orange-50 border-orange-200", provider: "openai" },
  // Anthropic Models
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", color: "bg-amber-50 border-amber-200", provider: "anthropic" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", color: "bg-pink-50 border-pink-200", provider: "anthropic" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus", color: "bg-indigo-50 border-indigo-200", provider: "anthropic" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", color: "bg-teal-50 border-teal-200", provider: "anthropic" }
]

export function MultiModelBenchmarkGrid({ sessionId, isActive, onStatusChange, onCompletion }: MultiModelBenchmarkGridProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [status, setStatus] = useState<string>('idle')
  const [isConnected, setIsConnected] = useState(false)
  const [modelResults, setModelResults] = useState<Record<string, ModelResult>>({})
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!sessionId || !isActive) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
        setIsConnected(false)
      }
      return
    }

    // Create SSE connection via Next.js API (which proxies to Python backend)
    const eventSource = new EventSource(`/api/benchmark/stream/${sessionId}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      console.log('SSE connection opened')
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'log':
            setLogs(prev => [...prev, data.data])
            break
          
          case 'status':
            setStatus(data.status)
            onStatusChange?.(data.status)
            break
          
          case 'completion':
            setModelResults(data.model_results || {})
            onCompletion?.(data)
            break
          
          case 'error':
            console.error('SSE Error:', data.message)
            break
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error)
      setIsConnected(false)
    }

    return () => {
      eventSource.close()
      setIsConnected(false)
    }
  }, [sessionId, isActive, onStatusChange, onCompletion])

  const getLogIcon = (level: string, message?: string) => {
    // Special icon for final results
    if (message?.includes('🎯 Final Result:')) {
      return '🏆'
    }
    
    switch (level) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'action': return '🎯'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  const getLogColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      case 'action': return 'text-blue-600'
      case 'info': return 'text-gray-600'
      default: return 'text-gray-700'
    }
  }

  const getModelLogs = (modelId: string) => {
    return logs.filter(log => log.model_id === modelId || log.model_id === 'system')
  }

  const getModelStatus = (modelId: string) => {
    const modelResult = modelResults[modelId]
    if (modelResult) {
      return modelResult.success ? 'completed' : 'failed'
    }
    
    const modelLogs = getModelLogs(modelId)
    const lastLog = modelLogs[modelLogs.length - 1]
    
    if (lastLog?.level === 'success' && lastLog.message.includes('completed')) {
      return 'completed'
    } else if (lastLog?.level === 'error') {
      return 'failed'
    } else if (modelLogs.length > 0) {
      return 'running'
    }
    
    return 'idle'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'running': return 'text-blue-600 bg-blue-100'
      case 'starting': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const ModelCard = ({ model }: { model: typeof MODELS[0] }) => {
    const modelLogs = getModelLogs(model.id)
    const modelStatus = getModelStatus(model.id)
    const modelResult = modelResults[model.id]

    return (
      <div className={`${model.color} rounded-xl border-2 p-4 h-64 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              modelStatus === 'completed' ? 'bg-green-400' :
              modelStatus === 'failed' ? 'bg-red-400' :
              modelStatus === 'running' ? 'bg-blue-400 animate-pulse' :
              'bg-gray-400'
            }`}></div>
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-gray-900">{model.name}</h3>
              <span className={`text-xs ${
                model.provider === 'openai' ? 'text-blue-600' : 'text-amber-600'
              }`}>
                {model.provider === 'openai' ? 'OpenAI' : 'Anthropic'}
              </span>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(modelStatus)}`}>
            {modelStatus.charAt(0).toUpperCase() + modelStatus.slice(1)}
          </div>
        </div>

        {/* Logs Container */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {modelLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse mx-auto mb-2"></div>
                <p className="text-xs text-gray-500">Waiting...</p>
              </div>
            </div>
          ) : (
            modelLogs.slice(-5).map((log, index) => {
              const isFinalResult = log.message?.includes('🎯 Final Result:')
              return (
                <div 
                  key={index} 
                  className={`flex items-start space-x-2 p-2 rounded-lg transition-colors duration-200 ${
                    isFinalResult 
                      ? 'bg-gradient-to-r from-green-100 to-blue-100 border border-green-300' 
                      : 'bg-white/50'
                  }`}
                >
                  <span className="text-sm flex-shrink-0">
                    {getLogIcon(log.level, log.message)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-tight ${
                      isFinalResult ? 'text-gray-800 font-medium' : 'text-gray-700'
                    }`}>
                      {isFinalResult ? log.message.replace('🎯 Final Result: ', '') : log.message}
                    </p>
                    <span className="text-xs text-gray-400">
                      {log.timestamp.split(' ')[1]}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer with results */}
        {modelResult && (
          <div className="mt-3 pt-3 border-t border-gray-200/50">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${modelResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {modelResult.success ? 'Success' : 'Failed'}
              </span>
              <span className="text-gray-500">
                {modelResult.execution_time_ms}ms
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="h-96 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">Start a benchmark to see all 4 models in action</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <h3 className="text-lg font-semibold text-gray-900">Multi-Model Benchmark</h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>
              {Object.keys(modelResults).length}/8 completed
            </span>
            <span>
              {Object.values(modelResults).filter(r => r.success).length} successful
            </span>
          </div>
        </div>

        {isActive && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
              <span className="text-sm text-gray-600">Running benchmarks on all models...</span>
            </div>
          </div>
        )}
      </div>

      {/* 4x2 Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MODELS.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>
    </div>
  )
} 