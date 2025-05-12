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
        # Track frame info for skipping
        self._last_frame_time = 0
        self._consecutive_stale_frames = 0
        self._max_stale_frames = 3  # Skip frames after this many consecutive stale ones
        self._max_frame_age = 0.15  # Consider frames older than this as stale (150ms)

    async def recv(self) -> VideoFrame:
        """
        Await the next fresh frame (timeout if too old), apply any
        quality-based resizing, and return as an av.VideoFrame.
        """
        # Try to get frame with smart skipping for fluidity
        while True:
            # Get latest frame
            last_frame = await self.store.get_latest(self.code)
            last_time = await self.store.get_time(self.code)

            # Calculate frame age
            current_time = time()
            frame_age = current_time - last_time

            # If frame is fresh or we've been waiting too long, use it
            if last_frame and frame_age <= self._max_frame_age:
                # Reset stale frame counter since we got a fresh frame
                self._consecutive_stale_frames = 0
                break

            # If frame is stale but we've had too many stale frames already,
            # use this one instead of waiting for a fresher one
            if last_frame and self._consecutive_stale_frames >= self._max_stale_frames:
                self._consecutive_stale_frames = 0
                break

            # Track stale frames
            if last_frame:
                self._consecutive_stale_frames += 1

            # If no frame or all frames stale, wait a bit
            await asyncio.sleep(0.005)  # Short sleep to avoid CPU spin

            # If we've been waiting too long for any frame, use whatever we have
            if not last_frame and (time() - self._last_frame_time) > self.settings.FRAME_TIMEOUT:
                # If we still don't have a frame, return blank
                if not last_frame:
                    # Create a blank frame as fallback
                    img = np.zeros((240, 320, 3), dtype=np.uint8)
                    frame = VideoFrame.from_ndarray(img, format="rgb24")
                    frame.pts, frame.time_base = await self.next_timestamp()
                    return frame
                break

        # Update last frame time for timeout calculations
        self._last_frame_time = time()

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

            # Use more efficient resizing method when under load
            # INTER_AREA is better quality but slower
            # INTER_LINEAR is faster but slightly lower quality
            # INTER_NEAREST is fastest but lowest quality
            if self._consecutive_stale_frames > 0:
                # Under load, use faster resize
                img = cv2.resize(img, (self._target_width, new_h), interpolation=cv2.INTER_NEAREST)
            else:
                # Normal load, use better quality resize
                img = cv2.resize(img, (self._target_width, new_h), interpolation=cv2.INTER_LINEAR)

        # convert BGR→RGB for VideoFrame
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        frame = VideoFrame.from_ndarray(img_rgb, format="rgb24")

        # assign proper timing
        frame.pts, frame.time_base = await self.next_timestamp()
        return frame