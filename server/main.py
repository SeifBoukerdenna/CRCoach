import asyncio
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from api.routes import router, session_manager
from api.websocket import websocket_endpoint
from tasks.background_tasks import cleanup_task, stats_task
from core.config import Config

# Background task handles
background_tasks = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan"""
    print("🚀 FastAPI WebRTC Debug Server starting...")

    # Start background tasks
    cleanup_handle = asyncio.create_task(cleanup_task(session_manager))
    stats_handle = asyncio.create_task(stats_task(session_manager))
    background_tasks.extend([cleanup_handle, stats_handle])

    print("✅ Server startup complete")

    yield

    # Cleanup
    print("🛑 Server shutting down...")
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
    title="FastAPI WebRTC Debug Server",
    version="1.0.0-debug",
    lifespan=lifespan
)

# Include routes
app.include_router(router)

# WebSocket endpoint
app.websocket("/ws/{session_code}")(websocket_endpoint)

# Development server runner
if __name__ == "__main__":
    print("🔧 Starting FastAPI WebRTC Debug Server...")
    print("🔍 This version has detailed logging to help diagnose video streaming issues")

    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=False,
        log_level="warning",
        access_log=False
    )
