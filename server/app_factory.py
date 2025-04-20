import logging
import signal
import asyncio
from aiohttp import web
from signaling import upload_handler, offer_handler, pcs
from frame_capture_handler import register_frame_capture_routes

logger = logging.getLogger("webrtc.app")

def create_app() -> web.Application:
    app = web.Application()
    app.router.add_post("/upload", upload_handler)
    app.router.add_post("/offer", offer_handler)

    # Register frame capture routes
    register_frame_capture_routes(app)  # Add this line

    async def on_shutdown(app):
        await asyncio.gather(*(pc.close() for pc in pcs), return_exceptions=True)

    app.on_shutdown.append(on_shutdown)
    return app

# Hook into signal to stop loop if launched standalone

def register_signals(loop: asyncio.AbstractEventLoop):
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, loop.stop)