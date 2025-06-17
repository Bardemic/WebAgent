# Anthropic Models Support Setup Guide

This guide explains how to set up and use the new Anthropic models support in your WebAgent benchmark system.

## Overview

Your WebAgent now supports **8 models** for multi-model benchmarking:

### OpenAI Models (4)
- GPT-4o
- GPT-4o Mini  
- GPT-4 Turbo
- GPT-3.5 Turbo

### Anthropic Models (4)
- Claude 3.5 Sonnet
- Claude 3 Haiku
- Claude 3 Opus
- Claude 3.5 Haiku

## Prerequisites

### 1. Environment Variables

Make sure you have both API keys configured in your environment:

```bash
# In your .env file or environment
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 2. Python Dependencies

Ensure you have the required packages installed:

```bash
cd python-backend
pip install langchain-anthropic
# or if you need to update requirements.txt:
echo "langchain-anthropic" >> requirements.txt
pip install -r requirements.txt
```

## Database Setup

### Run the New Migration

Apply the new migration to update your database schema:

```sql
-- Run this SQL migration in your database
-- File: migration-002-anthropic-models-support.sql

-- This will:
-- 1. Update default total_models from 4 to 8
-- 2. Add llm_provider column to benchmarks table
-- 3. Update constraints for 8 models
-- 4. Add performance indexes
-- 5. Create provider statistics view
```

### Migration Details

The migration will:
- Change the default `total_models` from 4 to 8
- Add an `llm_provider` column to track which provider each benchmark uses
- Update database constraints to allow up to 8 models per session
- Create a new view `benchmark_provider_stats` for analytics

## UI Changes

### Multi-Model Grid Layout

The benchmark grid now displays:
- **4 columns on large screens** (lg:grid-cols-4)
- **2 columns on smaller screens** (grid-cols-2)
- **Color-coded model cards** with provider indicators
- **Provider labels** showing "OpenAI" or "Anthropic" under each model name

### Model Colors

- **OpenAI Models**: Blue, Green, Purple, Orange backgrounds
- **Anthropic Models**: Amber, Pink, Indigo, Teal backgrounds

## Testing the Setup

### 1. Start the Backend

```bash
cd python-backend
python main.py
```

### 2. Start the Frontend

```bash
npm run dev
```

### 3. Test API Endpoints

Check the supported models endpoint:
```bash
curl http://localhost:8000/api/supported-models
```

Should return:
```json
{
  "models": [
    {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai"},
    {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "provider": "openai"},
    {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "provider": "openai"},
    {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "provider": "anthropic"},
    {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku", "provider": "anthropic"},
    {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "provider": "anthropic"},
    {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku", "provider": "anthropic"}
  ],
  "providers": ["openai", "anthropic"],
  "total_models": 8
}
```

### 4. Run a Multi-Model Benchmark

1. Go to your WebAgent interface
2. Enter a website URL and task description
3. Start a benchmark
4. You should see all 8 models running in the grid

## Performance Considerations

### Sequential Execution

The models run sequentially (not in parallel) to avoid browser conflicts. With 8 models, benchmarks will take longer to complete.

### Resource Usage

- **Memory**: Each model maintains its own browser session
- **API Costs**: You'll now be making calls to both OpenAI and Anthropic APIs
- **Time**: Expect roughly 2x longer benchmark times

## Monitoring & Analytics

### New Database View

Use the new `benchmark_provider_stats` view to analyze performance:

```sql
SELECT 
  session_identifier,
  openai_successful,
  anthropic_successful,
  avg_openai_time,
  avg_anthropic_time
FROM benchmark_provider_stats 
ORDER BY created_at DESC 
LIMIT 10;
```

### Provider Comparison

The system now tracks:
- Success rates by provider
- Average execution times by provider
- Model-specific performance metrics

## Troubleshooting

### Common Issues

1. **Missing Anthropic API Key**
   - Error: "ANTHROPIC_API_KEY environment variable is required"
   - Solution: Add your Anthropic API key to the environment

2. **Database Constraint Errors**
   - Error: "completed_models_valid constraint violation"
   - Solution: Run the migration to update constraints

3. **UI Display Issues**
   - Problem: Models not showing in grid
   - Solution: Clear browser cache and restart frontend

### API Rate Limits

- **OpenAI**: Standard rate limits apply per model
- **Anthropic**: Check your Claude API rate limits
- **Recommendation**: Consider implementing delays between model executions if you hit rate limits

## Next Steps

Consider these future enhancements:
1. **Parallel Execution**: Implement parallel model execution with proper resource management
2. **Model Selection**: Allow users to select which models to include in benchmarks  
3. **Provider Analytics**: Add detailed provider comparison dashboards
4. **Cost Tracking**: Implement API cost tracking per provider

## Support

If you encounter issues:
1. Check that both API keys are properly configured
2. Verify the database migration was applied successfully
3. Ensure all dependencies are installed
4. Check the console logs for specific error messages 