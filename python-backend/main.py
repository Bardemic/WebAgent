import asyncio
import os
import time
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import base64
from supabase import create_client, Client
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from browser_use import Agent
import uuid

# Load environment variables
load_dotenv()

app = FastAPI(title="BenchMark My Website API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase: Client = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

class BenchmarkRequest(BaseModel):
    website_url: str
    task_description: str
    user_id: str
    llm_provider: str = "openai"  # openai, anthropic, etc.
    model: str = "gpt-4o"

class BenchmarkResponse(BaseModel):
    success: bool
    execution_time_ms: int
    error_message: Optional[str] = None
    browser_logs: List[Dict[Any, Any]] = []
    screenshot_base64: Optional[str] = None
    agent_steps: List[Dict[Any, Any]] = []

def get_llm(provider: str, model: str):
    """Get the appropriate LLM based on provider and model."""
    if provider.lower() == "openai":
        return ChatOpenAI(
            model=model,
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0
        )
    elif provider.lower() == "anthropic":
        return ChatAnthropic(
            model=model,
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            temperature=0
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")

@app.post("/api/benchmark", response_model=Dict[str, Any])
async def run_benchmark(request: BenchmarkRequest):
    """Run a website benchmark using BrowserUse AI agent."""
    start_time = time.time()
    
    try:
        # Get the appropriate LLM
        llm = get_llm(request.llm_provider, request.model)
        
        # Create the BrowserUse agent with the specific task
        task = f"Go to {request.website_url} and {request.task_description}"
        
        agent = Agent(
            task=task,
            llm=llm,
            use_vision=True,  # Enable vision for better web understanding
            save_conversation_path=f"logs/conversation_{uuid.uuid4()}.json",
            max_failures=3,
            retry_delay=2,
        )
        
        # Run the agent and capture results
        result = await agent.run()
        
        execution_time = int((time.time() - start_time) * 1000)
        
        # Get the browser history and screenshots
        browser_logs = []
        screenshot_base64 = None
        agent_steps = []
        
        # Extract information from the agent's history
        if hasattr(agent, 'browser') and agent.browser:
            # Get browser logs
            if hasattr(agent.browser, 'get_logs'):
                browser_logs = agent.browser.get_logs()
            
            # Take final screenshot
            if hasattr(agent.browser, 'take_screenshot'):
                screenshot_bytes = await agent.browser.take_screenshot()
                if screenshot_bytes:
                    screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
        
        # Get agent execution steps
        if hasattr(agent, 'history'):
            agent_steps = [
                {
                    "step": i + 1,
                    "action": step.get("action", ""),
                    "result": step.get("result", ""),
                    "timestamp": step.get("timestamp", "")
                }
                for i, step in enumerate(agent.history)
            ]
        
        # Determine success based on result
        success = result is not None and not isinstance(result, Exception)
        error_message = str(result) if isinstance(result, Exception) else None
        
        # Upload screenshot to Supabase if available
        screenshot_url = None
        if screenshot_base64:
            try:
                screenshot_id = str(uuid.uuid4())
                file_name = f"screenshots/{screenshot_id}.png"
                
                # Convert base64 to bytes
                screenshot_bytes = base64.b64decode(screenshot_base64)
                
                # Upload to Supabase storage
                upload_result = supabase.storage.from_("benchmark-screenshots").upload(
                    file_name, screenshot_bytes, {"content-type": "image/png"}
                )
                
                if not upload_result.get("error"):
                    # Get public URL
                    public_url = supabase.storage.from_("benchmark-screenshots").get_public_url(file_name)
                    screenshot_url = public_url.get("publicURL")
                    
            except Exception as e:
                print(f"Screenshot upload error: {e}")
        
        # Save benchmark result to database
        benchmark_data = {
            "user_id": request.user_id,
            "website_url": request.website_url,
            "task_description": request.task_description,
            "success": success,
            "execution_time_ms": execution_time,
            "error_message": error_message,
            "browser_logs": browser_logs,
            "screenshot_url": screenshot_url,
            "agent_steps": agent_steps,
            "llm_provider": request.llm_provider,
            "model": request.model
        }
        
        db_result = supabase.table("benchmarks").insert(benchmark_data).execute()
        
        if db_result.data:
            benchmark_id = db_result.data[0]["id"]
            created_at = db_result.data[0]["created_at"]
        else:
            raise Exception("Failed to save benchmark to database")
        
        return {
            "success": True,
            "data": {
                "id": benchmark_id,
                "success": success,
                "executionTimeMs": execution_time,
                "errorMessage": error_message,
                "screenshotUrl": screenshot_url,
                "agentSteps": agent_steps,
                "createdAt": created_at,
                "llmProvider": request.llm_provider,
                "model": request.model
            }
        }
        
    except Exception as e:
        execution_time = int((time.time() - start_time) * 1000)
        error_message = str(e)
        
        # Still try to save failed benchmark
        try:
            benchmark_data = {
                "user_id": request.user_id,
                "website_url": request.website_url,
                "task_description": request.task_description,
                "success": False,
                "execution_time_ms": execution_time,
                "error_message": error_message,
                "browser_logs": [],
                "screenshot_url": None,
                "agent_steps": [],
                "llm_provider": request.llm_provider,
                "model": request.model
            }
            
            supabase.table("benchmarks").insert(benchmark_data).execute()
        except:
            pass  # Don't fail if we can't save to DB
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Benchmark execution failed",
                "message": error_message,
                "executionTimeMs": execution_time
            }
        )

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "benchmark-api"}

@app.get("/api/supported-models")
async def get_supported_models():
    """Get list of supported LLM models and providers."""
    return {
        "providers": {
            "openai": {
                "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
                "default": "gpt-4o"
            },
            "anthropic": {
                "models": ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307", "claude-3-opus-20240229"],
                "default": "claude-3-5-sonnet-20241022"
            }
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 