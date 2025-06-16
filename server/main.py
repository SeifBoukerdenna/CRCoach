# server/main.py - Cleaned and simplified
import asyncio
import uvicorn
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router, session_manager
from api.websocket import websocket_endpoint
from api.inference_routes import router as inference_router
from tasks.background_tasks import cleanup_task, stats_task, monitor_single_viewer_sessions
from core.config import Config
from services.yolo_inference import get_inference_service

# Setup logging
log_level = logging.INFO if Config.ENABLE_DETAILED_LOGGING else logging.WARNING
logging.basicConfig(level=log_level, format='%(asctime)s - %(levelname)s - %(message)s')

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    print("🚀 FastAPI WebRTC + AI Analysis Server starting...")
    print("👤 SINGLE VIEWER ENFORCEMENT ENABLED")

    # Log configuration
    Config.log_config()

    # Initialize YOLO inference service
    print("🧠 Initializing YOLOv8 inference service...")
    inference_service = get_inference_service(
        model_path="models/best.pt",
        debug_mode=Config.ENABLE_DETAILED_LOGGING
    )

    if inference_service.is_ready():
        print("✅ YOLOv8 model loaded successfully")
        print(f"🎯 Inference FPS limit: {Config.INFERENCE_FPS_LIMIT}")
        print(f"🧠 Max concurrent inference sessions: {Config.MAX_INFERENCE_SESSIONS}")
    else:
        print("⚠️ YOLOv8 model not available - inference features disabled")

    # Start background tasks
    print("🔄 Starting background tasks...")
    background_tasks = [
        asyncio.create_task(cleanup_task(session_manager)),
        asyncio.create_task(stats_task(session_manager)),
        asyncio.create_task(monitor_single_viewer_sessions(session_manager))
    ]

    print("✅ Server startup complete")

    yield

    # Cleanup on shutdown
    print("🛑 Server shutting down...")

    if inference_service:
        inference_service.cleanup()

    # Cancel background tasks
    for task in background_tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    # Close all sessions
    total_connections_closed = 0
    for session in list(session_manager.sessions.values()):
        connections = 0

        if session.broadcaster:
            try:
                await session.broadcaster.close(code=1000, reason="Server shutting down")
                connections += 1
            except Exception as e:
                print(f"⚠️ Error closing broadcaster: {e}")

        for viewer in list(session.viewers):
            try:
                await viewer.close(code=1000, reason="Server shutting down")
                connections += 1
            except Exception as e:
                print(f"⚠️ Error closing viewer: {e}")

        total_connections_closed += connections

    session_manager.sessions.clear()
    print(f"✅ Server shutdown complete - closed {total_connections_closed} connections")

# Create FastAPI app
app = FastAPI(
    title="FastAPI WebRTC + AI Analysis Server (Single Viewer)",
    version=Config.VERSION,
    description="WebRTC server with STRICT single viewer enforcement per broadcast session",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tormentor.dev",
        "https://www.tormentor.dev",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routes
app.include_router(router, tags=["sessions"])
app.include_router(inference_router, prefix="/api")

# WebSocket endpoint
app.websocket("/ws/{session_code}")(websocket_endpoint)

# Development server runner
if __name__ == "__main__":
    print("🔧 Starting FastAPI WebRTC + AI Analysis Server...")
    print("👤 SINGLE VIEWER ENFORCEMENT ENABLED")
    print("🚫 STRICT LIMIT: Only 1 viewer per broadcast session")
    print("🧠 YOLOv8 Clash Royale troop detection enabled")
    print(f"📊 Supporting EXACTLY 1 viewer per session (NO EXCEPTIONS)")

    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=False,
        log_level="info" if Config.ENABLE_DETAILED_LOGGING else "warning",
        access_log=Config.ENABLE_DETAILED_LOGGING,
        ws_ping_interval=60,
        ws_ping_timeout=120,
        ws_max_size=16777216  # 16MB for larger frames
    )