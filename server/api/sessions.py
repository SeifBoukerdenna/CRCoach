
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from models.session import SessionStats
from services.session_manager import SessionManager
import time

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

def get_session_manager() -> SessionManager:
    """Dependency to get session manager"""
    # This will be injected by dependency injection
    pass

@router.get("/", response_model=dict)
async def get_all_sessions(session_manager: SessionManager = Depends(get_session_manager)):
    """Get all active sessions with statistics"""

    session_stats = session_manager.get_all_stats()
    global_stats = session_manager.get_global_stats()

    return {
        "total_sessions": global_stats['total_sessions'],
        "sessions": [stats.model_dump() for stats in session_stats],
        "server_uptime": time.time(),
        "total_connections": global_stats['total_connections']
    }

@router.get("/{session_code}", response_model=dict)
async def get_session(session_code: str, session_manager: SessionManager = Depends(get_session_manager)):
    """Get specific session details"""

    session = session_manager.get_session(session_code)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    stats = session.get_stats()
    return {
        **stats.dict(),
        "status": "active",
        "connections": [
            {
                "id": conn.id,
                "role": conn.role,
                "client_ip": conn.client_ip,
                "connected_at": conn.connected_at.isoformat(),
                "uptime_seconds": conn.get_uptime_seconds(),
                "is_healthy": conn.is_healthy(),
                "metrics": conn.metrics.dict()
            }
            for conn in session.get_all_connections()
        ]
    }

@router.delete("/{session_code}")
async def force_close_session(session_code: str, session_manager: SessionManager = Depends(get_session_manager)):
    """Force close a session (admin endpoint)"""

    session = session_manager.get_session(session_code)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Disconnect all connections
    for connection in session.get_all_connections():
        await session_manager.connection_manager.disconnect(connection)

    # Remove session
    session_manager._remove_session(session_code)

    return {"message": f"Session {session_code} force closed"}

@router.get("/stats/global")
async def get_global_stats(session_manager: SessionManager = Depends(get_session_manager)):
    """Get global server statistics"""
    return session_manager.get_global_stats()
