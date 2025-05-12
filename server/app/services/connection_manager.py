# app/services/connection_manager.py
import asyncio
from time import time  # Add missing import
from typing import Dict, Set
from aiortc import RTCPeerConnection
from track import FrameTrack

class ConnectionManager:
    def __init__(self, settings):
        self.pcs_by_code: Dict[str, Set[RTCPeerConnection]] = {}
        self._watchdogs: Dict[str, asyncio.Task] = {}
        self.settings = settings

    async def add_pc(self, code: str, pc: RTCPeerConnection):
        self.pcs_by_code.setdefault(code, set()).add(pc)
        if code not in self._watchdogs:
            self._watchdogs[code] = asyncio.create_task(self._watch_code(code))

    async def remove_pc(self, code: str, pc: RTCPeerConnection):
        self.pcs_by_code.get(code, set()).discard(pc)

    async def close_all(self):
        tasks = [pc.close() for pcs in self.pcs_by_code.values() for pc in pcs]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _watch_code(self, code: str):
        """Close PCs when frames stale or no viewers."""
        try:
            while True:
                await asyncio.sleep(self.settings.WATCHDOG_INTERVAL)  # Fix: Use WATCHDOG_INTERVAL
                last = await FrameTrack.store.get_time(code)
                stale = (time() - last) > self.settings.FRAME_TIMEOUT  # Fix: Use FRAME_TIMEOUT
                empty = not self.pcs_by_code.get(code)
                if stale or empty:
                    for pc in list(self.pcs_by_code.get(code, [])):
                        await pc.close()
                    self.pcs_by_code.pop(code, None)
                    await FrameTrack.store.delete(code)
                    return
        finally:
            self._watchdogs.pop(code, None)