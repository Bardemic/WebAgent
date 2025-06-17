import asyncio
import os
import time
import json
import base64
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from supabase import create_client, Client
from browser_use import Agent
import uuid
import logging

# Import from our modules
from models import BenchmarkRequest, BenchmarkStreamRequest
from services import (
    active_sessions, CustomLogHandler, emit_log, 
    get_llm, cleanup_session
)
from agents import CustomAgent, patch_agent_methods

app = FastAPI(title="BenchMark My Website API", version="1.0.0")

# Configure logging to capture browser_use logs
logging.basicConfig(level=logging.INFO)
browser_use_logger = logging.getLogger("browser_use")

# Create and add custom handler
custom_handler = CustomLogHandler()
browser_use_logger.addHandler(custom_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Supabase environment variables are required")

supabase: Client = create_client(supabase_url, supabase_key)

@app.post("/api/benchmark/stream")
async def start_benchmark_stream(request: BenchmarkStreamRequest):
    """Start a benchmark with streaming logs."""
    session_id = request.session_id
    
    # Initialize session
    active_sessions[session_id] = {
        'logs': [],
        'has_new_data': False,
        'status': 'starting',
        'request': request.dict()
    }
    
    # Start the benchmark in background
    asyncio.create_task(run_benchmark_with_logs(request))
    
    return {"success": True, "session_id": session_id, "message": "Benchmark started"}

async def run_benchmark_with_logs(request: BenchmarkStreamRequest):
    """Run the benchmark and capture logs."""
    session_id = request.session_id
    start_time = time.time()
    
    try:
        # Update status
        active_sessions[session_id]['status'] = 'running'
        
        # Get the appropriate LLM
        llm = get_llm(request.llm_provider, request.model)
        
        # Create the BrowserUse agent with the specific task
        task = f"Go to {request.website_url} and {request.task_description}"
        
        await emit_log(session_id, "info", f"🎯 Task: {task}")
        await emit_log(session_id, "info", f"🤖 Using {request.llm_provider} {request.model}")
        
        agent = CustomAgent(
            session_id=session_id,
            task=task,
            llm=llm,
            use_vision=True,
            save_conversation_path=f"logs/conversation_{session_id}.json",
            max_failures=3,
            retry_delay=2,
        )
        
        # Set the session ID for the custom log handler
        custom_handler.set_session_id(session_id)
        
        # Run the agent and capture results
        await emit_log(session_id, "info", "🔄 Executing benchmark...")
        result = await agent.run()
        
        execution_time = int((time.time() - start_time) * 1000)
        
        # Get the browser history and screenshots
        browser_logs = []
        screenshot_base64 = None
        agent_steps = []
        
        await emit_log(session_id, "info", "📸 Capturing final screenshot...")
        
        # Extract information from the agent (safely handling potential missing attributes)
        if hasattr(agent, 'browser') and agent.browser:
            # Get browser logs (if method exists)
            if hasattr(agent.browser, 'get_logs'):
                try:
                    browser_logs = agent.browser.get_logs()
                except Exception:
                    pass  # Browser logs not available
            
            # Take final screenshot (if method exists)
            if hasattr(agent.browser, 'take_screenshot'):
                try:
                    screenshot_bytes = await agent.browser.take_screenshot()
                    if screenshot_bytes:
                        screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                except Exception:
                    pass  # Screenshot not available
        
        # Get agent execution steps (safely handling potential missing attributes)
        if hasattr(agent, 'history'):
            try:
                agent_steps = [
                    {
                        "step": i + 1,
                        "action": step.get("action", ""),
                        "result": step.get("result", ""),
                        "timestamp": step.get("timestamp", "")
                    }
                    for i, step in enumerate(agent.history)
                ]
            except Exception:
                pass  # History not available
        
        # Determine success based on result
        success = result is not None and not isinstance(result, Exception)
        error_message = str(result) if isinstance(result, Exception) else None
        
        # Upload screenshot to Supabase if available
        screenshot_url = None
        if screenshot_base64:
            try:
                await emit_log(session_id, "info", "☁️ Uploading screenshot to Supabase...")
                screenshot_id = str(uuid.uuid4())
                file_name = f"screenshots/{screenshot_id}.png"
                
                # Convert base64 to bytes
                screenshot_bytes = base64.b64decode(screenshot_base64)
                
                # Upload to Supabase storage
                upload_result = supabase.storage.from_("benchmark-screenshots").upload(
                    file_name, screenshot_bytes, {"content-type": "image/png"}
                )
                
                # Handle upload result safely
                if hasattr(upload_result, 'error') and not upload_result.error:
                    # Get public URL
                    public_url_response = supabase.storage.from_("benchmark-screenshots").get_public_url(file_name)
                    # Handle different possible return types
                    if isinstance(public_url_response, dict):
                        screenshot_url = public_url_response.get("publicURL")
                    else:
                        screenshot_url = str(public_url_response)
                    await emit_log(session_id, "success", "✅ Screenshot uploaded successfully!")
                    
            except Exception as e:
                await emit_log(session_id, "warning", f"⚠️ Screenshot upload error: {e}")
        
        await emit_log(session_id, "info", "💾 Saving benchmark results to database...")
        
        # Save benchmark result to database
        benchmark_data = {
            "user_id": request.user_id,
            "website_url": request.website_url,
            "task_description": request.task_description,
            "success": success,
            "execution_time_ms": execution_time,
            "error_message": error_message,
            "browser_logs": active_sessions[session_id]['logs'],  # Use captured streaming logs
            "screenshot_url": screenshot_url,
            "agent_steps": agent_steps,
            "llm_provider": request.llm_provider,
            "model": request.model
        }
        
        db_result = supabase.table("benchmarks").insert(benchmark_data).execute()
        
        if db_result.data:
            benchmark_id = db_result.data[0]["id"]
            created_at = db_result.data[0]["created_at"]
            await emit_log(session_id, "success", f"✅ Benchmark saved with ID: {benchmark_id}")
        else:
            raise Exception("Failed to save benchmark to database")
        
        # Update session with final results
        active_sessions[session_id].update({
            'status': 'completed',
            'success': success,
            'execution_time_ms': execution_time,
            'benchmark_id': benchmark_id,
            'screenshot_url': screenshot_url,
            'created_at': created_at
        })
        
        await emit_log(session_id, "success", f"🎉 Benchmark completed in {execution_time}ms!")
        
    except Exception as e:
        execution_time = int((time.time() - start_time) * 1000)
        error_message = str(e)
        
        await emit_log(session_id, "error", f"💥 Benchmark failed: {error_message}")
        
        # Update session with error
        active_sessions[session_id].update({
            'status': 'failed',
            'success': False,
            'execution_time_ms': execution_time,
            'error_message': error_message
        })
        
        # Still try to save failed benchmark
        try:
            benchmark_data = {
                "user_id": request.user_id,
                "website_url": request.website_url,
                "task_description": request.task_description,
                "success": False,
                "execution_time_ms": execution_time,
                "error_message": error_message,
                "browser_logs": active_sessions[session_id]['logs'],
                "screenshot_url": None,
                "agent_steps": [],
                "llm_provider": request.llm_provider,
                "model": request.model
            }
            
            supabase.table("benchmarks").insert(benchmark_data).execute()
            await emit_log(session_id, "info", "💾 Failed benchmark saved to database")
        except:
            await emit_log(session_id, "error", "❌ Failed to save benchmark to database")
    finally:
        # Clear session from log handler
        custom_handler.set_session_id(None)

@app.get("/api/benchmark/stream/{session_id}")
async def stream_benchmark_logs(session_id: str):
    """Stream benchmark logs using Server-Sent Events."""
    
    async def generate_logs():
        """Generate SSE data for logs."""
        last_sent_count = 0
        
        while True:
            if session_id not in active_sessions:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Session not found'})}\n\n"
                break
            
            session = active_sessions[session_id]
            logs = session.get('logs', [])
            
            # Send new logs since last update
            if len(logs) > last_sent_count:
                new_logs = logs[last_sent_count:]
                for log in new_logs:
                    yield f"data: {json.dumps({'type': 'log', 'data': log})}\n\n"
                last_sent_count = len(logs)
            
            # Send status updates
            status = session.get('status', 'unknown')
            yield f"data: {json.dumps({'type': 'status', 'status': status})}\n\n"
            
            # Send completion data if finished
            if status in ['completed', 'failed']:
                completion_data = {
                    'type': 'completion',
                    'success': session.get('success', False),
                    'execution_time_ms': session.get('execution_time_ms', 0),
                    'benchmark_id': session.get('benchmark_id'),
                    'screenshot_url': session.get('screenshot_url'),
                    'created_at': session.get('created_at'),
                    'error_message': session.get('error_message')
                }
                yield f"data: {json.dumps(completion_data)}\n\n"
                
                # Clean up session after a delay
                asyncio.create_task(cleanup_session(session_id, 60))
                break
            
            await asyncio.sleep(1)  # Check for updates every second
    
    return StreamingResponse(
        generate_logs(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )

@app.post("/api/benchmark", response_model=Dict[str, Any])
async def run_benchmark(request: BenchmarkRequest):
    """Run a website benchmark using BrowserUse AI agent (legacy endpoint)."""
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
        
        # Extract information from the agent's history (safely)
        if hasattr(agent, 'browser') and agent.browser:
            # Get browser logs (if method exists)
            if hasattr(agent.browser, 'get_logs'):
                try:
                    browser_logs = agent.browser.get_logs()
                except Exception:
                    pass
            
            # Take final screenshot (if method exists)
            if hasattr(agent.browser, 'take_screenshot'):
                try:
                    screenshot_bytes = await agent.browser.take_screenshot()
                    if screenshot_bytes:
                        screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                except Exception:
                    pass
        
        # Get agent execution steps (safely)
        if hasattr(agent, 'history'):
            try:
                agent_steps = [
                    {
                        "step": i + 1,
                        "action": step.get("action", ""),
                        "result": step.get("result", ""),
                        "timestamp": step.get("timestamp", "")
                    }
                    for i, step in enumerate(agent.history)
                ]
            except Exception:
                pass
        
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
                
                # Handle upload result safely
                if hasattr(upload_result, 'error') and not upload_result.error:
                    # Get public URL
                    public_url_response = supabase.storage.from_("benchmark-screenshots").get_public_url(file_name)
                    # Handle different possible return types
                    if isinstance(public_url_response, dict):
                        screenshot_url = public_url_response.get("publicURL")
                    else:
                        screenshot_url = str(public_url_response)
                    
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