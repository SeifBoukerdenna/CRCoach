# server/api/routes.py - Enhanced with additional endpoints from main.py
import time
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse
from services.session_manager import SessionManager
from static.viewer_html import get_viewer_html
from static.viewer_js import get_viewer_js
from handlers.websocket_handlers import get_session_latency_stats
from core.config import Config
from services.yolo_inference import get_inference_service

router = APIRouter()

# Global session manager instance
session_manager = SessionManager()

@router.get("/", response_class=HTMLResponse)
async def serve_viewer():
    """Serve the debug viewer page"""
    return get_viewer_html()

@router.get("/static/viewer.js", response_class=PlainTextResponse)
async def serve_viewer_js():
    """Serve the viewer JavaScript"""
    return get_viewer_js()

@router.get("/health")
async def health_check():
    """Health check endpoint with latency info"""
    total_broadcasters = sum(1 for s in session_manager.sessions.values() if s.broadcaster)
    total_viewers = sum(len(s.viewers) for s in session_manager.sessions.values())

    # Calculate average latency across all sessions
    total_latency = 0
    total_frames = 0

    for session in session_manager.sessions.values():
        if hasattr(session, 'latency_data') and session.latency_data:
            latencies = [record['end_to_end_latency'] for record in session.latency_data]
            total_latency += sum(latencies)
            total_frames += len(latencies)

    avg_latency = total_latency / total_frames if total_frames > 0 else 0

    return {
        "status": "healthy",
        "active_sessions": len(session_manager.sessions),
        "total_broadcasters": total_broadcasters,
        "total_viewers": total_viewers,
        "uptime": time.time(),
        "timestamp": datetime.now().isoformat(),
        "version": Config.VERSION,
        "latency_info": {
            "average_latency_ms": round(avg_latency, 2),
            "total_frames_measured": total_frames,
        }
    }

@router.get("/health-single-viewer")
async def single_viewer_health_check():
    """Health check with single viewer statistics"""
    capacity_info = session_manager.get_server_capacity_info()
    available_sessions = session_manager.get_available_sessions()
    full_sessions = session_manager.get_full_sessions()

    return {
        "status": "healthy",
        "version": "1.2.0-single-viewer",
        "timestamp": asyncio.get_event_loop().time(),
        "single_viewer_enforcement": {
            "enabled": True,
            "max_viewers_per_session": 1,
            "total_sessions": len(session_manager.sessions),
            "available_sessions": len(available_sessions),
            "full_sessions": len(full_sessions),
            "capacity_utilization_percent": capacity_info['capacity_utilization_percent']
        },
        "server_capacity": capacity_info,
        "configuration": Config.get_performance_config(),
        "features": {
            "single_viewer_limit": True,
            "ai_inference": get_inference_service().is_ready(),
            "detailed_logging": Config.ENABLE_DETAILED_LOGGING,
            "strict_session_enforcement": True
        }
    }

@router.get("/api/sessions/available")
async def get_available_sessions():
    """Get sessions available for new viewers"""
    return {
        "available_sessions": session_manager.get_available_sessions(),
        "single_viewer_limit": True,
        "max_viewers_per_session": 1
    }

@router.get("/api/sessions/full")
async def get_full_sessions():
    """Get sessions that are at capacity"""
    return {
        "full_sessions": session_manager.get_full_sessions(),
        "single_viewer_limit": True,
        "max_viewers_per_session": 1
    }

@router.get("/session/{session_code}/status")
async def get_session_status(session_code: str):
    """Get status of a specific session"""
    if not Config.validate_session_code(session_code):
        raise HTTPException(status_code=400, detail="Invalid session code")

    session = session_manager.get_session(session_code)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return session.get_stats()

@router.get("/session/{session_code}/latency")
async def get_session_latency(session_code: str):
    """Get latency statistics for a session"""
    if not Config.validate_session_code(session_code):
        raise HTTPException(status_code=400, detail="Invalid session code")

    session = session_manager.get_session(session_code)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return get_session_latency_stats(session)