import asyncio
import time
import cv2
import numpy as np
from av import VideoFrame
from aiortc import VideoStreamTrack

from frame_processor import frame_processor

TARGET_WIDTH = 320

class FrameTrack(VideoStreamTrack):
    # shared buffers
    latest_frames: dict[str, bytes] = {}
    frame_times:  dict[str, float] = {}

    def __init__(self, code: str):
        super().__init__()
        self.code = code
        self._scale = None
        self._frame_count = 0

        # No need to initialize frame processor here as it's handled in main.py

    async def recv(self) -> VideoFrame:  # type: ignore[override]
        """Return next frame or close the track if sender disappeared."""
        while True:
            # If sender vanished >1.5 s ago, close the track so PC ↓
            last = FrameTrack.frame_times.get(self.code, 0)
            if time.time() - last > 1.5:
                raise asyncio.CancelledError("stream timed‑out")

            data = FrameTrack.latest_frames.get(self.code)
            if data:
                break
            await asyncio.sleep(0.001)

        # Processing will be handled by the frame processor already via /upload endpoint
        # We don't need to call it here to avoid duplicate processing

        arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:                       # ← explicit check!
            img = np.zeros((240, 320, 3), dtype=np.uint8)
        h, w = img.shape[:2]
        if abs(w - TARGET_WIDTH) > 20:
            if self._scale is None:
                self._scale = TARGET_WIDTH / w
            img = cv2.resize(img, (TARGET_WIDTH, int(h * self._scale)),
                             interpolation=cv2.INTER_LINEAR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        frame = VideoFrame.from_ndarray(img, format="rgb24")
        frame.pts, frame.time_base = await self.next_timestamp()
        return frame