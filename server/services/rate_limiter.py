import time
from typing import Dict, Tuple
from collections import defaultdict, deque

class RateLimiter:
    """Token bucket rate limiter"""

    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.clients: Dict[str, deque] = defaultdict(deque)

    def is_allowed(self, client_id: str) -> Tuple[bool, int]:
        """Check if request is allowed for client"""
        now = time.time()
        client_requests = self.clients[client_id]

        # Remove old requests outside the window
        while client_requests and client_requests[0] <= now - self.window_seconds:
            client_requests.popleft()

        # Check if under limit
        if len(client_requests) < self.max_requests:
            client_requests.append(now)
            return True, self.max_requests - len(client_requests)

        return False, 0

    def get_reset_time(self, client_id: str) -> float:
        """Get time until rate limit resets"""
        client_requests = self.clients[client_id]
        if not client_requests:
            return 0

        oldest_request = client_requests[0]
        return max(0, oldest_request + self.window_seconds - time.time())
