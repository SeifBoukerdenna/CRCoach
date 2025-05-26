from typing import Set, Optional, Dict, List
from pydantic import BaseModel, Field, Any
from datetime import datetime
from .connection import Connection, ConnectionRole

class SessionStats(BaseModel):
    """Session statistics model"""
    session_code: str
    has_broadcaster: bool
    viewer_count: int
    max_viewers: int
    created_at: datetime
    last_activity: datetime
    age_minutes: float
    inactive_minutes: float
    message_count: int
    webrtc_established: bool
    connection_attempts: int

class WebRTCSession(BaseModel):
    """WebRTC session model"""

    session_code: str
    created_at: datetime = Field(default_factory=datetime.now)
    last_activity: datetime = Field(default_factory=datetime.now)

    # Connection tracking
    broadcaster: Optional[Connection] = None
    viewers: Dict[str, Connection] = Field(default_factory=dict)

    # Session settings
    max_viewers: int = 10

    # State tracking
    message_count: int = 0
    connection_attempts: int = 0
    webrtc_established: bool = False

    # Session metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

    def add_broadcaster(self, connection: Connection) -> bool:
        """Add broadcaster to session"""
        if self.broadcaster:
            # Replace existing broadcaster
            pass

        self.broadcaster = connection
        self.update_activity()
        return True

    def add_viewer(self, connection: Connection) -> bool:
        """Add viewer to session"""
        if len(self.viewers) >= self.max_viewers:
            return False

        self.viewers[connection.id] = connection
        self.update_activity()
        return True

    def remove_broadcaster(self) -> Optional[Connection]:
        """Remove broadcaster from session"""
        if self.broadcaster:
            removed = self.broadcaster
            self.broadcaster = None
            self.webrtc_established = False
            self.update_activity()
            return removed
        return None

    def remove_viewer(self, connection_id: str) -> Optional[Connection]:
        """Remove viewer from session"""
        if connection_id in self.viewers:
            removed = self.viewers.pop(connection_id)
            self.update_activity()
            return removed
        return None

    def get_all_connections(self) -> List[Connection]:
        """Get all connections in session"""
        connections = []
        if self.broadcaster:
            connections.append(self.broadcaster)
        connections.extend(self.viewers.values())
        return connections

    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.now()

    def is_empty(self) -> bool:
        """Check if session is empty"""
        return not self.broadcaster and len(self.viewers) == 0

    def is_expired(self, timeout_minutes: int = 5) -> bool:
        """Check if session is expired"""
        inactive_seconds = (datetime.now() - self.last_activity).total_seconds()
        return inactive_seconds > (timeout_minutes * 60)

    def get_stats(self) -> SessionStats:
        """Get session statistics"""
        now = datetime.now()
        age_minutes = (now - self.created_at).total_seconds() / 60
        inactive_minutes = (now - self.last_activity).total_seconds() / 60

        return SessionStats(
            session_code=self.session_code,
            has_broadcaster=bool(self.broadcaster),
            viewer_count=len(self.viewers),
            max_viewers=self.max_viewers,
            created_at=self.created_at,
            last_activity=self.last_activity,
            age_minutes=round(age_minutes, 2),
            inactive_minutes=round(inactive_minutes, 2),
            message_count=self.message_count,
            webrtc_established=self.webrtc_established,
            connection_attempts=self.connection_attempts
        )