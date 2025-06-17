-- Migration: Add Multi-Model Benchmark Support
-- This migration adds support for storing multiple model results per benchmark session

-- Step 1: Create the new benchmark_sessions table
CREATE TABLE IF NOT EXISTS benchmark_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
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

-- Step 2: Enable RLS on benchmark_sessions
ALTER TABLE benchmark_sessions ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies for benchmark_sessions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own benchmark sessions') THEN
    CREATE POLICY "Users can view own benchmark sessions" ON benchmark_sessions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own benchmark sessions') THEN
    CREATE POLICY "Users can insert own benchmark sessions" ON benchmark_sessions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own benchmark sessions') THEN
    CREATE POLICY "Users can update own benchmark sessions" ON benchmark_sessions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own benchmark sessions') THEN
    CREATE POLICY "Users can delete own benchmark sessions" ON benchmark_sessions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Step 4: Add new columns to existing benchmarks table
DO $$ 
BEGIN
  -- Add session_id column (nullable initially for existing data)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'session_id') THEN
    ALTER TABLE benchmarks ADD COLUMN session_id UUID REFERENCES benchmark_sessions(id) ON DELETE CASCADE;
  END IF;

  -- Add updated_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'updated_at') THEN
    ALTER TABLE benchmarks ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
  END IF;

  -- Add session_identifier column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'session_identifier') THEN
    ALTER TABLE benchmarks ADD COLUMN session_identifier TEXT;
  END IF;

  -- Add model_id column (rename from existing 'model' column)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'model_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'model') THEN
      ALTER TABLE benchmarks RENAME COLUMN model TO model_id;
    ELSE
      ALTER TABLE benchmarks ADD COLUMN model_id TEXT NOT NULL DEFAULT 'gpt-4o';
    END IF;
  END IF;

  -- Add model_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'model_name') THEN
    ALTER TABLE benchmarks ADD COLUMN model_name TEXT NOT NULL DEFAULT 'GPT-4o';
  END IF;

  -- Add status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'status') THEN
    ALTER TABLE benchmarks ADD COLUMN status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));
  END IF;

  -- Add start_time column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'start_time') THEN
    ALTER TABLE benchmarks ADD COLUMN start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
  END IF;

  -- Add end_time column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'end_time') THEN
    ALTER TABLE benchmarks ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Step 5: Migrate existing benchmark data to use sessions
-- Create sessions for existing benchmarks that don't have one
INSERT INTO benchmark_sessions (
  session_id,
  user_id,
  website_url,
  task_description,
  status,
  total_models,
  completed_models,
  successful_models,
  start_time,
  end_time,
  created_at,
  updated_at
)
SELECT DISTINCT
  'legacy_' || b.id::text as session_id,
  b.user_id,
  b.website_url,
  b.task_description,
  'completed' as status,
  1 as total_models,
  1 as completed_models,
  CASE WHEN b.success THEN 1 ELSE 0 END as successful_models,
  b.created_at as start_time,
  b.created_at as end_time,
  b.created_at,
  b.created_at as updated_at
FROM benchmarks b
WHERE b.session_id IS NULL
ON CONFLICT (session_id) DO NOTHING;

-- Update existing benchmarks to reference their sessions
UPDATE benchmarks 
SET 
  session_id = bs.id,
  session_identifier = bs.session_id,
  model_name = CASE 
    WHEN model_id = 'gpt-4o' THEN 'GPT-4o'
    WHEN model_id = 'gpt-4o-mini' THEN 'GPT-4o Mini'
    WHEN model_id = 'gpt-4-turbo' THEN 'GPT-4 Turbo'
    WHEN model_id = 'gpt-3.5-turbo' THEN 'GPT-3.5 Turbo'
    ELSE 'GPT-4o'
  END,
  status = CASE WHEN success THEN 'completed' ELSE 'failed' END,
  end_time = benchmarks.created_at
FROM benchmark_sessions bs
WHERE benchmarks.session_id IS NULL 
  AND bs.session_id = 'legacy_' || benchmarks.id::text;

-- Step 6: Add constraints after data migration
DO $$
BEGIN
  -- Make session_id NOT NULL after migration
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'session_id' AND is_nullable = 'YES') THEN
    ALTER TABLE benchmarks ALTER COLUMN session_id SET NOT NULL;
  END IF;

  -- Make session_identifier NOT NULL after migration
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'session_identifier' AND is_nullable = 'YES') THEN
    ALTER TABLE benchmarks ALTER COLUMN session_identifier SET NOT NULL;
  END IF;

  -- Make model_id NOT NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'model_id' AND is_nullable = 'YES') THEN
    ALTER TABLE benchmarks ALTER COLUMN model_id SET NOT NULL;
  END IF;

  -- Make model_name NOT NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'model_name' AND is_nullable = 'YES') THEN
    ALTER TABLE benchmarks ALTER COLUMN model_name SET NOT NULL;
  END IF;

  -- Add unique constraint for model per session
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unique_model_per_session') THEN
    ALTER TABLE benchmarks ADD CONSTRAINT unique_model_per_session UNIQUE (session_id, model_id);
  END IF;
END $$;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS benchmark_sessions_user_id_idx ON benchmark_sessions(user_id);
CREATE INDEX IF NOT EXISTS benchmark_sessions_created_at_idx ON benchmark_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS benchmark_sessions_status_idx ON benchmark_sessions(status);
CREATE INDEX IF NOT EXISTS benchmark_sessions_session_id_idx ON benchmark_sessions(session_id);

CREATE INDEX IF NOT EXISTS benchmarks_session_id_idx ON benchmarks(session_id);
CREATE INDEX IF NOT EXISTS benchmarks_session_identifier_idx ON benchmarks(session_identifier);
CREATE INDEX IF NOT EXISTS benchmarks_model_id_idx ON benchmarks(model_id);
CREATE INDEX IF NOT EXISTS benchmarks_status_idx ON benchmarks(status);

-- Step 8: Create or replace the update function
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

-- Step 9: Create the trigger
DROP TRIGGER IF EXISTS update_session_stats_trigger ON benchmarks;
CREATE TRIGGER update_session_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON benchmarks
  FOR EACH ROW EXECUTE FUNCTION update_benchmark_session_stats();

-- Step 10: Create the benchmark_session_summary view
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

-- Step 11: Update the benchmark_stats view
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

-- Step 12: Grant necessary permissions (if needed)
-- These might be needed depending on your RLS setup
-- GRANT ALL ON benchmark_sessions TO authenticated;
-- GRANT ALL ON benchmark_session_summary TO authenticated;
-- GRANT ALL ON benchmark_stats TO authenticated;

-- Migration completed successfully!
-- The database now supports multi-model benchmarks with proper session grouping. 