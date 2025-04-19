import os
import logging
import numpy as np
import cv2
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, callbacks
from tensorflow.keras.applications import MobileNetV2, ResNet50V2
from typing import Dict, Optional, Tuple, List, Union
import time
from pathlib import Path

from tf_data_handler import tf_data_handler

logger = logging.getLogger("model_trainer")

class ModelTrainer:
    """Handles training and fine-tuning of TensorFlow models for Clash Royale detection."""

    def __init__(self, data_handler=None):
        """Initialize the model trainer.

        Args:
            data_handler: TensorFlow data handler or None to use global instance
        """
        self.data_handler = data_handler or tf_data_handler
        self.model = None
        self.training_history = None

    def create_logo_detector_model(self, input_shape=(224, 224, 3), base_model='mobilenet'):
        """Create a new logo detector model.

        Args:
            input_shape: Input shape for the model
            base_model: Base model architecture ('mobilenet' or 'resnet')

        Returns:
            Created model
        """
        try:
            # Create base model
            if base_model.lower() == 'resnet':
                base = ResNet50V2(
                    input_shape=input_shape,
                    include_top=False,
                    weights='imagenet'
                )
            else:
                # Default to MobileNetV2
                base = MobileNetV2(
                    input_shape=input_shape,
                    include_top=False,
                    weights='imagenet'
                )

            # Freeze base model layers
            base.trainable = False

            # Create model with custom top layers
            model = models.Sequential([
                base,
                layers.GlobalAveragePooling2D(),
                layers.Dense(1024, activation='relu'),
                layers.Dropout(0.5),
                layers.Dense(512, activation='relu'),
                layers.Dropout(0.3),
                layers.Dense(1, activation='sigmoid')  # Binary: logo or no logo
            ])

            # Compile model
            model.compile(
                optimizer=optimizers.Adam(learning_rate=0.0001),
                loss='binary_crossentropy',
                metrics=['accuracy']
            )

            self.model = model
            logger.info(f"Created {base_model} model for logo detection")

            return model

        except Exception as e:
            logger.error(f"Error creating model: {e}")
            return None

    def fine_tune_logo_detector(self, epochs=10, batch_size=32, validation_split=0.2,
                               unfreeze_layers=5, learning_rate=1e-5):
        """Fine-tune logo detector model with existing data.

        Args:
            epochs: Number of training epochs
            batch_size: Batch size
            validation_split: Validation split ratio
            unfreeze_layers: Number of layers to unfreeze in base model
            learning_rate: Learning rate for fine-tuning

        Returns:
            Training history
        """
        if self.model is None:
            logger.error("No model to fine-tune")
            return None

        try:
            # Get training data
            X, y = self.data_handler.get_training_data(category="logo")

            if len(X) == 0:
                logger.error("No training data available")
                return None

            logger.info(f"Fine-tuning with {len(X)} samples")

            # Configure callbacks
            early_stopping = callbacks.EarlyStopping(
                monitor='val_loss',
                patience=5,
                restore_best_weights=True
            )

            reduce_lr = callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=3,
                min_lr=1e-6
            )

            # Unfreeze some layers in base model
            base_model = self.model.layers[0]
            base_model.trainable = True

            # Freeze all layers except the last few
            for layer in base_model.layers[:-unfreeze_layers]:
                layer.trainable = False

            # Recompile model with lower learning rate
            self.model.compile(
                optimizer=optimizers.Adam(learning_rate=learning_rate),
                loss='binary_crossentropy',
                metrics=['accuracy']
            )

            # Train model
            history = self.model.fit(
                X, y,
                epochs=epochs,
                batch_size=batch_size,
                validation_split=validation_split,
                callbacks=[early_stopping, reduce_lr]
            )

            self.training_history = history.history

            # Save model
            model_path = self.data_handler.save_model(self.model, model_type="logo_detector")

            logger.info(f"Fine-tuning complete. Model saved to {model_path}")

            return history.history

        except Exception as e:
            logger.error(f"Error fine-tuning model: {e}")
            return None

    def train_new_model(self, category="logo", model_type="mobilenet",
                      epochs=20, batch_size=32, validation_split=0.2):
        """Train a new model from scratch.

        Args:
            category: Data category
            model_type: Model architecture
            epochs: Number of training epochs
            batch_size: Batch size
            validation_split: Validation split ratio

        Returns:
            Trained model
        """
        try:
            # Get training data
            X, y = self.data_handler.get_training_data(category=category)

            if len(X) == 0:
                logger.error("No training data available")
                return None

            logger.info(f"Training new model with {len(X)} samples")

            # Create model
            self.create_logo_detector_model(base_model=model_type)

            if self.model is None:
                return None

            # Configure callbacks
            early_stopping = callbacks.EarlyStopping(
                monitor='val_loss',
                patience=5,
                restore_best_weights=True
            )

            reduce_lr = callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=3,
                min_lr=1e-6
            )

            # Train model
            history = self.model.fit(
                X, y,
                epochs=epochs,
                batch_size=batch_size,
                validation_split=validation_split,
                callbacks=[early_stopping, reduce_lr]
            )

            self.training_history = history.history

            # Save model
            model_path = self.data_handler.save_model(self.model, model_type=f"{category}_detector")

            logger.info(f"Training complete. Model saved to {model_path}")

            return self.model

        except Exception as e:
            logger.error(f"Error training model: {e}")
            return None

    def load_model(self, model_path: Optional[str] = None, model_type: str = "logo_detector"):
        """Load a saved model.

        Args:
            model_path: Path to model file or None to load latest model
            model_type: Model type to load if path is None

        Returns:
            Loaded model
        """
        try:
            # Get latest model path if not provided
            if model_path is None:
                model_path = self.data_handler.get_latest_model_path(model_type)

            if model_path is None or not os.path.exists(model_path):
                logger.error(f"No model found for type {model_type}")
                return None

            # Load model
            self.model = self.data_handler.load_model(model_path)
            logger.info(f"Loaded model from {model_path}")

            return self.model

        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return None

    def evaluate_model(self, X=None, y=None, category="logo"):
        """Evaluate model performance.

        Args:
            X: Input data or None to use test data
            y: Target labels or None to use test data
            category: Data category if using test data

        Returns:
            Evaluation metrics
        """
        if self.model is None:
            logger.error("No model to evaluate")
            return None

        try:
            # Get test data if not provided
            if X is None or y is None:
                X, y = self.data_handler.get_training_data(category=category)

                if len(X) == 0:
                    logger.error("No test data available")
                    return None

            # Evaluate model
            metrics = self.model.evaluate(X, y, verbose=1)

            # Format results
            results = {}
            for i, metric_name in enumerate(self.model.metrics_names):
                results[metric_name] = float(metrics[i])

            logger.info(f"Model evaluation: {results}")

            return results

        except Exception as e:
            logger.error(f"Error evaluating model: {e}")
            return None

    def predict(self, frame):
        """Run prediction on frame.

        Args:
            frame: Input frame

        Returns:
            Prediction result
        """
        if self.model is None:
            logger.error("No model to predict with")
            return None

        try:
            # Preprocess frame
            img = cv2.resize(frame, (224, 224))
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = img / 255.0  # Normalize
            img = np.expand_dims(img, axis=0)

            # Run prediction
            prediction = self.model.predict(img, verbose=0)

            return float(prediction[0][0])

        except Exception as e:
            logger.error(f"Error predicting: {e}")
            return None


# Create global instance
model_trainer = ModelTrainer()