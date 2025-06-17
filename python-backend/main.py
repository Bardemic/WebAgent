import asyncio
import os
import time
import json
import re
from typing import Optional, Dict, Any, List, AsyncGenerator
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import base64
from supabase import create_client, Client
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from browser_use import Agent
import uuid
import logging
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

app = FastAPI(title="BenchMark My Website API", version="1.0.0")

# Configure logging to capture browser_use logs
logging.basicConfig(level=logging.INFO)
browser_use_logger = logging.getLogger("browser_use")

class CustomLogHandler(logging.Handler):
    """Custom log handler to capture browser_use logs and forward them to sessions."""
    
    def __init__(self):
        super().__init__()
        self.current_session_id = None
    
    def set_session_id(self, session_id: str):
        """Set the current session ID for log forwarding."""
        self.current_session_id = session_id
    
    def emit(self, record):
        """Emit log record to the current session."""
        if not self.current_session_id or self.current_session_id not in active_sessions:
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
                asyncio.create_task(emit_log(self.current_session_id, level, clean_message))
                
        except Exception as e:
            # Don't let logging errors break the application
            pass

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
supabase: Client = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# Global dictionary to store active streaming sessions
active_sessions: Dict[str, Dict[str, Any]] = {}

class BenchmarkRequest(BaseModel):
    website_url: str
    task_description: str
    user_id: str
    llm_provider: str = "openai"  # openai, anthropic, etc.
    model: str = "gpt-4o"

class BenchmarkStreamRequest(BaseModel):
    website_url: str
    task_description: str
    user_id: str
    llm_provider: str = "openai"
    model: str = "gpt-4o"
    session_id: str

class BenchmarkResponse(BaseModel):
    success: bool
    execution_time_ms: int
    error_message: Optional[str] = None
    browser_logs: List[Dict[Any, Any]] = []
    screenshot_base64: Optional[str] = None
    agent_steps: List[Dict[Any, Any]] = []

class LogEntry(BaseModel):
    timestamp: str
    level: str
    message: str
    data: Optional[Dict[str, Any]] = None

async def emit_log(session_id: str, level: str, message: str, data: Optional[Dict[str, Any]] = None):
    """Emit a log entry to the active session."""
    if session_id in active_sessions:
        log_entry = LogEntry(
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
            level=level,
            message=message,
            data=data
        )
        
        # Add to session logs
        if 'logs' not in active_sessions[session_id]:
            active_sessions[session_id]['logs'] = []
        active_sessions[session_id]['logs'].append(log_entry.model_dump())
        
        # Mark that new data is available
        active_sessions[session_id]['has_new_data'] = True

class CustomAgent(Agent):
    """Custom Agent that captures logs for streaming."""
    
    def __init__(self, session_id: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.session_id = session_id
        self.captured_logs = []
    
    async def run(self, max_steps: int = 100):
        """Override run method to capture logs."""
        await emit_log(self.session_id, "info", f"🚀 Starting benchmark task: {self.task}")
        
        try:
            # Initialize browser
            await emit_log(self.session_id, "info", "🌐 Launching browser...")
            
            # Set the session ID for the custom log handler
            custom_handler.set_session_id(self.session_id)
            
            result = await super().run(max_steps)
            
            await emit_log(self.session_id, "success", "✅ Benchmark completed successfully!")
            return result
            
        except Exception as e:
            await emit_log(self.session_id, "error", f"❌ Benchmark failed: {str(e)}")
            raise
        finally:
            # Clear session from log handler
            custom_handler.set_session_id(None)

# Override some Agent methods to capture more detailed logs
def patch_agent_methods(agent: CustomAgent):
    """Patch agent methods to capture detailed browser logs."""
    
    # Patch browser controller methods if available
    if hasattr(agent, 'browser') and agent.browser:
        browser = agent.browser
        
        # Patch controller methods
        if hasattr(browser, 'controller'):
            controller = browser.controller
            
            # Store original methods
            original_click = getattr(controller, 'click', None)
            original_type = getattr(controller, 'type', None)
            original_scroll = getattr(controller, 'scroll', None)
            original_navigate = getattr(controller, 'navigate', None)
            
            # Create logged versions
            async def logged_click(*args, **kwargs):
                element_info = f"index {args[0]}" if args else "element"
                await emit_log(agent.session_id, "action", f"🖱️ Clicking {element_info}")
                if original_click:
                    result = await original_click(*args, **kwargs)
                    await emit_log(agent.session_id, "success", f"✅ Click completed on {element_info}")
                    return result
            
            async def logged_type(*args, **kwargs):
                text = args[1] if len(args) > 1 else kwargs.get('text', 'text')
                element_info = f"index {args[0]}" if args else "element"
                await emit_log(agent.session_id, "action", f"⌨️ Typing '{text}' into {element_info}")
                if original_type:
                    result = await original_type(*args, **kwargs)
                    await emit_log(agent.session_id, "success", f"✅ Text input completed: {element_info}")
                    return result
            
            async def logged_scroll(*args, **kwargs):
                direction = args[0] if args else kwargs.get('direction', 'down')
                await emit_log(agent.session_id, "action", f"📜 Scrolling {direction}")
                if original_scroll:
                    result = await original_scroll(*args, **kwargs)
                    await emit_log(agent.session_id, "success", f"✅ Scroll completed: {direction}")
                    return result
            
            async def logged_navigate(*args, **kwargs):
                url = args[0] if args else kwargs.get('url', 'page')
                await emit_log(agent.session_id, "action", f"🌐 Navigating to: {url}")
                if original_navigate:
                    result = await original_navigate(*args, **kwargs)
                    await emit_log(agent.session_id, "success", f"✅ Navigation completed: {url}")
                    return result
            
            # Apply patches
            if original_click:
                controller.click = logged_click
            if original_type:
                controller.type = logged_type
            if original_scroll:
                controller.scroll = logged_scroll
            if original_navigate:
                controller.navigate = logged_navigate

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
        
        # Run the agent and capture results
        await emit_log(session_id, "info", "🔄 Executing benchmark...")
        result = await agent.run()
        
        execution_time = int((time.time() - start_time) * 1000)
        
        # Get the browser history and screenshots
        browser_logs = []
        screenshot_base64 = None
        agent_steps = []
        
        await emit_log(session_id, "info", "📸 Capturing final screenshot...")
        
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
                await emit_log(session_id, "info", "☁️ Uploading screenshot to Supabase...")
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

async def cleanup_session(session_id: str, delay: int = 60):
    """Clean up session after delay."""
    await asyncio.sleep(delay)
    if session_id in active_sessions:
        del active_sessions[session_id]

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