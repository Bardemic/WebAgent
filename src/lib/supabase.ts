import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function createClientComponentClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      benchmark_sessions: {
        Row: {
          id: string
          session_id: string
          created_at: string
          updated_at: string
          user_id: string
          website_url: string
          task_description: string
          status: 'running' | 'completed' | 'failed' | 'cancelled'
          total_models: number
          completed_models: number
          successful_models: number
          start_time: string
          end_time: string | null
        }
        Insert: {
          id?: string
          session_id: string
          created_at?: string
          updated_at?: string
          user_id: string
          website_url: string
          task_description: string
          status?: 'running' | 'completed' | 'failed' | 'cancelled'
          total_models?: number
          completed_models?: number
          successful_models?: number
          start_time?: string
          end_time?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          website_url?: string
          task_description?: string
          status?: 'running' | 'completed' | 'failed' | 'cancelled'
          total_models?: number
          completed_models?: number
          successful_models?: number
          start_time?: string
          end_time?: string | null
        }
      }
      benchmarks: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          session_id: string
          session_identifier: string
          model_id: string
          model_name: string
          status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          success: boolean
          execution_time_ms: number
          start_time: string
          end_time: string | null
          error_message: string | null
          browser_logs: Json | null

          agent_steps: Json | null
          llm_provider: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          session_id: string
          session_identifier: string
          model_id: string
          model_name: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          success?: boolean
          execution_time_ms?: number
          start_time?: string
          end_time?: string | null
          error_message?: string | null
          browser_logs?: Json | null
          screenshot_url?: string | null
          agent_steps?: Json | null
          llm_provider?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          session_id?: string
          session_identifier?: string
          model_id?: string
          model_name?: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          success?: boolean
          execution_time_ms?: number
          start_time?: string
          end_time?: string | null
          error_message?: string | null
          browser_logs?: Json | null
          screenshot_url?: string | null
          agent_steps?: Json | null
          llm_provider?: string
        }
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
        }
      }
    }
    Views: {
      benchmark_session_summary: {
        Row: {
          id: string
          session_id: string
          created_at: string
          updated_at: string
          user_id: string
          website_url: string
          task_description: string
          status: 'running' | 'completed' | 'failed' | 'cancelled'
          total_models: number
          completed_models: number
          successful_models: number
          start_time: string
          end_time: string | null
          execution_time_ms: number
          model_results: Json
        }
      }
      benchmark_stats: {
        Row: {
          user_id: string
          total_sessions: number
          completed_sessions: number
          failed_sessions: number
          total_model_runs: number
          total_successful_runs: number
          avg_session_time_ms: number
          unique_websites_tested: number
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 