"""
server/services/frame_capture.py - Frame capture service for real-time inference
"""

import asyncio
import logging
import time
import base64
from typing import Dict, Optional
from services.yolo_inference import get_inference_service
from api.inference_routes import session_inference_states, broadcast_inference_result

class FrameCaptureService:
    def __init__(self):
        self.capture_tasks: Dict[str, asyncio.Task] = {}
        self.capture_intervals: Dict[str, float] = {}  # FPS per session
        self.last_frame_data: Dict[str, str] = {}  # Cache last frame per session

    def is_capture_active(self, session_code: str) -> bool:
        """Check if frame capture is active for a session"""
        return session_code in self.capture_tasks and not self.capture_tasks[session_code].done()

    async def start_capture(self, session_code: str, fps: float = 2.0):
        """Start frame capture for a session"""
        if self.is_capture_active(session_code):
            logging.warning(f"⚠️ Frame capture already active for session {session_code}")
            return

        self.capture_intervals[session_code] = fps

        task = asyncio.create_task(self._capture_loop(session_code))
        self.capture_tasks[session_code] = task

        logging.info(f"🎥 Started frame capture for session {session_code} at {fps} FPS")

    async def stop_capture(self, session_code: str):
        """Stop frame capture for a session"""
        if session_code in self.capture_tasks:
            self.capture_tasks[session_code].cancel()
            try:
                await self.capture_tasks[session_code]
            except asyncio.CancelledError:
                pass
            del self.capture_tasks[session_code]

        if session_code in self.capture_intervals:
            del self.capture_intervals[session_code]

        if session_code in self.last_frame_data:
            del self.last_frame_data[session_code]

        logging.info(f"🛑 Stopped frame capture for session {session_code}")

    async def update_frame(self, session_code: str, frame_data: str):
        """Update the latest frame data for a session"""
        self.last_frame_data[session_code] = frame_data

    async def _capture_loop(self, session_code: str):
        """Main capture loop for a session"""
        inference_service = get_inference_service()
        fps = self.capture_intervals.get(session_code, 2.0)
        interval = 1.0 / fps

        try:
            while True:
                # Check if inference is still enabled
                if not session_inference_states.get(session_code, False):
                    logging.info(f"🛑 Inference disabled for session {session_code}, stopping capture")
                    break

                # Check if we have frame data
                if session_code not in self.last_frame_data:
                    await asyncio.sleep(0.1)  # Wait for frame data
                    continue

                frame_data = self.last_frame_data[session_code]

                # Run inference
                try:
                    result = await inference_service.run_inference(frame_data, session_code)

                    if result:
                        # Broadcast result to WebSocket connections
                        await broadcast_inference_result(session_code, result)

                except Exception as e:
                    logging.error(f"❌ Inference error in capture loop: {e}")

                # Wait for next frame
                await asyncio.sleep(interval)

        except asyncio.CancelledError:
            logging.info(f"🛑 Frame capture cancelled for session {session_code}")
        except Exception as e:
            logging.error(f"❌ Frame capture error for session {session_code}: {e}")
        finally:
            # Cleanup
            if session_code in self.capture_tasks:
                del self.capture_tasks[session_code]

# Global frame capture service
frame_capture_service = FrameCaptureService()

def get_frame_capture_service() -> FrameCaptureService:
    """Get the global frame capture service"""
    return frame_capture_service