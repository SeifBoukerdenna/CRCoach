import asyncio
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI

from config import HOST, PORT
from signaling import router, pcs_by_code

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("main")

# Use lifespan instead of on_event for FastAPI 0.95.0+
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: No specific code needed here
    yield
    # Shutdown: Close peer connections
    logger.info("Closing %d peer connections", len(pcs_by_code))
    await asyncio.gather(*(pc.close() for pc in pcs_by_code), return_exceptions=True)

app = FastAPI(lifespan=lifespan)
app.include_router(router)

if __name__ == "__main__":
    logger.info("Starting FastAPI server at http://%s:%d", HOST, PORT)
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)