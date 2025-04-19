import asyncio
import cv2
import numpy as np
from av import VideoFrame
from aiortc import VideoStreamTrack
from config import TARGET_WIDTH

class FrameTrack(VideoStreamTrack):
    """Optimized VideoStreamTrack that minimizes processing overhead."""

    def __init__(self):
        super().__init__()
        self.latest_frame: bytes | None = None
        # Pre-allocate buffers to reduce memory allocations
        self._buffer = None
        self._last_shape = None
        # Use fixed scale to avoid recalculating
        self._scale = None

    async def recv(self) -> VideoFrame:  # type: ignore[override]
        # Wait for frame with shorter sleep interval
        while self.latest_frame is None:
            await asyncio.sleep(0.001)  # 1ms instead of 5ms
        data = self.latest_frame

        # JPEG -> BGR with optimized decoding flags
        # IMREAD_REDUCED_COLOR_2 = load at 1/2 resolution for faster decoding
        # Only use full resolution if target width requires it
        arr = np.frombuffer(data, np.uint8)

        # Use fast decode path if possible
        h, w = 0, 0
        if len(arr) > 1000:  # Make sure we have enough data for a header
            try:
                # Try to extract image dimensions from JPEG header
                # to determine if we can use reduced loading
                jpeg_header = arr[:100]  # Examine first 100 bytes
                for i in range(0, len(jpeg_header) - 10):
                    if jpeg_header[i] == 0xFF and jpeg_header[i+1] == 0xC0:
                        h = (jpeg_header[i+5] << 8) | jpeg_header[i+6]
                        w = (jpeg_header[i+7] << 8) | jpeg_header[i+8]
                        break
            except:
                pass

        # Choose optimal decoding flags based on input size
        if w > 0 and w > TARGET_WIDTH * 2:
            # Use reduced color loading for very large images
            img_bgr = cv2.imdecode(arr, cv2.IMREAD_REDUCED_COLOR_2)
        else:
            # Standard decode for normal sized images
            img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        if img_bgr is None:
            # Fallback in case decode fails
            img_bgr = np.zeros((240, 320, 3), dtype=np.uint8)

        # Only resize if necessary - skip if already close to target
        h, w = img_bgr.shape[:2]
        if abs(w - TARGET_WIDTH) > 20:  # Only resize if difference is substantial
            if self._scale is None:
                self._scale = TARGET_WIDTH / w

            target_h = int(h * self._scale)
            # Use INTER_LINEAR for speed instead of INTER_AREA
            img_bgr = cv2.resize(img_bgr, (TARGET_WIDTH, target_h),
                                interpolation=cv2.INTER_LINEAR)

        # BGR -> RGB (can be done in-place for speed)
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        # Create frame with optimal memory handling
        frame = VideoFrame.from_ndarray(img_rgb, format="rgb24")

        # Generate timestamp more efficiently
        pts, tb = await self.next_timestamp()
        frame.pts = pts
        frame.time_base = tb

        return frame