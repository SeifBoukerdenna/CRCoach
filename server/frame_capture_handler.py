# frame_capture_fastapi.py
import os
import time
import logging
from pathlib import Path
from fastapi import APIRouter, UploadFile, Form, File, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime

logger = logging.getLogger("frame_capture")

class FastAPIFrameCaptureHandler:
    """Handles frame capture requests for FastAPI."""

    def __init__(self, base_dir="captured_frames"):
        """Initialize the frame capture handler."""
        self.base_dir = Path(base_dir)
        self.session_counts = {}

        # Create base directory if it doesn't exist
        os.makedirs(self.base_dir, exist_ok=True)

        logger.info(f"Frame capture handler initialized with base directory: {self.base_dir}")

    async def handle_capture(self, frame: UploadFile, sessionCode: str = Form(...)):
        """Handle frame capture request."""
        try:
            if not sessionCode:
                raise HTTPException(400, "Empty session code")

            # Create session directory
            session_dir = self.base_dir / sessionCode
            os.makedirs(session_dir, exist_ok=True)

            # Get frame count for this session
            if sessionCode not in self.session_counts:
                # Initialize with the number of existing files
                existing_files = list(session_dir.glob("*.jpg"))
                self.session_counts[sessionCode] = len(existing_files)

            # Increment frame count for this session
            self.session_counts[sessionCode] += 1
            frame_count = self.session_counts[sessionCode]

            # Generate timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")

            # Create filename
            filename = f"frame_{frame_count:06d}_{timestamp}.jpg"
            filepath = session_dir / filename

            # Save frame data
            contents = await frame.read()
            with open(filepath, 'wb') as f:
                f.write(contents)

            logger.debug(f"Saved frame {frame_count} for session {sessionCode} to {filepath}")

            return {
                "success": True,
                "session": sessionCode,
                "frame_number": frame_count,
                "path": str(filepath)
            }

        except Exception as e:
            logger.error(f"Error handling frame capture: {e}")
            raise HTTPException(500, str(e))

    def get_session_stats(self, session_code=None):
        """Get statistics about captured frames."""
        if session_code:
            # Stats for specific session
            session_dir = self.base_dir / session_code
            if not session_dir.exists():
                return {"session": session_code, "frames": 0, "exists": False}

            frames = list(session_dir.glob("*.jpg"))
            return {
                "session": session_code,
                "frames": len(frames),
                "exists": True,
                "path": str(session_dir),
                "size_mb": sum(f.stat().st_size for f in frames) / (1024 * 1024),
                "last_capture": max((f.stat().st_mtime for f in frames), default=0)
            }
        else:
            # Stats for all sessions
            sessions = [d for d in self.base_dir.iterdir() if d.is_dir()]
            return {
                "total_sessions": len(sessions),
                "total_frames": sum(len(list(d.glob("*.jpg"))) for d in sessions),
                "sessions": [d.name for d in sessions],
                "base_dir": str(self.base_dir)
            }

# Create handler instance
frame_capture_handler = FastAPIFrameCaptureHandler()

# Create router
frame_capture_router = APIRouter(prefix="/api", tags=["Frame Capture"])

@frame_capture_router.post("/capture-frame")
async def capture_frame(frame: UploadFile = File(...), sessionCode: str = Form(...)):
    """Capture a frame and save it to disk."""
    return await frame_capture_handler.handle_capture(frame, sessionCode)

@frame_capture_router.get("/capture-stats")
async def get_stats():
    """Get statistics for all sessions."""
    return frame_capture_handler.get_session_stats()

@frame_capture_router.get("/capture-stats/{session_code}")
async def get_session_stats(session_code: str):
    """Get statistics for a specific session."""
    return frame_capture_handler.get_session_stats(session_code)