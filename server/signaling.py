import asyncio
import logging
from typing import Set

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from aiortc import RTCPeerConnection, RTCSessionDescription

from track import FrameTrack
from config import JPEG_HEADER

logger = logging.getLogger("signaling")

router = APIRouter()
track = FrameTrack()
pcs: Set[RTCPeerConnection] = set()

# ───────────────────────── upload ──────────────────────────
@router.post("/upload")
async def upload(request: Request) -> dict:
    """Receive raw JPEG bytes from iOS."""
    data = await request.body()
    if not data.startswith(JPEG_HEADER):
        raise HTTPException(400, "Invalid JPEG payload")
    track.latest_frame = data
    return {"status": "ok"}

# ───────────────────────── offer/answer ────────────────────
@router.post("/offer")
async def offer(payload: dict) -> JSONResponse:
    sdp = payload.get("sdp")
    typ = payload.get("type")
    if not sdp or not typ:
        raise HTTPException(400, "Missing SDP or type")

    pc = RTCPeerConnection()
    pcs.add(pc)
    logger.info("Peer %s created", pc)

    @pc.on("connectionstatechange")
    async def _():
        logger.info("%s -> %s", pc, pc.connectionState)
        if pc.connectionState in ("failed", "closed", "disconnected"):
            await pc.close()
            pcs.discard(pc)

    await pc.setRemoteDescription(RTCSessionDescription(sdp=sdp, type=typ))
    pc.addTrack(track)

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    # wait for ICE
    ice = asyncio.Event()
    if pc.iceGatheringState == "complete":
        ice.set()
    else:
        @pc.on("icegatheringstatechange")
        def __():
            if pc.iceGatheringState == "complete":
                ice.set()
        try:
            await asyncio.wait_for(ice.wait(), 3)
        except asyncio.TimeoutError:
            logger.warning("ICE gathering timeout for %s", pc)

    return JSONResponse({
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type,
    })