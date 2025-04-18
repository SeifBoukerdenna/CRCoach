import os

# network
HOST = os.getenv("SERVER_HOST", "0.0.0.0")
PORT = int(os.getenv("SERVER_PORT", 8080))

# video processing
TARGET_WIDTH = int(os.getenv("TARGET_WIDTH", 720))  # px
JPEG_HEADER = b"\xFF\xD8"  # magic bytes for JPEG