def detect_supercell_splash(frame):
    """Detect Supercell splash screen by its distinct characteristics."""
    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Check if mostly black
    if np.mean(gray) > 30:  # Not dark enough to be splash screen
        return False, 0

    # Check for white text in center
    h, w = gray.shape
    center_region = gray[int(h*0.4):int(h*0.6), int(w*0.3):int(w*0.7)]

    # White text should create high contrast in center
    text_pixels = np.sum(center_region > 200)  # Count bright pixels
    center_contrast = text_pixels / center_region.size

    # If center has some white pixels but image is mostly black
    detected = center_contrast > 0.05 and center_contrast < 0.5
    confidence = center_contrast * 2  # Simple confidence score

    return detected, confidence