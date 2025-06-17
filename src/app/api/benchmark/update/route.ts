import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      benchmark_id, 
      status, 
      success, 
      execution_time_ms, 
      error_message, 
      browser_logs, 
      agent_steps,
      final_result
    } = body

    if (!benchmark_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: benchmark_id, status' },
        { status: 400 }
      )
    }

    // Update benchmark in database
    await db.updateBenchmarkStatus(benchmark_id, status, {
      success,
      execution_time_ms,
      error_message,
      browser_logs,
      agent_steps,
      final_result
    })

    return NextResponse.json({
      success: true,
      message: 'Benchmark updated successfully'
    })

  } catch (error) {
    console.error('Update benchmark error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 