# test_timer.py
import os
import sys
import json
import pytest
import cv2
from pathlib import Path

# Add the parent directory to path to import timer module
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir / 'app' / 'ai'))

from vision_pipeline import GameVisionPipeline

# Test cases with expected results
TEST_CASES = {
    # filename: (expected_time_text, expected_seconds, expected_OT)
    "IMG_0981.PNG": ("0:11", 11, False),
    "IMG_0999.PNG": ("1:56", 116, True),
    "IMG_1001.PNG": ("1:34", 94, True),
    "IMG_0997.PNG": ("0:02", 2, False),
    "IMG_0996.PNG": ("0:04", 4, False),
    "IMG_0990.PNG": ("0:25", 25, False),
    "IMG_0993.PNG": ("0:18", 18, False),
    "IMG_0989.PNG": ("0:27", 27, False),
    "IMG_0992.PNG": ("0:19", 19, False),
    "IMG_0986.PNG": ("2:04", 124, False),
    "IMG_0985.PNG": ("2:39", 159, False),

    # Overtime cases (if you have any)
    # "IMG_OVERTIME1.PNG": ("0:30", 30, True),
    # "IMG_OVERTIME2.PNG": ("0:15", 15, True),
}

@pytest.fixture(scope="module")
def vision_pipeline():
    """Create a vision pipeline instance for testing"""
    return GameVisionPipeline(config={'debug': False})

@pytest.fixture(scope="module")
def test_images_dir():
    """Get the test images directory"""
    test_dir = Path(__file__).parent / "test_images"
    test_dir.mkdir(exist_ok=True)
    return test_dir

@pytest.mark.parametrize("filename,expected", TEST_CASES.items())
def test_timer_detection(filename, expected, vision_pipeline, test_images_dir):
    """Test timer detection for each image"""
    expected_time_text, expected_seconds, expected_OT = expected

    image_path = test_images_dir / filename

    # Skip if image doesn't exist
    if not image_path.exists():
        pytest.skip(f"Image {filename} not found in test_images/")

    # Read the image
    frame = cv2.imread(str(image_path))
    assert frame is not None, f"Failed to read image {filename}"

    # Process the frame
    results = vision_pipeline.process_frame(frame)
    assert 'time_left' in results, f"No time_left results for {filename}"

    time_left = results['time_left']

    # Assert the results match expected values
    assert time_left.get('time_text') == expected_time_text, \
        f"{filename}: Expected time_text '{expected_time_text}', got '{time_left.get('time_text')}'"

    assert time_left.get('seconds') == expected_seconds, \
        f"{filename}: Expected seconds {expected_seconds}, got {time_left.get('seconds')}"

    assert time_left.get('OT') == expected_OT, \
        f"{filename}: Expected OT {expected_OT}, got {time_left.get('OT')}"

def test_invalid_image(vision_pipeline):
    """Test with an invalid image"""
    # Create a blank/corrupted image
    blank_frame = None
    results = vision_pipeline.process_frame(blank_frame)

    # Should handle the error gracefully
    assert 'error' in results or ('time_left' in results and results['time_left'].get('time_text') is None)

def test_no_timer_visible(vision_pipeline):
    """Test with an image where no timer is visible"""
    # Create a solid color image with no timer
    solid_frame = cv2.imread(str(Path(__file__).parent / "test_images" / "NO_TIMER.PNG")) if Path("test_images/NO_TIMER.PNG").exists() else None

    if solid_frame is not None:
        results = vision_pipeline.process_frame(solid_frame)
        time_left = results.get('time_left', {})
        assert time_left.get('time_text') is None, "Should not detect any timer"
        assert time_left.get('seconds') is None, "Should not detect any timer"

if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v"])