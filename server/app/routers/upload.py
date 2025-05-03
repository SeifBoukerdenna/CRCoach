# app/routers/upload.py
from fastapi import APIRouter, Request, HTTPException, Depends, Body
from deps import get_settings, get_store
import logging
from starlette.requests import ClientDisconnect

router = APIRouter()
logger = logging.getLogger("upload_router")

@router.post("/upload/{code}")
async def upload(
    code: str,
    request: Request,
    settings = Depends(get_settings),
    store = Depends(get_store),
):
    try:
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
                # Process the frame
                pipeline = request.app.state.vision_pipeline
                results = pipeline.process_frame(data)

                # Extract game time if available
                time_info = results.get('time_left', {})
                if time_info.get('time_text'):
                    logger.info(f"Game time for code {code}: {time_info['time_text']}")

                # Store results if analysis store is available
                if hasattr(request.app.state, "analysis_store"):
                    await request.app.state.analysis_store.save_analysis(code, results)

            except Exception as e:
                logger.error(f"Error processing frame for code {code}: {str(e)}")
                # Continue processing even if analysis fails

        return {"status": "ok"}

    except ClientDisconnect:
        logger.warning(f"Client disconnected during upload processing for code {code}")
        return {"status": "client_disconnected"}
    except Exception as e:
        logger.error(f"Unexpected error in upload for code {code}: {str(e)}")
        raise HTTPException(500, "Server error processing upload")