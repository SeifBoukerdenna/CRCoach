import psutil
import time
from typing import Dict, Any
from datetime import datetime

class StatsCollector:
    """Collects system and application statistics"""

    def __init__(self):
        self.start_time = time.time()

    def get_system_stats(self) -> Dict[str, Any]:
        """Get system resource statistics"""
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=1)
        disk = psutil.disk_usage('/')

        return {
            "cpu_percent": cpu_percent,
            "memory": {
                "total_gb": round(memory.total / 1024**3, 2),
                "available_gb": round(memory.available / 1024**3, 2),
                "used_gb": round(memory.used / 1024**3, 2),
                "percent": memory.percent
            },
            "disk": {
                "total_gb": round(disk.total / 1024**3, 2),
                "free_gb": round(disk.free / 1024**3, 2),
                "used_gb": round(disk.used / 1024**3, 2),
                "percent": round((disk.used / disk.total) * 100, 2)
            }
        }

    def get_process_stats(self) -> Dict[str, Any]:
        """Get current process statistics"""
        process = psutil.Process()
        memory_info = process.memory_info()

        return {
            "memory_rss_mb": round(memory_info.rss / 1024 / 1024, 2),
            "memory_vms_mb": round(memory_info.vms / 1024 / 1024, 2),
            "cpu_percent": process.cpu_percent(),
            "num_threads": process.num_threads(),
            "uptime_seconds": time.time() - self.start_time
        }
