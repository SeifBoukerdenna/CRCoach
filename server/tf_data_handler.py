import os
import logging
import numpy as np
import tensorflow as tf
import cv2
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Union
from datetime import datetime
import shutil

logger = logging.getLogger("tf_data_handler")

class TFDataHandler:
    """Handles training data, model persistence, and inference for TensorFlow models."""

    def __init__(self, data_dir: str = "ml_data"):
        """Initialize the data handler.

        Args:
            data_dir: Directory for storing ML data (models, samples, etc.)
        """
        self.data_dir = Path(data_dir)
        self.models_dir = self.data_dir / "models"
        self.samples_dir = self.data_dir / "samples"
        self.labels_file = self.data_dir / "labels.json"

        # Ensure directories exist
        self._ensure_dirs()

        # Labels tracking
        self.labels = self._load_labels()

    def _ensure_dirs(self):
        """Create necessary directories if they don't exist."""
        try:
            for dir_path in [self.data_dir, self.models_dir, self.samples_dir]:
                if not dir_path.exists():
                    dir_path.mkdir(parents=True)
                    logger.info(f"Created directory: {dir_path}")
        except Exception as e:
            logger.error(f"Error creating directories: {e}")

    def _load_labels(self) -> Dict:
        """Load labels from JSON file or create new ones."""
        if self.labels_file.exists():
            try:
                with open(self.labels_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading labels: {e}")

        # Default labels structure
        default_labels = {
            "logo_samples": {
                "positive": [],  # Paths to positive samples
                "negative": []   # Paths to negative samples
            },
            "game_state_samples": {},
            "last_updated": datetime.now().isoformat()
        }

        # Save default labels
        self._save_labels(default_labels)
        return default_labels

    def _save_labels(self, labels: Dict):
        """Save labels to JSON file.

        Args:
            labels: Labels dictionary
        """
        try:
            labels["last_updated"] = datetime.now().isoformat()
            with open(self.labels_file, 'w') as f:
                json.dump(labels, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving labels: {e}")

    def save_sample(self, frame: np.ndarray, label: str, category: str = "logo") -> str:
        """Save a sample frame with label.

        Args:
            frame: Frame to save
            label: Label for the frame (e.g., "positive", "negative")
            category: Category (logo, game_state, etc.)

        Returns:
            Path to saved sample
        """
        try:
            # Create category directory if needed
            category_dir = self.samples_dir / category
            if not category_dir.exists():
                category_dir.mkdir(parents=True)

            # Create label directory if needed
            label_dir = category_dir / label
            if not label_dir.exists():
                label_dir.mkdir(parents=True)

            # Generate filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            filename = f"{label}_{timestamp}.jpg"
            filepath = label_dir / filename

            # Save frame
            cv2.imwrite(str(filepath), frame)

            # Update labels
            key = f"{category}_samples"
            if key not in self.labels:
                self.labels[key] = {}
            if label not in self.labels[key]:
                self.labels[key][label] = []

            # Add to labels
            rel_path = str(filepath.relative_to(self.data_dir))
            self.labels[key][label].append(rel_path)
            self._save_labels(self.labels)

            return str(filepath)

        except Exception as e:
            logger.error(f"Error saving sample: {e}")
            return ""

    def get_latest_model_path(self, model_type: str = "logo_detector") -> Optional[str]:
        """Get path to latest model of specified type.

        Args:
            model_type: Type of model to get

        Returns:
            Path to latest model or None if not found
        """
        try:
            model_dir = self.models_dir / model_type
            if not model_dir.exists():
                return None

            # Find latest model by modified time
            models = list(model_dir.glob("*.h5"))
            if not models:
                return None

            latest = max(models, key=lambda p: p.stat().st_mtime)
            return str(latest)

        except Exception as e:
            logger.error(f"Error getting latest model: {e}")
            return None

    def save_model(self, model: tf.keras.Model, model_type: str = "logo_detector") -> str:
        """Save a model to disk.

        Args:
            model: TensorFlow model to save
            model_type: Type of model

        Returns:
            Path to saved model
        """
        try:
            # Create model directory if needed
            model_dir = self.models_dir / model_type
            if not model_dir.exists():
                model_dir.mkdir(parents=True)

            # Generate filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{model_type}_{timestamp}.h5"
            filepath = model_dir / filename

            # Save model
            model.save(str(filepath))
            logger.info(f"Model saved to {filepath}")

            return str(filepath)

        except Exception as e:
            logger.error(f"Error saving model: {e}")
            return ""

    def load_model(self, model_path: str) -> Optional[tf.keras.Model]:
        """Load a model from disk.

        Args:
            model_path: Path to model file

        Returns:
            Loaded model or None if failed
        """
        try:
            model = tf.keras.models.load_model(model_path)
            logger.info(f"Model loaded from {model_path}")
            return model

        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return None

    def get_training_data(self, category: str = "logo",
                         labels: List[str] = ["positive", "negative"]) -> Tuple[np.ndarray, np.ndarray]:
        """Get training data for specified category and labels.

        Args:
            category: Data category
            labels: Labels to include

        Returns:
            Tuple of (images, labels) arrays
        """
        images = []
        y_labels = []

        try:
            key = f"{category}_samples"
            if key not in self.labels:
                return np.array([]), np.array([])

            # Load all labeled images
            for i, label in enumerate(labels):
                if label not in self.labels[key]:
                    continue

                for path in self.labels[key][label]:
                    full_path = self.data_dir / path
                    if not full_path.exists():
                        continue

                    # Load and preprocess image
                    img = cv2.imread(str(full_path))
                    if img is None:
                        continue

                    # Resize to standard size
                    img = cv2.resize(img, (224, 224))
                    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    img = img / 255.0  # Normalize

                    images.append(img)
                    y_labels.append(i)  # Use index as label

            # Convert to numpy arrays
            if images:
                return np.array(images), np.array(y_labels)
            else:
                return np.array([]), np.array([])

        except Exception as e:
            logger.error(f"Error getting training data: {e}")
            return np.array([]), np.array([])

    def prepare_tf_dataset(self, category: str = "logo", batch_size: int = 32) -> tf.data.Dataset:
        """Create a TensorFlow dataset from training data.

        Args:
            category: Data category
            batch_size: Batch size for dataset

        Returns:
            TensorFlow dataset
        """
        try:
            X, y = self.get_training_data(category)

            if len(X) == 0:
                return None

            # Create TF dataset
            dataset = tf.data.Dataset.from_tensor_slices((X, y))

            # Shuffle and batch
            dataset = dataset.shuffle(len(X))
            dataset = dataset.batch(batch_size)
            dataset = dataset.prefetch(tf.data.AUTOTUNE)

            return dataset

        except Exception as e:
            logger.error(f"Error preparing TF dataset: {e}")
            return None

    def extract_frames_from_video(self, video_path: str, output_dir: Optional[str] = None,
                                 fps: int = 1, max_frames: int = 100) -> List[str]:
        """Extract frames from video file.

        Args:
            video_path: Path to video file
            output_dir: Directory to save frames, or None to use samples/extracted
            fps: Frames per second to extract
            max_frames: Maximum number of frames to extract

        Returns:
            List of paths to extracted frames
        """
        try:
            # Set output directory
            if output_dir is None:
                output_dir = self.samples_dir / "extracted"

            # Create directory if needed
            output_dir = Path(output_dir)
            if not output_dir.exists():
                output_dir.mkdir(parents=True)

            # Open video file
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                logger.error(f"Error opening video file: {video_path}")
                return []

            # Get video properties
            video_fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / video_fps

            # Calculate frame interval
            interval = int(video_fps / fps)
            if interval < 1:
                interval = 1

            # Extract frames
            frame_paths = []
            frame_index = 0
            frames_saved = 0

            while frames_saved < max_frames:
                # Read frame
                ret, frame = cap.read()
                if not ret:
                    break

                # Save frame at intervals
                if frame_index % interval == 0:
                    # Generate filename
                    filename = f"frame_{frames_saved:04d}.jpg"
                    filepath = output_dir / filename

                    # Save frame
                    cv2.imwrite(str(filepath), frame)
                    frame_paths.append(str(filepath))
                    frames_saved += 1

                frame_index += 1

            # Release video file
            cap.release()

            logger.info(f"Extracted {len(frame_paths)} frames from {video_path}")
            return frame_paths

        except Exception as e:
            logger.error(f"Error extracting frames: {e}")
            return []


# Create global instance
tf_data_handler = TFDataHandler()