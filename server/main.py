import asyncio
import logging

import uvicorn
from fastapi import FastAPI

from config import HOST, PORT
from signaling import router, pcs

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("main")

app = FastAPI()
app.include_router(router)

@app.on_event("shutdown")
async def _cleanup():
    logger.info("Closing %d peer connections", len(pcs))
    await asyncio.gather(*(pc.close() for pc in pcs), return_exceptions=True)

if __name__ == "__main__":
    logger.info("Starting FastAPI server at http://%s:%d", HOST, PORT)
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)