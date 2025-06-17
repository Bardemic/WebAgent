# WebAgent Architecture

## Overview

This system has been redesigned with a clear separation of concerns:

- **Next.js Frontend & API**: Handles all UI, database operations, and session management
- **Python Backend**: Handles only browser automation and AI agent execution

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Frontend      │    │   Next.js API   │    │  Python Backend │
│   (React)       │────│   (Database)    │────│  (Browser Auto) │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                │
                         ┌─────────────────┐
                         │                 │
                         │   Supabase DB   │
                         │                 │
                         └─────────────────┘
```

## Components

### Next.js Application
- **Frontend**: React components for UI
- **API Routes**: 
  - `/api/benchmark` - Create new benchmark sessions, fetch user sessions
  - `/api/benchmark/[sessionId]` - Get detailed session results
  - `/api/benchmark/update` - Update benchmark status (called by Python backend)
- **Database Service**: `src/lib/database.ts` handles all Supabase operations

### Python Backend
- **Browser Automation**: Uses browseruse + LangChain for AI agents
- **Endpoints**:
  - `/api/benchmark/execute` - Execute benchmarks for all models
  - `/api/benchmark/stream/{session_id}` - Stream logs via SSE
  - `/api/health` - Health check
- **No Database Operations**: Calls Next.js API to update benchmark status

## Data Flow

### Creating a Benchmark
1. User submits form on frontend
2. Next.js API creates benchmark session in database
3. Next.js API creates individual benchmark records for each model
4. Next.js API calls Python backend to start execution
5. Python backend runs AI agents and calls back to update status

### Viewing Results
1. Frontend calls Next.js API to fetch sessions
2. Next.js API queries database directly
3. Results displayed in UI

### Real-time Updates
1. Python backend streams logs via SSE
2. Python backend updates database via Next.js API
3. Frontend can poll or use real-time subscriptions

## Benefits

1. **Clear Separation**: Database logic in one place (Next.js)
2. **Scalability**: Python backend is stateless for browser automation
3. **Maintainability**: Easier to maintain and debug
4. **Type Safety**: Shared TypeScript types between frontend and API
5. **Performance**: Direct database queries from Next.js

## Environment Variables

### Next.js (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXTJS_API_URL=http://localhost:3000
```

### Python Backend (.env)
```
OPENAI_API_KEY=your-openai-api-key
NEXTJS_API_URL=http://localhost:3000
```

## Running the System

1. **Database**: Ensure Supabase is configured with the schema
2. **Next.js**: `npm run dev` (runs on :3000)
3. **Python**: `cd python-backend && python main.py` (runs on :8000)

## API Reference

### Next.js API Routes

#### POST /api/benchmark
Create new benchmark session
```json
{
  "websiteUrl": "https://example.com",
  "taskDescription": "Find the contact page",
  "userId": "user-uuid"
}
```

#### GET /api/benchmark?userId=xxx
Get user's benchmark sessions

#### GET /api/benchmark/[sessionId]
Get detailed session results

#### POST /api/benchmark/update
Update benchmark status (internal use by Python backend)

### Python API Routes

#### POST /api/benchmark/execute
Execute benchmark for all models (called by Next.js)

#### GET /api/benchmark/stream/{session_id}
Stream benchmark logs via Server-Sent Events 