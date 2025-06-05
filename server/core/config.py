"""
server/core/config.py - Updated configuration for better multiple viewer support
"""

import os
from datetime import datetime

class Config:
    """Configuration settings for the WebRTC server with enhanced multi-viewer support"""

    # Server settings
    HOST = "0.0.0.0"
    PORT = 8080

    # Session settings - Increased limits for better multi-viewer support
    MAX_VIEWERS_PER_SESSION = int(os.getenv('MAX_VIEWERS_PER_SESSION', '100'))  # Increased from 10 to 100
    SESSION_TIMEOUT_MINUTES = int(os.getenv('SESSION_TIMEOUT_MINUTES', '30'))    # Increased from 5 to 30

    # Rate limiting - Adjusted for multiple viewers
    MAX_MESSAGES_PER_CONNECTION = int(os.getenv('MAX_MESSAGES_PER_CONNECTION', '2000'))  # Increased from 1000
    MAX_CONNECTIONS_PER_IP = int(os.getenv('MAX_CONNECTIONS_PER_IP', '20'))             # Increased from 5

    # Background task intervals
    CLEANUP_INTERVAL = int(os.getenv('CLEANUP_INTERVAL', '60'))     # Reduced from 120 to 60 seconds for better cleanup
    STATS_INTERVAL = int(os.getenv('STATS_INTERVAL', '30'))        # 30 seconds
    PING_INTERVAL = int(os.getenv('PING_INTERVAL', '25'))          # 25 seconds

    # Connection settings
    MAX_RECONNECT_ATTEMPTS = int(os.getenv('MAX_RECONNECT_ATTEMPTS', '3'))  # Increased from 2 to 3

    # New settings for multi-viewer optimization
    VIEWER_TIMEOUT_SECONDS = int(os.getenv('VIEWER_TIMEOUT_SECONDS', '60'))    # Individual viewer timeout
    BROADCASTER_TIMEOUT_SECONDS = int(os.getenv('BROADCASTER_TIMEOUT_SECONDS', '120'))  # Broadcaster timeout

    # WebRTC settings
    WEBRTC_STUN_SERVERS = [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302"
    ]

    # Performance settings
    ENABLE_DETAILED_LOGGING = os.getenv('ENABLE_DETAILED_LOGGING', 'false').lower() == 'true'
    LOG_VIEWER_CONNECTIONS = os.getenv('LOG_VIEWER_CONNECTIONS', 'true').lower() == 'true'

    # Inference settings
    INFERENCE_FPS_LIMIT = int(os.getenv('INFERENCE_FPS_LIMIT', '10'))  # Limit inference FPS to reduce load
    MAX_INFERENCE_SESSIONS = int(os.getenv('MAX_INFERENCE_SESSIONS', '5'))  # Limit concurrent inference sessions

    @staticmethod
    def get_session_timeout_seconds():
        """Get session timeout in seconds"""
        return Config.SESSION_TIMEOUT_MINUTES * 60

    @staticmethod
    def get_viewer_timeout_seconds():
        """Get viewer-specific timeout in seconds"""
        return Config.VIEWER_TIMEOUT_SECONDS

    @staticmethod
    def get_broadcaster_timeout_seconds():
        """Get broadcaster-specific timeout in seconds"""
        return Config.BROADCASTER_TIMEOUT_SECONDS

    @staticmethod
    def get_max_viewers_per_session():
        """Get maximum viewers per session"""
        return Config.MAX_VIEWERS_PER_SESSION

    @staticmethod
    def should_log_viewer_details():
        """Check if detailed viewer logging is enabled"""
        return Config.ENABLE_DETAILED_LOGGING and Config.LOG_VIEWER_CONNECTIONS

    @staticmethod
    def get_webrtc_config():
        """Get WebRTC configuration"""
        return {
            "iceServers": [{"urls": server} for server in Config.WEBRTC_STUN_SERVERS]
        }

    @staticmethod
    def validate_session_code(session_code: str) -> bool:
        """Validate session code format"""
        return (
            session_code and
            session_code.isdigit() and
            len(session_code) == 4 and
            1000 <= int(session_code) <= 9999
        )

    @staticmethod
    def get_performance_config():
        """Get performance-related configuration"""
        return {
            "max_viewers_per_session": Config.MAX_VIEWERS_PER_SESSION,
            "max_messages_per_connection": Config.MAX_MESSAGES_PER_CONNECTION,
            "max_connections_per_ip": Config.MAX_CONNECTIONS_PER_IP,
            "inference_fps_limit": Config.INFERENCE_FPS_LIMIT,
            "max_inference_sessions": Config.MAX_INFERENCE_SESSIONS,
            "cleanup_interval": Config.CLEANUP_INTERVAL,
            "stats_interval": Config.STATS_INTERVAL
        }

    @staticmethod
    def log_config():
        """Log current configuration"""
        print("🔧 Server Configuration:")
        print(f"   📡 Host: {Config.HOST}:{Config.PORT}")
        print(f"   👥 Max viewers per session: {Config.MAX_VIEWERS_PER_SESSION}")
        print(f"   ⏰ Session timeout: {Config.SESSION_TIMEOUT_MINUTES} minutes")
        print(f"   🚀 Max connections per IP: {Config.MAX_CONNECTIONS_PER_IP}")
        print(f"   📊 Stats interval: {Config.STATS_INTERVAL} seconds")
        print(f"   🧹 Cleanup interval: {Config.CLEANUP_INTERVAL} seconds")
        print(f"   🧠 Max inference sessions: {Config.MAX_INFERENCE_SESSIONS}")
        print(f"   🎯 Inference FPS limit: {Config.INFERENCE_FPS_LIMIT}")
        if Config.ENABLE_DETAILED_LOGGING:
            print(f"   📝 Detailed logging: ENABLED")
        else:
            print(f"   📝 Detailed logging: DISABLED")