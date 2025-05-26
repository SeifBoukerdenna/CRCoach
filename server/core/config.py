import os
from datetime import datetime

class Config:
    """Configuration settings for the WebRTC server"""

    # Server settings
    HOST = "0.0.0.0"
    PORT = 8080

    # Session settings
    MAX_VIEWERS_PER_SESSION = 10
    SESSION_TIMEOUT_MINUTES = 5

    # Rate limiting
    MAX_MESSAGES_PER_CONNECTION = 1000
    MAX_CONNECTIONS_PER_IP = 5

    # Background task intervals
    CLEANUP_INTERVAL = 120  # 2 minutes
    STATS_INTERVAL = 30     # 30 seconds
    PING_INTERVAL = 25      # 25 seconds

    # Connection settings
    MAX_RECONNECT_ATTEMPTS = 2

    @staticmethod
    def get_session_timeout_seconds():
        return Config.SESSION_TIMEOUT_MINUTES * 60
