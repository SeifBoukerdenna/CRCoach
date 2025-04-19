import os
import logging
import cv2
import numpy as np
from pathlib import Path
from typing import Optional, Dict, List, Tuple

logger = logging.getLogger("ml_utils")

def ensure_assets_dir(path="assets"):
    """Create assets directory if it doesn't exist.

    Args:
        path: Path to assets directory

    Returns:
        Absolute path to assets directory
    """
    assets_dir = Path(path)
    if not assets_dir.exists():
        try:
            assets_dir.mkdir(parents=True)
            logger.info(f"Created assets directory: {assets_dir}")
        except Exception as e:
            logger.error(f"Error creating assets directory: {e}")

    return assets_dir.absolute()


def create_dummy_logo(assets_dir="assets", filename="supercell_logo.png",
                     size=(300, 100), text="SUPERCELL"):
    """Create a dummy logo for testing.

    Args:
        assets_dir: Directory to save logo to
        filename: Filename to save as
        size: Tuple of (width, height)
        text: Text to write on logo

    Returns:
        Path to created logo file
    """
    dir_path = ensure_assets_dir(assets_dir)
    file_path = dir_path / filename

    # Skip if file already exists
    if file_path.exists():
        return file_path

    try:
        # Create basic logo shape with blue background
        w, h = size
        logo = np.zeros((h, w, 3), dtype=np.uint8)
        logo[:, :, 0] = 30    # Blue
        logo[:, :, 1] = 65
        logo[:, :, 2] = 255

        # Add text
        font = cv2.FONT_HERSHEY_SIMPLEX
        text_size = cv2.getTextSize(text, font, 1.2, 2)[0]
        x = (w - text_size[0]) // 2
        y = (h + text_size[1]) // 2

        cv2.putText(
            logo,
            text,
            (x, y),
            font,
            1.2,
            (255, 255, 255),
            2,
            cv2.LINE_AA
        )

        # Save logo
        cv2.imwrite(str(file_path), logo)
        logger.info(f"Created dummy logo at {file_path}")

        return file_path
    except Exception as e:
        logger.error(f"Error creating dummy logo: {e}")
        return None


def overlay_detection_info(frame: np.ndarray, detection: Dict) -> np.ndarray:
    """Overlay detection information on a frame.

    Args:
        frame: Frame to overlay info on
        detection: Detection result dictionary

    Returns:
        Frame with overlay
    """
    if not detection or not detection.get('detected', False):
        return frame

    # Make a copy to avoid modifying the original
    result = frame.copy()

    # Draw bounding box if location available
    loc = detection.get('location')
    if loc:
        x, y = loc.get('x', 0), loc.get('y', 0)
        w, h = loc.get('width', 0), loc.get('height', 0)
        cv2.rectangle(result, (x, y), (x + w, y + h), (0, 255, 0), 2)

    # Add confidence text
    conf = detection.get('confidence', 0)
    text = f"Supercell Logo: {conf:.2f}"
    cv2.putText(result, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX,
                0.7, (0, 255, 0), 2)

    return result


def save_sample_frames(frames: List[np.ndarray],
                      directory: str = "debug_frames",
                      prefix: str = "frame",
                      max_frames: int = 10):
    """Save sample frames to disk for debugging.

    Args:
        frames: List of frames to save
        directory: Directory to save to
        prefix: Filename prefix
        max_frames: Maximum number of frames to save
    """
    try:
        # Create directory if it doesn't exist
        debug_dir = Path(directory)
        if not debug_dir.exists():
            debug_dir.mkdir(parents=True)

        # Limit number of frames
        frames = frames[:max_frames]

        # Save frames
        for i, frame in enumerate(frames):
            filepath = debug_dir / f"{prefix}_{i:03d}.jpg"
            cv2.imwrite(str(filepath), frame)

        logger.info(f"Saved {len(frames)} debug frames to {debug_dir}")
    except Exception as e:
        logger.error(f"Error saving debug frames: {e}")