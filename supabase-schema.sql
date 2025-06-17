-- Enable RLS (Row Level Security)
-- This will be enforced on all tables

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles - users can only see and edit their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create benchmark_sessions table to group multi-model benchmarks
CREATE TABLE IF NOT EXISTS benchmark_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL, -- Human-readable session identifier
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  website_url TEXT NOT NULL,
  task_description TEXT NOT NULL,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  total_models INTEGER DEFAULT 4,
  completed_models INTEGER DEFAULT 0,
  successful_models INTEGER DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  end_time TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT website_url_length CHECK (char_length(website_url) >= 10),
  CONSTRAINT task_description_length CHECK (char_length(task_description) >= 5),
  CONSTRAINT completed_models_valid CHECK (completed_models >= 0 AND completed_models <= total_models),
  CONSTRAINT successful_models_valid CHECK (successful_models >= 0 AND successful_models <= completed_models)
);

-- Enable RLS on benchmark_sessions
ALTER TABLE benchmark_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for benchmark_sessions
CREATE POLICY "Users can view own benchmark sessions" ON benchmark_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own benchmark sessions" ON benchmark_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own benchmark sessions" ON benchmark_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own benchmark sessions" ON benchmark_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create benchmarks table (modified to support individual model results)
CREATE TABLE IF NOT EXISTS benchmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES benchmark_sessions(id) ON DELETE CASCADE NOT NULL,
  session_identifier TEXT NOT NULL, -- References benchmark_sessions.session_id for easier queries
  model_id TEXT NOT NULL, -- e.g., 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'
  model_name TEXT NOT NULL, -- e.g., 'GPT-4o', 'GPT-4o Mini', 'GPT-4 Turbo', 'GPT-3.5 Turbo'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  success BOOLEAN NOT NULL DEFAULT false,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  end_time TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  browser_logs JSONB,
  screenshot_url TEXT,
  agent_steps JSONB,
  llm_provider TEXT DEFAULT 'openai',
  
  -- Ensure each model appears only once per session
  CONSTRAINT unique_model_per_session UNIQUE (session_id, model_id),
  CONSTRAINT execution_time_positive CHECK (execution_time_ms >= 0)
);

-- Enable RLS on benchmarks
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;

-- Create policies for benchmarks - users can only see and manage their own benchmarks
CREATE POLICY "Users can view own benchmarks" ON benchmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own benchmarks" ON benchmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own benchmarks" ON benchmarks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own benchmarks" ON benchmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS benchmark_sessions_user_id_idx ON benchmark_sessions(user_id);
CREATE INDEX IF NOT EXISTS benchmark_sessions_created_at_idx ON benchmark_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS benchmark_sessions_status_idx ON benchmark_sessions(status);
CREATE INDEX IF NOT EXISTS benchmark_sessions_session_id_idx ON benchmark_sessions(session_id);

CREATE INDEX IF NOT EXISTS benchmarks_user_id_idx ON benchmarks(user_id);
CREATE INDEX IF NOT EXISTS benchmarks_session_id_idx ON benchmarks(session_id);
CREATE INDEX IF NOT EXISTS benchmarks_session_identifier_idx ON benchmarks(session_identifier);
CREATE INDEX IF NOT EXISTS benchmarks_model_id_idx ON benchmarks(model_id);
CREATE INDEX IF NOT EXISTS benchmarks_created_at_idx ON benchmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS benchmarks_success_idx ON benchmarks(success);
CREATE INDEX IF NOT EXISTS benchmarks_status_idx ON benchmarks(status);

-- Create storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('benchmark-screenshots', 'benchmark-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload screenshots" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'benchmark-screenshots' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view screenshots" ON storage.objects
  FOR SELECT USING (bucket_id = 'benchmark-screenshots');

CREATE POLICY "Users can update their screenshots" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'benchmark-screenshots' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their screenshots" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'benchmark-screenshots' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update benchmark_sessions stats when benchmarks are updated
CREATE OR REPLACE FUNCTION update_benchmark_session_stats()
RETURNS trigger AS $$
BEGIN
  -- Update the benchmark_sessions table with current stats
  UPDATE benchmark_sessions 
  SET 
    completed_models = (
      SELECT COUNT(*) 
      FROM benchmarks 
      WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
      AND status IN ('completed', 'failed')
    ),
    successful_models = (
      SELECT COUNT(*) 
      FROM benchmarks 
      WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
      AND status = 'completed' 
      AND success = true
    ),
    updated_at = timezone('utc'::text, now()),
    status = CASE 
      WHEN (SELECT COUNT(*) FROM benchmarks WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) AND status IN ('completed', 'failed')) = 
           (SELECT total_models FROM benchmark_sessions WHERE id = COALESCE(NEW.session_id, OLD.session_id))
      THEN 'completed'
      ELSE 'running'
    END,
    end_time = CASE 
      WHEN (SELECT COUNT(*) FROM benchmarks WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) AND status IN ('completed', 'failed')) = 
           (SELECT total_models FROM benchmark_sessions WHERE id = COALESCE(NEW.session_id, OLD.session_id))
      THEN timezone('utc'::text, now())
      ELSE end_time
    END
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update session stats when benchmarks change
DROP TRIGGER IF EXISTS update_session_stats_trigger ON benchmarks;
CREATE TRIGGER update_session_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON benchmarks
  FOR EACH ROW EXECUTE FUNCTION update_benchmark_session_stats();

-- Create a view for easy querying of benchmark sessions with their results
CREATE OR REPLACE VIEW benchmark_session_summary AS
SELECT 
  bs.id,
  bs.session_id,
  bs.created_at,
  bs.updated_at,
  bs.user_id,
  bs.website_url,
  bs.task_description,
  bs.status,
  bs.total_models,
  bs.completed_models,
  bs.successful_models,
  bs.start_time,
  bs.end_time,
  EXTRACT(EPOCH FROM (COALESCE(bs.end_time, NOW()) - bs.start_time)) * 1000 AS execution_time_ms,
  -- Aggregate individual benchmark results
  jsonb_agg(
    jsonb_build_object(
      'model_id', b.model_id,
      'model_name', b.model_name,
      'status', b.status,
      'success', b.success,
      'execution_time_ms', b.execution_time_ms,
      'error_message', b.error_message,
      'screenshot_url', b.screenshot_url,
      'start_time', b.start_time,
      'end_time', b.end_time
    ) ORDER BY b.created_at
  ) FILTER (WHERE b.id IS NOT NULL) AS model_results
FROM benchmark_sessions bs
LEFT JOIN benchmarks b ON bs.id = b.session_id
GROUP BY bs.id, bs.session_id, bs.created_at, bs.updated_at, bs.user_id, 
         bs.website_url, bs.task_description, bs.status, bs.total_models, 
         bs.completed_models, bs.successful_models, bs.start_time, bs.end_time;

-- Create a view for benchmark statistics (updated for new structure)
CREATE OR REPLACE VIEW benchmark_stats AS
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_sessions,
  SUM(completed_models) as total_model_runs,
  SUM(successful_models) as total_successful_runs,
  ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) * 1000)) as avg_session_time_ms,
  COUNT(DISTINCT website_url) as unique_websites_tested
FROM benchmark_sessions 
GROUP BY user_id; 