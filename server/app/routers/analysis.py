# app/routers/analysis.py
from fastapi import APIRouter, Request, HTTPException, Depends, UploadFile, File
from deps import get_settings, get_store
import logging
import io

router = APIRouter(prefix="/analysis", tags=["analysis"])
description = "Game analysis and information endpoints"
logger = logging.getLogger("analysis_router")

@router.get("/{code}")
async def get_analysis(code: str, request: Request):
    """Get the latest analysis results for a session code."""
    if not hasattr(request.app.state, "analysis_store"):
        raise HTTPException(501, "Analysis service not available")

    results = await request.app.state.analysis_store.get_analysis(code)
    if not results:
        raise HTTPException(404, "No analysis results found for this code")

    return results

@router.get("/time/{code}")
async def get_time(code: str, request: Request):
    """Get just the time left for a session code."""
    if not hasattr(request.app.state, "analysis_store"):
        raise HTTPException(501, "Analysis service not available")

    results = await request.app.state.analysis_store.get_analysis(code)
    if not results or 'time_left' not in results:
        raise HTTPException(404, "No time information found for this code")

    return results['time_left']

@router.get("/time-text/{code}")
async def get_time_text(code: str, request: Request):
    """Get just the time text (MM:SS format) for a session code."""
    if not hasattr(request.app.state, "analysis_store"):
        raise HTTPException(501, "Analysis service not available")

    results = await request.app.state.analysis_store.get_analysis(code)
    if not results or 'time_left' not in results or not results['time_left'].get('time_text'):
        raise HTTPException(404, "No time information found for this code")

    return {"time": results['time_left']['time_text']}

@router.get("/time-seconds/{code}")
async def get_time_seconds(code: str, request: Request):
    """Get just the remaining seconds for a session code."""
    if not hasattr(request.app.state, "analysis_store"):
        raise HTTPException(501, "Analysis service not available")

    results = await request.app.state.analysis_store.get_analysis(code)
    if not results or 'time_left' not in results or results['time_left'].get('seconds') is None:
        raise HTTPException(404, "No time information found for this code")

    return {"seconds": results['time_left']['seconds']}

@router.post("/test-ocr")
async def test_ocr(request: Request, file: UploadFile = File(...)):
    """Test endpoint for OCR on an uploaded image."""
    if not hasattr(request.app.state, "vision_pipeline"):
        raise HTTPException(501, "Vision pipeline not available")

    content = await file.read()
    pipeline = request.app.state.vision_pipeline
    results = pipeline.process_frame(content)

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "results": results
    }

@router.post("/test-time/{code}")
async def test_time_upload(code: str, request: Request, file: UploadFile = File(...)):
    """Test time extraction on an uploaded image and save to store."""
    if not hasattr(request.app.state, "vision_pipeline") or not hasattr(request.app.state, "analysis_store"):
        raise HTTPException(501, "Vision pipeline or analysis store not available")

    content = await file.read()
    pipeline = request.app.state.vision_pipeline
    results = pipeline.process_frame(content)

    # Save to analysis store
    await request.app.state.analysis_store.save_analysis(code, results)

    return {
        "code": code,
        "filename": file.filename,
        "results": results,
        "message": f"Results saved to store for code '{code}'"
    }