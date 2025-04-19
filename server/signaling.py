import asyncio
import logging
from typing import Set

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from aiortc import RTCPeerConnection, RTCSessionDescription

from track import FrameTrack            # ⬅️  ➊ no global instance now

logger = logging.getLogger("signaling")

router = APIRouter()
pcs: Set[RTCPeerConnection] = set()     # active peer‑connections


# ───────────────────────── upload ──────────────────────────
@router.post("/upload")
async def upload(request: Request) -> dict:
    """
    Receive raw JPEG bytes pushed by the ReplayKit extension.
    The payload is stored on FrameTrack.latest_frame so any
    active tracks can consume it.
    """
    data = await request.body()

    # quick JPEG sanity check (0xFFD8 = SOI)
    if not data.startswith(b"\xFF\xD8"):
        raise HTTPException(400, "Invalid JPEG payload")

    FrameTrack.latest_frame = data      # ⬅️  ➋ share frame with all tracks
    return {"status": "ok"}


# ───────────────────────── offer ───────────────────────────
@router.post("/offer")
async def offer(payload: dict) -> JSONResponse:
    """
    Handle SDP offer from browser, return answer.
    Always wipes old PCs first so a page refresh works
    without restarting the server.
    """
    sdp = payload.get("sdp")
    typ = payload.get("type")
    if not sdp or not typ:
        raise HTTPException(400, "Missing SDP or type")

    # 1)  Drop every stale / previous connection
    for pc in list(pcs):
        await pc.close()
        pcs.discard(pc)

    # 2)  Fresh peer‑connection (no ICE servers for LAN)
    pc = RTCPeerConnection()
    pcs.add(pc)
    logger.info("Created new peer‑connection (%d total)", len(pcs))

    @pc.on("connectionstatechange")
    async def _():
        if pc.connectionState in ("failed", "closed", "disconnected"):
            await pc.close()
            pcs.discard(pc)
            logger.warning("Peer‑connection closed (%d remaining)", len(pcs))

    try:
        # Apply remote SDP
        await pc.setRemoteDescription(RTCSessionDescription(sdp=sdp, type=typ))

        # 3)  Give *this* viewer its own video track
        pc.addTrack(FrameTrack())

        # 4)  Create / send answer
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        # Wait ≤2 s for ICE gathering
        done = asyncio.Event()

        if pc.iceGatheringState == "complete":
            done.set()
        else:

            @pc.on("icegatheringstatechange")
            def _():
                if pc.iceGatheringState == "complete":
                    done.set()

            try:
                await asyncio.wait_for(done.wait(), 2.0)
            except asyncio.TimeoutError:
                logger.warning("ICE gathering timeout – continuing")

        return JSONResponse(
            {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
        )

    except Exception as e:
        await pc.close()
        pcs.discard(pc)
        logger.error("WebRTC setup failed: %s", e, exc_info=True)
        raise HTTPException(500, f"WebRTC setup failed: {e}")
