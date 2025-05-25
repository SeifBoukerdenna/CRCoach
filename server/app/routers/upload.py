# server/app/routers/upload.py - Fixed for older Python versions
from fastapi import APIRouter, Request, HTTPException, Depends
from deps import get_settings, get_store
import logging
from starlette.requests import ClientDisconnect
import time
import asyncio
from typing import Dict
import base64

router = APIRouter()
logger = logging.getLogger("upload_router")

# Track processing state for each session code
processing_locks: Dict[str, asyncio.Lock] = {}
last_processed_time: Dict[str, float] = {}

# Track dropped frame statistics
dropped_frames: Dict[str, Dict] = {}

# Track inference state per session
inference_enabled: Dict[str, bool] = {}

# Configure frame rate control - OPTIMIZED FOR REAL-TIME
MIN_FRAME_INTERVAL = 0.010   # ~100fps max (reduced from 0.016)
PROCESSING_TIMEOUT = 0.030   # Drop frames if processing takes longer than 30ms (reduced from 50ms)
INFERENCE_INTERVAL = 0.050   # Run inference every 50ms (reduced from 100ms for 20fps inference)

# Frame skipping logic for high load
FRAME_SKIP_THRESHOLD = 0.040  # Start skipping if processing takes >40ms
MAX_CONSECUTIVE_SKIPS = 2     # Max frames to skip in a row

# Cleanup function
async def cleanup_locks(timeout=300):
    """Remove locks for sessions that haven't been active for a while"""
    current_time = time.time()
    to_remove = []

    for code, last_time in last_processed_time.items():
        if current_time - last_time > timeout:
            to_remove.append(code)

    for code in to_remove:
        processing_locks.pop(code, None)
        last_processed_time.pop(code, None)
        dropped_frames.pop(code, None)
        inference_enabled.pop(code, None)
        logger.info(f"Cleaned up processing locks for inactive session {code}")

# Python version compatible timeout context manager
class TimeoutContext:
    def __init__(self, timeout_seconds: float):
        self.timeout_seconds = timeout_seconds
        self.task = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass

async def with_timeout(coro, timeout_seconds: float):
    """Compatible timeout function for older Python versions"""
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        raise asyncio.TimeoutError(f"Operation timed out after {timeout_seconds} seconds")

