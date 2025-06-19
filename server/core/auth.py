# server/core/auth.py - FIXED VERSION
import jwt
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Request, HTTPException, status
from core.discord_config import DiscordConfig  # FIXED: Import DiscordConfig instead of Config
from core.discord_service import DiscordUser

logger = logging.getLogger(__name__)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)

    to_encode.update({"exp": expire})
    to_encode.update({"iat": datetime.now(timezone.utc)})

    encoded_jwt = jwt.encode(to_encode, DiscordConfig.JWT_SECRET_KEY, algorithm=DiscordConfig.JWT_ALGORITHM)
    logger.debug(f"✅ Created JWT token for user: {data.get('username')}")
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, DiscordConfig.JWT_SECRET_KEY, algorithms=[DiscordConfig.JWT_ALGORITHM])
        logger.debug(f"✅ JWT token verified for user: {payload.get('username')}")
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

    # Get user data from token
    user_id = payload.get('sub')
    username = payload.get('username')

    if not user_id:
        logger.warning("⚠️ No user ID in JWT payload")
        return None

    logger.debug(f"🔍 Looking for user {username} (ID: {user_id}) in session storage...")

    # Try to get user from stored sessions first
    try:
        # Import the user sessions from discord_routes
        from ..api.discord_routes import user_sessions

        if user_id in user_sessions:
            stored_user = user_sessions[user_id]
            logger.debug(f"✅ Found user {username} in session storage with server membership: {stored_user.is_in_server}")
            return stored_user
        else:
            logger.debug(f"⚠️ User {username} not in session storage, restoring from JWT token...")
    except ImportError:
        logger.debug("⚠️ Could not import user_sessions, restoring from JWT token...")

    # FIXED: Restore user from JWT token data (for persistence across server restarts)
    try:
        restored_user = DiscordUser(
            id=user_id,
            username=username or "Unknown",
            discriminator=payload.get('discriminator', '0'),
            avatar=payload.get('avatar'),
            is_in_server=payload.get('is_in_server', False),  # Restore from JWT!
            server_nickname=payload.get('server_nickname')
        )

        # Re-add to session storage for future requests
        try:
            from ..api.discord_routes import user_sessions
            user_sessions[user_id] = restored_user
            logger.info(f"🔄 Restored user {username} from JWT token (Server member: {restored_user.is_in_server})")
        except ImportError:
            pass

        return restored_user

    except Exception as e:
        logger.error(f"❌ Failed to restore user from JWT: {e}")
        return None

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