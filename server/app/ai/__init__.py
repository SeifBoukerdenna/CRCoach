"""
`python -m ai` launches a bare REPL with the vision pipeline already imported,
so you can quickly test screenshots:

>>> vp = GameVisionPipeline()
>>> vp.analyze_time_left(cv2.imread("IMG_0981.PNG"))
{'time_text': '0:11', 'seconds': 11}
"""
import code, cv2
from pathlib import Path
from .vision_pipeline import GameVisionPipeline

if __name__ == '__main__':
    banner = (
        " 🧠  Clash‑Royale vision REPL\n"
        "     GameVisionPipeline → variable `vp`\n"
        "     cv2.imread(...)    → OpenCV helper\n"
    )
    vp = GameVisionPipeline()
    namespace = globals() | locals()
    code.interact(banner, local=namespace)
