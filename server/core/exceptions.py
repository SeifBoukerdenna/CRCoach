class WebRTCException(Exception):
    """Base WebRTC exception"""
    pass

class SessionNotFoundException(WebRTCException):
    """Session not found exception"""
    pass

class SessionFullException(WebRTCException):
    """Session at capacity exception"""
    pass

class InvalidMessageException(WebRTCException):
    """Invalid message format exception"""
    pass

class RateLimitExceededException(WebRTCException):
    """Rate limit exceeded exception"""
    pass

class ConnectionLimitExceededException(WebRTCException):
    """Connection limit exceeded exception"""
    pass
