# server/core/auth.py

import jwt
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .discord_config import DiscordConfig
from .discord_service import DiscordUser

logger = logging.getLogger(__name__)

# Security scheme for Bearer token
security = HTTPBearer(auto_error=False)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=DiscordConfig.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": datetime.utcnow()})

    try:
        encoded_jwt = jwt.encode(
            to_encode,
            DiscordConfig.JWT_SECRET_KEY,
            algorithm=DiscordConfig.JWT_ALGORITHM
        )
        logger.debug(f"✅ Created JWT token for user {data.get('sub')}")
        return encoded_jwt
    except Exception as e:
        logger.error(f"❌ Failed to create JWT token: {e}")
        raise HTTPException(status_code=500, detail="Failed to create access token")

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(
            token,
            DiscordConfig.JWT_SECRET_KEY,
            algorithms=[DiscordConfig.JWT_ALGORITHM]
        )

        # Check if token is expired
        exp = payload.get('exp')
        if exp and datetime.utcnow().timestamp() > exp:
            logger.warning("⚠️ JWT token has expired")
            return None

        logger.debug(f"✅ JWT token verified for user {payload.get('sub')}")
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("⚠️ JWT token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"⚠️ Invalid JWT token: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ JWT token verification error: {e}")
        return None

def get_token_from_request(request: Request) -> Optional[str]:
    """Extract JWT token from request (cookie or Authorization header)"""

    # First, try to get token from HTTP-only cookie
    token = request.cookies.get("access_token")
    if token:
        logger.debug("🍪 Found token in cookie")
        return token

    # Fallback: try Authorization header
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        logger.debug("🔑 Found token in Authorization header")
        return token

    logger.debug("❌ No token found in request")
    return None

async def get_current_user(request: Request) -> Optional[DiscordUser]:
    """Get current authenticated user from request"""

    # Get token from request
    token = get_token_from_request(request)
    if not token:
        return None

    # Verify token
    payload = verify_token(token)
    if not payload:
        return None

    # Get user ID from token
    user_id = payload.get('sub')
    username = payload.get('username')

    if not user_id:
        logger.warning("⚠️ No user ID in JWT payload")
        return None

    # Import here to avoid circular imports
    from .discord_service import get_discord_service

    # For now, we'll create a basic DiscordUser object from the JWT payload
    # In a real implementation, you might want to store user sessions or fetch from database

    # Try to get user from stored sessions
    try:
        # Import the user sessions from discord_routes
        from ..api.discord_routes import user_sessions

        if user_id in user_sessions:
            stored_user = user_sessions[user_id]
            logger.debug(f"✅ Found user {username} in session storage")
            return stored_user
    except ImportError:
        logger.debug("⚠️ Could not import user_sessions, creating basic user object")

    # Create basic user object from JWT if not in sessions
    basic_user = DiscordUser(
        id=user_id,
        username=username or "Unknown",
        discriminator="0",
        avatar=None,
        is_in_server=False,
        server_nickname=None
    )

    logger.debug(f"✅ Created basic user object for {username}")
    return basic_user

def require_authentication(func):
    """Decorator to require authentication for a route"""
    async def wrapper(request: Request, *args, **kwargs):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return await func(request, user, *args, **kwargs)
    return wrapper

def require_server_membership(func):
    """Decorator to require Discord server membership"""
    async def wrapper(request: Request, *args, **kwargs):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_in_server:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Discord server membership required",
            )

        return await func(request, user, *args, **kwargs)
    return wrapper