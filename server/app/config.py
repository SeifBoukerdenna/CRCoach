# app/config.py - Optimized WebRTC settings for low latency
import os

class Settings:
    # network
    SERVER_HOST      = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT      = int(os.getenv("SERVER_PORT", 8080))

    # Redis for frames
    REDIS_URL        = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # video processing - reduced sizes for faster processing
    DEFAULT_WIDTH    = int(os.getenv("DEFAULT_TARGET_WIDTH", 320))
    TARGET_WIDTHS    = {
        "low":    int(os.getenv("WIDTH_LOW",    160)),   # Reduced from 240
        "medium": int(os.getenv("WIDTH_MEDIUM", 320)),   # Same
        "high":   int(os.getenv("WIDTH_HIGH",   480)),   # Same
    }

    # timeouts & bitrates - optimized for lower latency
    MAX_BITRATE      = int(os.getenv("MAX_BITRATE", 1500))
    MIN_BITRATE      = int(os.getenv("MIN_BITRATE", 500))
    ICE_TIMEOUT      = float(os.getenv("ICE_TIMEOUT", 0.5))       # Reduced from 1.0 for faster connections

    FRAME_TIMEOUT    = float(os.getenv("FRAME_TIMEOUT",    0.5))  # Reduced from 1.5 to drop stale frames faster
    WATCHDOG_INTERVAL= float(os.getenv("WATCHDOG_INTERVAL",0.25)) # Reduced from 0.5 for more responsive cleanup

    # WebRTC settings for lower latency
    RTC_CONFIGURATION = {
        "iceServers": [
            {"urls": ["stun:stun.l.google.com:19302"]},
        ],
        "sdpSemantics": "unified-plan",
        "bundlePolicy": "max-bundle",
        "rtcpMuxPolicy": "require",
        "iceTransportPolicy": "all",
    }

    # Media settings optimized for low latency
    MEDIA_CONSTRAINTS = {
        "video": {
            "frameRate": {"ideal": 30, "max": 60},
            "width": {"ideal": 480, "max": 640},
            "height": {"ideal": 360, "max": 480},
        }
    }