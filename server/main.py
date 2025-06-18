# server/main.py - Fixed background task calls
import asyncio
import uvicorn
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Existing imports
from api.routes import router, session_manager
from api.websocket import websocket_endpoint
from api.inference_routes import router as inference_router
from tasks.background_tasks import cleanup_task, stats_task, monitor_single_viewer_sessions
from core.config import Config
from services.yolo_inference import get_inference_service

# NEW: Discord authentication imports
from api.discord_routes import router as discord_router
from core.discord_config import DiscordConfig
from services.discord_service import get_discord_service

from core.cors import setup_cors


# Setup logging
log_level = logging.INFO if Config.ENABLE_DETAILED_LOGGING else logging.WARNING
logging.basicConfig(level=log_level, format='%(asctime)s - %(levelname)s - %(message)s')

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management with Discord auth"""
    print("🚀 FastAPI WebRTC + AI Analysis Server starting...")
    print("👤 SINGLE VIEWER ENFORCEMENT ENABLED")
    print("🔐 Discord Authentication Enabled")

    # Log configuration
    Config.log_config()

    # NEW: Validate Discord configuration
    try:
        DiscordConfig.validate_config()
        print("✅ Discord OAuth2 configuration validated")
        print(f"🎮 Target Discord Server ID: {DiscordConfig.SERVER_ID}")
    except ValueError as e:
        print(f"⚠️ Discord configuration issue: {e}")
        print("⚠️ Discord authentication will be unavailable")

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
        print("⚠️ YOLOv8 model not available - inference disabled")

    # FIXED: Start background tasks with proper arguments
    print("🔄 Starting background cleanup tasks...")
    try:
        # Pass session_manager to tasks that need it
        asyncio.create_task(cleanup_task(session_manager))
        asyncio.create_task(stats_task(session_manager))
        asyncio.create_task(monitor_single_viewer_sessions(session_manager))
        print("✅ Background tasks started successfully")
    except Exception as e:
        print(f"⚠️ Failed to start some background tasks: {e}")

    yield

    # Cleanup on shutdown
    print("🛑 Shutting down server...")

    # NEW: Close Discord service
    try:
        discord_service = get_discord_service()
        await discord_service.close()
        print("✅ Discord service closed")
    except Exception as e:
        print(f"⚠️ Error closing Discord service: {e}")

# Create FastAPI app
app = FastAPI(
    title="FastAPI WebRTC + AI Analysis Server (Single Viewer + Discord Auth)",
    version=Config.VERSION,
    description="WebRTC server with STRICT single viewer enforcement per broadcast session and Discord authentication",
    lifespan=lifespan
)

# CORS middleware - Updated for Discord OAuth2
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tormentor.dev",
        "https://www.tormentor.dev",
        "https://api.tormentor.dev",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",  # For Discord callback
        "http://127.0.0.1:8080",  # For Discord callback
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

setup_cors(app)

# Include routes
app.include_router(router, tags=["sessions"])
app.include_router(inference_router, prefix="/api")

# NEW: Include Discord authentication routes
app.include_router(discord_router, tags=["Discord Authentication"])

# WebSocket endpoint
app.websocket("/ws/{session_code}")(websocket_endpoint)

# Health check endpoint with Discord status
@app.get("/health")
async def enhanced_health_check():
    """Enhanced health check with Discord authentication status"""
    # Existing health check logic
    total_broadcasters = sum(1 for s in session_manager.sessions.values() if s.broadcaster)
    total_viewers = sum(len(s.viewers) for s in session_manager.sessions.values())

    # Discord auth status
    discord_configured = False
    try:
        DiscordConfig.validate_config()
        discord_configured = True
    except:
        pass

    return {
        "status": "healthy",
        "version": Config.VERSION,
        "sessions": {
            "total": len(session_manager.sessions),
            "broadcasters": total_broadcasters,
            "viewers": total_viewers
        },
        "inference": {
            "available": get_inference_service().is_ready(),
            "model_loaded": get_inference_service().is_ready()
        },
        "discord_auth": {
            "configured": discord_configured,
            "server_id": DiscordConfig.SERVER_ID if discord_configured else None
        }
    }

# Development server runner
if __name__ == "__main__":
    print("🔧 Starting FastAPI WebRTC + AI Analysis Server...")
    print("👤 SINGLE VIEWER ENFORCEMENT ENABLED")
    print("🚫 STRICT LIMIT: Only 1 viewer per broadcast session")
    print("🧠 YOLOv8 Clash Royale troop detection enabled")
    print("🔐 Discord OAuth2 authentication enabled")
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