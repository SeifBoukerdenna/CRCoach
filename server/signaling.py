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
    # Validate input
    sdp = payload.get("sdp")
    typ = payload.get("type")
    if not sdp or not typ:
        raise HTTPException(400, "Missing SDP or type")

    # Create peer connection with simplified config for local network
    pc = RTCPeerConnection()
    pcs.add(pc)
    logger.info("Peer connection created")

    # Connection state monitoring
    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        logger.info("Connection state changed to: %s", pc.connectionState)
        if pc.connectionState in ("failed", "closed", "disconnected"):
            logger.warning("Connection state is %s, closing", pc.connectionState)
            await pc.close()
            pcs.discard(pc)

    # Log ICE gathering state changes
    @pc.on("icegatheringstatechange")
    def on_icegatheringstatechange():
        logger.info("ICE gathering state changed to: %s", pc.iceGatheringState)

    # Log ICE connection state changes
    @pc.on("iceconnectionstatechange")
    def on_iceconnectionstatechange():
        logger.info("ICE connection state changed to: %s", pc.iceConnectionState)

    try:
        # Set remote description (client offer)
        logger.info("Setting remote description (offer)")
        await pc.setRemoteDescription(RTCSessionDescription(sdp=sdp, type=typ))

        # Add the video track
        logger.info("Adding video track")
        pc.addTrack(track)

        # Create answer
        logger.info("Creating answer")
        answer = await pc.createAnswer()

        # Set local description
        logger.info("Setting local description (answer)")
        await pc.setLocalDescription(answer)

        # Wait for ICE gathering or timeout after 2 seconds
        logger.info("Waiting for ICE gathering (max 2 seconds)")
        ice = asyncio.Event()

        if pc.iceGatheringState == "complete":
            ice.set()
        else:
            @pc.on("icegatheringstatechange")
            def _():
                if pc.iceGatheringState == "complete":
                    ice.set()

        try:
            await asyncio.wait_for(ice.wait(), 2.0)
            logger.info("ICE gathering complete")
        except asyncio.TimeoutError:
            logger.warning("ICE gathering timeout - proceeding with available candidates")

        # Return the answer with any gathered ICE candidates
        logger.info("Sending answer back to client")
        return JSONResponse({
            "sdp": pc.localDescription.sdp,
            "type": pc.localDescription.type,
        })

    except Exception as e:
        logger.error("Error during WebRTC setup: %s", str(e), exc_info=True)
        # If anything fails, clean up the peer connection
        await pc.close()
        pcs.discard(pc)
        raise HTTPException(500, f"WebRTC setup failed: {str(e)}")