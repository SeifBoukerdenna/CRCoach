import time
import psutil
from datetime import datetime
from fastapi import APIRouter, Depends
from services.session_manager import SessionManager

router = APIRouter(prefix="/health", tags=["health"])

def get_session_manager() -> SessionManager:
    """Dependency to get session manager"""
    # This will be injected by dependency injection
    pass

@router.get("/")
async def health_check(session_manager: SessionManager = Depends(get_session_manager)):
    """Basic health check endpoint"""

    stats = session_manager.get_global_stats()
    memory_info = psutil.Process().memory_info()

    return {
        "status": "healthy",
        "active_sessions": stats['active_sessions'],
        "total_connections": stats['total_connections'],
        "healthy_connections": stats['total_connections'],  # Simplified
        "uptime": time.time(),
        "timestamp": datetime.now().isoformat(),
        "version": "2.1.0-fastapi",
        "memory_usage": {
            "rss_mb": round(memory_info.rss / 1024 / 1024, 2),
            "vms_mb": round(memory_info.vms / 1024 / 1024, 2)
        }
    }

@router.get("/detailed")
async def detailed_health_check(session_manager: SessionManager = Depends(get_session_manager)):
    """Detailed health check with system metrics"""

    stats = session_manager.get_global_stats()
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')

    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.1.0-fastapi",
        "webrtc_stats": stats,
        "system_metrics": {
            "cpu_percent": cpu_percent,
            "memory": {
                "total_gb": round(memory.total / 1024**3, 2),
                "available_gb": round(memory.available / 1024**3, 2),
                "percent": memory.percent
            },
            "disk": {
                "total_gb": round(disk.total / 1024**3, 2),
                "free_gb": round(disk.free / 1024**3, 2),
                "percent": round((disk.used / disk.total) * 100, 2)
            }
        }
    }
