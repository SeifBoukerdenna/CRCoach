# server/core/config.py - Hardcoded values, no environment variables
from datetime import datetime

class Config:
    """Configuration settings for the WebRTC server with STRICT single viewer enforcement"""

    # Server settings
    HOST = "0.0.0.0"
    PORT = 8080
    VERSION = "1.2.1-full-dns"

    # Session settings - SINGLE VIEWER ENFORCEMENT
    MAX_VIEWERS_PER_SESSION = 1  # STRICTLY ENFORCED - NO EXCEPTIONS
    SESSION_TIMEOUT_MINUTES = 15

    # Rate limiting - Optimized for single viewer sessions
    MAX_MESSAGES_PER_CONNECTION = 1500
    MAX_CONNECTIONS_PER_IP = 10

    # Background task intervals
    CLEANUP_INTERVAL = 60
    STATS_INTERVAL = 30
    PING_INTERVAL = 60

    # Infinite timeouts for inference streams
    BROADCASTER_TIMEOUT_SECONDS = 0  # 0 = infinite
    VIEWER_TIMEOUT_SECONDS = 0       # 0 = infinite

    # Connection settings
    MAX_RECONNECT_ATTEMPTS = 5

    # WebRTC settings
    WEBRTC_STUN_SERVERS = [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302"
    ]

    # Performance settings
    ENABLE_DETAILED_LOGGING = True
    LOG_VIEWER_CONNECTIONS = True

    # Inference settings
    INFERENCE_FPS_LIMIT = 8
    MAX_INFERENCE_SESSIONS = 100  # Support many concurrent inference streams

    # Single viewer enforcement flags
    STRICT_SINGLE_VIEWER_ENFORCEMENT = True
    REJECT_MULTIPLE_VIEWERS = True
    ENABLE_SESSION_AVAILABILITY_CHECK = True

    @staticmethod
    def get_session_timeout_seconds():
        return Config.SESSION_TIMEOUT_MINUTES * 60

    @staticmethod
    def get_viewer_timeout_seconds():
        return Config.VIEWER_TIMEOUT_SECONDS

    @staticmethod
    def get_broadcaster_timeout_seconds():
        return Config.BROADCASTER_TIMEOUT_SECONDS

    @staticmethod
    def get_max_viewers_per_session():
        return 1  # HARDCODED - NO EXCEPTIONS

    @staticmethod
    def should_log_viewer_details():
        return Config.ENABLE_DETAILED_LOGGING and Config.LOG_VIEWER_CONNECTIONS

    @staticmethod
    def get_webrtc_config():
        return {
            "iceServers": [{"urls": server} for server in Config.WEBRTC_STUN_SERVERS]
        }

    @staticmethod
    def validate_session_code(session_code: str) -> bool:
        return (
            session_code and
            session_code.isdigit() and
            len(session_code) == 4 and
            1000 <= int(session_code) <= 9999
        )

    @staticmethod
    def get_performance_config():
        return {
            "max_viewers_per_session": 1,
            "single_viewer_enforcement": True,
            "strict_enforcement": Config.STRICT_SINGLE_VIEWER_ENFORCEMENT,
            "reject_multiple_viewers": Config.REJECT_MULTIPLE_VIEWERS,
            "session_availability_check": Config.ENABLE_SESSION_AVAILABILITY_CHECK,
            "max_messages_per_connection": Config.MAX_MESSAGES_PER_CONNECTION,
            "max_connections_per_ip": Config.MAX_CONNECTIONS_PER_IP,
            "inference_fps_limit": Config.INFERENCE_FPS_LIMIT,
            "max_inference_sessions": Config.MAX_INFERENCE_SESSIONS,
            "cleanup_interval": Config.CLEANUP_INTERVAL,
            "stats_interval": Config.STATS_INTERVAL,
            "viewer_timeout_seconds": Config.VIEWER_TIMEOUT_SECONDS,
            "broadcaster_timeout_seconds": Config.BROADCASTER_TIMEOUT_SECONDS
        }

    @staticmethod
    def get_single_viewer_config():
        return {
            "enforcement_enabled": Config.STRICT_SINGLE_VIEWER_ENFORCEMENT,
            "max_viewers_per_session": 1,
            "reject_multiple_viewers": Config.REJECT_MULTIPLE_VIEWERS,
            "availability_check_enabled": Config.ENABLE_SESSION_AVAILABILITY_CHECK,
            "optimized_timeouts": {
                "viewer_timeout": Config.VIEWER_TIMEOUT_SECONDS,
                "broadcaster_timeout": Config.BROADCASTER_TIMEOUT_SECONDS,
                "session_timeout": Config.get_session_timeout_seconds()
            },
            "optimized_intervals": {
                "cleanup_interval": Config.CLEANUP_INTERVAL,
                "stats_interval": Config.STATS_INTERVAL,
                "ping_interval": Config.PING_INTERVAL
            }
        }

    @staticmethod
    def log_config():
        print("🔧 Server Configuration (SINGLE VIEWER ENFORCEMENT):")
        print(f"   📡 Host: {Config.HOST}:{Config.PORT}")
        print(f"   👤 Max viewers per session: {Config.get_max_viewers_per_session()} (STRICTLY ENFORCED)")
        print(f"   🚫 Multiple viewer rejection: {'ENABLED' if Config.REJECT_MULTIPLE_VIEWERS else 'DISABLED'}")
        print(f"   ✅ Session availability check: {'ENABLED' if Config.ENABLE_SESSION_AVAILABILITY_CHECK else 'DISABLED'}")
        print(f"   ⏰ Session timeout: {Config.SESSION_TIMEOUT_MINUTES} minutes")
        print(f"   🚀 Max connections per IP: {Config.MAX_CONNECTIONS_PER_IP}")
        print(f"   📊 Stats interval: {Config.STATS_INTERVAL} seconds")
        print(f"   🧹 Cleanup interval: {Config.CLEANUP_INTERVAL} seconds")
        print(f"   🧠 Max inference sessions: {Config.MAX_INFERENCE_SESSIONS}")
        print(f"   🎯 Inference FPS limit: {Config.INFERENCE_FPS_LIMIT}")
        print(f"   ⏱️ Viewer timeout: {Config.VIEWER_TIMEOUT_SECONDS}s (0=infinite)")
        print(f"   ⏱️ Broadcaster timeout: {Config.BROADCASTER_TIMEOUT_SECONDS}s (0=infinite)")
        if Config.ENABLE_DETAILED_LOGGING:
            print(f"   📝 Detailed logging: ENABLED")
        else:
            print(f"   📝 Detailed logging: DISABLED")

        print(f"   🔒 SINGLE VIEWER ENFORCEMENT: {'ACTIVE' if Config.STRICT_SINGLE_VIEWER_ENFORCEMENT else 'INACTIVE'}")

        if Config.STRICT_SINGLE_VIEWER_ENFORCEMENT:
            print("   ⚠️  NO EXCEPTIONS: Only 1 viewer allowed per broadcast session")
            print("   ⚠️  Multiple viewer attempts will be REJECTED")
            print("   ⚠️  Session availability checked before connection")

    @staticmethod
    def is_single_viewer_enforcement_enabled():
        return Config.STRICT_SINGLE_VIEWER_ENFORCEMENT

    @staticmethod
    def should_reject_multiple_viewers():
        return Config.REJECT_MULTIPLE_VIEWERS

    @staticmethod
    def should_check_session_availability():
        return Config.ENABLE_SESSION_AVAILABILITY_CHECK