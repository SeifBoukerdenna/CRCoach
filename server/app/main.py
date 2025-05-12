# app/main.py
import signal, asyncio, logging
from fastapi import FastAPI
from contextlib import asynccontextmanager
import traceback

from config import Settings
from store import MemoryFrameStore
from services.connection_manager import ConnectionManager
from routers import upload, offer, analysis  # Import the new analysis router
from track import FrameTrack
from ai.vision_pipeline import GameVisionPipeline
from ai.analysis_store import AnalysisStore

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

        # Set up analysis services
        app.state.analysis_store = AnalysisStore(expiration=120.0)  # Store results for 2 minutes
        app.state.vision_pipeline = GameVisionPipeline(config={
            'debug': False,
            'save_debug_images': False,
        })

        # Start background task for cleanup
        cleanup_task = asyncio.create_task(run_cleanup(app))
        app.state.cleanup_task = cleanup_task  # Store reference to cancel later

        # graceful shutdown on SIGINT/SIGTERM
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, loop.stop)

        logger.info("Application startup complete")
        yield  # application is now running
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        logger.error(traceback.format_exc())
        raise

    # shutdown
    try:
        logger.info("Shutting down — closing all peer connections")
        if hasattr(app.state, 'cleanup_task'):
            app.state.cleanup_task.cancel()
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
            # Wait before trying again
            await asyncio.sleep(5)

# Create FastAPI app
app = FastAPI(
    title="Clash Royale Coaching Server",
    description="Server for Clash Royale broadcast and analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Add routers
app.include_router(upload.router)
app.include_router(offer.router)
app.include_router(analysis.router)

# Main entry point for running the server directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=True,
    )