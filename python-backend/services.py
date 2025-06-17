import asyncio
import os
import time
import re
from typing import Optional, Dict, Any
import logging
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# Import models
from models import LogEntry

# Load environment variables
load_dotenv()

# Global dictionary to store active streaming sessions
active_sessions: Dict[str, Dict[str, Any]] = {}

class CustomLogHandler(logging.Handler):
    """Custom log handler to capture browser_use logs and forward them to sessions."""
    
    def __init__(self):
        super().__init__()
        self.current_session_id: Optional[str] = None
    
    def set_session_id(self, session_id: Optional[str]):
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

def get_llm(provider: str, model: str):
    """Get the appropriate LLM based on provider and model."""
    if provider.lower() == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            temperature=0
        )
    elif provider.lower() == "anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
        return ChatAnthropic(
            model_name=model,
            anthropic_api_key=api_key,
            temperature=0
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")

async def cleanup_session(session_id: str, delay: int = 60):
    """Clean up session after delay."""
    await asyncio.sleep(delay)
    if session_id in active_sessions:
        del active_sessions[session_id] 