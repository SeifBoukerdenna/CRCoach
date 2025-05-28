import asyncio
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from api.routes import router, session_manager
from api.websocket import websocket_endpoint
from tasks.background_tasks import cleanup_task, stats_task
from core.config import Config
from services.yolo_inference import get_inference_service

# ✅ ADD THIS LINE - Import inference routes
from api.inference_routes import router as inference_router

import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Background task handles
background_tasks = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan with YOLO initialization"""
    print("🚀 FastAPI WebRTC + AI Analysis Server starting...")

    # Initialize YOLO inference service
    print("🧠 Initializing YOLOv8 inference service...")
    inference_service = get_inference_service(
        model_path="models/best.pt",
        debug_mode=True
    )

    if inference_service.is_ready():
        print("✅ YOLOv8 model loaded successfully")
        print(f"📋 Model classes: {inference_service.get_stats()['classes']}")
    else:
        print("⚠️ YOLOv8 model not available - inference features disabled")
        print("   Make sure 'models/best.pt' exists and ultralytics is installed")

    # Start background tasks
    cleanup_handle = asyncio.create_task(cleanup_task(session_manager))
    stats_handle = asyncio.create_task(stats_task(session_manager))
    background_tasks.extend([cleanup_handle, stats_handle])

    print("✅ Server startup complete")

    yield

    # Cleanup
    print("🛑 Server shutting down...")

    # Cleanup YOLO service
    if inference_service:
        inference_service.cleanup()

    for task in background_tasks:
        task.cancel()

    # Close all connections
    for session in session_manager.sessions.values():
        if session.broadcaster:
            try:
                await session.broadcaster.close(code=1000, reason="Server shutting down")
            except:
                pass
        for viewer in session.viewers.copy():
            try:
                await viewer.close(code=1000, reason="Server shutting down")
            except:
                pass

    session_manager.sessions.clear()
    print("✅ Server shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="FastAPI WebRTC + AI Analysis Server",
    version="1.0.0-ai",
    lifespan=lifespan
)

# Include routes
app.include_router(router)

# ✅ ADD THIS LINE - Include inference routes
app.include_router(inference_router, prefix="/api")

# WebSocket endpoint
app.websocket("/ws/{session_code}")(websocket_endpoint)

# Development server runner
if __name__ == "__main__":
    print("🔧 Starting FastAPI WebRTC + AI Analysis Server...")
    print("🧠 YOLOv8 Clash Royale troop detection enabled")
    print("🔍 Debug mode: Detection images will be saved to debug_outputs/")

    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=False,
        log_level="warning",
        access_log=False
    )