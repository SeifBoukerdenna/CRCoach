# app/ai/analysis_store.py
import asyncio
import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("analysis_store")

class AnalysisStore:
    """Store for vision analysis results with time-based expiration."""

    def __init__(self, expiration: float = 60.0):
        """
        Initialize the analysis store.

        Args:
            expiration: Time in seconds after which entries expire
        """
        self._store: Dict[str, Dict[str, Any]] = {}
        self._times: Dict[str, float] = {}
        self._expiration = expiration
        self._lock = asyncio.Lock()
        logger.info(f"Analysis store initialized with {expiration}s expiration")

    async def save_analysis(self, code: str, results: Dict[str, Any]) -> None:
        """Save analysis results for a session code."""
        if not code or not results:
            return

        try:
            async with self._lock:
                self._store[code] = results
                self._times[code] = time.time()

                # Log time left if available
                if 'time_left' in results and results['time_left'].get('time_text'):
                    logger.info(f"Saved analysis for code {code} with time: {results['time_left']['time_text']}")

        except Exception as e:
            logger.error(f"Error saving analysis for code {code}: {str(e)}")

    async def get_analysis(self, code: str) -> Optional[Dict[str, Any]]:
        """Get the latest analysis results for a session code."""
        if not code:
            return None

        try:
            async with self._lock:
                if code not in self._store:
                    return None

                # Check for expiration
                if time.time() - self._times[code] > self._expiration:
                    # Expired entry
                    del self._store[code]
                    del self._times[code]
                    return None

                return self._store[code]

        except Exception as e:
            logger.error(f"Error getting analysis for code {code}: {str(e)}")
            return None

    async def cleanup_expired(self) -> None:
        """Remove expired entries from the store."""
        try:
            async with self._lock:
                now = time.time()
                expired = [code for code, timestamp in self._times.items()
                          if now - timestamp > self._expiration]

                if expired:
                    logger.info(f"Cleaning up {len(expired)} expired entries")

                for code in expired:
                    del self._store[code]
                    del self._times[code]
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")