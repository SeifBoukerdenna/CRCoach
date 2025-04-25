# app/track.py

import asyncio
from time import time

import cv2
import numpy as np
from av import VideoFrame
from aiortc import VideoStreamTrack

from config import Settings
from store import FrameStore

class FrameTrack(VideoStreamTrack):
    """
    VideoStreamTrack that pulls the latest JPEG frame for a given code
    from the shared FrameStore, resizes it based on quality, and
    delivers it to the RTCPeerConnection.
    """
    # These will be injected in main.py:
    store: FrameStore
    settings: Settings

    def __init__(self, code: str):
        super().__init__()
        self.code = code
        self._last_quality = None
        # start at default width
        self._target_width = self.settings.DEFAULT_WIDTH
        self._scale = None

    async def recv(self) -> VideoFrame:
        """
        Await the next fresh frame (timeout if too old), apply any
        quality-based resizing, and return as an av.VideoFrame.
        """
        # wait until we have a non-stale frame
        while True:
            last_frame = await self.store.get_latest(self.code)
            last_time  = await self.store.get_time(self.code)
            if last_frame and (time() - last_time) <= self.settings.FRAME_TIMEOUT:
                break
            await asyncio.sleep(0.001)

        # check for quality change
        quality = await self.store.get_quality(self.code)
        if quality != self._last_quality:
            self._target_width = self.settings.TARGET_WIDTHS.get(
                quality, self.settings.DEFAULT_WIDTH
            )
            self._scale = None
            self._last_quality = quality

        # decode JPEG into BGR image
        arr = np.frombuffer(last_frame, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            # fallback to a blank frame if decoding fails
            img = np.zeros((240, 320, 3), dtype=np.uint8)

        h, w = img.shape[:2]

        # resize only if significantly different from target
        if abs(w - self._target_width) > 20:
            if self._scale is None:
                self._scale = self._target_width / w
            new_h = int(h * self._scale)
            img = cv2.resize(img, (self._target_width, new_h), interpolation=cv2.INTER_LINEAR)

        # convert BGR→RGB for VideoFrame
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        frame = VideoFrame.from_ndarray(img_rgb, format="rgb24")

        # assign proper timing
        frame.pts, frame.time_base = await self.next_timestamp()
        return frame
