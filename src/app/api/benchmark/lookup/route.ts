import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionIdentifier = searchParams.get('session_identifier')
    const modelId = searchParams.get('model_id')

    if (!sessionIdentifier || !modelId) {
      return NextResponse.json(
        { error: 'Missing required parameters: session_identifier, model_id' },
        { status: 400 }
      )
    }

    // Get benchmarks for this session
    const benchmarks = await db.getBenchmarksBySessionIdentifier(sessionIdentifier)
    
    // Find the specific benchmark for this model
    const benchmark = benchmarks.find(b => b.model_id === modelId)
    
    if (!benchmark) {
      return NextResponse.json(
        { error: 'Benchmark not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      benchmark_id: benchmark.id,
      model_id: benchmark.model_id,
      model_name: benchmark.model_name,
      current_status: benchmark.status
    })

  } catch (error) {
    console.error('Lookup benchmark error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 