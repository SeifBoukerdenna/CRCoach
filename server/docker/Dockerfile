FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1-mesa-glx \
    libgtk-3-0 \
  && rm -rf /var/lib/apt/lists/*

# Copy requirements & install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your entire app
COPY . .

# Create dirs for models & debug
RUN mkdir -p models debug_outputs/detections debug_outputs/raw_frames

# Run as non-root
RUN useradd -m -u 1000 webrtc && chown -R webrtc:webrtc /app
USER webrtc

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# **Always listen on 0.0.0.0 so Docker’s port mapping works**
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "info"]
