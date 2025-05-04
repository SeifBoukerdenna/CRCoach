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
from collections import Counter

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("vision_pipeline")


class GameVisionPipeline:
    """
    Vision pipeline for Clash Royale frames.
    Enhanced selection logic for reliable timer detection.
    """

    def __init__(self, config=None):
        self.config = config or {}
        self.tesseract_config = self.config.get('tesseract_config', '--psm 7 --oem 1')
        self.last_time_value = None
        self.time_confidence_history = []  # Track confidence of readings

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
        Extract Clash Royale timer via multiple detection methods.
        Enhanced with better selection logic.
        """
        try:
            h, w = frame.shape[:2]

            # Precise ROI for timer area
            roi_x1, roi_x2 = int(w * 0.75), int(w * 1.0)
            roi_y1, roi_y2 = int(h * 0.052), int(h * 0.125)
            roi = frame[roi_y1:roi_y2, roi_x1:roi_x2]

            # Save debug image if enabled
            if self.config.get('save_debug_images'):
                ts = datetime.now().strftime('%H%M%S')
                os.makedirs('debug_images', exist_ok=True)
                cv2.imwrite(f"debug_images/time_roi_{ts}.png", roi)

            # Apply multiple preprocessing techniques
            processed_images = []

            # Method 1: Grayscale with thresholding
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            _, thresh_gray = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
            processed_images.append(("gray_thresh", thresh_gray))

            # Method 2: HSV detection for both white and red
            hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

            # White timer detection
            mask_white = cv2.inRange(hsv, np.array([0, 0, 180]), np.array([180, 30, 255]))
            processed_images.append(("white", mask_white))

            # Red timer detection
            mask_red1 = cv2.inRange(hsv, np.array([0, 100, 100]), np.array([10, 255, 255]))
            mask_red2 = cv2.inRange(hsv, np.array([170, 100, 100]), np.array([180, 255, 255]))
            mask_red = cv2.bitwise_or(mask_red1, mask_red2)
            processed_images.append(("red", mask_red))

            # Method 3: Combined detection
            mask_combined = cv2.bitwise_or(mask_white, mask_red)
            processed_images.append(("combined", mask_combined))

            # Save all preprocessed images if debug enabled
            if self.config.get('save_debug_images'):
                for name, img in processed_images:
                    cv2.imwrite(f"debug_images/time_{name}_{ts}.png", img)

            # Try OCR on all preprocessed images
            valid_times = []
            for method_name, img in processed_images:
                for psm in [6, 7, 8, 11]:
                    cfg = f"--psm {psm} --oem 1 -c tessedit_char_whitelist=0123456789:"
                    try:
                        text = pytesseract.image_to_string(img, config=cfg).strip()
                        if not text:
                            continue

                        logger.debug(f"Method {method_name}, PSM {psm}: '{text}'")

                        # Parse the OCR result
                        parsed_times = self._parse_time_text(text)
                        for time_text, seconds in parsed_times:
                            valid_times.append((seconds, time_text, method_name))

                    except Exception as e:
                        logger.debug(f"OCR failed with {method_name}, PSM {psm}: {str(e)}")

            # If no valid times found, try a more aggressive approach
            if not valid_times:
                # Combine all OCR results and try to reconstruct
                all_text = " ".join([
                    pytesseract.image_to_string(img[1], config="--psm 6 --oem 1").strip()
                    for img in processed_images
                ])
                parsed_times = self._parse_time_text(all_text)
                for time_text, seconds in parsed_times:
                    valid_times.append((seconds, time_text, "combined_text"))

            if not valid_times:
                return {
                    'time_text': None,
                    'seconds': None,
                    'raw_text': '',
                    'method': 'none',
                    'confidence': 0
                }

            # Select the best time value using enhanced logic
            best_time = self._select_best_time(valid_times)

            if best_time:
                total_seconds, time_text, method = best_time
                self.last_time_value = total_seconds

                # Add to confidence history
                self.time_confidence_history.append((total_seconds, len(valid_times)))
                if len(self.time_confidence_history) > 5:
                    self.time_confidence_history.pop(0)

                return {
                    'time_text': time_text,
                    'seconds': total_seconds,
                    'method': method,
                    'confidence': len(valid_times),
                    'debug': {'all_valid_times': valid_times} if self.config.get('debug') else None
                }
            else:
                return {
                    'time_text': None,
                    'seconds': None,
                    'raw_text': '',
                    'method': 'none',
                    'confidence': 0
                }

        except Exception as e:
            logger.error("Template OCR failed: %s", e)
            logger.error(traceback.format_exc())
            return {'error': str(e)}

    def _parse_time_text(self, text):
        """Parse time from OCR text using multiple patterns."""
        valid_times = []

        # Clean the text
        text = text.strip()

        # Pattern 1: Standard MM:SS or M:SS
        for match in re.finditer(r'(\d{1,2}):(\d{1,2})', text):
            minutes, seconds = match.groups()
            try:
                m, s = int(minutes), int(seconds)
                if 0 <= m <= 5 and 0 <= s < 60:
                    time_text = f"{m}:{s:02d}"
                    total_seconds = m * 60 + s
                    valid_times.append((time_text, total_seconds))
            except ValueError:
                continue

        # Pattern 2: Just seconds with colon prefix (:SS)
        for match in re.finditer(r':(\d{1,2})', text):
            seconds_str = match.group(1)
            try:
                s = int(seconds_str)
                if 0 <= s < 60:
                    time_text = f"0:{s:02d}"
                    total_seconds = s
                    valid_times.append((time_text, total_seconds))
            except ValueError:
                continue

        # Pattern 3: Just numbers (could be seconds)
        numbers = re.findall(r'\d+', text)
        for num_str in numbers:
            try:
                num = int(num_str)
                if 0 <= num < 60:  # Likely seconds
                    time_text = f"0:{num:02d}"
                    total_seconds = num
                    valid_times.append((time_text, total_seconds))
                elif num >= 100:  # Could be minutes+seconds combined
                    minutes = num // 100
                    seconds = num % 100
                    if 0 <= minutes <= 5 and 0 <= seconds < 60:
                        time_text = f"{minutes}:{seconds:02d}"
                        total_seconds = minutes * 60 + seconds
                        valid_times.append((time_text, total_seconds))
            except ValueError:
                continue

        return valid_times

    def _select_best_time(self, valid_times):
        """Select the most plausible time using confidence-based approach."""
        if not valid_times:
            return None

        # Count frequency of each time value
        time_counts = Counter([t[0] for t in valid_times])

        # Get the most common time values
        most_common = time_counts.most_common()

        if not most_common:
            return None

        # Filter for times with high frequency
        max_count = most_common[0][1]
        candidates = [item for item in most_common if item[1] >= max_count * 0.7]

        # If we have multiple candidates with similar frequency, use additional logic
        if len(candidates) > 1:
            # Prefer times that make sense based on last value
            if self.last_time_value is not None:
                # Sort candidates by proximity to last value and decreasing nature
                candidates.sort(key=lambda x: (
                    0 if x[0] <= self.last_time_value else 1,  # Prefer decreasing
                    abs(x[0] - self.last_time_value)  # Prefer closer to last
                ))

            # If still multiple, prefer values that are not edge cases (0, 1, 2)
            non_edge_candidates = [c for c in candidates if c[0] > 2]
            if non_edge_candidates:
                best_time_value = non_edge_candidates[0][0]
            else:
                best_time_value = candidates[0][0]
        else:
            best_time_value = candidates[0][0]

        # Find a representative entry for this time value
        for time_value, time_text, method in valid_times:
            if time_value == best_time_value:
                return (time_value, time_text, method)

        return None