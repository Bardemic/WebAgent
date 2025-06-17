import { NextRequest, NextResponse } from 'next/server'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  // Get the AbortController to handle client disconnection
  const abortController = new AbortController()
  
  // Handle client disconnect
  request.signal.addEventListener('abort', () => {
    abortController.abort()
  })

  try {
    // Create a fetch request to the Python backend SSE endpoint
    const response = await fetch(`${PYTHON_API_URL}/api/benchmark/stream/${sessionId}`, {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      signal: abortController.signal,
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
              // Check if client disconnected
              if (abortController.signal.aborted) {
                break
              }
              
              const { done, value } = await reader.read()
              
              if (done) {
                if (controller.desiredSize !== null) {
                  controller.close()
                }
                break
              }
              
              // Check if controller is still open before enqueueing
              if (controller.desiredSize !== null) {
                controller.enqueue(value)
              } else {
                // Controller is closed, stop the pump
                break
              }
            }
          } catch (error) {
            // Don't log abort errors as they're expected when client disconnects
            if (error instanceof Error && error.name !== 'AbortError') {
              console.error('SSE proxy error:', error)
            } else if (!(error instanceof Error)) {
              console.error('SSE proxy error:', error)
            }
            
            // Only call error if controller is still open and it's not an abort
            if (controller.desiredSize !== null && !(error instanceof Error && error.name === 'AbortError')) {
              controller.error(error)
            }
          } finally {
            // Clean up the reader
            try {
              reader.releaseLock()
            } catch (e) {
              // Ignore errors when releasing lock
            }
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