import logging

# Create a filter for access logs to reduce frequency
class ThrottledAccessLogFilter(logging.Filter):
    def __init__(self, rate_limit=1.0):
        super().__init__()
        self.rate_limit = rate_limit  # Log only once per this many seconds
        self.last_log_time = {}

    def filter(self, record):
        # Extract the client and path from the log message
        import re
        if hasattr(record, 'args') and len(record.args) >= 3:
            client = record.args[0]
            request = record.args[2]

            # Extract path from request (e.g., "POST /upload/2123 HTTP/1.1")
            match = re.search(r"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) (/[^\s]*)", request)
            if not match:
                return True  # Allow logging if we can't parse the request

            path = match.group(2)

            # Create a key for this client+path combination
            key = f"{client}:{path}"

            # Check if we should log this request
            current_time = time.time()
            last_time = self.last_log_time.get(key, 0)

            if current_time - last_time >= self.rate_limit:
                # Update last log time and allow logging
                self.last_log_time[key] = current_time

                # Clean up old entries occasionally
                if len(self.last_log_time) > 1000:
                    # Remove entries older than 1 hour
                    cutoff = current_time - 3600
                    self.last_log_time = {k: v for k, v in self.last_log_time.items() if v > cutoff}

                return True
            else:
                # Skip logging this request
                return False

        # Allow logging for other types of messages
        return True

# Apply the filter to uvicorn.access logger
def configure_logging():
    # Set up throttled access logging
    access_logger = logging.getLogger("uvicorn.access")
    access_logger.addFilter(ThrottledAccessLogFilter(rate_limit=10.0))  # Log once per 5 seconds per endpoint

    # Reduce verbosity of other loggers
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
