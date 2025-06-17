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

-- Create benchmarks table
CREATE TABLE IF NOT EXISTS benchmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  website_url TEXT NOT NULL,
  task_description TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  browser_logs JSONB,
  screenshot_url TEXT,
  agent_steps JSONB,
  llm_provider TEXT DEFAULT 'openai',
  model TEXT DEFAULT 'gpt-4o',
  
  CONSTRAINT website_url_length CHECK (char_length(website_url) >= 10),
  CONSTRAINT task_description_length CHECK (char_length(task_description) >= 5),
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
CREATE INDEX IF NOT EXISTS benchmarks_user_id_idx ON benchmarks(user_id);
CREATE INDEX IF NOT EXISTS benchmarks_created_at_idx ON benchmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS benchmarks_success_idx ON benchmarks(success);
CREATE INDEX IF NOT EXISTS benchmarks_website_url_idx ON benchmarks(website_url);

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

-- Create a view for benchmark statistics (optional, for future analytics)
CREATE OR REPLACE VIEW benchmark_stats AS
SELECT 
  user_id,
  COUNT(*) as total_benchmarks,
  COUNT(*) FILTER (WHERE success = true) as successful_benchmarks,
  COUNT(*) FILTER (WHERE success = false) as failed_benchmarks,
  ROUND(AVG(execution_time_ms)) as avg_execution_time_ms,
  MIN(execution_time_ms) as min_execution_time_ms,
  MAX(execution_time_ms) as max_execution_time_ms,
  COUNT(DISTINCT website_url) as unique_websites_tested
FROM benchmarks 
GROUP BY user_id; 