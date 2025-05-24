# server/app/main.py - Updated with YOLO inference
import signal, asyncio, logging
from fastapi import FastAPI, Request, HTTPException, Depends
from contextlib import asynccontextmanager
import traceback
import time
from pathlib import Path

from config import Settings
from store import MemoryFrameStore
from services.connection_manager import ConnectionManager
from routers import upload, offer, analysis, inference  # Added inference router
from track import FrameTrack
from ai.yolo_inference import YOLOInferenceService
from ai.inference_store import InferenceStore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(module)s:%(lineno)d - %(message)s"
)
logger = logging.getLogger("main")

settings = Settings()
store = MemoryFrameStore()
conn_mgr = ConnectionManager(settings)

# Give FrameTrack access to our store/settings
FrameTrack.store = store
FrameTrack.settings = settings

# Configure logging filter
class ThrottledAccessLogFilter(logging.Filter):
    def __init__(self, rate_limit=1.0):
        super().__init__()
        self.rate_limit = rate_limit
        self.last_log_time = {}

    def filter(self, record):
        import re
        if hasattr(record, 'args') and len(record.args) >= 3:
            client = record.args[0]
            request = record.args[2]
            match = re.search(r"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) (/[^\s]*)", request)
            if not match:
                return True

            path = match.group(2)
            key = f"{client}:{path}"
            current_time = time.time()
            last_time = self.last_log_time.get(key, 0)

            if current_time - last_time >= self.rate_limit:
                self.last_log_time[key] = current_time
                if len(self.last_log_time) > 1000:
                    cutoff = current_time - 3600
                    self.last_log_time = {k: v for k, v in self.last_log_time.items() if v > cutoff}
                return True
            else:
                return False
        return True

def configure_logging():
    access_logger = logging.getLogger("uvicorn.access")
    access_logger.addFilter(ThrottledAccessLogFilter(rate_limit=10.0))
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        app.state.settings = settings
        app.state.store = store
        app.state.conn_mgr = conn_mgr

        # Configure logging
        configure_logging()

        # Initialize inference services
        app.state.inference_store = InferenceStore(expiration=120.0)

        # Check if YOLO model exists
        # YOUR MODEL SHOULD BE PLACED AT: server/models/best.pt
        model_path = Path("models/best.pt")
        if model_path.exists():
            logger.info(f"Initializing YOLO inference service with model: {model_path}")
            app.state.yolo_service = YOLOInferenceService(
                model_path=str(model_path),
                config={
                    'conf_threshold': 0.5,
                    'iou_threshold': 0.45,
                    'max_det': 100,
                    'debug': False
                }
            )
            logger.info("YOLO inference service initialized successfully")
        else:
            logger.warning(f"YOLO model not found at {model_path}. Inference service disabled.")
            app.state.yolo_service = None

        # Start background tasks
        cleanup_task = asyncio.create_task(run_cleanup(app))
        lock_cleanup_task = asyncio.create_task(run_lock_cleanup())
        stats_task = asyncio.create_task(run_stats_logging(app))
        inference_cleanup_task = asyncio.create_task(run_inference_cleanup(app))

        app.state.cleanup_tasks = [cleanup_task, lock_cleanup_task, stats_task, inference_cleanup_task]

        # Setup signal handlers
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, loop.stop)

        logger.info("Application startup complete with YOLO inference enabled")
        yield

    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        logger.error(traceback.format_exc())
        raise

    # Shutdown
    try:
        logger.info("Shutting down — closing all connections and tasks")
        if hasattr(app.state, 'cleanup_tasks'):
            for task in app.state.cleanup_tasks:
                task.cancel()
        await conn_mgr.close_all()
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")
        logger.error(traceback.format_exc())

async def run_cleanup(app):
    """Background task to clean up expired entries"""
    while True:
        try:
            await asyncio.sleep(60)
            # Clean up old entries if needed
        except asyncio.CancelledError:
            logger.info("Cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            await asyncio.sleep(5)

async def run_lock_cleanup():
    """Background task to clean up processing locks"""
    while True:
        try:
            await asyncio.sleep(120)
            from routers.upload import cleanup_locks
            await cleanup_locks(timeout=300)
        except asyncio.CancelledError:
            logger.info("Lock cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Error during lock cleanup: {str(e)}")
            await asyncio.sleep(5)

async def run_inference_cleanup(app):
    """Background task to clean up expired inference results"""
    while True:
        try:
            await asyncio.sleep(60)
            if hasattr(app.state, "inference_store"):
                await app.state.inference_store.cleanup_expired()
        except asyncio.CancelledError:
            logger.info("Inference cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Error during inference cleanup: {str(e)}")
            await asyncio.sleep(5)

async def run_stats_logging(app):
    """Background task to log performance statistics"""
    while True:
        try:
            await asyncio.sleep(30)

            from routers.upload import processing_locks
            active_sessions = len(processing_locks)

            stats_msg = f"Server stats: {active_sessions} active sessions"

            # Add YOLO stats if available
            if hasattr(app.state, "yolo_service") and app.state.yolo_service:
                if hasattr(app.state.yolo_service, "is_initialized"):
                    stats_msg += f", YOLO: {'ready' if app.state.yolo_service.is_initialized else 'not ready'}"

            logger.info(stats_msg)

        except asyncio.CancelledError:
            logger.info("Stats logging task cancelled")
            break
        except Exception as e:
            logger.error(f"Error during stats logging: {str(e)}")
            await asyncio.sleep(5)

# Create FastAPI app
app = FastAPI(
    title="Clash Royale Coaching Server with YOLO",
    description="Real-time streaming and YOLO inference for Clash Royale",
    version="2.0.0",
    lifespan=lifespan
)

# Add routers
app.include_router(upload.router)
app.include_router(offer.router)
app.include_router(analysis.router)
app.include_router(inference.router)  # New inference router

# Health check endpoint
@app.get("/health")
async def health_check(request: Request):
    """Health check endpoint with YOLO status"""
    from routers.upload import processing_locks

    active_sessions = len(processing_locks)

    stats = {
        "status": "healthy",
        "active_sessions": active_sessions,
    }

    # Add YOLO status
    if hasattr(request.app.state, "yolo_service"):
        yolo = request.app.state.yolo_service
        stats["yolo"] = {
            "available": yolo is not None,
            "initialized": yolo.is_initialized if yolo else False,
            "model_path": str(yolo.model_path) if yolo else None
        }

    return stats

# Get stream stats with inference info
@app.get("/api/stream-stats/{code}")
async def stream_stats(code: str, request: Request):
    """Get detailed statistics including inference results"""
    from routers.upload import last_processed_time, processing_locks, dropped_frames

    is_active = code in last_processed_time

    stats = {
        "code": code,
        "active": is_active,
        "last_upload": int(time.time() - last_processed_time.get(code, 0)) if is_active else None,
    }

    # Add dropped frame stats
    if code in dropped_frames:
        session_drops = dropped_frames[code]
        stats["dropped_frames"] = {
            "count": session_drops.get("count", 0),
            "reason": session_drops.get("last_dropped_reason", None),
            "reasons": session_drops.get("reasons", {}),
        }

    # Add inference stats
    if hasattr(request.app.state, "inference_store"):
        inference_result = await request.app.state.inference_store.get_inference(code)
        if inference_result:
            stats["inference"] = {
                "available": True,
                "detections": len(inference_result.get("detections", [])),
                "last_inference_time": inference_result.get("inference_time", 0),
                "success": inference_result.get("success", False)
            }
        else:
            stats["inference"] = {"available": False}

    return stats

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        log_level="info",
        access_log=True,
        reload=True,
    )