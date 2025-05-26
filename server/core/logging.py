import logging
import sys
from typing import Dict, Any

class ColoredFormatter(logging.Formatter):
    """Colored log formatter"""

    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
    }
    RESET = '\033[0m'

    def format(self, record):
        log_color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{log_color}{record.levelname}{self.RESET}"
        return super().format(record)

def setup_logging(debug: bool = False) -> logging.Logger:
    """Setup application logging"""

    level = logging.DEBUG if debug else logging.INFO

    # Create formatter
    formatter = ColoredFormatter(
        '%(asctime)s | %(levelname)s | %(name)s | %(message)s',
        datefmt='%H:%M:%S'
    )

    # Setup handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # Setup logger
    logger = logging.getLogger("webrtc_server")
    logger.setLevel(level)
    logger.addHandler(handler)

    # Prevent duplicate logs
    logger.propagate = False

    return logger
