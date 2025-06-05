"""
server/main.py - Updated with enhanced multi-viewer support
"""

import asyncio
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
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
    """Application lifespan with enhanced multi-viewer support"""
    print("🚀 FastAPI WebRTC + AI Analysis Server starting...")
    print("👥 Enhanced Multi-Viewer Support Enabled")

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

    # Start background tasks with enhanced monitoring
    print("🔄 Starting background tasks...")
    cleanup_handle = asyncio.create_task(cleanup_task(session_manager))
    stats_handle = asyncio.create_task(stats_task(session_manager))

    # Add monitoring task for multi-viewer sessions
    monitoring_handle = asyncio.create_task(monitor_multi_viewer_sessions(session_manager))

    background_tasks.extend([cleanup_handle, stats_handle, monitoring_handle])

    print("✅ Server startup complete")
    print(f"📊 Ready to handle up to {Config.MAX_VIEWERS_PER_SESSION} viewers per session")
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

    # Enhanced cleanup for multi-viewer sessions
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

        # Close all viewers
        for viewer in list(session.viewers):
            try:
                await viewer.close(code=1000, reason="Server shutting down")
                session_connections += 1
            except Exception as e:
                print(f"⚠️ Error closing viewer in session {session.session_code}: {e}")

        if session_connections > 0:
            print(f"🔌 Closed {session_connections} connections in session {session.session_code}")
        total_connections_closed += session_connections

    session_manager.sessions.clear()
    print(f"✅ Server shutdown complete - closed {total_connections_closed} total connections")

async def monitor_multi_viewer_sessions(session_manager):
    """Monitor sessions with multiple viewers for performance insights"""
    while True:
        try:
            # Check every 2 minutes
            await asyncio.sleep(120)

            multi_viewer_sessions = []
            total_viewers = 0
            max_viewers_in_session = 0

            for session in session_manager.sessions.values():
                viewer_count = len(session.viewers)
                total_viewers += viewer_count

                if viewer_count > max_viewers_in_session:
                    max_viewers_in_session = viewer_count

                if viewer_count > 1:  # Multi-viewer session
                    multi_viewer_sessions.append({
                        'code': session.session_code,
                        'viewers': viewer_count,
                        'has_broadcaster': session.broadcaster is not None,
                        'webrtc_established': session.webrtc_established,
                        'uptime': (session.last_activity - session.created_at).total_seconds()
                    })

            if multi_viewer_sessions:
                print("🎯 Multi-Viewer Session Report:")
                for session_info in sorted(multi_viewer_sessions, key=lambda x: x['viewers'], reverse=True):
                    status = "🟢" if session_info['has_broadcaster'] and session_info['webrtc_established'] else "🟡"
                    print(f"  {status} Session {session_info['code']}: {session_info['viewers']} viewers, "
                          f"uptime: {session_info['uptime']:.0f}s")

                print(f"📊 Total viewers across all sessions: {total_viewers}")
                print(f"🏆 Largest session has {max_viewers_in_session} viewers")

                # Performance warnings
                if max_viewers_in_session > Config.MAX_VIEWERS_PER_SESSION * 0.8:
                    print(f"⚠️ Warning: Session approaching viewer limit ({max_viewers_in_session}/{Config.MAX_VIEWERS_PER_SESSION})")

                # Server capacity check
                capacity_info = session_manager.get_server_capacity_info()
                if capacity_info['capacity_utilization_percent'] > 80:
                    print(f"⚠️ High server utilization: {capacity_info['capacity_utilization_percent']:.1f}%")

        except Exception as e:
            print(f"❌ Error in multi-viewer monitoring: {e}")

# Create FastAPI app with enhanced settings
app = FastAPI(
    title="FastAPI WebRTC + AI Analysis Server (Multi-Viewer)",
    version="1.1.0-multiviewer",
    description="Enhanced WebRTC server supporting multiple viewers per broadcast session",
    lifespan=lifespan
)

# Include routes
app.include_router(router)
app.include_router(inference_router, prefix="/api")

# WebSocket endpoint
app.websocket("/ws/{session_code}")(websocket_endpoint)

# Add health check with multi-viewer info
@app.get("/health-extended")
async def extended_health_check():
    """Extended health check with multi-viewer statistics"""
    capacity_info = session_manager.get_server_capacity_info()
    multi_viewer_sessions = session_manager.get_session_by_viewer_count(min_viewers=2)

    return {
        "status": "healthy",
        "version": "1.1.0-multiviewer",
        "timestamp": asyncio.get_event_loop().time(),
        "server_capacity": capacity_info,
        "multi_viewer_sessions": len(multi_viewer_sessions),
        "configuration": Config.get_performance_config(),
        "features": {
            "multi_viewer_support": True,
            "ai_inference": get_inference_service().is_ready(),
            "detailed_logging": Config.ENABLE_DETAILED_LOGGING
        }
    }

# Development server runner
if __name__ == "__main__":
    print("🔧 Starting FastAPI WebRTC + AI Analysis Server...")
    print("👥 Enhanced Multi-Viewer Support")
    print("🧠 YOLOv8 Clash Royale troop detection enabled")
    print("🔍 Debug mode: Detection images will be saved to debug_outputs/")
    print(f"📊 Supporting up to {Config.MAX_VIEWERS_PER_SESSION} viewers per session")

    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=False,
        log_level="info" if Config.ENABLE_DETAILED_LOGGING else "warning",
        access_log=Config.ENABLE_DETAILED_LOGGING,
        # Enhanced settings for multi-viewer support
        ws_ping_interval=Config.PING_INTERVAL,
        ws_ping_timeout=30,
        ws_max_size=16777216  # 16MB for larger frames
    )