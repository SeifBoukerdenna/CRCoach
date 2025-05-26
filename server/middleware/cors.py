from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

def add_cors_middleware(app):
    """Add CORS middleware to FastAPI app"""
    if settings.enable_cors:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
