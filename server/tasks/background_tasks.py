import asyncio
from core.config import Config
from services.session_manager import SessionManager

async def cleanup_task(session_manager: SessionManager):
    """Background cleanup task"""
    while True:
        try:
            session_manager.cleanup_expired_sessions()
            await asyncio.sleep(Config.CLEANUP_INTERVAL)
        except Exception as e:
            print(f"❌ Cleanup error: {e}")
            await asyncio.sleep(60)

async def stats_task(session_manager: SessionManager):
    """Background stats logging"""
    while True:
        try:
            session_manager.log_server_stats()
            await asyncio.sleep(Config.STATS_INTERVAL)
        except Exception as e:
            print(f"❌ Stats error: {e}")
            await asyncio.sleep(30)