import time
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import HTMLResponse, PlainTextResponse
from services.session_manager import SessionManager
from static.viewer_html import get_viewer_html
from static.viewer_js import get_viewer_js

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
    """Health check endpoint"""
    total_broadcasters = sum(1 for s in session_manager.sessions.values() if s.broadcaster)
    total_viewers = sum(len(s.viewers) for s in session_manager.sessions.values())

    return {
        "status": "healthy",
        "active_sessions": len(session_manager.sessions),
        "total_broadcasters": total_broadcasters,
        "total_viewers": total_viewers,
        "uptime": time.time(),
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0-debug"
    }

@router.get("/api/sessions")
async def get_sessions():
    """Get all sessions"""
    return {
        "total_sessions": len(session_manager.sessions),
        "sessions": session_manager.get_all_stats(),
        "timestamp": datetime.now().isoformat()
    }
