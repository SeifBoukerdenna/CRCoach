#!/bin/bash
# Docker WebRTC Server Startup Script

SCRIPT_DIR="/home/malikmacbook/CRCoach/server"
IMAGE_NAME="webrtc-server"
CONTAINER_NAME="webrtc-server"
PORT="8080"

echo "Starting WebRTC server startup script..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Starting Docker..."
    sudo systemctl start docker
    sleep 5
fi

# Check if container is already running
if docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "Container ${CONTAINER_NAME} is already running"
    exit 0
fi

# Navigate to project directory
cd "$SCRIPT_DIR" || {
    echo "Error: Cannot find directory $SCRIPT_DIR"
    exit 1
}

# Check if image exists
if ! docker images --format "table {{.Repository}}" | grep -q "^${IMAGE_NAME}$"; then
    echo "Image ${IMAGE_NAME} not found. Building..."
    docker build -f docker/Dockerfile -t "$IMAGE_NAME" .

    if [ $? -ne 0 ]; then
        echo "Error: Failed to build Docker image"
        exit 1
    fi
    echo "Image built successfully"
else
    echo "Image ${IMAGE_NAME} already exists"
fi

# Stop and remove existing container if it exists but isn't running
if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "Removing existing container..."
    docker rm -f "$CONTAINER_NAME"
fi

# Run the container
echo "Starting container..."
docker run -d --name "$CONTAINER_NAME" -p "${PORT}:${PORT}" "$IMAGE_NAME"

if [ $? -eq 0 ]; then
    echo "Container started successfully"
    echo "Server should be available at: http://$(curl -s ifconfig.me):${PORT}/health"
else
    echo "Error: Failed to start container"
    exit 1
fi