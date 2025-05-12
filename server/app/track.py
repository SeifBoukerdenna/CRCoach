# app/track.py - Optimized for ultra-low latency

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
    from the shared FrameStore, optimized for ultra-low latency.
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
        self._last_frame = None
        self._consecutive_stale_frames = 0
        self._max_stale_frames = 3  # Skip frames after this many consecutive stale ones
        self._max_frame_age = 0.1  # Consider frames older than this as stale (100ms)

        # Pre-allocate memory for blank frame to avoid allocations
        self._blank_frame = np.zeros((240, 320, 3), dtype=np.uint8)
        self._blank_rgb = cv2.cvtColor(self._blank_frame, cv2.COLOR_BGR2RGB)

        # Tracking decode/resize performance
        self._decode_times = []
        self._resize_times = []
        self._max_times = 50  # Keep last 50 measurements

    async def recv(self) -> VideoFrame:
        """
        Await the next fresh frame (timeout if too old), apply any
        quality-based resizing, and return as an av.VideoFrame.
        Ultra-low latency version.
        """
        start_time = time()
        current_frame = None

        # Get a frame with minimal delay
        try:
            # Get latest frame with no waiting
            last_frame = await self.store.get_latest(self.code)
            last_time = await self.store.get_time(self.code)

            # Calculate frame age
            current_time = time()
            frame_age = current_time - last_time

            # If we have a fresh frame, use it
            if last_frame and frame_age <= self._max_frame_age:
                current_frame = last_frame
                self._consecutive_stale_frames = 0
                self._last_frame_time = last_time
                self._last_frame = last_frame
            elif last_frame:
                # Frame is stale but still use it (with tracking)
                current_frame = last_frame
                self._consecutive_stale_frames += 1
                self._last_frame_time = last_time
                self._last_frame = last_frame
            elif self._last_frame:
                # No new frame, reuse last known frame
                current_frame = self._last_frame
                self._consecutive_stale_frames += 1
            else:
                # No frames at all, use blank
                img_rgb = self._blank_rgb.copy()  # Avoid modifying the original
                frame = VideoFrame.from_ndarray(img_rgb, format="rgb24")
                frame.pts, frame.time_base = await self.next_timestamp()
                return frame
        except Exception as e:
            # Handle any exception by returning a blank frame
            img_rgb = self._blank_rgb.copy()
            frame = VideoFrame.from_ndarray(img_rgb, format="rgb24")
            frame.pts, frame.time_base = await self.next_timestamp()
            return frame

        # Check and apply quality settings
        quality = await self.store.get_quality(self.code)
        if quality != self._last_quality:
            self._target_width = self.settings.TARGET_WIDTHS.get(
                quality, self.settings.DEFAULT_WIDTH
            )
            self._scale = None
            self._last_quality = quality

        # Decode JPEG - track timing
        decode_start = time()
        arr = np.frombuffer(current_frame, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        decode_time = time() - decode_start

        # Record decode time
        self._decode_times.append(decode_time)
        if len(self._decode_times) > self._max_times:
            self._decode_times.pop(0)

        if img is None:
            # Blank frame if decoding fails
            img = self._blank_frame.copy()

        h, w = img.shape[:2]

        # Resize if needed - with timing
        resize_time = 0
        if abs(w - self._target_width) > 20:
            resize_start = time()
            if self._scale is None:
                self._scale = self._target_width / w
            new_h = int(h * self._scale)

            # Use faster resize method when under pressure
            if frame_age > 0.05 or self._consecutive_stale_frames > 0:
                img = cv2.resize(img, (self._target_width, new_h), interpolation=cv2.INTER_NEAREST)
            else:
                img = cv2.resize(img, (self._target_width, new_h), interpolation=cv2.INTER_LINEAR)

            resize_time = time() - resize_start

            # Record resize time
            self._resize_times.append(resize_time)
            if len(self._resize_times) > self._max_times:
                self._resize_times.pop(0)

        # Convert BGR→RGB for VideoFrame - reuse memory when possible
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        frame = VideoFrame.from_ndarray(img_rgb, format="rgb24")

        # Assign proper timing
        frame.pts, frame.time_base = await self.next_timestamp()

        # Calculate and log total processing time occasionally
        total_time = time() - start_time
        if len(self._decode_times) % 100 == 0:
            avg_decode = sum(self._decode_times) / len(self._decode_times) * 1000
            avg_resize = sum(self._resize_times) / max(1, len(self._resize_times)) * 1000
            print(f"Stream metrics - decode: {avg_decode:.1f}ms, resize: {avg_resize:.1f}ms, total: {total_time*1000:.1f}ms")

        return frame