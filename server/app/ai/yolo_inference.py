# server/app/ai/yolo_inference.py
import cv2
import numpy as np
from ultralytics import YOLO
import logging
from typing import Dict, List, Optional, Tuple
import time
import asyncio
from pathlib import Path

logger = logging.getLogger("yolo_inference")

class YOLOInferenceService:
    """Service for running YOLO inference on frames in real-time"""

    def __init__(self, model_path: str = "models/best.pt", config: Optional[Dict] = None):
        self.config = config or {}
        self.model_path = Path(model_path)
        self.model = None
        self.is_initialized = False

        # Performance settings
        self.conf_threshold = self.config.get('conf_threshold', 0.5)
        self.iou_threshold = self.config.get('iou_threshold', 0.45)
        self.max_det = self.config.get('max_det', 100)

        # Initialize model
        self._initialize_model()

    def _initialize_model(self):
        """Initialize YOLO model"""
        try:
            if not self.model_path.exists():
                logger.error(f"Model file not found: {self.model_path}")
                return

            logger.info(f"Loading YOLO model from {self.model_path}")
            self.model = YOLO(str(self.model_path))

            # Warm up the model with a dummy image
            dummy_img = np.zeros((640, 640, 3), dtype=np.uint8)
            self.model(dummy_img, verbose=False)

            self.is_initialized = True
            logger.info("YOLO model initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize YOLO model: {str(e)}")
            self.is_initialized = False

    def process_frame(self, frame_data: bytes) -> Dict:
        """Process a single frame and return detection results"""
        if not self.is_initialized or self.model is None:
            return {
                'success': False,
                'error': 'Model not initialized',
                'detections': [],
                'inference_time': 0
            }

        try:
            # Start timing
            start_time = time.time()

            # Decode JPEG to numpy array
            nparr = np.frombuffer(frame_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {
                    'success': False,
                    'error': 'Failed to decode image',
                    'detections': [],
                    'inference_time': 0
                }

            # Run inference
            results = self.model(
                img,
                conf=self.conf_threshold,
                iou=self.iou_threshold,
                max_det=self.max_det,
                verbose=False
            )

            # Process results
            detections = []
            if len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes

                for i in range(len(boxes)):
                    # Get box coordinates (xyxy format)
                    x1, y1, x2, y2 = boxes.xyxy[i].tolist()

                    # Get confidence and class
                    conf = float(boxes.conf[i])
                    cls = int(boxes.cls[i])

                    # Get class name
                    class_name = self.model.names.get(cls, f"class_{cls}")

                    detection = {
                        'bbox': {
                            'x1': int(x1),
                            'y1': int(y1),
                            'x2': int(x2),
                            'y2': int(y2),
                            'width': int(x2 - x1),
                            'height': int(y2 - y1)
                        },
                        'confidence': round(conf, 3),
                        'class': class_name,
                        'class_id': cls
                    }
                    detections.append(detection)

            # Calculate inference time
            inference_time = (time.time() - start_time) * 1000  # ms

            return {
                'success': True,
                'detections': detections,
                'inference_time': round(inference_time, 2),
                'image_shape': {
                    'width': img.shape[1],
                    'height': img.shape[0]
                }
            }

        except Exception as e:
            logger.error(f"Error during inference: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'detections': [],
                'inference_time': 0
            }

    def draw_detections(self, img: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """Draw bounding boxes and labels on image"""
        for det in detections:
            bbox = det['bbox']
            x1, y1, x2, y2 = bbox['x1'], bbox['y1'], bbox['x2'], bbox['y2']
            conf = det['confidence']
            cls = det['class']

            # Draw box
            color = (0, 255, 0)  # Green for detections
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

            # Draw label with confidence
            label = f"{cls} {conf:.2f}"
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)

            # Background for text
            cv2.rectangle(img, (x1, y1 - label_size[1] - 4),
                         (x1 + label_size[0], y1), color, -1)

            # Draw text
            cv2.putText(img, label, (x1, y1 - 2),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        return img

    async def process_frame_async(self, frame_data: bytes) -> Dict:
        """Async wrapper for frame processing"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.process_frame, frame_data)

    def draw_detections_on_frame(self, frame_data: bytes, detections: List[Dict]) -> Optional[bytes]:
        """Draw detections on frame and return as JPEG bytes"""
        try:
            # Decode JPEG to numpy array
            nparr = np.frombuffer(frame_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return None

            # Draw each detection
            for det in detections:
                bbox = det['bbox']
                x1, y1, x2, y2 = bbox['x1'], bbox['y1'], bbox['x2'], bbox['y2']
                conf = det['confidence']
                cls = det['class']

                # Choose color based on class or use default green
                color = (0, 255, 0)  # Green default

                # Draw bounding box
                cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

                # Prepare label
                label = f"{cls} {conf:.2f}"

                # Calculate label size
                (label_width, label_height), baseline = cv2.getTextSize(
                    label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1
                )

                # Draw label background
                label_y = y1 - 10 if y1 - 10 > 10 else y1 + label_height + 10
                cv2.rectangle(
                    img,
                    (x1, label_y - label_height - 5),
                    (x1 + label_width + 5, label_y + baseline - 5),
                    color,
                    -1
                )

                # Draw label text
                cv2.putText(
                    img,
                    label,
                    (x1 + 2, label_y - 2),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 255, 255),
                    1,
                    cv2.LINE_AA
                )

            # Add inference info overlay
            info_text = f"Detections: {len(detections)}"
            cv2.putText(
                img,
                info_text,
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
                cv2.LINE_AA
            )

            # Encode back to JPEG
            success, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if success:
                return buffer.tobytes()

            return None

        except Exception as e:
            logger.error(f"Error drawing detections: {str(e)}")
            return None

    async def draw_detections_async(self, frame_data: bytes, detections: List[Dict]) -> Optional[bytes]:
        """Async wrapper for drawing detections"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.draw_detections_on_frame, frame_data, detections)