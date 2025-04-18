import asyncio
import cv2
import numpy as np
from av import VideoFrame
from aiortc import VideoStreamTrack
from config import TARGET_WIDTH

class FrameTrack(VideoStreamTrack):
    """Pulls the latest JPEG bytes, downsamples, emits VideoFrames."""

    def __init__(self):
        super().__init__()
        self.latest_frame: bytes | None = None

    async def recv(self) -> VideoFrame:  # type: ignore[override]
        while self.latest_frame is None:
            await asyncio.sleep(0.005)
        data = self.latest_frame

        # JPEG -> BGR
        img_bgr = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise RuntimeError("Failed to decode JPEG")

        # down‑sample
        h, w = img_bgr.shape[:2]
        scale = TARGET_WIDTH / w
        img_bgr = cv2.resize(img_bgr, (TARGET_WIDTH, int(h * scale)), cv2.INTER_AREA)

        # BGR -> RGB
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        frame = VideoFrame.from_ndarray(img_rgb, format="rgb24")
        pts, tb = await self.next_timestamp()
        frame.pts = pts
        frame.time_base = tb
        return frame