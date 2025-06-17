import asyncio
import os
import time
import json
import httpx
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from browser_use import Agent, BrowserSession
import uuid
import logging

# Import from our modules
from models import (
    BenchmarkRequest, BenchmarkStreamRequest, LogEntry, ModelResult,
    StreamingUpdate, BenchmarkStatus
)
from services import active_sessions, emit_log, get_llm, cleanup_session
from dotenv import load_dotenv
import re
from typing import Optional, Dict, Any, List, AsyncGenerator
from pydantic import BaseModel
from datetime import datetime

# Load environment variables
load_dotenv()

# Next.js API URL
NEXTJS_API_URL = os.getenv('NEXTJS_API_URL', 'http://localhost:3000')

async def update_benchmark_in_db(session_identifier: str, model_id: str, status: str, success: bool, execution_time_ms: int, error_message: str = None, final_result: str = None):
    """Update benchmark status in the database via Next.js API."""
    try:
        async with httpx.AsyncClient() as client:
            # First, get the benchmark ID by looking up benchmarks for this session
            response = await client.get(f"{NEXTJS_API_URL}/api/benchmark/lookup", params={
                'session_identifier': session_identifier,
                'model_id': model_id
            })
            
            if response.status_code != 200:
                print(f"Failed to lookup benchmark for {model_id}: {response.status_code}")
                return
            
            data = response.json()
            benchmark_id = data.get('benchmark_id')
            
            if not benchmark_id:
                print(f"No benchmark_id found for session {session_identifier}, model {model_id}")
                return
            
            # Update the benchmark
            update_response = await client.post(f"{NEXTJS_API_URL}/api/benchmark/update", json={
                'benchmark_id': benchmark_id,
                'status': status,
                'success': success,
                'execution_time_ms': execution_time_ms,
                'error_message': error_message,
                'final_result': final_result
            })
            
            if update_response.status_code == 200:
                print(f"✅ Updated benchmark in DB: {model_id} -> {status}")
            else:
                print(f"❌ Failed to update benchmark in DB: {update_response.status_code}")
                
    except Exception as e:
        print(f"Error updating benchmark in DB: {e}")

