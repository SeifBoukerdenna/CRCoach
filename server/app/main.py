# app/main.py
import signal, asyncio, logging
from fastapi import FastAPI
from contextlib import asynccontextmanager

from config import Settings
from store import MemoryFrameStore
from services.connection_manager import ConnectionManager
from routers import upload, offer
from track import FrameTrack

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

settings = Settings()
store    = MemoryFrameStore()             # ← no Redis!
conn_mgr = ConnectionManager(settings)

# give FrameTrack access to our store/settings
FrameTrack.store    = store
FrameTrack.settings = settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.settings = settings
    app.state.store    = store
    app.state.conn_mgr = conn_mgr

    # graceful shutdown on SIGINT/SIGTERM
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, loop.stop)

    yield  # application is now running

    # shutdown
    logging.info("Shutting down — closing all peer connections")
    await conn_mgr.close_all()

app = FastAPI(lifespan=lifespan)
app.include_router(upload.router)
app.include_router(offer.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=True,
    )
