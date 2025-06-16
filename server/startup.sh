#!/bin/bash
set -e

SCRIPT_DIR="/home/malikmacbook/CRCoach/server"
IMAGE_NAME="webrtc-server"
CONTAINER_NAME="webrtc-server"
PORT="8080"

echo "🚀 Starting WebRTC server startup script..."

# 1) Ensure Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Starting it..."
  sudo systemctl start docker
  sleep 5
fi

# 2) Switch to your project dir
cd "$SCRIPT_DIR" || {
  echo "❌ Cannot find directory $SCRIPT_DIR"
  exit 1
}

# 3) Stop and remove any existing container
if docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}\$"; then
  echo "🛑 Stopping running container ${CONTAINER_NAME}"
  docker stop "$CONTAINER_NAME"
fi

if docker ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}\$"; then
  echo "🗑️  Removing old container ${CONTAINER_NAME}"
  docker rm "$CONTAINER_NAME"
fi

# 4) Build image with layer caching (packages cached unless requirements.txt changes)
echo "🔨 Building Docker image ${IMAGE_NAME} with smart caching..."
docker build -f docker/Dockerfile -t "$IMAGE_NAME" .

# 5) Run the new container
echo "▶️  Launching container ${CONTAINER_NAME} on port ${PORT}"
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${PORT}:${PORT}" \
  "$IMAGE_NAME"

# 6) Final check
if [ $? -eq 0 ]; then
  echo "✅ Container started. Health check at: http://$(curl -s ifconfig.me):${PORT}/health"
  echo "📊 View logs: docker logs -f ${CONTAINER_NAME}"
else
  echo "❌ Failed to start container"
  exit 1
fi