@router.post("/upload/{code}")
async def upload(
    code: str,
    request: Request,
    settings = Depends(get_settings),
    store = Depends(get_store),
):
    try:
        start_time = time.time()

        # Create lock for this session if it doesn't exist
        if code not in processing_locks:
            processing_locks[code] = asyncio.Lock()
            last_processed_time[code] = 0
            dropped_frames[code] = {
                "count": 0,
                "reasons": {},
                "consecutive_skips": 0,
                "last_skip_time": 0
            }
            inference_enabled[code] = False  # Default to disabled

        # Fast path: Check if we should skip this frame for performance
        current_time = time.time()
        time_since_last = current_time - last_processed_time.get(code, 0)

        # Skip frames if they're coming too fast
        if time_since_last < MIN_FRAME_INTERVAL:
            dropped_frames[code]["count"] += 1
            dropped_frames[code]["reasons"]["rate_limit"] = dropped_frames[code]["reasons"].get("rate_limit", 0) + 1
            return {"status": "skipped", "reason": "rate_limit", "time_since_last": time_since_last}

        # Check if previous processing is still running and skip if needed
        if processing_locks[code].locked():
            dropped_frames[code]["count"] += 1
            dropped_frames[code]["reasons"]["busy"] = dropped_frames[code]["reasons"].get("busy", 0) + 1
            dropped_frames[code]["consecutive_skips"] += 1

            # If we're skipping too many frames, force process this one
            if dropped_frames[code]["consecutive_skips"] < MAX_CONSECUTIVE_SKIPS:
                return {"status": "skipped", "reason": "busy"}

        # Get the request body with minimal delay
        try:
            data = await with_timeout(request.body(), 0.1)  # 100ms timeout
        except (ClientDisconnect, asyncio.TimeoutError):
            logger.warning(f"Client timeout/disconnect during upload for code {code}")
            return {"status": "client_error"}

        # Quick validation
        if not data or len(data) < 2 or data[0:2] != b"\xFF\xD8":
            return {"status": "invalid_data"}

        # Get quality setting from header
        q = request.headers.get("X-Quality-Level", "medium")
        if q not in settings.TARGET_WIDTHS:
            q = "medium"

        # CRITICAL: Save the original frame to the store immediately with minimal processing
        try:
            await with_timeout(
                store.save_frame(code, data, q, settings.FRAME_TIMEOUT),
                0.05  # 50ms max for storage
            )
        except asyncio.TimeoutError:
            logger.warning(f"Storage timeout for {code}")
            return {"status": "storage_timeout"}

        # Reset consecutive skips counter on successful processing
        dropped_frames[code]["consecutive_skips"] = 0

        # Background inference processing (non-blocking) - ONLY if enabled
        time_since_last_inference = current_time - last_processed_time.get(f"{code}_inference", 0)

        if (inference_enabled.get(code, False) and
            time_since_last_inference >= INFERENCE_INTERVAL):
            if hasattr(request.app.state, "yolo_service") and getattr(request.app.state, "yolo_service"):
                # Start inference task in background without waiting
                async def run_inference_bg():
                    try:
                        # Use compatible timeout for inference
                        async with processing_locks[code]:
                            yolo_service = request.app.state.yolo_service
                            result = await with_timeout(
                                yolo_service.process_frame_async(data),
                                0.2  # 200ms max for inference
                            )

                            if result.get("success", False):
                                # Only generate annotated frame if there are detections (saves processing)
                                if result["detections"]:
                                    annotated_frame = await yolo_service.draw_detections_async(data, result["detections"])
                                    if annotated_frame:
                                        result["annotated_frame"] = base64.b64encode(annotated_frame).decode('utf-8')

                                # Store inference results
                                if hasattr(request.app.state, "inference_store"):
                                    await request.app.state.inference_store.save_inference(code, result)

                            # Update inference timestamp
                            last_processed_time[f"{code}_inference"] = time.time()

                    except asyncio.TimeoutError:
                        logger.warning(f"Inference timeout for code {code}")
                    except Exception as e:
                        logger.error(f"Inference error for code {code}: {str(e)}")

                # Fire and forget
                asyncio.create_task(run_inference_bg())

        # Update last processed time
        last_processed_time[code] = current_time
        upload_time = time.time() - start_time

        # Log performance metrics
        if upload_time > PROCESSING_TIMEOUT:
            logger.debug(f"Slow upload for {code}: {upload_time*1000:.1f}ms")

        return {
            "status": "ok",
            "processed_time_ms": round(upload_time * 1000, 2),
            "queue_time_ms": round((current_time - start_time) * 1000, 2),
            "inference_enabled": inference_enabled.get(code, False)
        }

    except ClientDisconnect:
        return {"status": "client_disconnected"}
    except Exception as e:
        logger.error(f"Upload error for code {code}: {str(e)}")
        return {"status": "error", "message": str(e)}

# New endpoint to enable/disable inference
@router.post("/inference/{code}/toggle")
async def toggle_inference(code: str, request: Request):
    """Enable or disable inference for a session"""
    try:
        body = await request.json()
        enabled = body.get("enabled", False)

        # Initialize session if not exists
        if code not in inference_enabled:
            processing_locks[code] = asyncio.Lock()
            last_processed_time[code] = 0
            dropped_frames[code] = {"count": 0, "reasons": {}, "consecutive_skips": 0}

        inference_enabled[code] = enabled

        logger.info(f"Inference {'enabled' if enabled else 'disabled'} for session {code}")

        return {
            "status": "ok",
            "inference_enabled": enabled,
            "session_code": code
        }
    except Exception as e:
        logger.error(f"Error toggling inference for {code}: {str(e)}")
        raise HTTPException(500, f"Failed to toggle inference: {str(e)}")

# Get inference status
@router.get("/inference/{code}/status")
async def get_inference_status(code: str):
    """Get inference status for a session"""
    return {
        "session_code": code,
        "inference_enabled": inference_enabled.get(code, False),
        "has_yolo_service": hasattr(request.app.state, "yolo_service") and
                           getattr(request.app.state, "yolo_service") is not None
    }

# Additional endpoint for getting session stats (useful for debugging)
@router.get("/stats/{code}")
async def get_session_stats(code: str):
    """Get performance statistics for a session"""
    return {
        "code": code,
        "active": code in last_processed_time,
        "last_upload": last_processed_time.get(code, 0),
        "dropped_frames": dropped_frames.get(code, {}),
        "is_processing": processing_locks.get(code, asyncio.Lock()).locked() if code in processing_locks else False,
        "inference_enabled": inference_enabled.get(code, False)
    }