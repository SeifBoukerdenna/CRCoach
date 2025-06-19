# server/api/routes.py - Updated with Discord auth JS endpoint
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
    """Serve the debug viewer page with Discord auth"""
    return get_viewer_html()

@router.get("/static/viewer.js", response_class=PlainTextResponse)
async def serve_viewer_js():
    """Serve the viewer JavaScript"""
    return get_viewer_js()

@router.get("/static/discord_auth.js", response_class=PlainTextResponse)
async def serve_discord_auth_js():
    """Serve the Discord authentication JavaScript"""
    # Read the Discord auth JS file content
    from static.discord_auth_js import get_discord_auth_js
    return get_discord_auth_js()

@router.get("/health")
async def health_check():
    """Health check endpoint with latency info and Discord status"""
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

    # Discord configuration status
    from core.discord_config import DiscordConfig
    discord_configured = False
    try:
        DiscordConfig.validate_config()
        discord_configured = True
    except:
        pass

    return {
        "status": "healthy",
        "version": Config.VERSION,
        "timestamp": datetime.now().isoformat(),
        "sessions": {
            "total": len(session_manager.sessions),
            "broadcasters": total_broadcasters,
            "viewers": total_viewers,
            "average_latency_ms": round(avg_latency, 2) if avg_latency > 0 else None
        },
        "inference": {
            "available": get_inference_service().is_ready(),
            "model_loaded": get_inference_service().is_ready()
        },
        "discord_auth": {
            "configured": discord_configured,
            "server_id": DiscordConfig.SERVER_ID if discord_configured else None
        }
    }

@router.get("/api/sessions/{session_code}/status")
async def get_session_status(session_code: str):
    """Get detailed session status"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code format")

    session = session_manager.get_session(session_code)

    if not session:
        return {
            "session_code": session_code,
            "exists": False,
            "broadcaster_online": False,
            "viewer_count": 0,
            "created_at": None
        }

    # Get latency stats
    latency_stats = get_session_latency_stats(session)

    return {
        "session_code": session_code,
        "exists": True,
        "broadcaster_online": bool(session.broadcaster),
        "viewer_count": len(session.viewers),
        "max_viewers": session.max_viewers,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "connection_attempts": session.connection_attempts,
        "messages_exchanged": session.messages_exchanged,
        "latency_stats": latency_stats
    }

@router.post("/api/sessions/{session_code}/clear")
async def clear_session(session_code: str):
    """Clear a session (admin endpoint)"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code format")

    removed = session_manager.remove_session(session_code)

    return {
        "session_code": session_code,
        "removed": removed,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/api/sessions")
async def list_active_sessions():
    """List all active sessions"""
    sessions_data = []

    for session_code, session in session_manager.sessions.items():
        latency_stats = get_session_latency_stats(session)

        sessions_data.append({
            "session_code": session_code,
            "broadcaster_online": bool(session.broadcaster),
            "viewer_count": len(session.viewers),
            "max_viewers": session.max_viewers,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "connection_attempts": session.connection_attempts,
            "messages_exchanged": session.messages_exchanged,
            "latency_stats": latency_stats
        })

    return {
        "total_sessions": len(sessions_data),
        "sessions": sessions_data,
        "timestamp": datetime.now().isoformat()
    }