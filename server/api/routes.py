# server/api/routes.py
import time
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse

from services.session_manager import SessionManager
from static.viewer_html import get_viewer_html
from static.viewer_js import get_viewer_js
from handlers.websocket_handlers import get_session_latency_stats

router = APIRouter(tags=["sessions"])

# Global session manager instance
session_manager = SessionManager()

@router.get("/", response_class=HTMLResponse, include_in_schema=False)
async def serve_viewer():
    return get_viewer_html()

@router.get("/static/viewer.js", response_class=PlainTextResponse, include_in_schema=False)
async def serve_viewer_js():
    return get_viewer_js()

@router.get("/health", include_in_schema=False)
async def health_check():
    total_broadcasters = sum(1 for s in session_manager.sessions.values() if s.broadcaster)
    total_viewers = sum(len(s.viewers) for s in session_manager.sessions.values())

    total_latency = 0
    total_frames = 0
    for session in session_manager.sessions.values():
        if hasattr(session, 'latency_data') and session.latency_data:
            lat = [r['end_to_end_latency'] for r in session.latency_data]
            total_latency += sum(lat)
            total_frames += len(lat)

    avg_latency = total_latency / total_frames if total_frames else 0
    return {
        "status": "healthy",
        "active_sessions": len(session_manager.sessions),
        "total_broadcasters": total_broadcasters,
        "total_viewers": total_viewers,
        "uptime": time.time(),
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0-debug",
        "latency_info": {
            "average_latency_ms": round(avg_latency, 2),
            "total_frames_measured": total_frames,
            "sessions_with_latency_data": sum(
                1 for s in session_manager.sessions.values()
                if hasattr(s, 'latency_data') and s.latency_data
            )
        }
    }

@router.get("/sessions/{session_code}/status", summary="Check session status and availability")
async def get_session_status(session_code: str):
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code format")

    session = session_manager.get_session(session_code)
    if not session:
        return {
            "session_code": session_code,
            "exists": False,
            "has_broadcaster": False,
            "viewer_count": 0,
            "max_viewers": 1,
            "available_for_viewer": True,
            "available_for_broadcaster": True,
            "message": "Session available"
        }

    viewer_count = len(session.viewers)
    has_broadcaster = session.broadcaster is not None
    return {
        "session_code": session_code,
        "exists": True,
        "has_broadcaster": has_broadcaster,
        "viewer_count": viewer_count,
        "max_viewers": 1,
        "available_for_viewer": viewer_count == 0,
        "available_for_broadcaster": not has_broadcaster,
        "message": (
            "Session not available - already has a viewer"
            if viewer_count > 0 else
            "Session available"
        ),
        "created_at": session.created_at.isoformat(),
        "last_activity": session.last_activity.isoformat()
    }

@router.get("/sessions", summary="Get all sessions with latency information")
async def get_sessions():
    sessions_with_latency = []
    for session in session_manager.sessions.values():
        stats = session.get_stats()
        if hasattr(session, 'latency_data') and session.latency_data:
            lat = [r['end_to_end_latency'] for r in session.latency_data]
            stats['latency_stats'] = {
                'average_latency': sum(lat) / len(lat),
                'min_latency': min(lat),
                'max_latency': max(lat),
                'total_frames': len(lat),
                'recent_latencies': lat[-10:]
            }
        else:
            stats['latency_stats'] = {
                'average_latency': 0,
                'min_latency': 0,
                'max_latency': 0,
                'total_frames': 0,
                'recent_latencies': []
            }
        sessions_with_latency.append(stats)

    return {
        "total_sessions": len(session_manager.sessions),
        "sessions": sessions_with_latency,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/sessions/{session_code}/latency", summary="Get detailed latency statistics for a session")
async def get_session_latency(session_code: str):
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

@router.post("/sessions/{session_code}/latency/reset", summary="Reset latency statistics for a session")
async def reset_session_latency(session_code: str):
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
