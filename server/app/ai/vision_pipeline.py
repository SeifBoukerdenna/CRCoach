# app/ai/vision_pipeline.py
import cv2
import numpy as np
import pytesseract
from PIL import Image
import re
import logging
import os
from datetime import datetime
import traceback

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("vision_pipeline")


class GameVisionPipeline:
    """
    Vision pipeline for Clash Royale frames.
    Improved time extraction with better accuracy.
    """

    def __init__(self, config=None):
        self.config = config or {}
        self.tesseract_config = self.config.get('tesseract_config', '--psm 7 --oem 1')
        self.last_time_value = None
        self.time_history = []  # Track recent time values for smoothing
        self.max_history = 5

        # verify tesseract present
        try:
            _ = pytesseract.image_to_string(np.zeros((20, 60), dtype=np.uint8))
            logger.info("Tesseract OK")
        except Exception as e:
            logger.warning("⚠️  Tesseract not available: %s", e)
            logger.warning("Install with: brew install tesseract")

        # analysis registry
        self.analyzers = {
            'time_left': self.analyze_time_left_template,
        }
        logger.info("Vision pipeline ready (template OCR only)")

    def process_frame(self, frame_data):
        """
        In: raw bytes or cv2 ndarray.
        Out: dict with 'time_left' analysis (or error details).
        """
        try:
            frame = (cv2.imdecode(np.frombuffer(frame_data, np.uint8), cv2.IMREAD_COLOR)
                     if isinstance(frame_data, (bytes, bytearray))
                     else frame_data)

            if frame is None or frame.size == 0:
                return {'error': 'Invalid frame'}

            results = {}
            try:
                results['time_left'] = self.analyzers['time_left'](frame)
            except Exception as e:
                logger.error("Time-left analyzer failed: %s", e)
                logger.error(traceback.format_exc())
                results['time_left'] = {'error': str(e)}

            if self.config.get('debug', False):
                logger.debug("Frame results: %s", results)

            return results

        except Exception as e:
            logger.error("Frame processing error: %s", e)
            logger.error(traceback.format_exc())
            return {'error': str(e)}

    def analyze_time_left_template(self, frame):
        """
        Extract Clash Royale timer via color-mask + OCR whitelist.
        Enhanced with better preprocessing and robust time tracking.
        """
        try:
            h, w = frame.shape[:2]

            # Improved ROI calculation for timer area
            roi_x1, roi_x2 = int(w * 0.75), int(w * 0.98)
            roi_y1, roi_y2 = int(h * 0.05), int(h * 0.11)
            roi = frame[roi_y1:roi_y2, roi_x1:roi_x2]

            # Multiple preprocessing approaches for robustness
            results = []

            # Method 1: Original HSV approach
            hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
            mask1 = cv2.inRange(hsv, np.array([0, 0, 180]), np.array([180, 70, 255]))
            gray1 = cv2.cvtColor(cv2.bitwise_and(roi, roi, mask=mask1), cv2.COLOR_BGR2GRAY)
            _, thresh1 = cv2.threshold(gray1, 50, 255, cv2.THRESH_BINARY)

            # Method 2: White color detection in BGR
            mask2 = cv2.inRange(roi, np.array([200, 200, 200]), np.array([255, 255, 255]))

            # Method 3: Grayscale + adaptive threshold
            gray2 = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            thresh2 = cv2.adaptiveThreshold(gray2, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 11, 2)

            # Try all methods
            for method_name, img in [("hsv", thresh1), ("bgr", mask2), ("adaptive", thresh2)]:
                for psm in [6, 7, 8, 10, 11, 12, 13]:
                    cfg = f"--psm {psm} --oem 1 -c tessedit_char_whitelist=0123456789:"
                    try:
                        txt = pytesseract.image_to_string(img, config=cfg).strip()
                        if txt and ':' in txt:
                            results.append((method_name, psm, txt))
                            logger.debug(f"Method {method_name}, PSM {psm}: {txt}")
                    except Exception as ocr_error:
                        logger.debug(f"OCR failed with method {method_name}, PSM {psm}: {str(ocr_error)}")

            # Save debug images if enabled
            if self.config.get('save_debug_images'):
                ts = datetime.now().strftime('%H%M%S')
                os.makedirs('debug_images', exist_ok=True)
                cv2.imwrite(f"debug_images/time_roi_{ts}.png", roi)
                cv2.imwrite(f"debug_images/time_hsv_{ts}.png", thresh1)
                cv2.imwrite(f"debug_images/time_bgr_{ts}.png", mask2)
                cv2.imwrite(f"debug_images/time_adaptive_{ts}.png", thresh2)

            # Process all results to find best match
            combined_text = " ".join([r[2] for r in results])

            # Find all potential time values
            time_matches = re.findall(r'(\d+:\d{2}|\d+:\d{1})', combined_text)

            valid_times = []
            for time_text in time_matches:
                try:
                    # Normalize single digit seconds to double digits
                    if len(time_text.split(':')[1]) == 1:
                        time_text += '0'

                    parts = time_text.split(':')
                    if len(parts) == 2:
                        minutes, seconds = int(parts[0]), int(parts[1])

                        # Validate time range (0-5 minutes for Clash Royale)
                        if 0 <= minutes <= 5 and 0 <= seconds < 60:
                            total_seconds = minutes * 60 + seconds
                            valid_times.append((total_seconds, time_text))
                except Exception as e:
                    logger.debug(f"Error parsing time {time_text}: {e}")

            if not valid_times:
                return {
                    'time_text': None,
                    'seconds': None,
                    'raw_text': combined_text,
                    'method': 'all',
                    'confidence': 0
                }

            # Sort by plausibility (proximity to last known value)
            if self.last_time_value is not None:
                valid_times.sort(key=lambda x: abs(x[0] - self.last_time_value))
                best_time = valid_times[0]

                # Sanity check: time should decrease
                if best_time[0] > self.last_time_value:
                    # Look for next best candidate
                    for candidate in valid_times[1:]:
                        if candidate[0] <= self.last_time_value:
                            best_time = candidate
                            break
            else:
                # No history, pick most likely value (highest confidence)
                best_time = max(valid_times, key=lambda x: valid_times.count(x))

            total_seconds, time_text = best_time

            # Update history for smoothing
            self.time_history.append(total_seconds)
            if len(self.time_history) > self.max_history:
                self.time_history.pop(0)

            # Smooth the value if we have history
            if len(self.time_history) > 1:
                # Use median of recent values to avoid spikes
                smoothed_value = sorted(self.time_history)[len(self.time_history) // 2]
                # Only use smoothed value if it's close to our raw reading
                if abs(smoothed_value - total_seconds) <= 1:
                    total_seconds = smoothed_value
                    time_text = self._format_time(total_seconds)

            self.last_time_value = total_seconds

            return {
                'time_text': time_text,
                'seconds': total_seconds,
                'method': 'multi-approach',
                'confidence': len(valid_times),
                'raw_results': results[:5] if self.config.get('debug') else None
            }

        except Exception as e:
            logger.error("Template OCR failed: %s", e)
            logger.error(traceback.format_exc())
            return {'error': str(e)}

    @staticmethod
    def _format_time(seconds):
        """Format seconds as MM:SS."""
        return f"{seconds // 60}:{seconds % 60:02d}"