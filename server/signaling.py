import asyncio
import logging
from collections import defaultdict
from time import time
from typing import Dict, Set

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from aiortc import RTCPeerConnection, RTCSessionDescription

from track import FrameTrack
from frame_processor import frame_processor, convert_to_json_response
from logo_detector import logo_detector

logger = logging.getLogger("signaling")

router = APIRouter()

# per‑room viewer sets
pcs_by_code: Dict[str, Set[RTCPeerConnection]] = defaultdict(set)
# background watchdogs
_watchdogs: Dict[str, asyncio.Task] = {}
# expose alias for main.py shutdown
pcs = pcs_by_code


# ─────────────────── upload ────────────────────────────────
@router.post("/upload/{code}")
async def upload(code: str, request: Request) -> dict:
    data = await request.body()
    if not data.startswith(b"\xFF\xD8"):
        raise HTTPException(400, "Invalid JPEG payload")

    FrameTrack.latest_frames[code] = data    # frame bytes
    FrameTrack.frame_times[code] = time()   # timestamp (seconds)

    # Submit frame for processing in background (not awaited)
    # This won't block the response
    frame_processor.process_jpeg(data, code)

    return {"status": "ok"}


# ─────────────────── watchdog helper ───────────────────────
async def _watch_code(code: str):
    """Close every PC if no frame for 1.5 s."""
    logger.info("Watchdog started for code %s", code)
    try:
        while True:
            await asyncio.sleep(0.5)

            last = FrameTrack.frame_times.get(code, 0)
            stale = (time() - last) > 1.5
            empty_room = not pcs_by_code.get(code)

            if stale or empty_room:
                # close all PCs in that room
                for pc in list(pcs_by_code.get(code, [])):
                    await pc.close()
                pcs_by_code.pop(code, None)
                FrameTrack.latest_frames.pop(code, None)
                FrameTrack.frame_times.pop(code, None)
                logger.info("Watchdog closed room %s (stale=%s empty=%s)",
                            code, stale, empty_room)
                return
    finally:
        _watchdogs.pop(code, None)
        logger.info("Watchdog finished for code %s", code)


# ─────────────────── setup ────────────────────────────────
async def startup_tasks():
    """Tasks to run on startup."""
    # Start the frame processor
    frame_processor.start()
    logger.info("Frame processor started")


# ─────────────────── offer / answer ────────────────────────
@router.post("/offer")
async def offer(payload: dict, background_tasks: BackgroundTasks) -> JSONResponse:
    code = payload.get("code")
    sdp = payload.get("sdp")
    typ = payload.get("type")
    if not (code and sdp and typ):
        raise HTTPException(400, "Missing code / SDP / type")

    # ensure at least one frame exists (<1 s wait)
    for _ in range(10):
        if code in FrameTrack.latest_frames:
            break
        await asyncio.sleep(0.1)
    else:
        raise HTTPException(404, "No active broadcast for this code")

    # peer connection for this viewer
    pc = RTCPeerConnection()
    pcs_by_code[code].add(pc)
    logger.info("Viewer joined %s  |  %d viewers", code, len(pcs_by_code[code]))

    # start watchdog if first viewer
    if code not in _watchdogs:
        _watchdogs[code] = asyncio.create_task(_watch_code(code))

    @pc.on("connectionstatechange")
    async def _():
        if pc.connectionState in ("failed", "closed", "disconnected"):
            await pc.close()
            pcs_by_code[code].discard(pc)
            logger.info("Viewer left %s  |  %d viewers", code, len(pcs_by_code[code]))

    # negotiate
    await pc.setRemoteDescription(RTCSessionDescription(sdp=sdp, type=typ))
    pc.addTrack(FrameTrack(code))

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return JSONResponse({
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type,
    })


# ─────────────────── detection endpoints ────────────────────────
@router.get("/detection/{code}")
async def detection_status(code: str) -> JSONResponse:
    """Get detection status for a session.

    Args:
        code: Session code

    Returns:
        JSON with detection status
    """
    # Check if session exists
    if code not in FrameTrack.latest_frames:
        return JSONResponse({
            "status": "unknown",
            "error": "No active session with this code"
        }, status_code=404)

    # Get detection results
    results = frame_processor.get_detection_results(code)
    response = convert_to_json_response(results)

    return JSONResponse(
        response,
        headers={"Content-Type": "application/json"}
    )


@router.get("/session/{code}/status")
async def session_status(code: str) -> JSONResponse:
    """Get comprehensive session status including detection info.

    Args:
        code: Session code

    Returns:
        JSON with session status
    """
    # Check if session exists
    if code not in FrameTrack.latest_frames:
        return JSONResponse({
            "status": "inactive",
            "viewers": 0,
            "detections": {}
        })

    # Get detection results
    results = frame_processor.get_detection_results(code)

    # Get viewers count
    viewers = len(pcs_by_code.get(code, set()))

    # Get session duration
    last_frame = FrameTrack.frame_times.get(code, 0)
    session_active = (time() - last_frame) < 2.0

    return JSONResponse({
        "status": "active" if session_active else "stale",
        "viewers": viewers,
        "last_frame": last_frame,
        "detections": {
            "logo": {
                "detected": results.get('logo', {}).get('detected', False),
                "confidence": results.get('logo', {}).get('confidence', 0),
            }
        }
    })