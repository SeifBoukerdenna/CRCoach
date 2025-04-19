import asyncio
import logging
from typing import Set

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from aiortc import RTCPeerConnection, RTCSessionDescription

from track import FrameTrack

logger = logging.getLogger("signaling")

router = APIRouter()
pcs: Set[RTCPeerConnection] = set()


# ───────── upload (per‑code) ──────────
@router.post("/upload/{code}")
async def upload(code: str, request: Request) -> dict:
    data = await request.body()
    if not data.startswith(b"\xFF\xD8"):  # simple JPEG check
        raise HTTPException(400, "Invalid JPEG payload")
    FrameTrack.latest_frames[code] = data
    return {"status": "ok"}


# ───────── offer / answer ─────────────
@router.post("/offer")
async def offer(payload: dict) -> JSONResponse:
    code = payload.get("code")
    sdp  = payload.get("sdp")
    typ  = payload.get("type")
    if not (code and sdp and typ):
        raise HTTPException(400, "Missing code / SDP / type")

    # 0) make sure the broadcaster is actually sending something
    elapsed = 0.0
    while code not in FrameTrack.latest_frames and elapsed < 1.0:
        await asyncio.sleep(0.1)
        elapsed += 0.1
    if code not in FrameTrack.latest_frames:
        raise HTTPException(404, "No active broadcast for this code")

    # 1) clear stale PCs
    for pc in list(pcs):
        await pc.close(); pcs.discard(pc)

    # 2) negotiate normally
    pc = RTCPeerConnection()
    pcs.add(pc)

    @pc.on("connectionstatechange")
    async def _():
        if pc.connectionState in ("failed", "closed", "disconnected"):
            await pc.close(); pcs.discard(pc)

    await pc.setRemoteDescription(RTCSessionDescription(sdp=sdp, type=typ))
    pc.addTrack(FrameTrack(code))

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return JSONResponse({
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type,
    })