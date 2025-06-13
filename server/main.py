"""
server/main.py - Updated with single viewer enforcement
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

# ✅ Import inference routes
from api.inference_routes import router as inference_router

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
    """Application lifespan with single viewer enforcement"""
    print("🚀 FastAPI WebRTC + AI Analysis Server starting...")
    print("👤 SINGLE VIEWER ENFORCEMENT ENABLED")
    print("🚫 Maximum 1 viewer per broadcast session")

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
        print(f"📋 Model classes: {inference_service.get_stats()['classes']}")
        print(f"🎯 Inference FPS limit: {Config.INFERENCE_FPS_LIMIT}")
        print(f"🧠 Max concurrent inference sessions: {Config.MAX_INFERENCE_SESSIONS}")
    else:
        print("⚠️ YOLOv8 model not available - inference features disabled")
        print("   Make sure 'models/best.pt' exists and ultralytics is installed")

    # Start background tasks with single viewer monitoring
    print("🔄 Starting background tasks...")
    cleanup_handle = asyncio.create_task(cleanup_task(session_manager))
    stats_handle = asyncio.create_task(stats_task(session_manager))

    # Add single viewer monitoring task
    monitoring_handle = asyncio.create_task(monitor_single_viewer_sessions(session_manager))

    background_tasks.extend([cleanup_handle, stats_handle, monitoring_handle])

    print("✅ Server startup complete")
    print(f"👤 SINGLE VIEWER LIMIT: 1 viewer per session (STRICTLY ENFORCED)")
    print(f"🔗 Maximum {Config.MAX_CONNECTIONS_PER_IP} connections per IP address")

    yield

    # Cleanup
    print("🛑 Server shutting down...")

    # Cleanup YOLO service
    if inference_service:
        inference_service.cleanup()

    # Cancel background tasks
    for task in background_tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    # Enhanced cleanup for single viewer sessions
    total_connections_closed = 0

    for session in list(session_manager.sessions.values()):
        session_connections = 0

        # Close broadcaster
        if session.broadcaster:
            try:
                await session.broadcaster.close(code=1000, reason="Server shutting down")
                session_connections += 1
            except Exception as e:
                print(f"⚠️ Error closing broadcaster in session {session.session_code}: {e}")

        # Close the single viewer (if any)
        for viewer in list(session.viewers):
            try:
                await viewer.close(code=1000, reason="Server shutting down")
                session_connections += 1
            except Exception as e:
                print(f"⚠️ Error closing viewer in session {session.session_code}: {e}")

        if session_connections > 0:
            print(f"🔌 Closed {session_connections} connections in single viewer session {session.session_code}")
        total_connections_closed += session_connections

    session_manager.sessions.clear()
    print(f"✅ Server shutdown complete - closed {total_connections_closed} total connections from single viewer sessions")

async def monitor_single_viewer_sessions(session_manager):
    """Monitor single viewer sessions for performance insights"""
    while True:
        try:
            # Check every 2 minutes
            await asyncio.sleep(120)

            active_sessions = []
            full_sessions = []
            available_sessions = []
            total_viewers = 0

            for session in session_manager.sessions.values():
                viewer_count = len(session.viewers)
                total_viewers += viewer_count

                session_info = {
                    'code': session.session_code,
                    'viewers': viewer_count,
                    'has_broadcaster': session.broadcaster is not None,
                    'webrtc_established': session.webrtc_established,
                    'uptime': (session.last_activity - session.created_at).total_seconds(),
                    'is_full': session.is_full(),
                    'available': session.is_available_for_viewer()
                }

                active_sessions.append(session_info)

                if session.is_full():
                    full_sessions.append(session_info)
                elif session.is_available_for_viewer():
                    available_sessions.append(session_info)

            if active_sessions:
                print("🎯 Single Viewer Session Report:")
                print(f"📊 Total sessions: {len(active_sessions)}")
                print(f"👤 Total viewers: {total_viewers}")
                print(f"🔴 Full sessions (1/1): {len(full_sessions)}")
                print(f"🟢 Available sessions (0/1): {len(available_sessions)}")

                for session_info in sorted(active_sessions, key=lambda x: (not x['has_broadcaster'], -x['uptime'])):
                    status = "🟢" if session_info['has_broadcaster'] and session_info['webrtc_established'] else "🟡"
                    availability = "🔴 FULL" if session_info['is_full'] else "🟢 AVAILABLE"
                    print(f"  {status} Session {session_info['code']}: {session_info['viewers']}/1 viewers {availability}, "
                          f"uptime: {session_info['uptime']:.0f}s")

                # Performance warnings
                if len(full_sessions) > len(active_sessions) * 0.8:
                    print(f"⚠️ Warning: {len(full_sessions)}/{len(active_sessions)} sessions are at capacity")

                # Server capacity analysis
                capacity_info = session_manager.get_server_capacity_info()
                print(f"📈 Server utilization: {capacity_info['capacity_utilization_percent']:.1f}% "
                      f"({total_viewers}/{capacity_info['total_capacity']} max possible viewers)")

                if capacity_info['capacity_utilization_percent'] > 80:
                    print(f"⚠️ High server utilization: {capacity_info['capacity_utilization_percent']:.1f}%")

        except Exception as e:
            print(f"❌ Error in single viewer session monitoring: {e}")

# Create FastAPI app with single viewer configuration
app = FastAPI(
    title="FastAPI WebRTC + AI Analysis Server (Single Viewer)",
    version="1.2.0-single-viewer",
    description="WebRTC server with STRICT single viewer enforcement per broadcast session",
    lifespan=lifespan
)

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

# WebSocket endpoint
app.websocket("/ws/{session_code}")(websocket_endpoint)

# Add health check with single viewer info
@app.get("/health-single-viewer")
async def single_viewer_health_check():
    """Health check with single viewer statistics"""
    capacity_info = session_manager.get_server_capacity_info()
    available_sessions = session_manager.get_available_sessions()
    full_sessions = session_manager.get_full_sessions()

    return {
        "status": "healthy",
        "version": "1.2.0-single-viewer",
        "timestamp": asyncio.get_event_loop().time(),
        "single_viewer_enforcement": {
            "enabled": True,
            "max_viewers_per_session": 1,
            "total_sessions": len(session_manager.sessions),
            "available_sessions": len(available_sessions),
            "full_sessions": len(full_sessions),
            "capacity_utilization_percent": capacity_info['capacity_utilization_percent']
        },
        "server_capacity": capacity_info,
        "configuration": Config.get_performance_config(),
        "features": {
            "single_viewer_limit": True,
            "ai_inference": get_inference_service().is_ready(),
            "detailed_logging": Config.ENABLE_DETAILED_LOGGING,
            "strict_session_enforcement": True
        }
    }

# Enhanced session status endpoint
@app.get("/api/sessions/available")
async def get_available_sessions():
    """Get sessions available for new viewers"""
    return {
        "available_sessions": session_manager.get_available_sessions(),
        "single_viewer_limit": True,
        "max_viewers_per_session": 1
    }

@app.get("/api/sessions/full")
async def get_full_sessions():
    """Get sessions that are at capacity"""
    return {
        "full_sessions": session_manager.get_full_sessions(),
        "single_viewer_limit": True,
        "max_viewers_per_session": 1
    }

# Development server runner
if __name__ == "__main__":
    print("🔧 Starting FastAPI WebRTC + AI Analysis Server...")
    print("👤 SINGLE VIEWER ENFORCEMENT ENABLED")
    print("🚫 STRICT LIMIT: Only 1 viewer per broadcast session")
    print("🧠 YOLOv8 Clash Royale troop detection enabled")
    print("🔍 Debug mode: Detection images will be saved to debug_outputs/")
    print(f"📊 Supporting EXACTLY 1 viewer per session (NO EXCEPTIONS)")

    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=False,
        log_level="info" if Config.ENABLE_DETAILED_LOGGING else "warning",
        access_log=Config.ENABLE_DETAILED_LOGGING,
        # Enhanced settings for single viewer sessions
        ws_ping_interval=Config.PING_INTERVAL,
        ws_ping_timeout=30,
        ws_max_size=16777216  # 16MB for larger frames
    )