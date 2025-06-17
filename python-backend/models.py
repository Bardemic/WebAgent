from typing import Optional, Dict, Any, List
from pydantic import BaseModel


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