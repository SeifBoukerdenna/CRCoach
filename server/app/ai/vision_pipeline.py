# app/ai/vision_pipeline.py
import cv2
import numpy as np
import pytesseract
from PIL import Image
import io
import re
import logging
import os
from datetime import datetime
import traceback

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("vision_pipeline")

class GameVisionPipeline:
    """
    Pipeline for analyzing Clash Royale game frames and extracting game state information.
    Designed to be highly scalable with a modular approach for adding more analyzers.
    """

    def __init__(self, config=None):
        """Initialize the vision pipeline with configuration options."""
        self.config = config or {}

        # Configure OCR engine with custom config
        self.tesseract_config = self.config.get('tesseract_config', '--psm 7 --oem 1')

        # Check if tesseract is installed
        try:
            # Create debug directory if it doesn't exist
            if self.config.get('save_debug_images', False):
                os.makedirs('debug_images', exist_ok=True)

            # Test tesseract with a simple image
            test_img = np.zeros((50, 100), dtype=np.uint8)
            cv2.putText(test_img, "Test", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, 255, 2)
            pytesseract.image_to_string(test_img)
            logger.info("Tesseract OCR initialized successfully")
        except Exception as e:
            logger.warning(f"Tesseract OCR initialization failed: {str(e)}. Text recognition will not work.")
            logger.warning("Make sure tesseract is installed: brew install tesseract")

        # Store the last extracted time for comparison/filtering
        self.last_time_value = None

        # Initialize analysis modules - can be expanded in the future
        self.analyzers = {
            'time_left': self.analyze_time_left,
            # Future analyzers will be added here:
            # 'elixir_count': self.analyze_elixir,
            # 'card_cycle': self.analyze_cards,
            # etc.
        }

        logger.info("Vision pipeline initialized")

    def process_frame(self, frame_data):
        """
        Process a single frame and return extracted game information.

        Args:
            frame_data (bytes or numpy.ndarray): Raw image data or CV2 image

        Returns:
            dict: Extracted game state information
        """
        try:
            # Convert input to OpenCV format if needed
            if isinstance(frame_data, bytes):
                # Convert from bytes to numpy array
                nparr = np.frombuffer(frame_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            else:
                frame = frame_data

            # Skip processing if frame is empty or invalid
            if frame is None or frame.size == 0:
                logger.warning("Empty or invalid frame received")
                return {'error': 'Invalid frame'}

            # For Clash Royale, use the specialized time extraction methods first
            results = {}

            # Try template approach first
            time_template_results = self.analyze_time_left_template(frame)

            # If successful, use those results; otherwise try standard approach
            if time_template_results.get('time_text'):
                results['time_left'] = time_template_results
            else:
                # Try regular approach
                time_results = self.analyze_time_left(frame)

                # Use whichever approach worked
                if time_results.get('time_text'):
                    results['time_left'] = time_results
                else:
                    # Combine results from both approaches for debugging
                    combined = {
                        'time_text': None,
                        'seconds': None,
                        'regular_results': time_results,
                        'template_results': time_template_results
                    }
                    results['time_left'] = combined

            # Process the frame with all active analyzers
            for analyzer_name, analyzer_func in self.analyzers.items():
                # Skip time_left as we already processed it
                if analyzer_name == 'time_left':
                    continue

                try:
                    results[analyzer_name] = analyzer_func(frame)
                except Exception as e:
                    error_msg = f"Error in {analyzer_name} analyzer: {str(e)}"
                    logger.error(error_msg)
                    logger.error(traceback.format_exc())
                    results[analyzer_name] = {'error': error_msg}

            # Log the results if debug is enabled
            if self.config.get('debug', False):
                logger.debug(f"Frame analysis results: {results}")

            return results

        except Exception as e:
            error_msg = f"Error processing frame: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return {'error': error_msg}


    def analyze_time_left(self, frame):
        """
        Extract the time left information from the top right corner of the frame.

        Args:
            frame (numpy.ndarray): OpenCV image frame

        Returns:
            dict: Time information with keys 'time_text' and 'seconds'
        """
        try:
            # Get frame dimensions
            height, width = frame.shape[:2]

            # Define region of interest (ROI) for time left - specifically for Clash Royale
            # Based on the screenshot, the time is in a black box in the top right
            roi_x = int(width * 0.75)  # Start at 75% of the width
            roi_y = int(height * 0.05)  # Start at 5% of the height
            roi_width = int(width * 0.24)  # Take 24% of width
            roi_height = int(height * 0.06)  # Take 6% of the height

            # Extract ROI with boundary checks
            if roi_x + roi_width > width:
                roi_width = width - roi_x
            if roi_y + roi_height > height:
                roi_height = height - roi_y

            # Skip if ROI is too small
            if roi_width < 10 or roi_height < 10:
                return {'error': 'ROI too small'}

            # Extract ROI
            roi = frame[roi_y:roi_y+roi_height, roi_x:roi_x+roi_width]

            # Pre-process the ROI for better OCR
            # 1. Convert to grayscale
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

            # 2. Apply different thresholds since text is white on black
            _, thresh1 = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)  # For white text

            # 3. Apply slight blur to reduce noise
            preprocessed = cv2.GaussianBlur(thresh1, (3, 3), 0)

            # 4. Increase contrast
            alpha = 1.5  # Contrast control
            beta = 30    # Brightness control
            enhanced = cv2.convertScaleAbs(preprocessed, alpha=alpha, beta=beta)

            # 5. Perform morphological operations to enhance text
            kernel = np.ones((2, 2), np.uint8)
            dilated = cv2.dilate(enhanced, kernel, iterations=1)

            # Save debug images
            if self.config.get('save_debug_images', False):
                timestamp = datetime.now().strftime('%H%M%S')
                debug_path = f"debug_images/frame_{timestamp}.jpg"
                cv2.imwrite(debug_path, frame)
                debug_path = f"debug_images/time_roi_{timestamp}.png"
                cv2.imwrite(debug_path, roi)
                debug_path = f"debug_images/time_gray_{timestamp}.png"
                cv2.imwrite(debug_path, gray)
                debug_path = f"debug_images/time_thresh_{timestamp}.png"
                cv2.imwrite(debug_path, thresh1)
                debug_path = f"debug_images/time_enhanced_{timestamp}.png"
                cv2.imwrite(debug_path, enhanced)
                debug_path = f"debug_images/time_dilated_{timestamp}.png"
                cv2.imwrite(debug_path, dilated)

            # Try OCR on multiple preprocessed versions
            text_results = []

            # Try different preprocessing outputs
            for img, name in [
                (gray, "gray"),
                (thresh1, "threshold"),
                (enhanced, "enhanced"),
                (dilated, "dilated")
            ]:
                text = pytesseract.image_to_string(
                    Image.fromarray(img),
                    config=self.tesseract_config
                ).strip()

                if text:
                    text_results.append(text)
                    logger.debug(f"OCR result ({name}): {text}")

            # Combine all text results
            all_text = " ".join(text_results)
            logger.debug(f"Combined OCR text: {all_text}")

            # Extract the time value using regex pattern matching
            # Looking for patterns like "X:XX", "Time left: X:XX", etc.
            time_pattern = r'(\d+:\d{2})'
            matches = re.findall(time_pattern, all_text)

            if matches:
                time_text = matches[0]
                # Convert time to seconds
                try:
                    minutes, seconds = map(int, time_text.split(':'))
                    total_seconds = minutes * 60 + seconds

                    # Basic validation and filtering for spurious detections
                    if self.last_time_value is not None:
                        # Time should only decrease, never increase
                        if total_seconds > self.last_time_value and self.last_time_value - total_seconds > 10:
                            logger.warning(f"Suspicious time detection: {time_text}. Using previous value.")
                            return {'time_text': self._format_time(self.last_time_value),
                                    'seconds': self.last_time_value}

                    self.last_time_value = total_seconds
                    logger.info(f"Time left detected: {time_text} ({total_seconds} seconds)")

                    return {
                        'time_text': time_text,
                        'seconds': total_seconds
                    }
                except ValueError:
                    logger.warning(f"Failed to parse time: {time_text}")

            # If we still don't have a match using regex, try a direct approach
            # For games like Clash Royale where we know the exact format
            # Look specifically for "2:50" pattern
            target_pattern = r'(?:Time left:)?\s*(\d+:\d{2})'
            matches = re.findall(target_pattern, all_text)

            if matches:
                time_text = matches[0]
                try:
                    minutes, seconds = map(int, time_text.split(':'))
                    total_seconds = minutes * 60 + seconds
                    self.last_time_value = total_seconds

                    logger.info(f"Time left detected (direct match): {time_text} ({total_seconds} seconds)")

                    return {
                        'time_text': time_text,
                        'seconds': total_seconds
                    }
                except ValueError:
                    logger.warning(f"Failed to parse time from direct match: {time_text}")

            # If OCR fails, try template matching
            # This works by recognizing the time pattern rather than reading text
            # For digits 0-9 and colon, we would need pre-defined templates
            # This is a more advanced technique, but could be implemented in a future version

            # Return debug info if all else fails
            return {
                'time_text': None,
                'seconds': None,
                'raw_text': all_text,
                'raw_texts': text_results
            }

        except Exception as e:
            error_msg = f"Error in time left analysis: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return {'error': error_msg}

            """
            Extract the time left information from the top right corner of the frame.

            Args:
                frame (numpy.ndarray): OpenCV image frame

            Returns:
                dict: Time information with keys 'time_text' and 'seconds'
            """
            try:
                # Get frame dimensions
                height, width = frame.shape[:2]

                # Define region of interest (ROI) for time left - specifically for Clash Royale
                # Based on the screenshot, the time is in a black box in the top right
                roi_x = int(width * 0.75)  # Start at 75% of the width
                roi_y = int(height * 0.05)  # Start at 5% of the height
                roi_width = int(width * 0.24)  # Take 24% of width
                roi_height = int(height * 0.06)  # Take 6% of the height

                # Extract ROI with boundary checks
                if roi_x + roi_width > width:
                    roi_width = width - roi_x
                if roi_y + roi_height > height:
                    roi_height = height - roi_y

                # Skip if ROI is too small
                if roi_width < 10 or roi_height < 10:
                    return {'error': 'ROI too small'}

                # Extract ROI
                roi = frame[roi_y:roi_y+roi_height, roi_x:roi_x+roi_width]

                # Pre-process the ROI for better OCR
                # 1. Convert to grayscale
                gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

                # 2. Apply different thresholds since text is white on black
                _, thresh1 = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)  # For white text

                # 3. Apply slight blur to reduce noise
                preprocessed = cv2.GaussianBlur(thresh1, (3, 3), 0)

                # 4. Increase contrast
                alpha = 1.5  # Contrast control
                beta = 30    # Brightness control
                enhanced = cv2.convertScaleAbs(preprocessed, alpha=alpha, beta=beta)

                # 5. Perform morphological operations to enhance text
                kernel = np.ones((2, 2), np.uint8)
                dilated = cv2.dilate(enhanced, kernel, iterations=1)

                # Save debug images
                if self.config.get('save_debug_images', False):
                    timestamp = datetime.now().strftime('%H%M%S')
                    debug_path = f"debug_images/frame_{timestamp}.jpg"
                    cv2.imwrite(debug_path, frame)
                    debug_path = f"debug_images/time_roi_{timestamp}.png"
                    cv2.imwrite(debug_path, roi)
                    debug_path = f"debug_images/time_gray_{timestamp}.png"
                    cv2.imwrite(debug_path, gray)
                    debug_path = f"debug_images/time_thresh_{timestamp}.png"
                    cv2.imwrite(debug_path, thresh1)
                    debug_path = f"debug_images/time_enhanced_{timestamp}.png"
                    cv2.imwrite(debug_path, enhanced)
                    debug_path = f"debug_images/time_dilated_{timestamp}.png"
                    cv2.imwrite(debug_path, dilated)

                # Try OCR on multiple preprocessed versions
                text_results = []

                # Try different preprocessing outputs
                for img, name in [
                    (gray, "gray"),
                    (thresh1, "threshold"),
                    (enhanced, "enhanced"),
                    (dilated, "dilated")
                ]:
                    text = pytesseract.image_to_string(
                        Image.fromarray(img),
                        config=self.tesseract_config
                    ).strip()

                    if text:
                        text_results.append(text)
                        logger.debug(f"OCR result ({name}): {text}")

                # Combine all text results
                all_text = " ".join(text_results)
                logger.debug(f"Combined OCR text: {all_text}")

                # Extract the time value using regex pattern matching
                # Looking for patterns like "X:XX", "Time left: X:XX", etc.
                time_pattern = r'(\d+:\d{2})'
                matches = re.findall(time_pattern, all_text)

                if matches:
                    time_text = matches[0]
                    # Convert time to seconds
                    try:
                        minutes, seconds = map(int, time_text.split(':'))
                        total_seconds = minutes * 60 + seconds

                        # Basic validation and filtering for spurious detections
                        if self.last_time_value is not None:
                            # Time should only decrease, never increase
                            if total_seconds > self.last_time_value and self.last_time_value - total_seconds > 10:
                                logger.warning(f"Suspicious time detection: {time_text}. Using previous value.")
                                return {'time_text': self._format_time(self.last_time_value),
                                        'seconds': self.last_time_value}

                        self.last_time_value = total_seconds
                        logger.info(f"Time left detected: {time_text} ({total_seconds} seconds)")

                        return {
                            'time_text': time_text,
                            'seconds': total_seconds
                        }
                    except ValueError:
                        logger.warning(f"Failed to parse time: {time_text}")

                # If we still don't have a match using regex, try a direct approach
                # For games like Clash Royale where we know the exact format
                # Look specifically for "2:50" pattern
                target_pattern = r'(?:Time left:)?\s*(\d+:\d{2})'
                matches = re.findall(target_pattern, all_text)

                if matches:
                    time_text = matches[0]
                    try:
                        minutes, seconds = map(int, time_text.split(':'))
                        total_seconds = minutes * 60 + seconds
                        self.last_time_value = total_seconds

                        logger.info(f"Time left detected (direct match): {time_text} ({total_seconds} seconds)")

                        return {
                            'time_text': time_text,
                            'seconds': total_seconds
                        }
                    except ValueError:
                        logger.warning(f"Failed to parse time from direct match: {time_text}")

                # If OCR fails, try template matching
                # This works by recognizing the time pattern rather than reading text
                # For digits 0-9 and colon, we would need pre-defined templates
                # This is a more advanced technique, but could be implemented in a future version

                # Return debug info if all else fails
                return {
                    'time_text': None,
                    'seconds': None,
                    'raw_text': all_text,
                    'raw_texts': text_results
                }

            except Exception as e:
                error_msg = f"Error in time left analysis: {str(e)}"
                logger.error(error_msg)
                logger.error(traceback.format_exc())
                return {'error': error_msg}

    def analyze_time_left_template(self, frame):
        """
        Alternative approach to extract time using template matching.
        This works better for Clash Royale's specific font and format.

        Args:
            frame (numpy.ndarray): OpenCV image frame

        Returns:
            dict: Time information with keys 'time_text' and 'seconds'
        """
        try:
            # Get frame dimensions
            height, width = frame.shape[:2]

            # Define the ROI for the time specifically for Clash Royale
            roi_x = int(width * 0.75)  # Start at 75% of the width
            roi_y = int(height * 0.05)  # Start at 5% of the height
            roi_width = int(width * 0.24)  # Take 24% of width
            roi_height = int(height * 0.06)  # Take 6% of the height

            # Extract ROI with boundary checks
            if roi_x + roi_width > width:
                roi_width = width - roi_x
            if roi_y + roi_height > height:
                roi_height = height - roi_y

            # Extract ROI
            roi = frame[roi_y:roi_y+roi_height, roi_x:roi_x+roi_width]

            # For Clash Royale, the time is white text on a dark background
            # Convert to HSV colorspace for better color isolation
            hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

            # Define range for white/bright colors
            lower_white = np.array([0, 0, 180])  # Low saturation, high value
            upper_white = np.array([180, 70, 255])  # Any hue, high value

            # Create mask for white text
            mask = cv2.inRange(hsv, lower_white, upper_white)

            # Apply mask to image
            masked = cv2.bitwise_and(roi, roi, mask=mask)

            # Convert to grayscale
            gray = cv2.cvtColor(masked, cv2.COLOR_BGR2GRAY)

            # Threshold the image
            _, thresh = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY)

            # Save debug images
            if self.config.get('save_debug_images', False):
                timestamp = datetime.now().strftime('%H%M%S')
                debug_path = f"debug_images/time_template_roi_{timestamp}.png"
                cv2.imwrite(debug_path, roi)
                debug_path = f"debug_images/time_template_mask_{timestamp}.png"
                cv2.imwrite(debug_path, mask)
                debug_path = f"debug_images/time_template_masked_{timestamp}.png"
                cv2.imwrite(debug_path, masked)
                debug_path = f"debug_images/time_template_thresh_{timestamp}.png"
                cv2.imwrite(debug_path, thresh)

            # Try OCR with different configurations
            # PSM 7 = Treat as a single line of text
            # PSM 8 = Treat as a single word
            # PSM 10 = Treat as a single character
            results = []
            for psm in [7, 8, 10, 13]:
                config = f'--psm {psm} --oem 1 -c tessedit_char_whitelist=0123456789:'
                text = pytesseract.image_to_string(
                    thresh,
                    config=config
                ).strip()

                if text:
                    results.append(text)
                    logger.debug(f"OCR result (PSM {psm}): {text}")

            # Combine results
            all_text = " ".join(results)

            # Look for time pattern X:XX
            time_pattern = r'(\d+:\d{2})'
            matches = re.findall(time_pattern, all_text)

            if matches:
                time_text = matches[0]
                try:
                    minutes, seconds = map(int, time_text.split(':'))
                    total_seconds = minutes * 60 + seconds
                    logger.info(f"Time left detected (template approach): {time_text} ({total_seconds} seconds)")

                    return {
                        'time_text': time_text,
                        'seconds': total_seconds,
                        'method': 'template'
                    }
                except ValueError:
                    logger.warning(f"Failed to parse time with template approach: {time_text}")

            # If time extraction failed with template matching, return info for debugging
            return {
                'time_text': None,
                'seconds': None,
                'raw_text': all_text,
                'method': 'template'
            }

        except Exception as e:
            error_msg = f"Error in template time analysis: {str(e)}"
            logger.error(error_msg)
            return {'error': error_msg}


        def _format_time(self, seconds):
            """Format seconds as MM:SS"""
            minutes = seconds // 60
            remaining_seconds = seconds % 60
            return f"{minutes}:{remaining_seconds:02d}"