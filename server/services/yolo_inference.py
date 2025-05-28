"""
server/services/yolo_inference.py - YOLOv8 Clash Royale Inference Service
"""

import os
import cv2
import numpy as np
import asyncio
import threading
import time
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path
import base64
import logging

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    logging.warning("Ultralytics not available. Install with: pip install ultralytics")

class YOLOInferenceService:
    def __init__(self, model_path: str = "models/best.pt", debug_mode: bool = True):
        self.model_path = model_path
        self.debug_mode = debug_mode
        self.model: Optional[YOLO] = None
        self.is_initialized = False
        self.confidence_threshold = 0.2  # 20% confidence
        self.inference_count = 0
        self.last_inference_time = 0
        self.avg_inference_time = 0

        # Debug folders
        self.debug_folder = Path("debug_outputs")
        self.debug_folder.mkdir(exist_ok=True)
        (self.debug_folder / "detections").mkdir(exist_ok=True)
        (self.debug_folder / "raw_frames").mkdir(exist_ok=True)

        # Thread-safe initialization
        self._lock = threading.Lock()
        self._initialize_model()

    def _initialize_model(self):
        """Initialize YOLOv8 model in a thread-safe manner"""
        if not YOLO_AVAILABLE:
            logging.error("❌ Ultralytics not available. Cannot initialize YOLO model.")
            return

        try:
            if not os.path.exists(self.model_path):
                logging.error(f"❌ Model file not found: {self.model_path}")
                return

            logging.info(f"🧠 Loading YOLOv8 model from {self.model_path}")
            self.model = YOLO(self.model_path)
            self.is_initialized = True
            logging.info("✅ YOLOv8 model loaded successfully")

            # Log model info
            if hasattr(self.model, 'names'):
                class_names = list(self.model.names.values()) if isinstance(self.model.names, dict) else self.model.names
                logging.info(f"📋 Model classes: {class_names}")

        except Exception as e:
            logging.error(f"❌ Failed to initialize YOLOv8 model: {e}")
            self.is_initialized = False

    def is_ready(self) -> bool:
        """Check if the inference service is ready"""
        return self.is_initialized and self.model is not None

    def decode_base64_image(self, base64_str: str) -> Optional[np.ndarray]:
        """Decode base64 image string to OpenCV format"""
        try:
            # Remove data:image prefix if present
            if base64_str.startswith('data:image'):
                base64_str = base64_str.split(',', 1)[1]

            # Decode base64
            img_data = base64.b64decode(base64_str)

            # Convert to numpy array
            nparr = np.frombuffer(img_data, np.uint8)

            # Decode image
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                logging.error("❌ Failed to decode image from base64")
                return None

            return image

        except Exception as e:
            logging.error(f"❌ Error decoding base64 image: {e}")
            return None

    def encode_image_to_base64(self, image: np.ndarray) -> str:
        """Encode OpenCV image to base64 string"""
        try:
            _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 85])
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            return img_base64
        except Exception as e:
            logging.error(f"❌ Error encoding image to base64: {e}")
            return ""

    def save_debug_image(self, image: np.ndarray, filename: str, folder: str = "detections"):
        """Save debug image to disk"""
        if not self.debug_mode:
            return

        try:
            debug_path = self.debug_folder / folder / filename
            cv2.imwrite(str(debug_path), image)
            logging.info(f"💾 Debug image saved: {debug_path}")
        except Exception as e:
            logging.error(f"❌ Failed to save debug image: {e}")

    def draw_detections(self, image: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """Draw detection boxes and labels on image"""
        annotated_image = image.copy()

        for detection in detections:
            bbox = detection['bbox']
            class_name = detection['class']
            confidence = detection['confidence']

            # Extract coordinates
            x1, y1 = int(bbox['x1']), int(bbox['y1'])
            x2, y2 = int(bbox['x2']), int(bbox['y2'])

            # Choose color based on confidence
            if confidence >= 0.8:
                color = (0, 255, 0)  # Green for high confidence
            elif confidence >= 0.5:
                color = (0, 255, 255)  # Yellow for medium confidence
            else:
                color = (0, 0, 255)  # Red for low confidence

            # Draw bounding box
            cv2.rectangle(annotated_image, (x1, y1), (x2, y2), color, 2)

            # Draw label background
            label = f"{class_name}: {confidence:.2f}"
            (label_width, label_height), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
            cv2.rectangle(annotated_image, (x1, y1 - label_height - 10), (x1 + label_width, y1), color, -1)

            # Draw label text
            cv2.putText(annotated_image, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

        return annotated_image

    async def run_inference(self, image_data: str, session_code: str) -> Optional[Dict[str, Any]]:
        """Run YOLOv8 inference on image data"""
        if not self.is_ready():
            logging.error("❌ YOLO model not ready for inference")
            return None

        start_time = time.time()

        try:
            # Decode image
            image = self.decode_base64_image(image_data)
            if image is None:
                return None

            # Save raw frame for debugging
            if self.debug_mode:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
                raw_filename = f"raw_{session_code}_{timestamp}.jpg"
                # self.save_debug_image(image, raw_filename, "raw_frames")

            # Run inference
            with self._lock:
                results = self.model(image, conf=self.confidence_threshold, verbose=False)

            # Process results
            detections = []
            if len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes

                for i in range(len(boxes)):
                    # Get box coordinates
                    box = boxes.xyxy[i].cpu().numpy()
                    x1, y1, x2, y2 = box

                    # Get confidence and class
                    confidence = float(boxes.conf[i].cpu().numpy())
                    class_id = int(boxes.cls[i].cpu().numpy())

                    # Get class name
                    class_name = "unknown"
                    if hasattr(self.model, 'names') and class_id in self.model.names:
                        class_name = self.model.names[class_id]

                    detection = {
                        'class': class_name,
                        'class_id': class_id,
                        'confidence': confidence,
                        'bbox': {
                            'x1': float(x1),
                            'y1': float(y1),
                            'x2': float(x2),
                            'y2': float(y2),
                            'width': float(x2 - x1),
                            'height': float(y2 - y1)
                        }
                    }
                    detections.append(detection)

            # Calculate inference time
            inference_time = (time.time() - start_time) * 1000  # Convert to ms

            # Update stats
            self.inference_count += 1
            self.last_inference_time = inference_time
            self.avg_inference_time = ((self.avg_inference_time * (self.inference_count - 1)) + inference_time) / self.inference_count

            # Create annotated image
            annotated_image = self.draw_detections(image, detections)
            annotated_base64 = self.encode_image_to_base64(annotated_image)

            # Save debug image if detections found
            if detections and self.debug_mode:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
                debug_filename = f"detection_{session_code}_{timestamp}_{len(detections)}objs.jpg"
                self.save_debug_image(annotated_image, debug_filename)

                logging.info(f"🎯 Inference #{self.inference_count}: {len(detections)} detections in {inference_time:.1f}ms")
                for det in detections:
                    logging.info(f"   • {det['class']}: {det['confidence']:.3f} at ({det['bbox']['x1']:.0f},{det['bbox']['y1']:.0f})")

            # Prepare response
            response = {
                'detections': detections,
                'inference_time': inference_time,
                'image_shape': {
                    'width': image.shape[1],
                    'height': image.shape[0]
                },
                'annotated_frame': annotated_base64,
                'stats': {
                    'total_inferences': self.inference_count,
                    'avg_inference_time': self.avg_inference_time,
                    'model_confidence_threshold': self.confidence_threshold
                },
                'timestamp': datetime.now().isoformat(),
                'session_code': session_code
            }

            return response

        except Exception as e:
            error_time = (time.time() - start_time) * 1000
            logging.error(f"❌ Inference error after {error_time:.1f}ms: {e}")
            return None

    def get_stats(self) -> Dict[str, Any]:
        """Get inference service statistics"""
        return {
            'is_ready': self.is_ready(),
            'model_path': self.model_path,
            'total_inferences': self.inference_count,
            'avg_inference_time': self.avg_inference_time,
            'last_inference_time': self.last_inference_time,
            'confidence_threshold': self.confidence_threshold,
            'debug_mode': self.debug_mode,
            'classes': list(self.model.names.values()) if self.model and hasattr(self.model, 'names') else []
        }

    def set_confidence_threshold(self, threshold: float):
        """Update confidence threshold"""
        if 0.0 <= threshold <= 1.0:
            self.confidence_threshold = threshold
            logging.info(f"🎯 Updated confidence threshold to {threshold}")
        else:
            logging.error(f"❌ Invalid confidence threshold: {threshold}")

    def cleanup(self):
        """Cleanup resources"""
        logging.info("🧹 Cleaning up YOLO inference service")
        self.model = None
        self.is_initialized = False

# Global inference service instance
inference_service = None

def get_inference_service(model_path: str = "models/best.pt", debug_mode: bool = True) -> YOLOInferenceService:
    """Get or create global inference service instance"""
    global inference_service
    if inference_service is None:
        inference_service = YOLOInferenceService(model_path, debug_mode)
    return inference_service