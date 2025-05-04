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

# ────────────────────────────────  logging  ────────────────────────────────
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("vision_pipeline")


class GameVisionPipeline:
    """
    Vision pipeline for Clash Royale frames.
    *Only* the game‑clock (“time left”) is extracted for now, using
    a robust template‑matching OCR routine tuned to CR’s font.
    """

    # ───────────────────────────  initialisation  ──────────────────────────
    def __init__(self, config=None):
        self.config = config or {}
        self.tesseract_config = self.config.get('tesseract_config', '--psm 7 --oem 1')
        self.last_time_value = None

        # verify tesseract present
        try:
            _ = pytesseract.image_to_string(np.zeros((20, 60), dtype=np.uint8))
            logger.info("Tesseract OK")
        except Exception as e:
            logger.warning("⚠️  Tesseract not available: %s", e)
            logger.warning("Install with: brew install tesseract")

        # analysis registry – only template approach
        self.analyzers = {
            'time_left': self.analyze_time_left_template,
        }
        logger.info("Vision pipeline ready (template OCR only)")

    # ─────────────────────────────  interface  ─────────────────────────────
    def process_frame(self, frame_data):
        """
        In: raw bytes or cv2 ndarray.
        Out: dict with 'time_left' analysis (or error details).
        """
        try:
            # bytes → ndarray if needed
            frame = (cv2.imdecode(np.frombuffer(frame_data, np.uint8), cv2.IMREAD_COLOR)
                     if isinstance(frame_data, (bytes, bytearray))
                     else frame_data)

            if frame is None or frame.size == 0:
                return {'error': 'Invalid frame'}

            results = {}
            try:
                results['time_left'] = self.analyzers['time_left'](frame)
            except Exception as e:
                logger.error("Time‑left analyzer failed: %s", e)
                logger.error(traceback.format_exc())
                results['time_left'] = {'error': str(e)}

            if self.config.get('debug', False):
                logger.debug("Frame results: %s", results)

            return results

        except Exception as e:
            logger.error("Frame processing error: %s", e)
            logger.error(traceback.format_exc())
            return {'error': str(e)}

    # ────────────────────────  template OCR routine  ───────────────────────
    def analyze_time_left_template(self, frame):
        """
        Extract Clash Royale timer via colour‑mask + OCR whitelist.
        Returns {'time_text': 'X:YY', 'seconds': int} or debug info.
        """
        try:
            h, w = frame.shape[:2]
            roi = frame[int(h * 0.05):int(h * 0.11),
                        int(w * 0.75):int(w * 0.99)]

            hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
            mask = cv2.inRange(hsv,
                               np.array([0, 0, 180]),      # bright/white range
                               np.array([180, 70, 255]))
            masked = cv2.bitwise_and(roi, roi, mask=mask)
            gray = cv2.cvtColor(masked, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY)

            if self.config.get('save_debug_images'):
                ts = datetime.now().strftime('%H%M%S')
                cv2.imwrite(f"debug_images/time_roi_{ts}.png", roi)
                cv2.imwrite(f"debug_images/time_mask_{ts}.png", mask)
                cv2.imwrite(f"debug_images/time_thresh_{ts}.png", thresh)

            ocr_variants = []
            for psm in (7, 8, 10, 13):
                cfg = f"--psm {psm} --oem 1 -c tessedit_char_whitelist=0123456789:"
                txt = pytesseract.image_to_string(thresh, config=cfg).strip()
                if txt:
                    ocr_variants.append(txt)
                    logger.debug("PSM %s → %s", psm, txt)

            combined = " ".join(ocr_variants)
            match = re.search(r'(\d+:\d{2})', combined)
            if not match:
                return {'time_text': None,
                        'seconds': None,
                        'raw_text': combined,
                        'method': 'template'}

            time_text = match.group(1)
            minutes, seconds = map(int, time_text.split(':'))
            total_seconds = minutes * 60 + seconds

            # time must monotonically decrease
            if (self.last_time_value is not None
                    and total_seconds > self.last_time_value):
                logger.warning("Ignoring spurious OCR jump (%s)", time_text)
                total_seconds = self.last_time_value
                time_text = self._format_time(total_seconds)

            self.last_time_value = total_seconds
            return {'time_text': time_text,
                    'seconds': total_seconds,
                    'method': 'template'}

        except Exception as e:
            logger.error("Template OCR failed: %s", e)
            logger.error(traceback.format_exc())
            return {'error': str(e)}

    # ────────────────────────────  util  ────────────────────────────
    @staticmethod
    def _format_time(seconds):
        """MM:SS helper."""
        return f"{seconds // 60}:{seconds % 60:02d}"
