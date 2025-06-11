FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (cached unless base image changes)
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

# Copy ONLY requirements.txt first (cached unless requirements.txt changes)
COPY requirements.txt .

# Install Python dependencies (cached unless requirements.txt changes)
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code LAST (rebuilds when any code changes)
COPY . .

# Create directories for models & debug
RUN mkdir -p models debug_outputs/detections debug_outputs/raw_frames

# Create non-root user and set permissions
RUN useradd -m -u 1000 webrtc && chown -R webrtc:webrtc /app
USER webrtc

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "info"]