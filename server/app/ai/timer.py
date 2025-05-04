import cv2, subprocess, tempfile, os, re, sys

def read_timer(path):
    img = cv2.imread(path)
    h, w = img.shape[:2]
    roi = img[0:int(h*0.18), int(w*0.60):]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

    # black panel detection
    mask = cv2.inRange(gray, 0, 30)
    cnts,_ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    panel = None
    for c in cnts:
        x,y,ww,hh = cv2.boundingRect(c)
        if ww*hh>300 and y < roi.shape[0]*0.3:
            panel = gray[y:y+hh, x:x+ww]; break
    if panel is None:
        return None

    digits = panel[int(panel.shape[0]*0.45):]

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as t:
        cv2.imwrite(t.name, digits)
        txt = subprocess.check_output([
            "tesseract", t.name, "stdout",
            "--psm", "13",
            "-c", "tessedit_char_blacklist=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
        ], stderr=subprocess.DEVNULL).decode().strip()
        os.unlink(t.name)

    m = re.search(r"\d{1,2}:\d{2}", txt)
    return m.group() if m else None

if __name__ == "__main__":
    if len(sys.argv)!=2:
        print("usage: python timer.py screenshot.png"); sys.exit(1)
    t = read_timer(sys.argv[1])
    print(t if t else "Timer not found")
