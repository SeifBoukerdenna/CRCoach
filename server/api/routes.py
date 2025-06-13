"""
server/api/routes.py - Updated with proper session state handling
"""

import time
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse
from services.session_manager import SessionManager
from static.viewer_html import get_viewer_html
from static.viewer_js import get_viewer_js
from handlers.websocket_handlers import get_session_latency_stats
from core.config import Config


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
            "sessions_with_latency_data": sum(1 for s in session_manager.sessions.values()
                                            if hasattr(s, 'latency_data') and s.latency_data)
        }
    }

@router.get("/api/sessions/{session_code}/status")
async def get_session_status(session_code: str):
    """Check session status and availability with proper state handling"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code format")

    session = session_manager.get_session(session_code)

    if not session:
        # Session doesn't exist - NOT AVAILABLE
        return {
            "session_code": session_code,
            "exists": False,
            "has_broadcaster": False,
            "viewer_count": 0,
            "max_viewers": 1,
            "available_for_viewer": False,  # Changed from True to False
            "available_for_broadcaster": False,  # Changed from True to False
            "message": "Session does not exist. Please check the code or start a new broadcast.",
            "error_type": "session_not_found"
        }

    # Session exists - check current state
    viewer_count = len(session.viewers)
    has_broadcaster = session.broadcaster is not None

    # Check if session is expired due to viewer disconnect
    if session.is_expired_due_to_viewer_disconnect():
        return {
            "session_code": session_code,
            "exists": True,
            "has_broadcaster": has_broadcaster,
            "viewer_count": viewer_count,
            "max_viewers": 1,
            "available_for_viewer": False,
            "available_for_broadcaster": session.is_available_for_broadcaster(),
            "message": "Session expired. Previous viewer disconnected. Please generate a new broadcast.",
            "error_type": "session_expired",
            "expiry_reason": "viewer_disconnected",
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat()
        }

    # Check if session is full (has viewer)
    if viewer_count >= 1:
        return {
            "session_code": session_code,
            "exists": True,
            "has_broadcaster": has_broadcaster,
            "viewer_count": viewer_count,
            "max_viewers": 1,
            "available_for_viewer": False,
            "available_for_broadcaster": session.is_available_for_broadcaster(),
            "message": "Session already has a viewer. Only one viewer allowed per broadcast.",
            "error_type": "session_full",
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat()
        }

    # Session exists and is available
    return {
        "session_code": session_code,
        "exists": True,
        "has_broadcaster": has_broadcaster,
        "viewer_count": viewer_count,
        "max_viewers": 1,
        "available_for_viewer": True,
        "available_for_broadcaster": session.is_available_for_broadcaster(),
        "message": "Session available for viewer",
        "error_type": None,
        "created_at": session.created_at.isoformat(),
        "last_activity": session.last_activity.isoformat()
    }

@router.get("/api/sessions")
async def get_sessions():
    """Get all sessions with latency information"""
    sessions_with_latency = []

    for session in session_manager.sessions.values():
        session_stats = session.get_stats()

        # Add latency information if available
        if hasattr(session, 'latency_data') and session.latency_data:
            latencies = [record['end_to_end_latency'] for record in session.latency_data]
            session_stats['latency_stats'] = {
                'average_latency': sum(latencies) / len(latencies),
                'min_latency': min(latencies),
                'max_latency': max(latencies),
                'total_frames': len(latencies),
                'recent_latencies': latencies[-10:] if len(latencies) >= 10 else latencies
            }
        else:
            session_stats['latency_stats'] = {
                'average_latency': 0,
                'min_latency': 0,
                'max_latency': 0,
                'total_frames': 0,
                'recent_latencies': []
            }

        sessions_with_latency.append(session_stats)

    return {
        "total_sessions": len(session_manager.sessions),
        "sessions": sessions_with_latency,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/api/sessions/{session_code}/latency")
async def get_session_latency(session_code: str):
    """Get detailed latency statistics for a specific session"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    latency_stats = await get_session_latency_stats(session_code, session_manager)

    if latency_stats['total_frames'] == 0:
        raise HTTPException(status_code=404, detail="No latency data found for this session")

    return {
        "session_code": session_code,
        "latency_statistics": latency_stats,
        "timestamp": datetime.now().isoformat(),
        "measurement_info": {
            "measurement_type": "end_to_end",
            "description": "Latency from iOS frame capture to React display",
            "units": "milliseconds"
        }
    }

@router.post("/api/sessions/{session_code}/latency/reset")
async def reset_session_latency(session_code: str):
    """Reset latency statistics for a specific session"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    session = session_manager.get_session(session_code)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if hasattr(session, 'latency_data'):
        session.latency_data = []

    return {
        "session_code": session_code,
        "status": "latency_data_reset",
        "timestamp": datetime.now().isoformat()
    }