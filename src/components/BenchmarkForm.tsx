'use client'

import { useState } from 'react'
import { validateUrl, normalizeUrl } from '@/lib/utils'

interface BenchmarkFormProps {
  userId: string
  onBenchmarkComplete: (benchmark: any) => void
}

export function BenchmarkForm({ userId, onBenchmarkComplete }: BenchmarkFormProps) {
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [llmProvider, setLlmProvider] = useState('openai')
  const [model, setModel] = useState('gpt-4o')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      const response = await fetch('/api/benchmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: normalizedUrl,
          taskDescription: taskDescription.trim(),
          userId,
          llmProvider,
          model,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run benchmark')
      }

      if (data.success) {
        onBenchmarkComplete(data.data)
        setWebsiteUrl('')
        setTaskDescription('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
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
            className="w-full px-5 py-4 bg-white/70 border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500 hover:bg-white/90"
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
          rows={4}
          className="w-full px-5 py-4 bg-white/70 border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500 hover:bg-white/90 resize-none"
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
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-all duration-300 hover:shadow-md hover:scale-105 border border-indigo-200 hover:border-indigo-300"
            >
              {task}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="llm-provider" className="block text-sm font-bold text-gray-800 mb-3">
            🤖 AI Provider
          </label>
          <div className="relative">
            <select
              id="llm-provider"
              value={llmProvider}
              onChange={(e) => {
                setLlmProvider(e.target.value)
                if (e.target.value === 'openai') {
                  setModel('gpt-4o')
                } else if (e.target.value === 'anthropic') {
                  setModel('claude-3-5-sonnet-20241022')
                }
              }}
              className="w-full px-5 py-4 bg-white/70 border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-gray-900 hover:bg-white/90 appearance-none cursor-pointer"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="model" className="block text-sm font-bold text-gray-800 mb-3">
            🧠 Model
          </label>
          <div className="relative">
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-5 py-4 bg-white/70 border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-gray-900 hover:bg-white/90 appearance-none cursor-pointer"
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
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
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
            <span>Running Benchmark...</span>
          </div>
        ) : (
          <span className="relative z-10 flex items-center justify-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Start Benchmark
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </button>
    </form>
  )
} 