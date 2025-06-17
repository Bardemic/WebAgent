'use client'

interface Message {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  metadata?: any
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const getMessageIcon = (type: string, level?: string) => {
    if (type === 'user') {
      return (
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
          style={{ background: 'var(--primary)' }}
        >
          U
        </div>
      )
    }
    
    if (type === 'system') {
      return (
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--muted)' }}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    }
    
    // AI message
    if (level) {
      switch (level) {
        case 'success':
          return (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )
        case 'error':
          return (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )
        case 'warning':
          return (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-yellow-500">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          )
        case 'action':
          return (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          )
        default:
          return (
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent)' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          )
      }
    }
    
    return (
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: 'var(--accent)' }}
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
    )
  }

  const getMessageStyle = (type: string) => {
    if (type === 'user') {
      return 'message-user ml-12'
    }
    return 'message-ai'
  }

  return (
    <div className="message-animate">
      <div className="flex items-start space-x-3">
        {getMessageIcon(message.type, message.metadata?.level)}
        <div className={getMessageStyle(message.type)}>
          <div className="flex-1">
            <p style={{ color: 'var(--foreground)' }} className="whitespace-pre-wrap">
              {message.content}
            </p>
            
            {message.metadata?.data && (
              <details className="mt-2">
                <summary 
                  className="text-xs cursor-pointer hover:underline"
                  style={{ color: 'var(--muted)' }}
                >
                  View details
                </summary>
                <pre 
                  className="mt-1 text-xs p-2 rounded overflow-x-auto"
                  style={{ 
                    background: 'var(--secondary)',
                    color: 'var(--foreground)'
                  }}
                >
                  {JSON.stringify(message.metadata.data, null, 2)}
                </pre>
              </details>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <span 
                className="text-xs"
                style={{ color: 'var(--muted)' }}
              >
                {message.timestamp.toLocaleTimeString()}
              </span>
              {message.metadata?.level && (
                <span 
                  className={`text-xs px-2 py-1 rounded-full ${
                    message.metadata.level === 'success' ? 'status-success' :
                    message.metadata.level === 'error' ? 'status-error' :
                    message.metadata.level === 'warning' ? 'status-pending' :
                    'status-running'
                  }`}
                >
                  {message.metadata.level.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 