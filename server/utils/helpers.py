import asyncio
import signal
from datetime import datetime
from typing import Callable
from core.logging import setup_logging

logger = setup_logging()

def format_bytes(bytes_value: int) -> str:
    """Format bytes into human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_value < 1024:
            return f"{bytes_value:.2f} {unit}"
        bytes_value /= 1024
    return f"{bytes_value:.2f} PB"

def format_duration(seconds: float) -> str:
    """Format duration in seconds to human readable format"""
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f}m"
    else:
        hours = seconds / 3600
        return f"{hours:.1f}h"

def setup_signal_handlers(cleanup_func: Callable):
    """Setup graceful shutdown signal handlers"""

    def signal_handler(sig, frame):
        logger.info(f"🛑 Received signal {sig}, initiating graceful shutdown...")
        asyncio.create_task(cleanup_func())

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

async def run_periodic_task(func: Callable, interval: int, *args, **kwargs):
    """Run a function periodically"""
    while True:
        try:
            if asyncio.iscoroutinefunction(func):
                await func(*args, **kwargs)
            else:
                func(*args, **kwargs)
            await asyncio.sleep(interval)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"❌ Error in periodic task {func.__name__}: {e}")
            await asyncio.sleep(interval)
