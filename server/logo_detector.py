import os
import logging
import time
import numpy as np
import cv2
from pathlib import Path
from typing import Dict, Optional, Tuple, List, Union

logger = logging.getLogger("logo_detector")

class LogoDetector:
    """Specialized detector for the Supercell logo on black background."""

    def __init__(self, logo_path: Optional[str] = None, threshold: float = 0.7):
        """Initialize the logo detector.

        Args:
            logo_path: Path to logo template image, or None to use internal detection
            threshold: Confidence threshold for detection (0-1)
        """
        self.threshold = threshold
        self.logo_template = None
        self.last_detection = None
        self.detection_count = 0

        # First try to load user-provided logo
        self.logo_path = logo_path
        if logo_path and os.path.exists(logo_path):
            self._load_logo_template(logo_path)
        else:
            # Look for logo in standard locations
            self._find_or_create_logo()

    def _load_logo_template(self, path: str) -> bool:
        """Load logo template from file.

        Args:
            path: Path to logo template image

        Returns:
            True if successful, False otherwise
        """
        try:
            self.logo_template = cv2.imread(path)
            if self.logo_template is None:
                logger.error(f"Failed to load logo template from {path}")
                return False

            logger.info(f"Loaded logo template from {path}: {self.logo_template.shape}")
            return True
        except Exception as e:
            logger.error(f"Error loading logo template: {e}")
            return False

    def _find_or_create_logo(self):
        """Find logo in standard locations or create synthetic template."""
        # Check common asset locations
        for path in [
            "assets/supercell_logo.png",
            "assets/supercell_logo.jpg",
            "ml_data/samples/logo/supercell_logo.png",
        ]:
            if os.path.exists(path) and self._load_logo_template(path):
                self.logo_path = path
                return

        # Create directory if needed
        os.makedirs("assets", exist_ok=True)

        # Create a synthetic logo template
        self._create_synthetic_template()

    def _create_synthetic_template(self):
        """Create a synthetic Supercell logo template matching the example."""
        try:
            # Create black background with white stacked "SUPERCELL" text
            h, w = 600, 400
            template = np.zeros((h, w, 3), dtype=np.uint8)

            # Draw the stacked "SUPERCELL" text
            # (Approximating the font and positioning)
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 3.0
            thickness = 12
            color = (255, 255, 255)  # White

            # Draw the three parts of the stacked logo
            cv2.putText(template, "SUP", (w//2-80, h//2-60), font, font_scale, color, thickness)
            cv2.putText(template, "ERC", (w//2-80, h//2+20), font, font_scale, color, thickness)
            cv2.putText(template, "ELL", (w//2-80, h//2+100), font, font_scale, color, thickness)

            # Save the synthetic template
            output_path = "assets/supercell_logo.png"
            cv2.imwrite(output_path, template)

            # Load the saved template
            self.logo_template = template
            self.logo_path = output_path

            logger.info(f"Created synthetic Supercell logo template: {output_path}")

        except Exception as e:
            logger.error(f"Error creating synthetic logo template: {e}")

    def detect(self, frame: np.ndarray) -> Dict:
        """Detect the Supercell logo in the given frame.

        Args:
            frame: Input frame as numpy array (BGR format)

        Returns:
            Detection result dictionary
        """
        start_time = time.time()

        if self.logo_template is None:
            logger.warning("No logo template available for detection")
            return {'detected': False, 'confidence': 0, 'location': None}

        try:
            # Check if the frame is mostly black (like the splash screen)
            is_dark = np.mean(frame) < 30

            # If not dark, unlikely to be the logo screen
            if not is_dark:
                result = {'detected': False, 'confidence': 0, 'location': None}
                self.last_detection = {
                    'result': result,
                    'timestamp': time.time(),
                    'duration': time.time() - start_time
                }
                return result

            # Convert both to grayscale for template matching
            gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # Edge case handling: convert template to grayscale if it's color
            if len(self.logo_template.shape) == 3 and self.logo_template.shape[2] == 3:
                gray_template = cv2.cvtColor(self.logo_template, cv2.COLOR_BGR2GRAY)
            else:
                gray_template = self.logo_template

            # Detect using two methods for robustness

            # 1. Template matching approach
            template_result = self._template_match(gray_frame, gray_template)

            # 2. Feature-based approach for the splash screen
            feature_result = self._detect_splash_screen_features(gray_frame)

            # Combine results (take the higher confidence)
            if template_result['confidence'] > feature_result['confidence']:
                result = template_result
            else:
                result = feature_result

            # Store detection state
            self.last_detection = {
                'result': result,
                'timestamp': time.time(),
                'duration': time.time() - start_time
            }

            # Log positive detections (but not too frequently)
            if result['detected']:
                self.detection_count += 1
                if self.detection_count % 10 == 1:
                    logger.info(f"Supercell logo detected with confidence {result['confidence']:.2f}")

            return result

        except Exception as e:
            logger.error(f"Error in logo detection: {e}")
            return {'detected': False, 'confidence': 0, 'location': None}

    def _template_match(self, gray_frame: np.ndarray, gray_template: np.ndarray) -> Dict:
        """Perform template matching for logo detection.

        Args:
            gray_frame: Grayscale input frame
            gray_template: Grayscale logo template

        Returns:
            Detection result
        """
        h, w = gray_frame.shape
        template_h, template_w = gray_template.shape

        # Try multiple scales since the logo size can vary
        scales = [0.2, 0.3, 0.4, 0.5]
        best_match = 0
        best_loc = None
        best_scale = 0

        for scale in scales:
            # Calculate target size
            target_h = int(h * scale)
            scale_factor = target_h / template_h
            target_w = int(template_w * scale_factor)

            # Skip if target is too small
            if target_h < 20 or target_w < 20:
                continue

            # Resize template
            resized_template = cv2.resize(gray_template, (target_w, target_h))

            # Template matching
            res = cv2.matchTemplate(gray_frame, resized_template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)

            # Update best match
            if max_val > best_match:
                best_match = max_val
                best_loc = max_loc
                best_scale = scale

        # Create result
        result = {
            'detected': best_match >= self.threshold,
            'confidence': float(best_match),
            'location': None
        }

        # Add location if detected
        if result['detected'] and best_loc is not None:
            result['location'] = {
                'x': int(best_loc[0]),
                'y': int(best_loc[1]),
                'width': int(template_w * best_scale),
                'height': int(template_h * best_scale),
                'scale': best_scale
            }

        return result

    def _detect_splash_screen_features(self, gray_frame: np.ndarray) -> Dict:
        """Detect Supercell splash screen by analyzing its features.

        Args:
            gray_frame: Grayscale input frame

        Returns:
            Detection result
        """
        h, w = gray_frame.shape

        # Check for white text in center region
        center_y1, center_y2 = int(h * 0.35), int(h * 0.65)
        center_x1, center_x2 = int(w * 0.25), int(w * 0.75)

        center_region = gray_frame[center_y1:center_y2, center_x1:center_x2]

        # Skip if center region is empty
        if center_region.size == 0:
            return {'detected': False, 'confidence': 0, 'location': None}

        # Count white pixels (text) in center region
        white_pixels = np.sum(center_region > 200)
        white_ratio = white_pixels / center_region.size

        # More refined check: Supercell logo has white text on black background
        # White ratio should be significant but not too high
        confidence = 0.0

        # Ideal range for white ratio of Supercell text on black background
        if white_ratio >= 0.03 and white_ratio <= 0.3:
            # Scale confidence based on how close the ratio is to ideal (0.1-0.15)
            if white_ratio >= 0.1 and white_ratio <= 0.15:
                confidence = 0.9  # Very likely the logo
            else:
                confidence = 0.7  # Possibly the logo

        # Create result
        result = {
            'detected': confidence >= self.threshold,
            'confidence': float(confidence),
            'location': None
        }

        # Add location if detected
        if result['detected']:
            result['location'] = {
                'x': center_x1,
                'y': center_y1,
                'width': center_x2 - center_x1,
                'height': center_y2 - center_y1,
            }

        return result

    def get_last_detection(self) -> Optional[Dict]:
        """Get the most recent detection result."""
        return self.last_detection


class GameStateDetector:
    """Detects various game states in Clash Royale."""

    def __init__(self):
        """Initialize the game state detector."""
        self.logo_detector = LogoDetector()
        self.last_state = {
            'splash_screen': False,
            'in_game': False,
            'elixir_count': 0,
            'cards_in_hand': []
        }

    def detect_state(self, frame: np.ndarray) -> Dict:
        """Detect game state from frame.

        Args:
            frame: Input frame (BGR format)

        Returns:
            Game state information
        """
        # First detect logo to identify splash screen
        logo_result = self.logo_detector.detect(frame)

        # Update state
        state = {
            'splash_screen': logo_result['detected'],
            'in_game': False,  # Will be implemented in future
            'elixir_count': 0,  # Will be implemented in future
            'cards_in_hand': []  # Will be implemented in future
        }

        self.last_state = state
        return state


# Create global instances
logo_detector = LogoDetector()
game_state_detector = GameStateDetector()