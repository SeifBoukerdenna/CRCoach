import os
import cv2
import numpy as np
import base64
from pathlib import Path
import argparse

def save_logo_from_file(input_path, output_path="assets/supercell_logo.png"):
    """Save a logo image to the assets directory.

    Args:
        input_path: Path to input logo image
        output_path: Path to save the processed logo
    """
    # Create assets directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Load and save the image
    img = cv2.imread(input_path)
    if img is None:
        print(f"Error: Could not load image from {input_path}")
        return False

    # Ensure the image is in a good format for detection
    # Resize if needed
    if max(img.shape[0], img.shape[1]) > 800:
        scale = 800 / max(img.shape[0], img.shape[1])
        img = cv2.resize(img, None, fx=scale, fy=scale)

    # Save the processed image
    success = cv2.imwrite(output_path, img)
    if success:
        print(f"Logo saved to {output_path}")
        return True
    else:
        print(f"Error: Failed to save logo to {output_path}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Save Supercell logo for detection")
    parser.add_argument("--input", "-i", help="Path to input logo image", required=True)
    parser.add_argument("--output", "-o", default="assets/supercell_logo.png",
                       help="Path to save the processed logo")

    args = parser.parse_args()
    save_logo_from_file(args.input, args.output)

if __name__ == "__main__":
    main()