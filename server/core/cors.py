# server/core/cors.py - CORS configuration for Discord integration

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logger = logging.getLogger(__name__)

def setup_cors(app: FastAPI) -> None:
    """Configure CORS middleware for the FastAPI app"""

    # Get allowed origins from environment or use defaults
    cors_origins = os.getenv('CORS_ORIGINS', '').split(',') if os.getenv('CORS_ORIGINS') else []

    # Default allowed origins for development and production
    default_origins = [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://localhost:3000",
        "https://localhost:5173",
    ]

    # Add environment-specific origins
    if cors_origins:
        allowed_origins = [origin.strip() for origin in cors_origins if origin.strip()]
        logger.info(f"🌐 Using CORS origins from environment: {allowed_origins}")
    else:
        allowed_origins = default_origins
        logger.info(f"🌐 Using default CORS origins: {allowed_origins}")

    # Add production domain if available
    production_domain = os.getenv('PRODUCTION_DOMAIN')
    if production_domain:
        allowed_origins.extend([
            f"https://{production_domain}",
            f"http://{production_domain}",  # Just in case
        ])
        logger.info(f"🌐 Added production domain: {production_domain}")

    # Configure CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,  # Important for Discord auth cookies
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Accept",
            "Accept-Language",
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-CSRF-Token",
            "Cache-Control",
        ],
        expose_headers=["Set-Cookie"],
        max_age=600,  # Cache preflight for 10 minutes
    )

    logger.info("✅ CORS middleware configured successfully")
    logger.info(f"🔒 Credentials allowed: True")
    logger.info(f"🌐 Total allowed origins: {len(allowed_origins)}")

def get_cors_origins() -> list:
    """Get the list of allowed CORS origins"""
    cors_origins = os.getenv('CORS_ORIGINS', '').split(',') if os.getenv('CORS_ORIGINS') else []

    default_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://localhost:3000",
        "https://localhost:5173",
         "https://tormentor.dev",
        "https://www.tormentor.dev",
        "https://api.tormentor.dev",
    ]

    if cors_origins:
        return [origin.strip() for origin in cors_origins if origin.strip()]
    else:
        return default_origins