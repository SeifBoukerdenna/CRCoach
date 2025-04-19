import logging
import time
import numpy as np
import cv2
from typing import Dict, Optional
import threading
import queue

from logo_detector import logo_detector

logger = logging.getLogger("frame_processor")

class FrameProcessor:
    """Processes frames from WebRTC streams for logo detection."""

    def __init__(self, sample_rate: int = 15, queue_size: int = 2):
        """Initialize the frame processor.

        Args:
            sample_rate: Process 1 in every N frames
            queue_size: Maximum size of frame queue
        """
        self.sample_rate = sample_rate
        self.frame_count = {}  # Per session
        self.last_processed = {}  # Timestamp per session
        self.detection_results = {}  # Results per session

        # Processing queue to prevent blocking
        self.frame_queue = queue.Queue(maxsize=queue_size)
        self.processing_thread = None
        self.running = False

    def start(self):
        """Start the frame processor thread."""
        if self.processing_thread is not None and self.processing_thread.is_alive():
            return

        self.running = True
        self.processing_thread = threading.Thread(target=self._process_queue)
        self.processing_thread.daemon = True
        self.processing_thread.start()
        logger.info("Frame processor thread started")

    def stop(self):
        """Stop the frame processor thread."""
        self.running = False
        if self.processing_thread is not None:
            self.processing_thread.join(timeout=1.0)
            self.processing_thread = None
        logger.info("Frame processor thread stopped")

    def process_jpeg(self, jpeg_data: bytes, code: str):
        """Queue a JPEG frame for processing.

        Args:
            jpeg_data: Raw JPEG bytes
            code: Session code
        """
        # Initialize or increment frame counter for this session
        if code not in self.frame_count:
            self.frame_count[code] = 0

        self.frame_count[code] += 1

        # Process only every Nth frame to reduce load
        if self.frame_count[code] % self.sample_rate != 0:
            return

        # Process more frequently on startup to quickly detect logo
        early_phase = self.frame_count[code] < 100
        if early_phase and self.frame_count[code] % 3 != 0:
            return

        # Add to queue if not full (non-blocking)
        try:
            self.frame_queue.put_nowait((jpeg_data, code))
        except queue.Full:
            # Queue full, skip this frame
            pass

    def _process_queue(self):
        """Background thread to process frames from queue."""
        while self.running:
            try:
                # Get frame from queue with timeout
                try:
                    jpeg_data, code = self.frame_queue.get(timeout=0.5)
                except queue.Empty:
                    continue

                # Don't process frames too frequently from the same session
                current_time = time.time()
                last_time = self.last_processed.get(code, 0)

                # Use more frequent processing if we haven't detected logo yet
                previous_result = self.detection_results.get(code, {})
                logo_detected = previous_result.get('logo', {}).get('detected', False)

                # Adjust processing rate based on whether we've detected the logo
                if logo_detected and current_time - last_time < 1.0:  # Less frequent after detection
                    self.frame_queue.task_done()
                    continue
                elif not logo_detected and current_time - last_time < 0.3:  # More frequent before detection
                    self.frame_queue.task_done()
                    continue

                self.last_processed[code] = current_time

                # Process frame
                try:
                    # Decode JPEG to numpy array
                    arr = np.frombuffer(jpeg_data, np.uint8)
                    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

                    if img is None:
                        logger.warning(f"Failed to decode JPEG for session {code}")
                        self.frame_queue.task_done()
                        continue

                    # Run logo detection
                    logo_result = logo_detector.detect(img)

                    # Update detection results
                    self.detection_results[code] = {
                        'timestamp': current_time,
                        'logo': logo_result,
                        'game_state': None  # Will be implemented later
                    }

                    # Log detection (not too frequently)
                    if logo_result['detected'] and self.frame_count[code] % 30 == 0:
                        logger.info(f"Logo detected in session {code} with confidence {logo_result['confidence']:.2f}")

                except Exception as e:
                    logger.error(f"Error processing frame: {e}")

                finally:
                    self.frame_queue.task_done()

            except Exception as e:
                logger.error(f"Error in processing thread: {e}")
                time.sleep(0.1)  # Prevent tight loop on errors

    def get_detection_results(self, code: str) -> Dict:
        """Get detection results for a session.

        Args:
            code: Session code

        Returns:
            Latest detection results or empty dict if none
        """
        if code not in self.detection_results:
            return {}

        results = self.detection_results[code]

        # Check if results are fresh (within last 5 seconds)
        current_time = time.time()
        if current_time - results['timestamp'] > 5.0:
            # Results are stale, clear logo detection
            if 'logo' in results:
                results['logo']['detected'] = False

        return results


# Create global instance
frame_processor = FrameProcessor()

# Additional utility functions
def convert_to_json_response(detection_results: Dict) -> Dict:
    """Convert detection results to JSON-friendly format.

    Args:
        detection_results: Detection results from frame processor

    Returns:
        JSON-friendly dict
    """
    if not detection_results:
        return {
            'status': 'no_data',
            'logo_detected': False,
            'timestamp': time.time()
        }

    # Extract logo detection
    logo_result = detection_results.get('logo', {})

    return {
        'status': 'active',
        'logo_detected': logo_result.get('detected', False),
        'confidence': logo_result.get('confidence', 0),
        'location': logo_result.get('location'),
        'timestamp': detection_results.get('timestamp', time.time())
    }