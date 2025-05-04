# app/ai/vision_pipeline.py
import cv2
import numpy as np
import re
import logging
import os
import subprocess
import tempfile
from datetime import datetime
import traceback
from collections import Counter

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("vision_pipeline")


class GameVisionPipeline:
    """
    Vision pipeline for Clash Royale frames.
    Enhanced timer detection with JSON response format.
    """

    def __init__(self, config=None):
        self.config = config or {}
        self.debug = self.config.get('debug', False)
        self.last_time_value = None
        self.time_confidence_history = []  # Track confidence of readings

        # Tesseract config for timer reading
        self.tsconfig = "--psm 13 -c tessedit_char_blacklist=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

        # Verify tesseract is available
        try:
            subprocess.check_output(["tesseract", "--version"], stderr=subprocess.DEVNULL)
            logger.info("Tesseract OCR detected")
        except Exception as e:
            logger.warning("⚠️  Tesseract not available: %s", e)
            logger.warning("Install with: brew install tesseract")

        # analysis registry
        self.analyzers = {
            'time_left': self.analyze_time_left,
        }
        logger.info("Vision pipeline ready")

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

            if self.debug:
                logger.debug("Frame results: %s", results)

            return results

        except Exception as e:
            logger.error("Frame processing error: %s", e)
            logger.error(traceback.format_exc())
            return {'error': str(e)}

    def _read_timer(self, roi, debug=False):
        """
        Extract timer from image using same logic as the command line script.
        Returns (time_text, is_overtime) or None.
        """
        h, w = roi.shape[:2]

        if debug:
            timestamp = datetime.now().strftime('%H%M%S')
            os.makedirs('debug_images', exist_ok=True)
            cv2.imwrite(f"debug_images/roi_{timestamp}.png", roi)

        # Convert to HSV for better color detection
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

        # Black panel detection
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        mask_black = cv2.inRange(gray, 0, 30)
        cnts_black, _ = cv2.findContours(mask_black, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        panel = None
        is_overtime = False

        # Debug: save black mask
        if debug:
            cv2.imwrite(f"debug_images/mask_black_{timestamp}.png", mask_black)

        # Try to find black panel first
        for c in cnts_black:
            x, y, ww, hh = cv2.boundingRect(c)
            if ww * hh > 300 and y < h * 0.3:
                panel = gray[y:y+hh, x:x+ww]
                if debug:
                    cv2.rectangle(roi, (x, y), (x+ww, y+hh), (0, 255, 0), 2)
                    cv2.imwrite(f"debug_images/black_panel_{timestamp}.png", panel)
                break

        # If no black panel found, try orange panel (Clash Royale Overtime)
        if panel is None:
            # Define orange color range in HSV
            lower_orange1 = np.array([0, 100, 100])      # Lower red
            upper_orange1 = np.array([30, 255, 255])     # Upper orange
            lower_orange2 = np.array([150, 100, 100])    # Higher red
            upper_orange2 = np.array([180, 255, 255])    # Orange wrapping around hue

            # Create masks for orange colors
            mask_orange1 = cv2.inRange(hsv, lower_orange1, upper_orange1)
            mask_orange2 = cv2.inRange(hsv, lower_orange2, upper_orange2)
            mask_orange = cv2.bitwise_or(mask_orange1, mask_orange2)

            # Debug: save orange mask
            if debug:
                cv2.imwrite(f"debug_images/mask_orange_{timestamp}.png", mask_orange)

            # Find contours in orange mask
            cnts_orange, _ = cv2.findContours(mask_orange, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for c in cnts_orange:
                x, y, ww, hh = cv2.boundingRect(c)
                if ww * hh > 300 and y < h * 0.3:
                    # Extract the panel in grayscale for OCR
                    panel = gray[y:y+hh, x:x+ww]
                    is_overtime = True  # Flag that orange panel was detected
                    if debug:
                        cv2.rectangle(roi, (x, y), (x+ww, y+hh), (0, 0, 255), 2)
                        cv2.imwrite(f"debug_images/orange_panel_{timestamp}.png", panel)
                    break

        if debug and panel is not None:
            cv2.imwrite(f"debug_images/roi_with_detection_{timestamp}.png", roi)

        if panel is None:
            return None

        # Extract the digits area (bottom portion of the panel)
        digits = panel[int(panel.shape[0]*0.45):]

        # Try different thresholding techniques
        _, digits_binary = cv2.threshold(digits, 127, 255, cv2.THRESH_BINARY_INV)
        digits_otsu = cv2.threshold(digits, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

        if debug:
            cv2.imwrite(f"debug_images/digits_original_{timestamp}.png", digits)
            cv2.imwrite(f"debug_images/digits_binary_{timestamp}.png", digits_binary)
            cv2.imwrite(f"debug_images/digits_otsu_{timestamp}.png", digits_otsu)

        # Try OCR on different processed images
        best_result = None
        for processed_digits in [digits, digits_binary, digits_otsu]:
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as t:
                cv2.imwrite(t.name, processed_digits)
                try:
                    txt = subprocess.check_output([
                        "tesseract", t.name, "stdout",
                        "--psm", "13",
                        "-c", "tessedit_char_blacklist=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
                    ], stderr=subprocess.DEVNULL).decode().strip()
                    os.unlink(t.name)

                    # Check for timer text with validation
                    validated_result = self._validate_timer_text(txt)
                    if validated_result:
                        best_result = validated_result
                        if debug:
                            print(f"Found timer: {best_result}")
                        break
                except Exception as e:
                    if debug:
                        print(f"OCR failed: {str(e)}")
                    os.unlink(t.name)

        if best_result:
            return best_result, is_overtime
        return None

    def _validate_timer_text(self, text):
        """Validate timer text and fix common OCR errors."""
        # Check for standard time format
        match = re.search(r"(\d{1,3}):(\d{2})", text)
        if match:
            minutes, seconds = match.groups()
            try:
                m = int(minutes)
                s = int(seconds)

                # Validate minutes: must be 0, 1, or 2
                if m > 2:
                    # If minutes > 2, default to 0
                    m = 0

                # Validate seconds: must be between 0-59
                if s >= 60:
                    s = s % 60  # Take the remainder

                return f"{m}:{s:02d}"
            except ValueError:
                return None

        # Try alternative patterns
        # Sometimes OCR might read '0:04' as just '04' or ':04'
        alt_match = re.search(r":(\d{2})", text)
        if alt_match:
            seconds = alt_match.group(1)
            try:
                s = int(seconds)
                if s >= 60:
                    s = s % 60
                return f"0:{s:02d}"
            except ValueError:
                return None

        return None

    def _parse_time_to_seconds(self, time_text):
        """Convert MM:SS format to total seconds"""
        if ':' in time_text:
            parts = time_text.split(':')
            if len(parts) == 2:
                minutes, seconds = parts
                try:
                    return int(minutes) * 60 + int(seconds)
                except ValueError:
                    return None
        return None

    def analyze_time_left(self, frame):
        """
        Extract Clash Royale timer and return in the expected format.
        """
        try:
            h, w = frame.shape[:2]

            # Precise ROI for timer area (top right corner)
            roi_x1, roi_x2 = int(w * 0.60), int(w * 1.0)
            roi_y1, roi_y2 = 0, int(h * 0.18)
            roi = frame[roi_y1:roi_y2, roi_x1:roi_x2]

            # Extract timer using the integrated method
            result = self._read_timer(roi, debug=self.debug)

            if result:
                time_text, is_overtime = result
                seconds = self._parse_time_to_seconds(time_text)

                response = {
                    'time_text': time_text,
                    'seconds': seconds,
                    'OT': is_overtime,
                    'raw_text': time_text,  # For compatibility
                    'method': 'template_ocr',
                    'confidence': 1.0  # Since we successfully found a timer
                }

                # Update confidence history
                self.last_time_value = seconds
                self.time_confidence_history.append((seconds, 1))
                if len(self.time_confidence_history) > 5:
                    self.time_confidence_history.pop(0)

                return response
            else:
                return {
                    'time_text': None,
                    'seconds': None,
                    'OT': False,
                    'raw_text': '',
                    'method': 'none',
                    'confidence': 0
                }

        except Exception as e:
            logger.error("OCR analyzer failed: %s", e)
            logger.error(traceback.format_exc())
            return {'error': str(e)}