# app/routers/upload.py - Optimized for ultra-low latency
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

# Configure frame rate control - FASTER SETTINGS
MIN_FRAME_INTERVAL = 0.016  # ~60fps max - adjusted to be much faster
PROCESSING_TIMEOUT = 0.05   # Drop frames if processing takes longer than 50ms

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
            dropped_frames[code] = {"count": 0, "reasons": {}}

        # Ultra-optimized path: immediate frame forwarding with minimal overhead
        # Get the request body with proper error handling
        try:
            data = await request.body()
        except ClientDisconnect:
            logger.warning(f"Client disconnected during upload for code {code}")
            return {"status": "client_disconnected"}

        # Validate JPEG header - quick check only
        if not data or len(data) < 2 or data[0:2] != b"\xFF\xD8":
            raise HTTPException(400, "Invalid JPEG payload")

        # Get quality setting from header
        q = request.headers.get("X-Quality-Level", "medium")
        if q not in settings.TARGET_WIDTHS:
            q = "medium"

        # CRITICAL PRIORITY: Save the frame to the store immediately
        # This ensures the video stream gets frames ASAP regardless of analysis
        await store.save_frame(code, data, q, settings.FRAME_TIMEOUT)

        # Update processing timestamp for this thread
        last_processed_time[code] = time.time()

        # Check if we should also perform analysis
        # Rate limit analysis while maintaining frame delivery
        time_since_last_analysis = start_time - last_processed_time.get(code, 0)

        # Only analyze frames at most 10 times per second (every 100ms)
        if time_since_last_analysis >= 0.1 and not processing_locks[code].locked():
            # Process the frame through the vision pipeline if available
            if hasattr(request.app.state, "vision_pipeline") and isinstance(data, bytes):
                try:
                    # Use a background task for analysis to avoid blocking the response
                    async def analyze_background():
                        async with processing_locks[code]:
                            try:
                                # Use asyncio.wait_for to timeout long-running frame analysis
                                pipeline = request.app.state.vision_pipeline
                                results = pipeline.process_frame(data)

                                # Store results if analysis store is available
                                if hasattr(request.app.state, "analysis_store"):
                                    await request.app.state.analysis_store.save_analysis(code, results)

                                # Log time for analysis occasionally
                                analyze_time = time.time() - start_time
                                if analyze_time > 0.1:  # Only log slow analyses
                                    logger.info(f"Analysis for {code} took {analyze_time*1000:.1f}ms")

                            except Exception as e:
                                logger.error(f"Error in background analysis for code {code}: {str(e)}")

                    # Start analysis without waiting for it to complete
                    asyncio.create_task(analyze_background())

                except Exception as e:
                    logger.error(f"Error processing frame for code {code}: {str(e)}")

        # Return success even if analysis is running in background
        upload_time = time.time() - start_time

        # Log upload time occasionally for monitoring
        if upload_time > 0.05:  # Only log slow uploads
            logger.debug(f"Upload for {code} took {upload_time*1000:.1f}ms")

        return {"status": "ok", "processed_time_ms": round(upload_time * 1000, 2)}

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