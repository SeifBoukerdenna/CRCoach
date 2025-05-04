import cv2, subprocess, tempfile, os, re, sys, json
import numpy as np

def parse_time_to_seconds(time_text):
    """Convert MM:SS format to total seconds"""
    if ':' in time_text:
        parts = time_text.split(':')
        if len(parts) == 2:
            minutes, seconds = parts
            try:
                return int(minutes) * 60 + int(seconds)
            except ValueError:
                return None
    return None

def read_timer(path, debug=False):
    img = cv2.imread(path)
    h, w = img.shape[:2]
    roi = img[0:int(h*0.18), int(w*0.60):]

    if debug:
        cv2.imwrite(f"{path}_roi.png", roi)

    # Convert to HSV for better color detection
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

    # Black panel detection
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    mask_black = cv2.inRange(gray, 0, 30)
    cnts_black, _ = cv2.findContours(mask_black, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    panel = None
    is_overtime = False

    # Debug: save black mask
    if debug:
        cv2.imwrite(f"{path}_mask_black.png", mask_black)

    # Try to find black panel first
    for c in cnts_black:
        x, y, ww, hh = cv2.boundingRect(c)
        if ww * hh > 300 and y < roi.shape[0] * 0.3:
            panel = gray[y:y+hh, x:x+ww]
            if debug:
                cv2.rectangle(roi, (x, y), (x+ww, y+hh), (0, 255, 0), 2)
                cv2.imwrite(f"{path}_black_panel.png", panel)
            break

    # If no black panel found, try orange panel (Clash Royale Overtime)
    if panel is None:
        # Define orange color range in HSV
        # You can adjust these values based on your orange colors
        lower_orange1 = np.array([0, 100, 100])      # Lower red
        upper_orange1 = np.array([30, 255, 255])     # Upper orange
        lower_orange2 = np.array([150, 100, 100])    # Higher red
        upper_orange2 = np.array([180, 255, 255])    # Orange wrapping around hue

        # Create masks for orange colors
        mask_orange1 = cv2.inRange(hsv, lower_orange1, upper_orange1)
        mask_orange2 = cv2.inRange(hsv, lower_orange2, upper_orange2)
        mask_orange = cv2.bitwise_or(mask_orange1, mask_orange2)

        # Debug: save orange mask
        if debug:
            cv2.imwrite(f"{path}_mask_orange.png", mask_orange)

        # Find contours in orange mask
        cnts_orange, _ = cv2.findContours(mask_orange, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in cnts_orange:
            x, y, ww, hh = cv2.boundingRect(c)
            if ww * hh > 300 and y < roi.shape[0] * 0.3:
                # Extract the panel in grayscale for OCR
                panel = gray[y:y+hh, x:x+ww]
                is_overtime = True  # Flag that orange panel was detected
                if debug:
                    cv2.rectangle(roi, (x, y), (x+ww, y+hh), (0, 0, 255), 2)
                    cv2.imwrite(f"{path}_orange_panel.png", panel)
                break

    if debug and panel is not None:
        cv2.imwrite(f"{path}_roi_with_detection.png", roi)

    if panel is None:
        return None

    # Extract the digits area (bottom portion of the panel)
    digits = panel[int(panel.shape[0]*0.45):]

    # Optional: Enhance the image for better OCR
    # Try different thresholding techniques
    _, digits_binary = cv2.threshold(digits, 127, 255, cv2.THRESH_BINARY_INV)
    digits_otsu = cv2.threshold(digits, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

    # Try with original, binary, and otsu
    if debug:
        cv2.imwrite(f"{path}_digits_original.png", digits)
        cv2.imwrite(f"{path}_digits_binary.png", digits_binary)
        cv2.imwrite(f"{path}_digits_otsu.png", digits_otsu)

    # Try OCR with different processed images
    best_result = None
    for processed_digits in [digits, digits_binary, digits_otsu]:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as t:
            cv2.imwrite(t.name, processed_digits)
            txt = subprocess.check_output([
                "tesseract", t.name, "stdout",
                "--psm", "13",
                "-c", "tessedit_char_blacklist=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
            ], stderr=subprocess.DEVNULL).decode().strip()
            os.unlink(t.name)

        m = re.search(r"\d{1,2}:\d{2}", txt)
        if m:
            best_result = m.group()
            if debug:
                print(f"Found timer: {best_result} using processing method")
            break

    if best_result:
        return best_result, is_overtime
    return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python timer.py screenshot.png [--debug]")
        sys.exit(1)

    debug = "--debug" in sys.argv
    filepath = sys.argv[1]

    result = read_timer(filepath, debug=debug)

    if result:
        time_text, is_overtime = result
        seconds = parse_time_to_seconds(time_text)

        output = {
            "filename": os.path.basename(filepath),
            "content_type": "image/png",
            "results": {
                "time_left": {
                    "time_text": time_text,
                    "seconds": seconds,
                    "OT": is_overtime
                }
            }
        }

        print(json.dumps(output, indent=2))
    else:
        output = {
            "filename": os.path.basename(filepath),
            "content_type": "image/png",
            "results": {
                "time_left": None
            }
        }
        print(json.dumps(output, indent=2))