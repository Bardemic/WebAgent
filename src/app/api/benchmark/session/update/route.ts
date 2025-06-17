import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      session_identifier, 
      status, 
      completed_models, 
      successful_models 
    } = body

    if (!session_identifier || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: session_identifier, status' },
        { status: 400 }
      )
    }

    // Get the session by session_identifier
    const benchmarks = await db.getBenchmarksBySessionIdentifier(session_identifier)
    
    if (benchmarks.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const sessionUuid = benchmarks[0].session_id

    // Update session status
    await db.updateSessionStatus(sessionUuid, status, {
      completed_models,
      successful_models
    })

    return NextResponse.json({
      success: true,
      message: 'Session status updated successfully'
    })

  } catch (error) {
    console.error('Update session status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 