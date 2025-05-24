# server/app/routers/upload.py - Fixed with YOLO inference and annotated frames
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

# Configure frame rate control
MIN_FRAME_INTERVAL = 0.016  # ~60fps max
PROCESSING_TIMEOUT = 0.05   # Drop frames if processing takes longer than 50ms
INFERENCE_INTERVAL = 0.1    # Run inference every 100ms



# Cleanup function - Fixed indentation
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
        logger.info(f"Cleaned up processing locks for inactive session {code}")


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

        # Get the request body with proper error handling
        try:
            data = await request.body()
        except ClientDisconnect:
            logger.warning(f"Client disconnected during upload for code {code}")
            return {"status": "client_disconnected"}

        # Validate JPEG header
        if not data or len(data) < 2 or data[0:2] != b"\xFF\xD8":
            raise HTTPException(400, "Invalid JPEG payload")

        # Get quality setting from header
        q = request.headers.get("X-Quality-Level", "medium")
        if q not in settings.TARGET_WIDTHS:
            q = "medium"

        # CRITICAL: Save the original frame to the store immediately
        await store.save_frame(code, data, q, settings.FRAME_TIMEOUT)

        # Update processing timestamp
        current_time = time.time()
        time_since_last_inference = current_time - last_processed_time.get(f"{code}_inference", 0)

        # Run YOLO inference at controlled intervals
        if time_since_last_inference >= INFERENCE_INTERVAL and not processing_locks[code].locked():
            if hasattr(request.app.state, "yolo_service") and getattr(request.app.state, "yolo_service"):
                try:
                    async def run_inference():
                        async with processing_locks[code]:
                            try:
                                # Run YOLO inference
                                yolo_service = request.app.state.yolo_service
                                result = await yolo_service.process_frame_async(data)

                                if result.get("success", False):
                                    # Draw detections on frame and get annotated image
                                    annotated_frame = await yolo_service.draw_detections_async(data, result["detections"])

                                    # Convert annotated frame to base64
                                    if annotated_frame:
                                        result["annotated_frame"] = base64.b64encode(annotated_frame).decode('utf-8')

                                    # Store inference results with annotated frame
                                    if hasattr(request.app.state, "inference_store"):
                                        await request.app.state.inference_store.save_inference(code, result)

                                # Update last inference time
                                last_processed_time[f"{code}_inference"] = time.time()

                                return result

                            except Exception as e:
                                logger.error(f"Error in YOLO inference for code {code}: {str(e)}")
                                return None

                    # Start inference in background
                    asyncio.create_task(run_inference())

                except Exception as e:
                    logger.error(f"Error starting YOLO inference for code {code}: {str(e)}")

        # Update last processed time
        last_processed_time[code] = current_time
        upload_time = time.time() - start_time

        # Log slow uploads
        if upload_time > 0.05:
            logger.debug(f"Upload for {code} took {upload_time*1000:.1f}ms")

        return {
            "status": "ok",
            "processed_time_ms": round(upload_time * 1000, 2)
        }

    except ClientDisconnect:
        logger.warning(f"Client disconnected during upload processing for code {code}")
        return {"status": "client_disconnected"}
    except Exception as e:
        logger.error(f"Unexpected error in upload for code {code}: {str(e)}")
        raise HTTPException(500, "Server error processing upload")
