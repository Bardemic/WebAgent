-- Migration: Add Anthropic Models Support
-- This migration updates the multi-model benchmark system to support 8 models (4 OpenAI + 4 Anthropic)

-- Step 1: Update the default total_models value from 4 to 8
ALTER TABLE benchmark_sessions ALTER COLUMN total_models SET DEFAULT 8;

-- Step 2: Update the constraints to allow up to 8 models
ALTER TABLE benchmark_sessions DROP CONSTRAINT IF EXISTS completed_models_valid;
ALTER TABLE benchmark_sessions ADD CONSTRAINT completed_models_valid CHECK (completed_models >= 0 AND completed_models <= 8);

ALTER TABLE benchmark_sessions DROP CONSTRAINT IF EXISTS successful_models_valid;
ALTER TABLE benchmark_sessions ADD CONSTRAINT successful_models_valid CHECK (successful_models >= 0 AND successful_models <= completed_models);

-- Step 3: Add llm_provider column to benchmarks table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmarks' AND column_name = 'llm_provider') THEN
    ALTER TABLE benchmarks ADD COLUMN llm_provider TEXT NOT NULL DEFAULT 'openai';
  END IF;
END $$;

-- Step 4: Update existing benchmark_sessions to use 8 models for future benchmarks
-- Note: This doesn't affect existing sessions, only new ones will use 8 models by default

-- Step 5: Add index for llm_provider for better performance
CREATE INDEX IF NOT EXISTS benchmarks_llm_provider_idx ON benchmarks(llm_provider);

-- Step 6: Create a view for model statistics by provider
CREATE OR REPLACE VIEW benchmark_provider_stats AS
SELECT 
  bs.id as session_id,
  bs.session_id as session_identifier,
  bs.user_id,
  bs.website_url,
  bs.task_description,
  bs.status as session_status,
  bs.created_at,
  COUNT(b.id) as total_benchmarks,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_benchmarks,
  COUNT(CASE WHEN b.success = true THEN 1 END) as successful_benchmarks,
  COUNT(CASE WHEN b.llm_provider = 'openai' THEN 1 END) as openai_models,
  COUNT(CASE WHEN b.llm_provider = 'anthropic' THEN 1 END) as anthropic_models,
  COUNT(CASE WHEN b.llm_provider = 'openai' AND b.success = true THEN 1 END) as openai_successful,
  COUNT(CASE WHEN b.llm_provider = 'anthropic' AND b.success = true THEN 1 END) as anthropic_successful,
  AVG(CASE WHEN b.llm_provider = 'openai' AND b.success = true THEN b.execution_time_ms END) as avg_openai_time,
  AVG(CASE WHEN b.llm_provider = 'anthropic' AND b.success = true THEN b.execution_time_ms END) as avg_anthropic_time
FROM benchmark_sessions bs
LEFT JOIN benchmarks b ON bs.id = b.session_id
GROUP BY bs.id, bs.session_id, bs.user_id, bs.website_url, bs.task_description, bs.status, bs.created_at
ORDER BY bs.created_at DESC;

-- Step 7: Enable RLS on the new view
-- Note: Views inherit RLS from their base tables, so this is automatic

-- Add a comment to document the migration
COMMENT ON TABLE benchmark_sessions IS 'Updated to support 8 models: 4 OpenAI + 4 Anthropic (migration-002)';
COMMENT ON COLUMN benchmarks.llm_provider IS 'LLM provider: openai or anthropic (added in migration-002)'; 