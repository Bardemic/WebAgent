'use client'

import { useState, useEffect, useRef } from 'react'

interface LogEntry {
  timestamp: string
  level: string
  message: string
  data?: any
}

interface BrowserLogsProps {
  sessionId: string | null
  isActive: boolean
  onStatusChange?: (status: string) => void
  onCompletion?: (data: any) => void
}

export function BrowserLogs({ sessionId, isActive, onStatusChange, onCompletion }: BrowserLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [status, setStatus] = useState<string>('idle')
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [logs])

  useEffect(() => {
    if (!sessionId || !isActive) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
        setIsConnected(false)
      }
      return
    }

    // Create SSE connection
    const eventSource = new EventSource(`http://localhost:8000/api/benchmark/stream/${sessionId}`)
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

  const getLogIcon = (level: string) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'running': return 'text-blue-600'
      case 'starting': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const clearLogs = () => {
    setLogs([])
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
          <p className="text-gray-500 font-medium">Start a benchmark to see real-time logs</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-96 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <h3 className="text-lg font-semibold text-gray-900">Browser Logs</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)} bg-gray-100`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </span>
          <button
            onClick={clearLogs}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-80">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-indigo-600 mx-auto mb-3"></div>
              <p className="text-gray-500 text-sm">Waiting for logs...</p>
            </div>
          </div>
        ) : (
          logs.map((log, index) => (
            <div 
              key={index} 
              className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
            >
              <span className="text-lg flex-shrink-0 mt-0.5">
                {getLogIcon(log.level)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`text-sm font-medium ${getLogColor(log.level)}`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-400">
                    {log.timestamp}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {log.message}
                </p>
                {log.data && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      View data
                    </summary>
                    <pre className="mt-1 text-xs text-gray-600 bg-white p-2 rounded border overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer */}
      {isActive && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
            <span className="text-sm text-gray-600">Streaming live logs...</span>
          </div>
        </div>
      )}
    </div>
  )
} 