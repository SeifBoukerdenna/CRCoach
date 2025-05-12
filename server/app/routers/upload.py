# app/routers/upload.py
from fastapi import APIRouter, Request, HTTPException, Depends, Body
from deps import get_settings, get_store
import logging
from starlette.requests import ClientDisconnect
import time
import asyncio
from typing import Dict

router = APIRouter()
logger = logging.getLogger("upload_router")

# Track processing state for each session code
processing_locks: Dict[str, asyncio.Lock] = {}
last_processed_time: Dict[str, float] = {}

# Track dropped frame statistics
dropped_frames: Dict[str, Dict] = {}

# Configure frame rate control
MIN_FRAME_INTERVAL = 0.033  # ~30fps max
PROCESSING_TIMEOUT = 0.1    # Drop frames if processing takes longer than this

@router.post("/upload/{code}")
async def upload(
    code: str,
    request: Request,
    settings = Depends(get_settings),
    store = Depends(get_store),
):
    try:
        # Create lock for this session if it doesn't exist
        if code not in processing_locks:
            processing_locks[code] = asyncio.Lock()
            last_processed_time[code] = 0
            dropped_frames[code] = {"count": 0, "reasons": {}}

        # Check if we're processing too frequently - implement rate limiting
        current_time = time.time()
        time_since_last = current_time - last_processed_time[code]

        # If we're receiving frames too quickly, drop some
        if time_since_last < MIN_FRAME_INTERVAL:
            # Track dropped frame statistics
            dropped_frames[code]["count"] += 1
            dropped_frames[code]["reasons"]["rate_limited"] = dropped_frames[code]["reasons"].get("rate_limited", 0) + 1
            dropped_frames[code]["last_dropped_reason"] = "rate_limited"

            return {"status": "dropped", "reason": "rate_limited"}

        # Try to acquire the lock with a timeout to prevent backlog
        try:
            # Non-blocking lock check - if locked, drop the frame
            if processing_locks[code].locked():
                # Track dropped frame statistics
                dropped_frames[code]["count"] += 1
                dropped_frames[code]["reasons"]["processing_backlog"] = dropped_frames[code]["reasons"].get("processing_backlog", 0) + 1
                dropped_frames[code]["last_dropped_reason"] = "processing_backlog"

                return {"status": "dropped", "reason": "processing_backlog"}

            # Acquire the lock for processing
            async with processing_locks[code]:
                # Update the last processed time
                last_processed_time[code] = current_time

                # Get the request body with proper error handling
                try:
                    data = await request.body()
                except ClientDisconnect:
                    logger.warning(f"Client disconnected during upload for code {code}")
                    return {"status": "client_disconnected"}

                # Validate JPEG header
                if not data.startswith(b"\xFF\xD8"):
                    raise HTTPException(400, "Invalid JPEG payload")

                # Get quality setting from header
                q = request.headers.get("X-Quality-Level", "medium")
                if q not in settings.TARGET_WIDTHS:
                    q = "medium"

                # Save the frame to the store
                await store.save_frame(code, data, q, settings.FRAME_TIMEOUT)

                # Process the frame through the vision pipeline if available
                if hasattr(request.app.state, "vision_pipeline") and isinstance(data, bytes):
                    try:
                        # Use asyncio.wait_for to timeout long-running frame analysis
                        async def process_with_vision():
                            pipeline = request.app.state.vision_pipeline
                            results = pipeline.process_frame(data)

                            # Extract game time if available
                            time_info = results.get('time_left', {})
                            if time_info.get('time_text'):
                                logger.debug(f"Game time for code {code}: {time_info['time_text']}")

                            # Store results if analysis store is available
                            if hasattr(request.app.state, "analysis_store"):
                                await request.app.state.analysis_store.save_analysis(code, results)

                            return results

                        # Use wait_for to timeout long processing
                        try:
                            await asyncio.wait_for(process_with_vision(), timeout=PROCESSING_TIMEOUT)
                        except asyncio.TimeoutError:
                            logger.warning(f"Vision processing timeout for code {code}, skipping analysis")
                            # Track dropped frame statistics (processing timed out but frame was used)
                            dropped_frames[code]["reasons"]["processing_timeout"] = dropped_frames[code]["reasons"].get("processing_timeout", 0) + 1

                    except Exception as e:
                        logger.error(f"Error processing frame for code {code}: {str(e)}")
                        # Continue processing even if analysis fails

                return {"status": "ok"}

        except asyncio.TimeoutError:
            # If we couldn't acquire the lock in time, drop the frame
            # Track dropped frame statistics
            dropped_frames[code]["count"] += 1
            dropped_frames[code]["reasons"]["lock_timeout"] = dropped_frames[code]["reasons"].get("lock_timeout", 0) + 1
            dropped_frames[code]["last_dropped_reason"] = "lock_timeout"

            return {"status": "dropped", "reason": "processing_timeout"}

    except ClientDisconnect:
        logger.warning(f"Client disconnected during upload processing for code {code}")
        return {"status": "client_disconnected"}
    except Exception as e:
        logger.error(f"Unexpected error in upload for code {code}: {str(e)}")
        raise HTTPException(500, "Server error processing upload")

# Cleanup function to remove unused locks - call this periodically
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
        logger.info(f"Cleaned up processing locks and stats for inactive session {code}")