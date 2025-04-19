import asyncio
import cv2
import numpy as np
from av import VideoFrame
from aiortc import VideoStreamTrack

TARGET_WIDTH = 320  # keep small for latency


class FrameTrack(VideoStreamTrack):
    """
    Video track bound to a specific 4‑digit session code.
    Frames are stored in the class‑level dict by `upload` handler.
    """

    latest_frames: dict[str, bytes] = {}  # code -> JPEG

    def __init__(self, code: str):
        super().__init__()
        self.code = code
        self._scale = None

    async def recv(self) -> VideoFrame:  # type: ignore[override]
        while self.code not in FrameTrack.latest_frames:
            await asyncio.sleep(0.001)

        arr = np.frombuffer(FrameTrack.latest_frames[self.code], np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            img = np.zeros((240, 320, 3), np.uint8)

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
