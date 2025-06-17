import { NextRequest, NextResponse } from 'next/server'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  try {
    // Create a fetch request to the Python backend SSE endpoint
    const response = await fetch(`${PYTHON_API_URL}/api/benchmark/stream/${sessionId}`, {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to connect to benchmark stream' },
        { status: response.status }
      )
    }

    // Create a readable stream that forwards the Python backend SSE data
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader()
        
        if (!reader) {
          controller.close()
          return
        }

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              
              if (done) {
                controller.close()
                break
              }
              
              controller.enqueue(value)
            }
          } catch (error) {
            console.error('SSE proxy error:', error)
            controller.error(error)
          }
        }

        pump()
      },
    })

    // Return the streaming response with proper SSE headers
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    })

  } catch (error) {
    console.error('Error proxying SSE stream:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 