async def update_session_status_in_db(session_identifier: str, status: str, completed_models: int, successful_models: int):
    """Update session status in the database via Next.js API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{NEXTJS_API_URL}/api/benchmark/session/update", json={
                'session_identifier': session_identifier,
                'status': status,
                'completed_models': completed_models,
                'successful_models': successful_models
            })
            
            if response.status_code == 200:
                print(f"✅ Updated session status in DB: {session_identifier} -> {status}")
            else:
                print(f"❌ Failed to update session status in DB: {response.status_code}")
                
    except Exception as e:
        print(f"Error updating session status in DB: {e}")

class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle datetime objects."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

app = FastAPI(title="BenchMark My Website API", version="1.0.0")

# Configure logging to capture browser_use logs
logging.basicConfig(level=logging.INFO)
browser_use_logger = logging.getLogger("browser_use")

# Define the 8 models to run (4 OpenAI + 4 Anthropic)
MODELS_TO_RUN = [
    # OpenAI Models
    {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai"},
    {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "provider": "openai"},
    {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "provider": "openai"},
    # Anthropic Models
    {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "provider": "anthropic"},
    {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku", "provider": "anthropic"},
    {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "provider": "anthropic"},
    {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku", "provider": "anthropic"}
]

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CustomLogHandler(logging.Handler):
    """Custom log handler to capture browser_use logs and forward them to sessions."""
    
    def __init__(self):
        super().__init__()
        self.current_session_id = None
        self.current_model_id = None
    
    def set_session_info(self, session_id: str, model_id: str):
        """Set the current session and model ID for log forwarding."""
        self.current_session_id = session_id
        self.current_model_id = model_id
    
    def emit(self, record):
        """Emit log record to the current session."""
        if not self.current_session_id or self.current_session_id not in active_sessions or not self.current_model_id:
            return
        
        try:
            # Format the log message
            message = self.format(record)
            
            # Determine log level based on record level
            if record.levelno >= logging.ERROR:
                level = "error"
            elif record.levelno >= logging.WARNING:
                level = "warning"
            elif "✅" in message or "success" in message.lower():
                level = "success"
            elif any(action in message for action in ["🖱️", "⌨️", "📜", "🔗", "👁️"]):
                level = "action"
            else:
                level = "info"
            
            # Extract clean message (remove logger prefixes)
            clean_message = re.sub(r'^\w+\s+\[.*?\]\s*', '', message)
            if clean_message:
                # Create task to emit log (non-blocking)
                asyncio.create_task(emit_log(self.current_session_id, self.current_model_id, level, clean_message))
                
        except Exception as e:
            # Don't let logging errors break the application
            pass

class CustomAgent(Agent):
    """Custom Agent that captures logs for streaming."""
    
    def __init__(self, session_id: str, model_id: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.session_id = session_id
        self.model_id = model_id
        self.captured_logs = []
    
    async def run(self, max_steps: int = 100):
        """Override run method to capture logs."""
        await emit_log(self.session_id, self.model_id, "info", f"🚀 Starting benchmark task: {self.task}")
        
        try:
            # Initialize browser
            await emit_log(self.session_id, self.model_id, "info", "🌐 Launching browser in headless mode...")
            
            # Set the session and model ID for the custom log handler
            custom_handler.set_session_info(self.session_id, self.model_id)
            
            result = await super().run(max_steps)
            
            await emit_log(self.session_id, self.model_id, "success", "✅ Benchmark completed successfully!")
            return result
            
        except Exception as e:
            await emit_log(self.session_id, self.model_id, "error", f"❌ Benchmark failed: {str(e)}")
            raise
        finally:
            # Clear session from log handler
            custom_handler.set_session_info(None, None)

# Create and add custom handler after class definition
custom_handler = CustomLogHandler()
browser_use_logger.addHandler(custom_handler)

async def run_single_model_benchmark(session_identifier: str, model_info: Dict[str, str], website_url: str, task_description: str) -> ModelResult:
    """Run benchmark for a single model."""
    model_id = model_info["id"]
    model_name = model_info["name"]
    start_time = time.time()
    
    try:
        await emit_log(session_identifier, model_id, "info", f"🤖 Starting {model_name}")
        
        # Update database: mark as running
        await update_benchmark_in_db(session_identifier, model_id, "running", False, 0, None, None)
        
        # Get the appropriate LLM
        provider = model_info.get("provider", "openai")  # Default to openai for backward compatibility
        llm = get_llm(provider, model_id)
        
        # Create the BrowserUse agent with the specific task
        task = f"Go to {website_url} and {task_description}"
        
        await emit_log(session_identifier, model_id, "info", f"🎯 Task: {task}")
        
        # Create a headless browser session with unique user data directory
        user_data_dir = f"~/.config/browseruse/profiles/{session_identifier}_{model_id}"
        browser_session = BrowserSession(
            headless=True,
            viewport={'width': 1280, 'height': 720},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            user_data_dir=user_data_dir
        )
        
        agent = CustomAgent(
            session_id=session_identifier,
            model_id=model_id,
            task=task,
            llm=llm,
            browser_session=browser_session,
            use_vision=True,
            save_conversation_path=f"logs/conversation_{session_identifier}_{model_id}.json",
            max_failures=3,
            retry_delay=2,
        )
        
        # Run the agent and capture results
        await emit_log(session_identifier, model_id, "info", "🔄 Executing benchmark...")
        result = await agent.run()
        
        execution_time = int((time.time() - start_time) * 1000)
        
        # Extract and process the final result from the agent
        final_result_text = result.action_results()[-2].extracted_content
        print(final_result_text, "!!!22!!!!!!!!!!!!!!!!!!")
        if final_result_text:
            if isinstance(final_result_text, str):
                await emit_log(session_identifier, model_id, "success", f"🎯 Final Result: {final_result_text}")
            else:
                await emit_log(session_identifier, model_id, "success", f"🎯 Final Result: {str(result)}")
        else:
            await emit_log(session_identifier, model_id, "warning", "⚠️ No final result returned from agent")
        

        
        # Determine success based on result
        success = result is not None and not isinstance(result, Exception)
        error_message = str(result) if isinstance(result, Exception) else None
        
        await emit_log(session_identifier, model_id, "success", f"🎉 {model_name} completed in {execution_time}ms!")
        
        # Update database: mark as completed
        await update_benchmark_in_db(
            session_identifier, 
            model_id, 
            "completed", 
            success, 
            execution_time, 
            error_message, 
            final_result_text
        )
        
        return ModelResult(
            model_id=model_id,
            model_name=model_name,
            status=BenchmarkStatus.COMPLETED,
            success=success,
            execution_time_ms=execution_time,
            error_message=error_message,
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow()
        )
        
    except Exception as e:
        execution_time = int((time.time() - start_time) * 1000)
        error_message = str(e)
        
        await emit_log(session_identifier, model_id, "error", f"💥 {model_name} failed: {error_message}")
        
        # Update database: mark as failed
        await update_benchmark_in_db(
            session_identifier, 
            model_id, 
            "failed", 
            False, 
            execution_time, 
            error_message,
            None   # final_result
        )
        
        return ModelResult(
            model_id=model_id,
            model_name=model_name,
            status=BenchmarkStatus.FAILED,
            success=False,
            execution_time_ms=execution_time,
            error_message=error_message,
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow()
        )

@app.post("/api/benchmark/stream")
async def start_benchmark_stream(request: BenchmarkStreamRequest):
    """Start a benchmark with streaming logs for all 4 models."""
    session_identifier = request.session_id
    
    try:
        # Initialize active session for streaming
        active_sessions[session_identifier] = {
            'logs': [],
            'has_new_data': False,
            'status': 'starting',
            'request': request.dict(),
            'model_results': {}
        }
        
        # Start all 4 benchmarks in background
        asyncio.create_task(run_all_models_benchmark(request))
        
        return {"success": True, "session_id": session_identifier, "message": "Benchmark started for all models"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start benchmark: {str(e)}")

async def run_all_models_benchmark(request: BenchmarkStreamRequest):
    """Run the benchmark on all 4 models sequentially to avoid browser conflicts."""
    session_identifier = request.session_id
    
    try:
        # Update status
        active_sessions[session_identifier]['status'] = 'running'
        
        await emit_log(session_identifier, "system", "info", f"🚀 Starting benchmarks for all {len(MODELS_TO_RUN)} models (running sequentially)...")
        
        # Run models sequentially to avoid browser singleton lock conflicts
        model_results = []
        for i, model_info in enumerate(MODELS_TO_RUN):
            await emit_log(session_identifier, "system", "info", f"▶️ Starting model {i+1}/{len(MODELS_TO_RUN)}: {model_info['name']}")
            
            try:
                result = await run_single_model_benchmark(
                    session_identifier, 
                    model_info, 
                    request.website_url, 
                    request.task_description
                )
                model_results.append(result)
                
                # Add a small delay between models to ensure proper cleanup
                if i < len(MODELS_TO_RUN) - 1:  # Don't wait after the last model
                    await emit_log(session_identifier, "system", "info", f"✅ {model_info['name']} completed. Preparing next model...")
                    await asyncio.sleep(2)  # 2 seconds between models
                    
            except Exception as e:
                await emit_log(session_identifier, model_info["id"], "error", f"❌ {model_info['name']} failed: {str(e)}")
                model_results.append(e)  # Keep the exception for processing below
        
        # Process results
        completed_models = 0
        successful_models = 0
        
        for i, result in enumerate(model_results):
            if isinstance(result, Exception):
                # Handle exception
                model_info = MODELS_TO_RUN[i]
                await emit_log(session_identifier, model_info["id"], "error", f"❌ {model_info['name']} crashed: {str(result)}")
                active_sessions[session_identifier]['model_results'][model_info["id"]] = ModelResult(
                    model_id=model_info["id"],
                    model_name=model_info["name"],
                    status=BenchmarkStatus.FAILED,
                    success=False,
                    execution_time_ms=0,
                    error_message=str(result),
                    start_time=datetime.utcnow(),
                    end_time=datetime.utcnow()
                )
            else:
                # Handle successful result
                active_sessions[session_identifier]['model_results'][result.model_id] = result
                if result.success:
                    successful_models += 1
            completed_models += 1
        
        # Update session with final results
        active_sessions[session_identifier].update({
            'status': 'completed',
            'completed_models': completed_models,
            'successful_models': successful_models
        })
        
        await emit_log(session_identifier, "system", "success", f"🎉 All benchmarks completed! {successful_models}/{completed_models} models succeeded")
        
        # Update session status in database
        await update_session_status_in_db(session_identifier, 'completed', completed_models, successful_models)
        
    except Exception as e:
        await emit_log(session_identifier, "system", "error", f"💥 Benchmark system failed: {str(e)}")
        
        # Update session with error
        active_sessions[session_identifier].update({
            'status': 'failed',
            'error_message': str(e)
        })

@app.get("/api/benchmark/stream/{session_id}")
async def stream_benchmark_logs(session_id: str):
    """Stream benchmark logs using Server-Sent Events for all models."""
    
    async def generate_logs():
        """Generate SSE data for logs."""
        last_sent_count = 0
        
        while True:
            if session_id not in active_sessions:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Session not found'}, cls=DateTimeEncoder)}\n\n"
                break
            
            session = active_sessions[session_id]
            logs = session.get('logs', [])
            
            # Send new logs since last update
            if len(logs) > last_sent_count:
                new_logs = logs[last_sent_count:]
                for log in new_logs:
                    yield f"data: {json.dumps({'type': 'log', 'data': log}, cls=DateTimeEncoder)}\n\n"
                last_sent_count = len(logs)
            
            # Send status updates
            status = session.get('status', 'unknown')
            yield f"data: {json.dumps({'type': 'status', 'status': status}, cls=DateTimeEncoder)}\n\n"
            
            # Send completion data if finished
            if status in ['completed', 'failed']:
                completion_data = {
                    'type': 'completion',
                    'status': status,
                    'completed_models': session.get('completed_models', 0),
                    'successful_models': session.get('successful_models', 0),
                    'model_results': {
                        model_id: result.model_dump() if hasattr(result, 'model_dump') else result.__dict__
                        for model_id, result in session.get('model_results', {}).items()
                    },
                    'error_message': session.get('error_message')
                }
                yield f"data: {json.dumps(completion_data, cls=DateTimeEncoder)}\n\n"
                
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

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "benchmark-api"}

@app.get("/api/supported-models")
async def get_supported_models():
    """Get list of supported LLM models and providers."""
    return {
        "models": MODELS_TO_RUN,
        "providers": ["openai", "anthropic"],
        "total_models": len(MODELS_TO_RUN)
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