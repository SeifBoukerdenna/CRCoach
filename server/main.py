import asyncio
import logging
from contextlib import asynccontextmanager
import os
import tensorflow as tf

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from config import HOST, PORT
from signaling import router, pcs_by_code, startup_tasks
from frame_processor import frame_processor
from logo_detector import logo_detector
from tf_data_handler import tf_data_handler
from ml_utils import ensure_assets_dir, create_dummy_logo

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("main")

# Configure TensorFlow to be less verbose
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # 0=DEBUG, 1=INFO, 2=WARNING, 3=ERROR
tf.get_logger().setLevel('WARNING')

# Use lifespan instead of on_event for FastAPI 0.95.0+
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize TensorFlow and ML components
    try:
        # Set up TensorFlow
        logger.info("Initializing TensorFlow environment...")

        # Check for GPU availability
        gpus = tf.config.list_physical_devices('GPU')
        if gpus:
            logger.info(f"Found {len(gpus)} GPU(s): {gpus}")
            # Set memory growth to avoid allocating all GPU memory at once
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
        else:
            logger.info("No GPUs found, using CPU for inference")

        # Create assets directory and dummy logo for testing
        logger.info("Setting up ML assets...")
        assets_dir = ensure_assets_dir()
        logo_path = create_dummy_logo(assets_dir=assets_dir)
        logger.info(f"Created testing assets in {assets_dir}")

        # Start frame processor
        frame_processor.start()
        logger.info("Frame processor started")

        # Run startup tasks
        await startup_tasks()

    except Exception as e:
        logger.error(f"Error initializing ML components: {e}")

    yield

    # Shutdown: Close peer connections and ML components
    logger.info("Closing %d peer connections", sum(len(pcs) for pcs in pcs_by_code.values()))
    await asyncio.gather(*(pc.close() for pcs in pcs_by_code.values() for pc in pcs),
                        return_exceptions=True)

    # Stop frame processor
    try:
        frame_processor.stop()
        logger.info("Frame processor stopped")
    except Exception as e:
        logger.error(f"Error stopping frame processor: {e}")

app = FastAPI(
    title="Clash Royale AI Coach",
    description="TensorFlow-powered coaching for Clash Royale",
    version="1.0.0",
    lifespan=lifespan
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)

# Add some ML-specific endpoints
@app.get("/ml/status")
async def ml_status():
    """Get ML system status."""
    return {
        "tensorflow_version": tf.__version__,
        "gpu_available": len(tf.config.list_physical_devices('GPU')) > 0,
        "models": {
            "logo_detector": {
                "initialized": logo_detector is not None,
                "last_detection": logo_detector.last_detection is not None
            }
        }
    }

if __name__ == "__main__":
    logger.info("Starting FastAPI server at http://%s:%d", HOST, PORT)
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True, log_level="critical")