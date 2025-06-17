# Python BrowserUse Backend

This is the Python backend that uses the real [BrowserUse](https://github.com/browser-use/browser-use) library to perform AI-powered website testing.

## Setup

### 1. Install Python Dependencies

```bash
cd python-backend
pip install -r requirements.txt
```

### 2. Install Playwright Browser

```bash
playwright install chromium --with-deps --no-shell
```

### 3. Environment Variables

Create a `.env` file in the `python-backend` directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM API Keys
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: Other providers
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_KEY=
GOOGLE_API_KEY=
DEEPSEEK_API_KEY=
GROK_API_KEY=
NOVITA_API_KEY=
```

### 4. Run the Backend

```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### POST /api/benchmark
Run a website benchmark using BrowserUse AI agent.

**Request:**
```json
{
  "website_url": "https://example.com",
  "task_description": "Find the contact form",
  "user_id": "user-uuid",
  "llm_provider": "openai",
  "model": "gpt-4o"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "benchmark-uuid",
    "success": true,
    "executionTimeMs": 5432,
    "errorMessage": null,
    "screenshotUrl": "https://...",
    "agentSteps": [...],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "llmProvider": "openai",
    "model": "gpt-4o"
  }
}
```

### GET /api/health
Health check endpoint.

### GET /api/supported-models
Get list of supported LLM models and providers.

## Development

The FastAPI server will automatically reload when you make changes to the code.

## Production

For production deployment, consider using:
- Gunicorn with Uvicorn workers
- Docker containers
- Load balancing for multiple instances
- Proper error logging and monitoring 