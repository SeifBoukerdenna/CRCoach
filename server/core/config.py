import os
from typing import Optional
from pydantic_settings import BaseSettings

class WebRTCSettings(BaseSettings):
    """WebRTC server configuration"""

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8080
    debug: bool = False

    # Session settings
    max_sessions: int = 1000
    max_viewers_per_session: int = 10
    session_timeout_minutes: int = 5
    connection_timeout_seconds: int = 30

    # Rate limiting
    max_connections_per_ip: int = 5
    max_messages_per_connection: int = 1000
    rate_limit_window_seconds: int = 60

    # WebSocket settings
    websocket_ping_interval: int = 20
    websocket_ping_timeout: int = 10

    # Monitoring
    stats_log_interval: int = 30
    cleanup_interval: int = 120

    # Security
    allowed_origins: list = ["*"]
    enable_cors: bool = True

    class Config:
        env_prefix = "WEBRTC_"
        case_sensitive = False

settings = WebRTCSettings()