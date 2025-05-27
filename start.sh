#!/bin/bash

# Royal Trainer Startup Script
echo "🚀 Starting Royal Trainer Development Environment..."

# Function to check if a port is available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $1 is already in use!"
        echo "   Kill the process using: kill \$(lsof -ti:$1)"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Check required ports
echo "🔍 Checking required ports..."
check_port 8080 || exit 1
check_port 3000 || exit 1

# Start Python WebRTC server in background
echo "🐍 Starting Python WebRTC server (port 8080)..."
cd server
python main.py &
PYTHON_PID=$!
echo "✅ Python server started with PID $PYTHON_PID"

# Wait a moment for Python server to start
sleep 3

# Start React development server
echo "⚛️  Starting React development server (port 3000)..."
cd ../royal_trainer_client
npm run dev &
REACT_PID=$!
echo "✅ React server started with PID $REACT_PID"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $PYTHON_PID 2>/dev/null
    kill $REACT_PID 2>/dev/null
    echo "✅ Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo ""
echo "🎉 Royal Trainer is now running!"
echo "📱 React UI: http://localhost:3000"
echo "🐍 Python debug viewer: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for servers and monitor
wait