# app/main.py with fixed imports
import signal, asyncio, logging
from fastapi import FastAPI, Request, HTTPException, Depends
from contextlib import asynccontextmanager
import traceback
import time

from config import Settings
from store import MemoryFrameStore
from services.connection_manager import ConnectionManager
from routers import upload, offer, analysis  # Import the new analysis router
from track import FrameTrack
from ai.vision_pipeline import GameVisionPipeline
from ai.analysis_store import AnalysisStore

from services.throattled_access_log_filter import ThrottledAccessLogFilter, configure_logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(module)s:%(lineno)d - %(message)s"
)
logger = logging.getLogger("main")


settings = Settings()
store = MemoryFrameStore()
conn_mgr = ConnectionManager(settings)

# give FrameTrack access to our store/settings
FrameTrack.store = store
FrameTrack.settings = settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    try:
        app.state.settings = settings
        app.state.store = store
        app.state.conn_mgr = conn_mgr

        # Configure logging with reduced frequency
        configure_logging()

        # Set up analysis services
        app.state.analysis_store = AnalysisStore(expiration=120.0)  # Store results for 2 minutes
        app.state.vision_pipeline = GameVisionPipeline(config={
            'debug': False,
            'save_debug_images': False,
        })

        # Start background tasks for cleanup
        cleanup_task = asyncio.create_task(run_cleanup(app))
        lock_cleanup_task = asyncio.create_task(run_lock_cleanup())
        stats_task = asyncio.create_task(run_stats_logging(app))
        app.state.cleanup_tasks = [cleanup_task, lock_cleanup_task, stats_task]

        # graceful shutdown on SIGINT/SIGTERM
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, loop.stop)

        logger.info("Application startup complete with optimized logging")
        yield  # application is now running
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        logger.error(traceback.format_exc())
        raise

    # shutdown
    try:
        logger.info("Shutting down — closing all peer connections and cleanup tasks")
        if hasattr(app.state, 'cleanup_tasks'):
            for task in app.state.cleanup_tasks:
                task.cancel()
        await conn_mgr.close_all()
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")
        logger.error(traceback.format_exc())

async def run_cleanup(app):
    """Background task to clean up expired analysis entries."""
    while True:
        try:
            await asyncio.sleep(60)  # Run every minute
            await app.state.analysis_store.cleanup_expired()
        except asyncio.CancelledError:
            logger.info("Cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            logger.error(traceback.format_exc())
            await asyncio.sleep(5)

async def run_lock_cleanup():
    """Background task to clean up processing locks for inactive sessions."""
    while True:
        try:
            await asyncio.sleep(120)  # Run every 2 minutes
            from routers.upload import cleanup_locks
            await cleanup_locks(timeout=300)  # Clean locks inactive for 5 minutes
        except asyncio.CancelledError:
            logger.info("Lock cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Error during lock cleanup: {str(e)}")
            logger.error(traceback.format_exc())
            await asyncio.sleep(5)

async def run_stats_logging(app):
    """Background task to periodically log performance statistics."""
    while True:
        try:
            await asyncio.sleep(30)  # Log stats every 30 seconds

            # Log vision pipeline stats if available
            if hasattr(app.state, "vision_pipeline"):
                pipeline = app.state.vision_pipeline
                if hasattr(pipeline, "frame_count") and pipeline.frame_count > 0:
                    from routers.upload import processing_locks

                    # Calculate current stream health
                    active_sessions = len(processing_locks)
                    processing_ratio = pipeline.process_count / max(1, pipeline.frame_count)
                    avg_time = sum(pipeline.processing_times) / max(1, len(pipeline.processing_times))

                    # Log comprehensive stats
                    logger.info(
                        f"Server stats: {active_sessions} active sessions, "
                        f"processed {pipeline.process_count}/{pipeline.frame_count} frames "
                        f"({processing_ratio:.1%}), "
                        f"avg proc time: {avg_time*1000:.1f}ms, "
                        f"throttle: {pipeline.min_processing_interval*1000:.1f}ms"
                    )

        except asyncio.CancelledError:
            logger.info("Stats logging task cancelled")
            break
        except Exception as e:
            logger.error(f"Error during stats logging: {str(e)}")
            logger.error(traceback.format_exc())
            await asyncio.sleep(5)

# Create FastAPI app
app = FastAPI(
    title="Clash Royale Coaching Server",
    description="Server for Clash Royale broadcast and analysis with performance optimizations",
    version="1.0.0",
    lifespan=lifespan
)

# Add routers
app.include_router(upload.router)
app.include_router(offer.router)
app.include_router(analysis.router)

# Add a health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint with basic server stats."""
    from routers.upload import processing_locks, last_processed_time

    # Get basic stats
    active_sessions = len(processing_locks)
    pipeline = None
    if hasattr(app.state, "vision_pipeline"):
        pipeline = app.state.vision_pipeline

    stats = {
        "status": "healthy",
        "active_sessions": active_sessions,
    }

    # Add vision pipeline stats if available
    if pipeline and hasattr(pipeline, "frame_count"):
        stats.update({
            "frames_received": pipeline.frame_count,
            "frames_processed": pipeline.process_count,
            "processing_ratio": f"{pipeline.process_count/max(1, pipeline.frame_count):.1%}",
            "avg_processing_time": f"{sum(pipeline.processing_times)/max(1, len(pipeline.processing_times))*1000:.1f}ms" if pipeline.processing_times else "N/A",
            "throttle_interval": f"{pipeline.min_processing_interval*1000:.1f}ms" if hasattr(pipeline, "min_processing_interval") else "N/A"
        })

    return stats

# Add an endpoint to get stream stats for clients
@app.get("/api/stream-stats/{code}")
async def stream_stats(code: str, request: Request):
    """Get detailed statistics for a specific streaming session."""
    from routers.upload import last_processed_time, processing_locks, dropped_frames

    # Check if this is an active session
    is_active = code in last_processed_time

    stats = {
        "code": code,
        "active": is_active,
        "last_upload": int(time.time() - last_processed_time.get(code, 0)) if is_active else None,
    }

    # Add dropped frame stats if available
    if code in dropped_frames:
        session_drops = dropped_frames[code]
        stats["dropped_frames"] = {
            "count": session_drops.get("count", 0),
            "reason": session_drops.get("last_dropped_reason", None),
            "reasons": session_drops.get("reasons", {}),
        }

    # Add vision pipeline stats if available
    if hasattr(request.app.state, "vision_pipeline"):
        pipeline = request.app.state.vision_pipeline
        if hasattr(pipeline, "frame_count"):
            stats.update({
                "total_frames": pipeline.frame_count,
                "processed_frames": pipeline.process_count,
                "processing_ratio": round(pipeline.process_count / max(1, pipeline.frame_count) * 100, 1),
                "processing_time_ms": round(sum(pipeline.processing_times) / max(1, len(pipeline.processing_times)) * 1000, 1),
                "throttle_interval_ms": round(pipeline.min_processing_interval * 1000, 1),
            })

    # Get timer information if available
    if hasattr(request.app.state, "analysis_store"):
        analysis = await request.app.state.analysis_store.get_analysis(code)
        if analysis and 'time_left' in analysis:
            stats['game_timer'] = {
                'time_text': analysis['time_left'].get('time_text'),
                'seconds': analysis['time_left'].get('seconds'),
                'overtime': analysis['time_left'].get('OT', False),
            }

    return stats

# Main entry point for running the server directly
if __name__ == "__main__":
    import uvicorn

    # Configure uvicorn with reduced logging
    uvicorn.run(
        "main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        log_level="info",
        access_log=True,  # We're filtering this ourselves
        reload=True,
    )