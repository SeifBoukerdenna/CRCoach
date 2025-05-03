# app/routers/analysis.py
from fastapi import APIRouter, Request, HTTPException, Depends, UploadFile, File
from deps import get_settings, get_store
import logging
import io

router = APIRouter(prefix="/analysis", tags=["analysis"])
description = "Game analysis and information endpoints"
logger = logging.getLogger("analysis_router")

@router.get("/{code}")
async def get_analysis(
    code: str,
    request: Request,
):
    """Get the latest analysis results for a session code."""
    # Check if analysis store is available
    if not hasattr(request.app.state, "analysis_store"):
        raise HTTPException(501, "Analysis service not available")

    # Get analysis results
    results = await request.app.state.analysis_store.get_analysis(code)

    if not results:
        raise HTTPException(404, "No analysis results found for this code")

    return results

@router.get("/time/{code}")
async def get_time(
    code: str,
    request: Request,
):
    """Get just the time left for a session code."""
    # Check if analysis store is available
    if not hasattr(request.app.state, "analysis_store"):
        raise HTTPException(501, "Analysis service not available")

    # Get analysis results
    results = await request.app.state.analysis_store.get_analysis(code)

    if not results or 'time_left' not in results:
        raise HTTPException(404, "No time information found for this code")

    return results['time_left']

@router.post("/test-ocr")
async def test_ocr(
    request: Request,
    file: UploadFile = File(...),
):
    """Test endpoint for OCR on an uploaded image."""
    # Check if vision pipeline is available
    if not hasattr(request.app.state, "vision_pipeline"):
        raise HTTPException(501, "Vision pipeline not available")

    # Read file content
    content = await file.read()

    # Process the image
    pipeline = request.app.state.vision_pipeline
    results = pipeline.process_frame(content)

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "results": results
    }