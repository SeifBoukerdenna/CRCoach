# server/tasks/background_tasks.py - Enhanced with monitoring task
import asyncio
import gc
from core.config import Config
from services.session_manager import SessionManager
from api.websocket import cleanup_dead_websockets

async def cleanup_task(session_manager: SessionManager):
    """Enhanced cleanup task with memory management"""
    cleanup_counter = 0

    while True:
        try:
            session_manager.cleanup_expired_sessions()

            cleanup_counter += 1
            if cleanup_counter % 5 == 0:
                await cleanup_dead_websockets()

                if cleanup_counter % 10 == 0:
                    gc.collect()
                    print(f"🗑️ Garbage collection completed (cycle {cleanup_counter})")

            await asyncio.sleep(Config.CLEANUP_INTERVAL)

        except Exception as e:
            print(f"❌ Cleanup error: {e}")
            await asyncio.sleep(60)

async def stats_task(session_manager: SessionManager):
    """Stats logging with memory monitoring"""
    while True:
        try:
            session_manager.log_server_stats()

            # Add memory statistics
            try:
                import psutil
                import os

                process = psutil.Process(os.getpid())
                memory_info = process.memory_info()
                memory_mb = memory_info.rss / 1024 / 1024

                print(f"💾 Memory usage: {memory_mb:.1f} MB")

                if memory_mb > 500:
                    print(f"⚠️ High memory usage detected: {memory_mb:.1f} MB")
            except ImportError:
                pass  # psutil not available

            await asyncio.sleep(Config.STATS_INTERVAL)

        except Exception as e:
            print(f"❌ Stats error: {e}")
            await asyncio.sleep(30)

async def monitor_single_viewer_sessions(session_manager: SessionManager):
    """Monitor single viewer sessions for performance insights"""
    while True:
        try:
            await asyncio.sleep(60)  # Monitor every minute

            if not session_manager.sessions:
                continue

            active_sessions = [s for s in session_manager.sessions.values() if not s.is_empty()]
            full_sessions = [s for s in active_sessions if s.is_full()]

            if active_sessions:
                total_viewers = sum(len(s.viewers) for s in active_sessions)
                total_broadcasters = sum(1 for s in active_sessions if s.broadcaster)

                print(f"📊 Single Viewer Monitor: {len(active_sessions)} active sessions, "
                      f"{total_broadcasters} broadcasters, {total_viewers} viewers")

                if len(full_sessions) > len(active_sessions) * 0.8:
                    print(f"⚠️ Warning: {len(full_sessions)}/{len(active_sessions)} sessions are at capacity")

                capacity_info = session_manager.get_server_capacity_info()
                print(f"📈 Server utilization: {capacity_info['capacity_utilization_percent']:.1f}% "
                      f"({total_viewers}/{capacity_info['total_capacity']} max possible viewers)")

                if capacity_info['capacity_utilization_percent'] > 80:
                    print(f"⚠️ High server utilization: {capacity_info['capacity_utilization_percent']:.1f}%")

        except Exception as e:
            print(f"❌ Error in single viewer session monitoring: {e}")

# Export all tasks
__all__ = ['cleanup_task', 'stats_task', 'monitor_single_viewer_sessions']