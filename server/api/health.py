import time
from datetime import datetime
from fastapi import APIRouter, Depends
from services.session_manager import SessionManager
from services.stats_collector import StatsCollector

router = APIRouter(prefix="/health", tags=["health"])

# Initialize stats collector
stats_collector = StatsCollector()

@router.get("/")
async def health_check(session_manager: SessionManager = Depends(lambda: None)):
    """Basic health check endpoint"""

    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.1.0-fastapi",
        "uptime": time.time() - stats_collector.start_time
    }

@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check with system metrics"""

    system_stats = stats_collector.get_system_stats()
    process_stats = stats_collector.get_process_stats()

    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.1.0-fastapi",
        "system_metrics": system_stats,
        "process_metrics": process_stats
    }
