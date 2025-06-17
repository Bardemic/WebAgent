'use client'

import { useState, useRef, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { validateUrl, normalizeUrl } from '@/lib/utils'
import { ChatMessage } from './ChatMessage'
import { Database } from '@/lib/supabase'

type Benchmark = Database['public']['Tables']['benchmarks']['Row']

interface ChatInterfaceProps {
  user: User
  onBenchmarkComplete: (benchmark: any) => void
  selectedBenchmark?: Benchmark | null
  onClearSelection?: () => void
}

interface Message {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  metadata?: any
}

export function ChatInterface({ user, onBenchmarkComplete, selectedBenchmark, onClearSelection }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [step, setStep] = useState<'url' | 'task' | 'running' | 'idle'>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const taskInputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load selected benchmark details
  useEffect(() => {
    if (selectedBenchmark) {
      loadBenchmarkDetails(selectedBenchmark)
    }
  }, [selectedBenchmark])

  const loadBenchmarkDetails = async (benchmark: Benchmark) => {
    // Completely reset state and show only this benchmark's details
    setWebsiteUrl(benchmark.website_url)
    setTaskDescription(benchmark.task_description)
    setStep('idle')
    setIsRunning(false)
    setSessionId(null)

    // Create a fresh message array for this benchmark only
    const benchmarkMessages: Message[] = []

    // Add header message
    benchmarkMessages.push({
      id: `header_${benchmark.id}`,
      type: 'system',
      content: `Viewing benchmark from ${new Date(benchmark.created_at).toLocaleDateString()} at ${new Date(benchmark.created_at).toLocaleTimeString()}`,
      timestamp: new Date(benchmark.created_at)
    })

    // Add original request
    benchmarkMessages.push({
      id: `url_${benchmark.id}`,
      type: 'user',
      content: `Website: ${benchmark.website_url}`,
      timestamp: new Date(benchmark.created_at)
    })

    benchmarkMessages.push({
      id: `task_${benchmark.id}`,
      type: 'user',
      content: `Task: ${benchmark.task_description}`,
      timestamp: new Date(benchmark.created_at)
    })

    // Add result message
    if (benchmark.success) {
      benchmarkMessages.push({
        id: `result_${benchmark.id}`,
        type: 'ai',
        content: `✅ Benchmark completed successfully in ${benchmark.execution_time_ms}ms! The AI agent was able to complete the task.`,
        timestamp: new Date(benchmark.created_at),
        metadata: {
          benchmark: {
            id: benchmark.id,
            success: benchmark.success,
            executionTimeMs: benchmark.execution_time_ms,
            createdAt: benchmark.created_at,
            screenshotUrl: benchmark.screenshot_url
          }
        }
      })
    } else {
      benchmarkMessages.push({
        id: `result_${benchmark.id}`,
        type: 'ai',
        content: `❌ Benchmark failed: ${benchmark.error_message || 'Unknown error'}`,
        timestamp: new Date(benchmark.created_at),
        metadata: {
          benchmark: {
            id: benchmark.id,
            success: benchmark.success,
            executionTimeMs: benchmark.execution_time_ms,
            createdAt: benchmark.created_at,
            errorMessage: benchmark.error_message
          }
        }
      })
    }

    // Try to fetch detailed logs if available
    try {
      const response = await fetch(`/api/benchmark/${benchmark.id}/logs`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.logs && data.logs.length > 0) {
          data.logs.forEach((log: any, index: number) => {
            benchmarkMessages.push({
              id: `log_${benchmark.id}_${index}`,
              type: 'ai',
              content: log.message,
              timestamp: new Date(log.timestamp || benchmark.created_at),
              metadata: { level: log.level, data: log.data, fromHistory: true }
            })
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch benchmark logs:', error)
    }

    // Set the complete message array at once - this replaces everything
    setMessages(benchmarkMessages)
  }

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!websiteUrl.trim()) return

    const normalizedUrl = normalizeUrl(websiteUrl.trim())
    if (!validateUrl(normalizedUrl)) {
      addMessage({
        type: 'system',
        content: 'Please enter a valid website URL (e.g., https://example.com)'
      })
      return
    }

    setWebsiteUrl(normalizedUrl)
    addMessage({
      type: 'user',
      content: `Website: ${normalizedUrl}`
    })

    addMessage({
      type: 'ai',
      content: 'Great! Now, what would you like me to test on this website? Please describe the task you want the AI agent to perform.'
    })

    setStep('task')
    setTimeout(() => {
      taskInputRef.current?.focus()
    }, 100)
  }

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskDescription.trim()) return

    addMessage({
      type: 'user',
      content: `Task: ${taskDescription.trim()}`
    })

    addMessage({
      type: 'ai',
      content: 'Perfect! I\'ll start testing your website now. This may take a few moments...'
    })

    setStep('running')
    setIsRunning(true)
    startBenchmark()
  }

  const startBenchmark = async () => {
    try {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)

      // Add progress message
      addMessage({
        type: 'system',
        content: 'Starting AI agent...'
      })

      const response = await fetch('http://localhost:8000/api/benchmark/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          website_url: websiteUrl,
          task_description: taskDescription.trim(),
          user_id: user.id,
          llm_provider: 'openai',
          model: 'gpt-4o',
          session_id: newSessionId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start benchmark')
      }

      // Start SSE for real-time updates
      const eventSource = new EventSource(`http://localhost:8000/api/benchmark/stream/${newSessionId}`)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'log':
              addMessage({
                type: 'ai',
                content: data.data.message,
                metadata: { level: data.data.level, data: data.data.data }
              })
              break
            
            case 'status':
              addMessage({
                type: 'system',
                content: `Status: ${data.status}`
              })
              break
            
            case 'completion':
              eventSource.close()
              handleBenchmarkComplete(data)
              break
            
            case 'error':
              eventSource.close()
              addMessage({
                type: 'system',
                content: `Error: ${data.message}`
              })
              setIsRunning(false)
              setStep('idle')
              break
          }
        } catch (error) {
          console.error('Failed to parse SSE data:', error)
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        addMessage({
          type: 'system',
          content: 'Connection error. Please try again.'
        })
        setIsRunning(false)
        setStep('idle')
      }

    } catch (error) {
      addMessage({
        type: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'An error occurred'}`
      })
      setIsRunning(false)
      setStep('idle')
    }
  }

  const handleBenchmarkComplete = (data: any) => {
    setIsRunning(false)
    setSessionId(null)
    setStep('idle')

    if (data.success) {
      addMessage({
        type: 'ai',
        content: `✅ Benchmark completed successfully in ${data.execution_time_ms}ms! The AI agent was able to complete the task.`
      })
      
      onBenchmarkComplete({
        id: data.benchmark_id,
        success: data.success,
        executionTimeMs: data.execution_time_ms,
        errorMessage: data.error_message,
        screenshotUrl: data.screenshot_url,
        createdAt: data.created_at,
        llmProvider: 'openai',
        model: 'gpt-4o'
      })
    } else {
      addMessage({
        type: 'ai',
        content: `❌ Benchmark failed: ${data.error_message || 'Unknown error'}`
      })
    }

    addMessage({
      type: 'ai',
      content: 'Would you like to test another website or task?'
    })
  }

  const handleNewTest = () => {
    // Clear everything and return to fresh state
    setMessages([])
    setWebsiteUrl('')
    setTaskDescription('')
    setStep('idle')
    setIsRunning(false)
    setSessionId(null)
    onClearSelection?.()
  }

  const commonTasks = [
    'Find contact information',
    'Navigate to login page', 
    'Search for products',
    'Find pricing information',
    'Locate about page',
    'Find customer support'
  ]

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                {selectedBenchmark ? 'Loading benchmark details...' : 'Ready to test your website?'}
              </h2>
              <p style={{ color: 'var(--muted)' }}>
                {selectedBenchmark 
                  ? 'Please wait while we load the benchmark details'
                  : 'Enter a website URL to get started with AI agent testing'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isRunning && (
                <div className="flex items-center space-x-2 p-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>AI is thinking...</span>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t p-6" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto">
          {step === 'idle' && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="flex space-x-4">
                <input
                  ref={urlInputRef}
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="Enter website URL (e.g., https://example.com)"
                  className="input-field flex-1"
                  disabled={isRunning}
                />
                <button
                  type="submit"
                  disabled={!websiteUrl.trim() || isRunning}
                  className="btn-primary px-6 py-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          )}

          {step === 'task' && (
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <textarea
                ref={taskInputRef}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Describe what you want the AI agent to do..."
                className="input-field resize-none"
                rows={3}
                disabled={isRunning}
              />
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                  Quick tasks:
                </span>
                {commonTasks.map((task) => (
                  <button
                    key={task}
                    type="button"
                    onClick={() => setTaskDescription(task)}
                    className="text-xs px-3 py-1 rounded-full border hover:bg-gray-50 transition-colors"
                    style={{ 
                      borderColor: 'var(--border)',
                      color: 'var(--muted)'
                    }}
                    disabled={isRunning}
                  >
                    {task}
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep('idle')}
                  className="btn-secondary px-4 py-2"
                  disabled={isRunning}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!taskDescription.trim() || isRunning}
                  className="btn-primary px-6 py-2 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Start Test</span>
                </button>
              </div>
            </form>
          )}

          {step === 'running' && (
            <div className="text-center py-4">
              <p style={{ color: 'var(--muted)' }}>
                AI agent is running... Please wait while the test completes.
              </p>
            </div>
          )}

          {messages.length > 0 && step === 'idle' && !isRunning && (
            <div className="text-center">
              <button
                onClick={handleNewTest}
                className="btn-primary px-6 py-2"
              >
                Start New Test
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 