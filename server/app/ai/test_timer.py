# test_timer.py
import os, sys, pytest

# ensure we import our local timer.py
HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)

from timer import read_timer

# map image → expected M:SS
TEST_CASES = {
    "IMG_0981.PNG": "0:11",
    "IMG_0999.PNG": "1:56",
    "IMG_1001.PNG": "1:34",
    "IMG_0997.PNG": "0:02",
    "IMG_0998.PNG": "2:00",
    "IMG_0996.PNG": "0:04",
    "IMG_0990.PNG": "0:25",
    "IMG_0993.PNG": "0:18",
    "IMG_0989.PNG": "0:27",
    "IMG_0992.PNG": "0:19",
    "IMG_0986.PNG": "2:04",
    "IMG_0985.PNG": "2:39",
}

@pytest.mark.parametrize("fname,expected", TEST_CASES.items())
def test_all_timers(fname, expected):
    img_path = os.path.join(HERE, "test_images", fname)
    if not os.path.exists(img_path):
        pytest.skip(f"{fname} not found in test_images/")
    result = read_timer(img_path)
    assert result is not None, f"No timer detected in {fname}"
    assert result == expected, f"{fname}: got {result!r}, expected {expected!r}"
