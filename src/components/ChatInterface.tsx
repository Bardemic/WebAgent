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
  const [llmProvider, setLlmProvider] = useState('openai')
  const [model, setModel] = useState('gpt-4o')
  const [showSettings, setShowSettings] = useState(false)
  
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
    
    // Set the model info from the benchmark
    setLlmProvider(benchmark.llm_provider || 'openai')
    setModel(benchmark.model || 'gpt-4o')

    // Create a fresh message array for this benchmark only
    const benchmarkMessages: Message[] = []

    // Add header message
    benchmarkMessages.push({
      id: `header_${benchmark.id}`,
      type: 'system',
      content: `Viewing benchmark from ${new Date(benchmark.created_at).toLocaleDateString()} at ${new Date(benchmark.created_at).toLocaleTimeString()}`,
      timestamp: new Date(benchmark.created_at)
    })

    // Add model info message
    benchmarkMessages.push({
      id: `model_${benchmark.id}`,
      type: 'system',
      content: `Used model: ${benchmark.llm_provider || 'openai'} - ${benchmark.model || 'gpt-4o'}`,
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

  const handleProviderChange = (provider: string) => {
    setLlmProvider(provider)
    if (provider === 'openai') {
      setModel('gpt-4o')
    } else if (provider === 'anthropic') {
      setModel('claude-3-5-sonnet-20241022')
    }
  }

  const getModelDisplayName = (provider: string, model: string) => {
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

    // Add model information
    addMessage({
      type: 'system',
      content: `Using ${getModelDisplayName(llmProvider, model)} for this test`
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
          llm_provider: llmProvider,
          model: model,
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
        llmProvider: llmProvider,
        model: model
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
      {/* Chat Header with Model Selection */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-sm font-medium text-slate-700">Ready to test</span>
            </div>
            <div className="h-4 w-px bg-slate-300"></div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-sm text-slate-600">
                {getModelDisplayName(llmProvider, model)}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200"
            disabled={isRunning}
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="max-w-4xl mx-auto mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">AI Model Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Provider
                </label>
                <select
                  value={llmProvider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  disabled={isRunning}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={isRunning}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {llmProvider === 'openai' ? (
                    <>
                      <option value="gpt-4o">GPT-4o (Recommended)</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </>
                  ) : (
                    <>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recommended)</option>
                      <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-slate-800">
                {selectedBenchmark ? 'Loading benchmark details...' : 'Ready to test your website?'}
              </h2>
              <p className="text-slate-600">
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
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-slate-600">AI is thinking...</span>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 p-6 bg-white">
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
                <span className="text-sm font-medium text-slate-600">
                  Quick tasks:
                </span>
                {commonTasks.map((task) => (
                  <button
                    key={task}
                    type="button"
                    onClick={() => setTaskDescription(task)}
                    className="text-xs px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
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
              <p className="text-slate-600">
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