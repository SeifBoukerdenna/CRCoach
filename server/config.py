import os

# network
HOST = os.getenv("SERVER_HOST", "0.0.0.0")
PORT = int(os.getenv("SERVER_PORT", 8080))

# video processing
TARGET_WIDTH = int(os.getenv("TARGET_WIDTH", 320))  # Reduced from 720px for lower latency
JPEG_HEADER = b"\xFF\xD8"  # magic bytes for JPEG

# WebRTC configuration
MAX_BITRATE = 1500  # kbps
MIN_BITRATE = 500   # kbps
ICE_TIMEOUT = 1.0   # seconds

# Frame processing
# Skip frame processing if CPU usage is above this percentage
CPU_THRESHOLD = 80  # percent