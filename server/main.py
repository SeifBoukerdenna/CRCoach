"""
server/main.py - Updated with Discord Authentication
"""

import asyncio
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router, session_manager
from api.websocket import websocket_endpoint
from tasks.background_tasks import cleanup_task, stats_task
from core.config import Config
from services.yolo_inference import get_inference_service

# Import inference routes
from api.inference_routes import router as inference_router

# ✅ Import auth routes and services
from api.auth_routes import router as auth_router
from core.auth_config import auth_config
from services.user_session_manager import user_session_manager

import logging

# Setup logging with appropriate level
log_level = logging.INFO if Config.ENABLE_DETAILED_LOGGING else logging.WARNING
logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Background task handles
background_tasks = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan with Discord authentication"""
    print("🚀 FastAPI WebRTC + AI Analysis Server starting...")
    print("👤 SINGLE VIEWER ENFORCEMENT ENABLED")
    print("🚫 Maximum 1 viewer per broadcast session")

    # Log configuration
    Config.log_config()

    # ✅ Log authentication configuration
    auth_config.log_config()

    # Initialize YOLO inference service
    print("🧠 Initializing YOLOv8 inference service...")
    inference_service = get_inference_service(
        model_path="models/best.pt",
        debug_mode=Config.ENABLE_DETAILED_LOGGING
    )

    if inference_service.is_ready():
        print("✅ YOLOv8 model loaded successfully")
        print(f"📋 Model classes: {inference_service.get_stats()['classes']}")
        print(f"🎯 Inference FPS limit: {Config.INFERENCE_FPS_LIMIT}")
        print(f"🧠 Max concurrent inference sessions: {Config.MAX_INFERENCE_SESSIONS}")
    else:
        print("⚠️ YOLOv8 model not available - inference features disabled")
        print("   Make sure 'models/best.pt' exists and ultralytics is installed")

    # ✅ Start user session manager
    print("👥 Starting user session manager...")
    user_session_manager.start_cleanup_task()

    # Start background tasks with single viewer monitoring
    print("🔄 Starting background tasks...")
    cleanup_handle = asyncio.create_task(cleanup_task(session_manager))
    stats_handle = asyncio.create_task(stats_task(session_manager))
    background_tasks.extend([cleanup_handle, stats_handle])

    # Single viewer monitoring task
    async def monitor_single_viewer_sessions():
        """Monitor and log single viewer session compliance"""
        while True:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds

                # Get session info
                active_sessions = list(session_manager.sessions.values())
                total_viewers = sum(len(s.viewers) for s in active_sessions)
                full_sessions = [s for s in active_sessions if len(s.viewers) >= 1]

                # Get auth info
                auth_sessions = user_session_manager.get_active_sessions_count()

                if len(active_sessions) > 0:
                    print(f"📊 Session Status: {len(active_sessions)} active, {total_viewers} viewers, {auth_sessions} authenticated users")

                if len(full_sessions) > 0:
                    print(f"⚠️ Warning: {len(full_sessions)}/{len(active_sessions)} sessions are at capacity")

                # Server capacity analysis
                capacity_info = session_manager.get_server_capacity_info()
                if hasattr(session_manager, 'get_server_capacity_info'):
                    print(f"📈 Server utilization: {capacity_info['capacity_utilization_percent']:.1f}% "
                          f"({total_viewers}/{capacity_info.get('total_capacity', 'unknown')} max possible viewers)")

                    if capacity_info['capacity_utilization_percent'] > 80:
                        print(f"⚠️ High server utilization: {capacity_info['capacity_utilization_percent']:.1f}%")

            except Exception as e:
                print(f"❌ Error in session monitoring: {e}")

    monitor_handle = asyncio.create_task(monitor_single_viewer_sessions())
    background_tasks.append(monitor_handle)

    print("✅ Server startup complete!")

    yield

    # Shutdown
    print("🛑 Shutting down server...")

    # ✅ Stop user session manager
    user_session_manager.stop_cleanup_task()

    # Cancel background tasks
    for task in background_tasks:
        if not task.done():
            task.cancel()

    # Wait for tasks to complete
    if background_tasks:
        await asyncio.gather(*background_tasks, return_exceptions=True)

    print("👋 Server shutdown complete")

# Create FastAPI app with Discord authentication
app = FastAPI(
    title="FastAPI WebRTC + AI Analysis Server with Discord Auth",
    version=f"{Config.VERSION}-auth",
    description="WebRTC server with Discord authentication and STRICT single viewer enforcement",
    lifespan=lifespan
)

# ✅ Updated CORS to include auth callback URLs
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tormentor.dev",
        "https://www.tormentor.dev",
        "http://localhost:3000",  # Keep for local development
        "http://127.0.0.1:3000",  # Keep for local development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routes
app.include_router(router, tags=["sessions"])
app.include_router(inference_router, prefix="/api")

# ✅ Include auth routes
app.include_router(auth_router, prefix="/api")

# WebSocket endpoint
app.websocket("/ws/{session_code}")(websocket_endpoint)

# Add health check with authentication info
@app.get("/health")
async def health_check():
    """Enhanced health check with authentication info"""
    capacity_info = session_manager.get_server_capacity_info() if hasattr(session_manager, 'get_server_capacity_info') else {}
    session_stats = user_session_manager.get_session_stats()

    return {
        "status": "healthy",
        "version": f"{Config.VERSION}-auth",
        "timestamp": asyncio.get_event_loop().time(),
        "webrtc_sessions": {
            "active_sessions": len(session_manager.sessions),
            "total_viewers": sum(len(s.viewers) for s in session_manager.sessions.values()),
            "total_broadcasters": sum(1 for s in session_manager.sessions.values() if s.broadcaster),
        },
        "authentication": {
            "discord_configured": bool(auth_config.DISCORD_CLIENT_ID and auth_config.DISCORD_CLIENT_SECRET),
            "guild_check_enabled": bool(auth_config.DISCORD_GUILD_ID),
            "active_user_sessions": session_stats["total_sessions"],
            "session_stats": session_stats
        },
        "single_viewer_enforcement": {
            "enabled": True,
            "max_viewers_per_session": 1,
        }
    }

# Add authentication status endpoint
@app.get("/auth-info")
async def auth_info():
    """Public authentication information"""
    return {
        "discord_auth_available": bool(auth_config.DISCORD_CLIENT_ID),
        "guild_check_enabled": bool(auth_config.DISCORD_GUILD_ID),
        "login_url": "/api/auth/login" if auth_config.DISCORD_CLIENT_ID else None,
        "frontend_url": auth_config.FRONTEND_URL
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        log_level="info",
        reload=False  # Set to True for development
    )