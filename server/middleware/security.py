import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from core.config import settings

class SecurityMiddleware(BaseHTTPMiddleware):
    """Security headers and basic protection middleware"""

    async def dispatch(self, request: Request, call_next):
        # Add security headers
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        if not settings.debug:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Request logging middleware"""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        response = await call_next(request)

        process_time = time.time() - start_time

        if settings.debug and request.url.path.startswith("/api/"):
            logger.info(
                f"{request.method} {request.url.path} - "
                f"{response.status_code} - {process_time:.3f}s"
            )

        response.headers["X-Process-Time"] = str(process_time)
        return response
