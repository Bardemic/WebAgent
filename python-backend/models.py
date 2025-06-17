from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class BenchmarkStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class SessionStatus(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class LogEntry(BaseModel):
    timestamp: str
    level: str  # info, warning, error, success, action
    message: str
    data: Optional[Dict[str, Any]] = None
    model_id: Optional[str] = None

class BenchmarkRequest(BaseModel):
    user_id: str
    website_url: str
    task_description: str

class BenchmarkStreamRequest(BaseModel):
    session_id: str
    user_id: str
    website_url: str
    task_description: str

class ModelResult(BaseModel):
    model_id: str
    model_name: str
    status: BenchmarkStatus
    success: bool
    execution_time_ms: int
    error_message: Optional[str] = None
    start_time: datetime
    end_time: datetime

class StreamingUpdate(BaseModel):
    type: str  # 'log', 'status', 'completion'
    data: Optional[Dict[str, Any]] = None 