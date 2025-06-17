import { createClient } from '@supabase/supabase-js'
import { Database } from './supabase'

export type BenchmarkStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type SessionStatus = 'running' | 'completed' | 'failed' | 'cancelled'

export type BenchmarkSession = {
  id: string
  session_id: string
  user_id: string
  website_url: string
  task_description: string
  status: SessionStatus
  total_models: number
  completed_models: number
  successful_models: number
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
}

export type Benchmark = {
  id: string
  session_id: string
  session_identifier: string
  user_id: string
  website_url: string
  task_description: string
  model_id: string
  model_name: string
  status: BenchmarkStatus
  success: boolean
  execution_time_ms: number
  start_time?: string
  end_time?: string
  error_message?: string
  browser_logs?: any[]
  agent_steps?: any[]
  final_result?: string
  llm_provider: string
  created_at: string
  updated_at: string
}

export type ModelResult = {
  model_id: string
  model_name: string
  status: BenchmarkStatus
  success: boolean
  execution_time_ms: number
  error_message?: string
  final_result?: string
  benchmark_id?: string
  start_time?: string
  end_time?: string
}

export type SessionSummary = {
  id: string
  session_id: string
  user_id: string
  website_url: string
  task_description: string
  status: SessionStatus
  total_models: number
  completed_models: number
  successful_models: number
  execution_time_ms: number
  model_results: ModelResult[]
  created_at: string
  updated_at: string
}

class DatabaseService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  async createBenchmarkSession(sessionData: Omit<BenchmarkSession, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const { data, error } = await this.supabase
      .from('benchmark_sessions')
      .insert({
        session_id: sessionData.session_id,
        user_id: sessionData.user_id,
        website_url: sessionData.website_url,
        task_description: sessionData.task_description,
        status: sessionData.status,
        total_models: sessionData.total_models,
        completed_models: sessionData.completed_models,
        successful_models: sessionData.successful_models,
        start_time: sessionData.start_time || new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  async createBenchmark(benchmarkData: Omit<Benchmark, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const { data, error } = await this.supabase
      .from('benchmarks')
      .insert({
        session_id: benchmarkData.session_id,
        session_identifier: benchmarkData.session_identifier,
        user_id: benchmarkData.user_id,
        website_url: benchmarkData.website_url,
        task_description: benchmarkData.task_description,
        model_id: benchmarkData.model_id,
        model_name: benchmarkData.model_name,
        status: benchmarkData.status,
        success: benchmarkData.success,
        execution_time_ms: benchmarkData.execution_time_ms,
        start_time: benchmarkData.start_time || new Date().toISOString(),
        error_message: benchmarkData.error_message,
        browser_logs: benchmarkData.browser_logs,
        agent_steps: benchmarkData.agent_steps,
        final_result: benchmarkData.final_result,
        llm_provider: benchmarkData.llm_provider
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  async updateBenchmarkStatus(
    benchmarkId: string,
    status: BenchmarkStatus,
    updates?: {
      success?: boolean
      execution_time_ms?: number
      error_message?: string
      browser_logs?: any[]
      agent_steps?: any[]
      final_result?: string
    }
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (updates) {
      Object.assign(updateData, updates)
    }

    if (status === 'completed' || status === 'failed') {
      updateData.end_time = new Date().toISOString()
    }

    const { error } = await this.supabase
      .from('benchmarks')
      .update(updateData)
      .eq('id', benchmarkId)

    if (error) throw error
  }

  async updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    updates?: {
      completed_models?: number
      successful_models?: number
    }
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (updates) {
      Object.assign(updateData, updates)
    }

    if (status === 'completed' || status === 'failed') {
      updateData.end_time = new Date().toISOString()
    }

    const { error } = await this.supabase
      .from('benchmark_sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (error) throw error
  }

  async getBenchmarksBySessionIdentifier(sessionIdentifier: string): Promise<Benchmark[]> {
    const { data, error } = await this.supabase
      .from('benchmarks')
      .select('*')
      .eq('session_identifier', sessionIdentifier)

    if (error) throw error
    return data || []
  }

  async getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
    // Get benchmark session
    const { data: session, error: sessionError } = await this.supabase
      .from('benchmark_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) return null

    // Get all benchmarks for this session
    const { data: benchmarks, error: benchmarksError } = await this.supabase
      .from('benchmarks')
      .select('*')
      .eq('session_id', sessionId)

    if (benchmarksError) throw benchmarksError

    const modelResults: ModelResult[] = (benchmarks || []).map(benchmark => ({
      model_id: benchmark.model_id,
      model_name: benchmark.model_name,
      status: benchmark.status as BenchmarkStatus,
      success: benchmark.success,
      execution_time_ms: benchmark.execution_time_ms,
      error_message: benchmark.error_message,
      benchmark_id: benchmark.id,
      start_time: benchmark.start_time,
      end_time: benchmark.end_time
    }))

    const totalExecutionTime = modelResults.reduce((sum, result) => sum + result.execution_time_ms, 0)

    return {
      id: session.id,
      session_id: session.session_id,
      user_id: session.user_id,
      website_url: session.website_url,
      task_description: session.task_description,
      status: session.status as SessionStatus,
      total_models: session.total_models,
      completed_models: session.completed_models,
      successful_models: session.successful_models,
      execution_time_ms: totalExecutionTime,
      model_results: modelResults,
      created_at: session.created_at,
      updated_at: session.updated_at
    }
  }

  async getUserSessions(userId: string, limit: number = 50): Promise<SessionSummary[]> {
    // Get benchmark sessions for user
    const { data: sessions, error: sessionsError } = await this.supabase
      .from('benchmark_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (sessionsError) throw sessionsError
    if (!sessions) return []

    // Get all benchmarks for these sessions
    const sessionIds = sessions.map(s => s.id)
    const { data: allBenchmarks, error: benchmarksError } = await this.supabase
      .from('benchmarks')
      .select('*')
      .in('session_id', sessionIds)

    if (benchmarksError) throw benchmarksError

    // Group benchmarks by session_id
    const benchmarksBySession = (allBenchmarks || []).reduce((acc, benchmark: any) => {
      if (!acc[benchmark.session_id]) acc[benchmark.session_id] = []
      acc[benchmark.session_id].push(benchmark)
      return acc
    }, {} as Record<string, any[]>)

    return sessions.map(session => {
      const sessionBenchmarks = benchmarksBySession[session.id] || []
      const modelResults: ModelResult[] = sessionBenchmarks.map((benchmark: any) => ({
        model_id: benchmark.model_id,
        model_name: benchmark.model_name,
        status: benchmark.status as BenchmarkStatus,
        success: benchmark.success,
        execution_time_ms: benchmark.execution_time_ms,
        error_message: benchmark.error_message,
        benchmark_id: benchmark.id,
        start_time: benchmark.start_time,
        end_time: benchmark.end_time
      }))

      const totalExecutionTime = modelResults.reduce((sum, result) => sum + result.execution_time_ms, 0)

      return {
        id: session.id,
        session_id: session.session_id,
        user_id: session.user_id,
        website_url: session.website_url,
        task_description: session.task_description,
        status: session.status as SessionStatus,
        total_models: session.total_models,
        completed_models: session.completed_models,
        successful_models: session.successful_models,
        execution_time_ms: totalExecutionTime,
        model_results: modelResults,
        created_at: session.created_at,
        updated_at: session.updated_at
      }
    })
  }
}

export const db = new DatabaseService() 