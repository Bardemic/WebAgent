'use client'

import { useState } from 'react'
import { validateUrl, normalizeUrl } from '@/lib/utils'
import { MultiModelBenchmarkGrid } from './MultiModelBenchmarkGrid'

interface BenchmarkFormProps {
  userId: string
  onBenchmarkComplete: (benchmark: any) => void
}

export function BenchmarkForm({ userId, onBenchmarkComplete }: BenchmarkFormProps) {
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [benchmarkStatus, setBenchmarkStatus] = useState<string>('idle')

  const commonTasks = [
    'Find contact information',
    'Navigate to login page',
    'Search for products',
    'Find account details',
    'Locate about page',
    'Find shopping cart',
    'Navigate to pricing page',
    'Find customer support'
  ]

  const handleStatusChange = (status: string) => {
    setBenchmarkStatus(status)
  }

  const handleCompletion = (data: any) => {
    setLoading(false)
    setSessionId(null)
    setBenchmarkStatus('idle')
    
    if (data.status === 'completed') {
      // Transform the completion data to match the expected format
      const modelResults = data.model_results || {}
      const executionTimes = Object.values(modelResults).map((r: any) => r?.execution_time_ms || 0)
      
      const benchmarkData = {
        id: `multi_${Date.now()}`, // Generate a composite ID
        success: data.successful_models > 0,
        executionTimeMs: executionTimes.length > 0 ? Math.max(...executionTimes) : 0,
        completedModels: data.completed_models,
        successfulModels: data.successful_models,
        modelResults: modelResults,
        errorMessage: data.error_message
      }
      
      onBenchmarkComplete(benchmarkData)
      setWebsiteUrl('')
      setTaskDescription('')
    } else {
      setError(data.error_message || 'Benchmark failed')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const normalizedUrl = normalizeUrl(websiteUrl)
      if (!validateUrl(normalizedUrl)) {
        throw new Error('Please enter a valid website URL')
      }

      if (!taskDescription.trim()) {
        throw new Error('Please enter a task description')
      }

      setBenchmarkStatus('starting')

      // Start the benchmark via Next.js API (which will call Python backend)
      const response = await fetch('/api/benchmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: normalizedUrl,
          taskDescription: taskDescription.trim(),
          userId: userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start benchmark')
      }

      if (data.success && data.session_id) {
        // Update the session ID with the one returned from the API
        setSessionId(data.session_id)
      }

      // The benchmark is now running in the background
      // The MultiModelBenchmarkGrid component will handle the streaming
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
      setSessionId(null)
      setBenchmarkStatus('idle')
    }
  }

  const isRunning = loading && sessionId !== null

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-2">
          <label htmlFor="website-url" className="block text-sm font-bold text-gray-800 mb-3">
            🌐 Website URL
          </label>
          <div className="relative">
            <input
              id="website-url"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              required
              disabled={isRunning}
              className="w-full px-5 py-4 bg-white/70 border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            Enter the website you want to test (e.g., your company website, e-commerce site, etc.)
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="task-description" className="block text-sm font-bold text-gray-800 mb-3">
            🎯 Task Description
          </label>
          <textarea
            id="task-description"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="Describe what the AI agent should try to do..."
            required
            disabled={isRunning}
            rows={4}
            className="w-full px-5 py-4 bg-white/70 border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500 hover:bg-white/90 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-2 font-medium">
            Be specific about what the AI should accomplish (e.g., "Find the contact form and fill it out")
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-800 mb-3">⚡ Common Tasks</p>
          <div className="flex flex-wrap gap-3">
            {commonTasks.map((task) => (
              <button
                key={task}
                type="button"
                onClick={() => setTaskDescription(task)}
                disabled={isRunning}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-all duration-300 hover:shadow-md hover:scale-105 border border-indigo-200 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {task}
              </button>
            ))}
          </div>
        </div>

        {/* Info about multi-model testing */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">🚀 Multi-Model Testing</h4>
              <p className="text-sm text-blue-700">
                This will test your website with 4 different OpenAI models simultaneously: 
                <span className="font-medium"> GPT-4o, GPT-4o Mini, GPT-4 Turbo, and GPT-3.5 Turbo</span>. 
                You'll see real-time results from all models in a side-by-side comparison.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50/80 border border-red-200/50 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-4 text-lg font-bold text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
              <span>
                {benchmarkStatus === 'starting' && 'Starting All Models...'}
                {benchmarkStatus === 'running' && 'Running 4 Models...'}
                {benchmarkStatus === 'completed' && 'Completing...'}
                {benchmarkStatus === 'failed' && 'Processing...'}
              </span>
            </div>
          ) : (
            <span className="relative z-10 flex items-center justify-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Start Multi-Model Benchmark
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </button>
      </form>

      {/* Multi-Model Real-time Grid */}
      <div className="space-y-4">
        <MultiModelBenchmarkGrid
          sessionId={sessionId}
          isActive={isRunning}
          onStatusChange={handleStatusChange}
          onCompletion={handleCompletion}
        />
      </div>
    </div>
  )
} 