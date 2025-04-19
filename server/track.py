import asyncio
import cv2
import numpy as np
from av import VideoFrame
from aiortc import VideoStreamTrack

TARGET_WIDTH = 320   # keep in sync with config.py if you change it


class FrameTrack(VideoStreamTrack):
    """
    VideoStreamTrack that downsamples to `TARGET_WIDTH`
    and consumes the most recent JPEG pushed via /upload.
    """

    # Shared frame buffer for *all* instances
    latest_frame: bytes | None = None

    def __init__(self):
        super().__init__()
        self._scale = None  # cached resize factor

    async def recv(self) -> VideoFrame:  # type: ignore[override]
        # Wait for first frame
        while FrameTrack.latest_frame is None:
            await asyncio.sleep(0.001)

        arr = np.frombuffer(FrameTrack.latest_frame, np.uint8)

        # Fast decode; use reduced‑size flag if original is huge
        img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            img_bgr = np.zeros((240, 320, 3), np.uint8)  # never crash

        h, w = img_bgr.shape[:2]
        if abs(w - TARGET_WIDTH) > 20:                   # only resize if needed
            if self._scale is None:
                self._scale = TARGET_WIDTH / w
            img_bgr = cv2.resize(
                img_bgr,
                (TARGET_WIDTH, int(h * self._scale)),
                interpolation=cv2.INTER_LINEAR,          # faster than INTER_AREA
            )

        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        frame = VideoFrame.from_ndarray(img_rgb, format="rgb24")

        pts, tb = await self.next_timestamp()
        frame.pts = pts
        frame.time_base = tb
        return frame
