"""
server/api/auth_routes.py - Discord Authentication Routes
"""

import secrets
import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse, JSONResponse

from core.auth_config import auth_config
from models.auth_models import (
    LoginResponse,
    RefreshTokenRequest,
    UserInfoResponse,
    AuthCallbackQuery,
    ErrorResponse
)
from services.discord_service import discord_service, DiscordAPIError
from services.jwt_service import jwt_service, auth_middleware, security
from services.user_session_manager import user_session_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.get("/login")
async def login():
    """Initiate Discord OAuth login"""
    try:
        # Generate state for CSRF protection
        state = secrets.token_urlsafe(32)

        # Get Discord OAuth URL
        oauth_url = discord_service.get_oauth_url(state)

        logger.info("🔐 Discord OAuth login initiated")

        return {
            "oauth_url": oauth_url,
            "state": state,
            "message": "Redirect user to oauth_url to complete authentication"
        }

    except Exception as e:
        logger.error(f"❌ Login initialization error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize login"
        )


@router.get("/callback")
async def auth_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None
):
    """Handle Discord OAuth callback"""
    # Check for OAuth errors
    if error:
        logger.warning(f"🚫 Discord OAuth error: {error} - {error_description}")

        error_url = f"{auth_config.FRONTEND_URL}/auth/error?error={error}&description={error_description or ''}"
        return RedirectResponse(url=error_url)

    # Validate required parameters
    if not code:
        logger.warning("🚫 Missing authorization code in callback")
        error_url = f"{auth_config.FRONTEND_URL}/auth/error?error=missing_code&description=Authorization code not provided"
        return RedirectResponse(url=error_url)

    try:
        # Get client info for session tracking
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # Authenticate user with Discord
        logger.info("🔄 Processing Discord OAuth callback...")
        auth_user, is_in_guild = await discord_service.authenticate_user(code)

        # Create JWT tokens
        jwt_tokens = jwt_service.create_token_pair(auth_user.discord_user)

        # Create user session
        session = user_session_manager.create_session(
            auth_user=auth_user,
            jwt_access_token=jwt_tokens.access_token,
            jwt_refresh_token=jwt_tokens.refresh_token,
            ip_address=client_ip,
            user_agent=user_agent
        )

        # Build success redirect URL with tokens
        success_url = (
            f"{auth_config.FRONTEND_URL}/auth/success"
            f"?access_token={jwt_tokens.access_token}"
            f"&refresh_token={jwt_tokens.refresh_token}"
            f"&expires_in={jwt_tokens.expires_in}"
            f"&in_guild={str(is_in_guild).lower()}"
        )

        logger.info(f"✅ Authentication successful for {auth_user.discord_user.get_display_name()}")
        return RedirectResponse(url=success_url)

    except DiscordAPIError as e:
        logger.error(f"❌ Discord API error in callback: {e.message}")
        error_url = f"{auth_config.FRONTEND_URL}/auth/error?error=discord_api_error&description={e.message}"
        return RedirectResponse(url=error_url)

    except Exception as e:
        logger.error(f"❌ Authentication callback error: {e}")
        error_url = f"{auth_config.FRONTEND_URL}/auth/error?error=auth_failed&description=Authentication process failed"
        return RedirectResponse(url=error_url)


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(refresh_request: RefreshTokenRequest):
    """Refresh JWT access token"""
    try:
        # Verify refresh token and get user ID
        payload = jwt_service.verify_token(refresh_request.refresh_token, "refresh")
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        # Get user session
        session = user_session_manager.get_session(user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired - please login again"
            )

        # Create new JWT tokens
        jwt_tokens = jwt_service.create_token_pair(session.user.discord_user)

        # Update session with new tokens
        session.jwt_access_token = jwt_tokens.access_token
        session.jwt_refresh_token = jwt_tokens.refresh_token
        session.refresh_activity()

        logger.info(f"🔄 Token refreshed for user {session.user.discord_user.get_display_name()}")

        return LoginResponse(
            user=session.user.discord_user,
            tokens=jwt_tokens,
            is_in_required_guild=session.user.is_in_required_guild,
            guilds=session.user.guilds
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )


@router.get("/me", response_model=UserInfoResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user info"""
    user = await auth_middleware.require_auth(credentials)

    # Get and update session
    session = user_session_manager.get_session(user.id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found - please login again"
        )

    # Update activity
    session.refresh_activity()

    return UserInfoResponse(
        user=session.user.discord_user,
        is_in_required_guild=session.user.is_in_required_guild,
        guilds=session.user.guilds,
        session_info=session.to_dict()
    )


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout user and invalidate session"""
    try:
        user = await auth_middleware.require_auth(credentials)

        # Remove user session
        removed = user_session_manager.remove_session(user.id)

        if removed:
            logger.info(f"👋 User {user.get_display_name()} logged out")
            return {"message": "Successfully logged out"}
        else:
            return {"message": "No active session found"}

    except HTTPException:
        # Even if auth fails, return success for logout
        return {"message": "Logged out"}
    except Exception as e:
        logger.error(f"❌ Logout error: {e}")
        return {"message": "Logged out"}


@router.get("/status")
async def auth_status():
    """Get authentication system status"""
    try:
        session_stats = user_session_manager.get_session_stats()

        return {
            "discord_configured": bool(auth_config.DISCORD_CLIENT_ID and auth_config.DISCORD_CLIENT_SECRET),
            "guild_check_enabled": bool(auth_config.DISCORD_GUILD_ID),
            "guild_id": auth_config.DISCORD_GUILD_ID,
            "frontend_url": auth_config.FRONTEND_URL,
            "session_stats": session_stats,
            "oauth_url": discord_service.get_oauth_url() if auth_config.DISCORD_CLIENT_ID else None
        }

    except Exception as e:
        logger.error(f"❌ Auth status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get auth status"
        )


@router.get("/check")
async def check_auth(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Quick auth check - returns user info if authenticated, null if not"""
    try:
        if not credentials:
            return {"authenticated": False, "user": None}

        user = await auth_middleware.get_current_user(credentials)
        if not user:
            return {"authenticated": False, "user": None}

        # Check session
        session = user_session_manager.get_session(user.id)
        if not session:
            return {"authenticated": False, "user": None}

        # Update activity
        session.refresh_activity()

        return {
            "authenticated": True,
            "user": {
                "id": user.id,
                "username": user.get_display_name(),
                "avatar_url": user.get_avatar_url(),
                "is_in_required_guild": session.user.is_in_required_guild
            }
        }

    except Exception as e:
        logger.error(f"❌ Auth check error: {e}")
        return {"authenticated": False, "user": None}