import { NextRequest, NextResponse } from 'next/server'
import { normalizeUrl, validateUrl } from '@/lib/utils'
import { db } from '@/lib/database'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

// Models to run benchmarks with
const MODELS_TO_RUN = [
  // OpenAI Models
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
  // Anthropic Models
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic' }
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { websiteUrl, taskDescription, userId } = body

    // Validation
    if (!websiteUrl || !taskDescription || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: websiteUrl, taskDescription, userId' },
        { status: 400 }
      )
    }

    const normalizedUrl = normalizeUrl(websiteUrl)
    if (!validateUrl(normalizedUrl)) {
      return NextResponse.json(
        { error: 'Invalid website URL' },
        { status: 400 }
      )
    }

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create benchmark session in database
    const sessionUuid = await db.createBenchmarkSession({
      session_id: sessionId,
      user_id: userId,
      website_url: normalizedUrl,
      task_description: taskDescription,
      status: 'running',
      total_models: MODELS_TO_RUN.length,
      completed_models: 0,
      successful_models: 0,
      start_time: new Date().toISOString()
    })

    // Create benchmark records for each model
    const benchmarkIds = await Promise.all(
      MODELS_TO_RUN.map(model => 
        db.createBenchmark({
          session_id: sessionUuid,
          session_identifier: sessionId,
          user_id: userId,
          website_url: normalizedUrl,
          task_description: taskDescription,
          model_id: model.id,
          model_name: model.name,
          status: 'pending',
          success: false,
          execution_time_ms: 0,
          llm_provider: model.provider
        })
      )
    )

    // Start benchmark execution in Python backend
    const pythonResponse = await fetch(`${PYTHON_API_URL}/api/benchmark/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        website_url: normalizedUrl,
        task_description: taskDescription
      })
    })

    if (!pythonResponse.ok) {
      // If Python backend fails, mark session as failed
      await db.updateBenchmarkStatus(sessionUuid, 'failed', {
        error_message: 'Failed to start benchmark execution'
      })
      
      const errorData = await pythonResponse.json().catch(() => ({}))
      throw new Error(errorData.detail?.message || errorData.message || 'Python API call failed')
    }

    const result = await pythonResponse.json()
    
    return NextResponse.json({
      success: true,
      session_id: sessionId,
      session_uuid: sessionUuid,
      message: 'Benchmark started for all models'
    })

  } catch (error) {
    console.error('Benchmark error:', error)
    
    // If Python API is not available, provide helpful error
    if (error instanceof Error && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'Python BrowserUse API not available',
          details: 'Please make sure the Python backend is running on port 8000',
          hint: 'Run: cd python-backend && pip install -r requirements.txt && python main.py'
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }

    // Fetch benchmark sessions from database
    const sessions = await db.getUserSessions(userId, limit)
    
    return NextResponse.json({
      success: true,
      data: sessions
    })

  } catch (error) {
    console.error('Fetch benchmark sessions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 