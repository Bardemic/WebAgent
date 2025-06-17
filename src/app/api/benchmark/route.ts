import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeUrl, validateUrl } from '@/lib/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { websiteUrl, taskDescription, userId, llmProvider = 'openai', model = 'gpt-4o' } = body

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

    // Call the Python BrowserUse API
    const pythonResponse = await fetch(`${PYTHON_API_URL}/api/benchmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        website_url: normalizedUrl,
        task_description: taskDescription,
        user_id: userId,
        llm_provider: llmProvider,
        model: model
      })
    })

    if (!pythonResponse.ok) {
      const errorData = await pythonResponse.json().catch(() => ({}))
      throw new Error(errorData.detail?.message || errorData.message || 'Python API call failed')
    }

    const result = await pythonResponse.json()
    
    return NextResponse.json(result)

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
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }

    // Fetch benchmarks for the user
    const { data: benchmarks, error } = await supabase
      .from('benchmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch benchmarks' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('benchmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countError) {
      console.error('Count error:', countError)
    }

    return NextResponse.json({
      success: true,
      data: benchmarks,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      }
    })

  } catch (error) {
    console.error('Fetch benchmarks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 