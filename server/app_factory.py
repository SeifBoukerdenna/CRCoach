import logging
import signal
import asyncio
from aiohttp import web
from signaling import upload_handler, offer_handler, pcs

logger = logging.getLogger("webrtc.app")

def create_app() -> web.Application:
    app = web.Application()
    app.router.add_post("/upload", upload_handler)
    app.router.add_post("/offer", offer_handler)

    async def on_shutdown(app):
        # logger.info("Shutting down %d peer connections", len(pcs))
        await asyncio.gather(*(pc.close() for pc in pcs), return_exceptions=True)

    app.on_shutdown.append(on_shutdown)
    return app

# Hook into signal to stop loop if launched standalone

def register_signals(loop: asyncio.AbstractEventLoop):
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, loop.stop)