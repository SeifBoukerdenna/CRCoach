# app/store.py
import asyncio
from time import time
from typing import Optional

class FrameStore:
    """Abstract API—same methods as your previous Redis store."""
    async def save_frame(self, code: str, jpeg: bytes, quality: str, timeout: float):
        raise NotImplementedError

    async def get_latest(self, code: str) -> Optional[bytes]:
        raise NotImplementedError

    async def get_time(self, code: str) -> float:
        raise NotImplementedError

    async def get_quality(self, code: str) -> str:
        raise NotImplementedError

    async def delete(self, code: str):
        raise NotImplementedError


class MemoryFrameStore(FrameStore):
    """In-process store using dicts + asyncio.Lock."""
    def __init__(self):
        self._frames: dict[str, bytes] = {}
        self._times:  dict[str, float] = {}
        self._quals:  dict[str, str] = {}
        self._lock = asyncio.Lock()

    async def save_frame(self, code: str, jpeg: bytes, quality: str, timeout: float):
        async with self._lock:
            self._frames[code] = jpeg
            self._times[code]  = time()
            self._quals[code]  = quality

    async def get_latest(self, code: str) -> Optional[bytes]:
        async with self._lock:
            return self._frames.get(code)

    async def get_time(self, code: str) -> float:
        async with self._lock:
            return self._times.get(code, 0.0)

    async def get_quality(self, code: str) -> str:
        async with self._lock:
            return self._quals.get(code, "medium")

    async def delete(self, code: str):
        async with self._lock:
            self._frames.pop(code, None)
            self._times. pop(code, None)
            self._quals. pop(code, None)
