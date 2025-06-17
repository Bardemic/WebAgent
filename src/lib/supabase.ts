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
      benchmarks: {
        Row: {
          id: string
          created_at: string
          user_id: string
          website_url: string
          task_description: string
          success: boolean
          execution_time_ms: number
          error_message: string | null
          browser_logs: Json | null
          screenshot_url: string | null
          agent_steps: Json | null
          llm_provider: string
          model: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          website_url: string
          task_description: string
          success: boolean
          execution_time_ms: number
          error_message?: string | null
          browser_logs?: Json | null
          screenshot_url?: string | null
          agent_steps?: Json | null
          llm_provider?: string
          model?: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          website_url?: string
          task_description?: string
          success?: boolean
          execution_time_ms?: number
          error_message?: string | null
          browser_logs?: Json | null
          screenshot_url?: string | null
          agent_steps?: Json | null
          llm_provider?: string
          model?: string
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
      [_ in never]: never
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