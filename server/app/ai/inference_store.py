# server/app/ai/inference_store.py
import asyncio
import time
from typing import Dict, Optional, List
import logging

logger = logging.getLogger("inference_store")

class InferenceStore:
    """Store and manage YOLO inference results"""

    def __init__(self, expiration: float = 60.0):
        self._results: Dict[str, Dict] = {}
        self._timestamps: Dict[str, float] = {}
        self._lock = asyncio.Lock()
        self.expiration = expiration

    async def save_inference(self, code: str, result: Dict):
        """Save inference result for a session code"""
        async with self._lock:
            self._results[code] = result
            self._timestamps[code] = time.time()

    async def get_inference(self, code: str) -> Optional[Dict]:
        """Get latest inference result for a session code"""
        async with self._lock:
            if code not in self._results:
                return None

            # Check if result is expired
            if time.time() - self._timestamps.get(code, 0) > self.expiration:
                return None

            return self._results.get(code)

    async def get_all_active(self) -> Dict[str, Dict]:
        """Get all active (non-expired) inference results"""
        async with self._lock:
            current_time = time.time()
            active_results = {}

            for code, result in self._results.items():
                if current_time - self._timestamps.get(code, 0) < self.expiration:
                    active_results[code] = result

            return active_results

    async def cleanup_expired(self):
        """Remove expired inference results"""
        async with self._lock:
            current_time = time.time()
            expired_codes = []

            for code, timestamp in self._timestamps.items():
                if current_time - timestamp > self.expiration:
                    expired_codes.append(code)

            for code in expired_codes:
                self._results.pop(code, None)
                self._timestamps.pop(code, None)

            if expired_codes:
                logger.info(f"Cleaned up {len(expired_codes)} expired inference results")