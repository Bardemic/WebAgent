import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    // Fetch session summary from database
    const sessionSummary = await db.getSessionSummary(sessionId)
    
    if (!sessionSummary) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: sessionSummary
    })
    
  } catch (error) {
    console.error('Error fetching benchmark session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()
    const { result } = body

    if (!result || (result !== 'good' && result !== 'bad')) {
      return NextResponse.json(
        { error: 'Invalid result. Must be "good" or "bad"' },
        { status: 400 }
      )
    }

    // Update the benchmark result
    await db.updateBenchmarkResult(sessionId, result === 'good')

    return NextResponse.json({
      success: true,
      message: 'Benchmark result updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating benchmark result:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 