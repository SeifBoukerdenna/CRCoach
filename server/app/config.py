# app/config.py
import os

class Settings:
    # network
    SERVER_HOST      = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT      = int(os.getenv("SERVER_PORT", 8080))

    # Redis for frames
    REDIS_URL        = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # video processing
    DEFAULT_WIDTH    = int(os.getenv("DEFAULT_TARGET_WIDTH", 320))
    TARGET_WIDTHS    = {
        "low":    int(os.getenv("WIDTH_LOW",    240)),
        "medium": int(os.getenv("WIDTH_MEDIUM", 320)),
        "high":   int(os.getenv("WIDTH_HIGH",   480)),
    }

    # timeouts & bitrates
    MAX_BITRATE      = int(os.getenv("MAX_BITRATE", 1500))
    MIN_BITRATE      = int(os.getenv("MIN_BITRATE", 500))
    ICE_TIMEOUT      = float(os.getenv("ICE_TIMEOUT", 1.0))

    FRAME_TIMEOUT    = float(os.getenv("FRAME_TIMEOUT",    1.5))
    WATCHDOG_INTERVAL= float(os.getenv("WATCHDOG_INTERVAL",0.5))
