import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class ConnectionRole(str, Enum):
    """Connection role enumeration"""
    BROADCASTER = "broadcaster"
    VIEWER = "viewer"

class ConnectionState(str, Enum):
    """Connection state enumeration"""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"

class ConnectionMetrics(BaseModel):
    """Connection metrics model"""
    messages_sent: int = 0
    messages_received: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    last_ping: Optional[datetime] = None
    last_pong: Optional[datetime] = None

class Connection(BaseModel):
    """WebRTC connection model"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    role: ConnectionRole
    session_code: str
    client_ip: str
    user_agent: Optional[str] = None

    # State management
    state: ConnectionState = ConnectionState.CONNECTING
    connected_at: datetime = Field(default_factory=datetime.now)
    last_activity: datetime = Field(default_factory=datetime.now)

    # Health monitoring
    is_alive: bool = True
    ping_failures: int = 0

    # Metrics
    metrics: ConnectionMetrics = Field(default_factory=ConnectionMetrics)

    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.now()

    def is_healthy(self, timeout_seconds: int = 30) -> bool:
        """Check if connection is healthy"""
        if not self.is_alive:
            return False

        inactive_seconds = (datetime.now() - self.last_activity).total_seconds()
        return inactive_seconds <= timeout_seconds

    def get_uptime_seconds(self) -> float:
        """Get connection uptime in seconds"""
        return (datetime.now() - self.connected_at).total_seconds()
