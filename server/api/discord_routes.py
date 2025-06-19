# server/api/discord_routes.py - FIXED with better session management

from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
from datetime import timedelta
from typing import Optional
import logging

from core.discord_service import get_discord_service, DiscordUser
from core.discord_config import DiscordConfig
from core.auth import create_access_token, get_current_user

# User sessions storage - IMPROVED with better logging
user_sessions = {}

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/discord", tags=["discord"])

@router.get("/status")
async def get_auth_status(current_user: Optional[DiscordUser] = Depends(get_current_user)):
    """Get current authentication status"""
    logger.debug(f"🔍 Auth status check - Current sessions: {list(user_sessions.keys())}")

    if current_user:
        logger.info(f"✅ User {current_user.username} authenticated with server membership: {current_user.is_in_server}")
        return {
            "authenticated": True,
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "discriminator": current_user.discriminator,
                "avatar": current_user.avatar,
                "is_in_server": current_user.is_in_server,
                "server_nickname": current_user.server_nickname
            }
        }
    else:
        logger.info("❌ No authenticated user found")
        return {"authenticated": False}

@router.get("/login")
async def discord_login():
    """Generate Discord OAuth2 login URL"""
    discord_service = get_discord_service()

    try:
        # Validate Discord configuration
        DiscordConfig.validate_config()

        # Generate OAuth2 URL
        auth_url = await discord_service.get_oauth_url()
        if not auth_url:
            raise HTTPException(status_code=500, detail="Failed to generate authentication URL")

        logger.info(f"✅ Generated Discord login URL: {auth_url[:50]}...")

        return {
            "auth_url": auth_url,
            "state": "secure_random_state",  # You should implement proper state validation
            "scope": DiscordConfig.OAUTH_SCOPES
        }

    except ValueError as e:
        logger.error(f"❌ Discord config validation failed: {e}")
        raise HTTPException(status_code=500, detail="Discord authentication not properly configured")
    except Exception as e:
        logger.error(f"❌ Failed to generate Discord login URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate Discord login")

@router.get("/callback")
async def discord_callback(code: str, error: Optional[str] = None):
    """Handle Discord OAuth2 callback"""
    if error:
        logger.error(f"❌ Discord OAuth2 error: {error}")
        raise HTTPException(status_code=400, detail=f"Discord authentication failed: {error}")

    if not code:
        logger.error("❌ No authorization code received from Discord")
        raise HTTPException(status_code=400, detail="Authorization code missing")

    discord_service = get_discord_service()

    try:
        # Exchange code for tokens
        token_data = await discord_service.exchange_code_for_token(code)
        if not token_data:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")

        # Create user object with server membership check
        discord_user = await discord_service.create_discord_user(token_data)
        if not discord_user:
            raise HTTPException(status_code=400, detail="Failed to retrieve user information")

        # FIXED: Store user session with better logging
        user_sessions[discord_user.id] = discord_user
        logger.info(f"💾 Stored user {discord_user.username} in session storage (Server member: {discord_user.is_in_server})")
        logger.info(f"📊 Current sessions: {list(user_sessions.keys())}")

        # Create JWT token
        access_token = create_access_token(
            data={"sub": discord_user.id, "username": discord_user.username},
            expires_delta=timedelta(minutes=DiscordConfig.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        logger.info(f"✅ Discord login successful for {discord_user.username} (Server member: {discord_user.is_in_server})")

        # Create response with cookie
        response = JSONResponse({
            "status": "success",
            "user": {
                "id": discord_user.id,
                "username": discord_user.username,
                "discriminator": discord_user.discriminator,
                "avatar": discord_user.avatar,
                "is_in_server": discord_user.is_in_server,
                "server_nickname": discord_user.server_nickname
            },
            "token": {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": DiscordConfig.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
            }
        })

        # Set secure HTTP-only cookie
        response.set_cookie(
            key="access_token",
            value=access_token,
            max_age=DiscordConfig.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax"
        )

        return response

    except Exception as e:
        logger.error(f"❌ Discord callback processing failed: {e}")
        raise HTTPException(status_code=500, detail="Authentication processing failed")

@router.get("/me")
async def get_current_user_info(current_user: Optional[DiscordUser] = Depends(get_current_user)):
    """Get current authenticated user information"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return {
        "id": current_user.id,
        "username": current_user.username,
        "discriminator": current_user.discriminator,
        "avatar": current_user.avatar,
        "is_in_server": current_user.is_in_server,
        "server_nickname": current_user.server_nickname
    }

@router.post("/logout")
async def discord_logout(request: Request, current_user: Optional[DiscordUser] = Depends(get_current_user)):
    """Logout current user"""
    try:
        # Remove user from sessions if exists
        if current_user and current_user.id in user_sessions:
            del user_sessions[current_user.id]
            logger.info(f"✅ User {current_user.username} logged out successfully")
            logger.info(f"📊 Remaining sessions: {list(user_sessions.keys())}")

        # Create response
        response = JSONResponse({
            "status": "success",
            "message": "Logged out successfully"
        })

        # Clear the access token cookie
        response.delete_cookie(
            key="access_token",
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax"
        )

        return response

    except Exception as e:
        logger.error(f"❌ Logout failed: {e}")
        # Still return success even if there's an error, as we want to clear client state
        response = JSONResponse({
            "status": "success",
            "message": "Logged out successfully"
        })

        response.delete_cookie(
            key="access_token",
            httponly=True,
            secure=False,
            samesite="lax"
        )

        return response

@router.get("/refresh")
async def refresh_user_info(current_user: Optional[DiscordUser] = Depends(get_current_user)):
    """Refresh current user information from Discord"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    discord_service = get_discord_service()

    try:
        # Update session cache
        user_sessions[current_user.id] = current_user
        logger.info(f"🔄 Refreshed user {current_user.username} in session storage")

        return {
            "id": current_user.id,
            "username": current_user.username,
            "discriminator": current_user.discriminator,
            "avatar": current_user.avatar,
            "is_in_server": current_user.is_in_server,
            "server_nickname": current_user.server_nickname
        }

    except Exception as e:
        logger.error(f"❌ Failed to refresh user info: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh user information")

@router.get("/debug/sessions")
async def debug_sessions():
    """DEBUG: Check current user sessions"""
    return {
        "total_sessions": len(user_sessions),
        "user_ids": list(user_sessions.keys()),
        "users": [{
            "id": user.id,
            "username": user.username,
            "is_in_server": user.is_in_server
        } for user in user_sessions.values()]
    }

@router.get("/debug/guilds")
async def debug_user_guilds(current_user: Optional[DiscordUser] = Depends(get_current_user)):
    """DEBUG: Get user's Discord guilds for troubleshooting"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    logger.info(f"🐛 DEBUG: Checking guilds for user {current_user.username}")

    return {
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "is_in_server": current_user.is_in_server
        },
        "target_server_id": DiscordConfig.SERVER_ID,
        "debug_info": "Check server logs for detailed guild information"
    }