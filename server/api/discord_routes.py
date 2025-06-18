# server/api/discord_routes.py
from datetime import timedelta
from fastapi import APIRouter, HTTPException, Request, Response, Depends, Cookie
from fastapi.responses import RedirectResponse, JSONResponse
from typing import Optional, Dict, Any
import logging

from core.discord_config import DiscordConfig
from services.discord_service import get_discord_service
from models.discord_user import DiscordUser, JWTToken, create_access_token, verify_token, extract_user_from_token

logger = logging.getLogger(__name__)

# In-memory user session storage (replace with Redis in production)
user_sessions: Dict[str, DiscordUser] = {}

router = APIRouter(prefix="/auth/discord", tags=["Discord Auth"])

# Dependency to get current user from JWT token
async def get_current_user(access_token: Optional[str] = Cookie(None)) -> Optional[DiscordUser]:
    """Get current authenticated user from JWT token"""
    if not access_token:
        return None

    user_id = extract_user_from_token(access_token)
    if not user_id:
        return None

    # Get user from session storage
    user = user_sessions.get(user_id)
    if not user:
        return None

    # Refresh server membership check (optional)
    discord_service = get_discord_service()
    membership_info = await discord_service.check_server_membership(user_id)
    user.is_in_server = membership_info.get("is_member", False)

    return user

@router.get("/login")
async def discord_login():
    """Initiate Discord OAuth2 login"""
    try:
        DiscordConfig.validate_config()
        oauth_url = DiscordConfig.get_oauth2_url()

        logger.info("🔗 Generated Discord OAuth2 URL")

        return {
            "auth_url": oauth_url,
            "status": "redirect_to_discord"
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

        # Create JWT token
        access_token = create_access_token(
            data={"sub": discord_user.id, "username": discord_user.username},
            expires_delta=timedelta(minutes=DiscordConfig.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        # Store user session
        user_sessions[discord_user.id] = discord_user

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
        "server_nickname": current_user.server_nickname,
        "authenticated": True
    }

@router.post("/logout")
async def discord_logout(response: Response, current_user: Optional[DiscordUser] = Depends(get_current_user)):
    """Logout current user"""
    if current_user:
        # Remove from session storage
        user_sessions.pop(current_user.id, None)
        logger.info(f"✅ User {current_user.username} logged out")

    # Clear cookie
    response.delete_cookie(key="access_token")

    return {"status": "logged_out"}

@router.get("/check-server/{user_id}")
async def check_server_membership_endpoint(user_id: str):
    """Manually check if a user is in the Discord server (admin endpoint)"""
    discord_service = get_discord_service()
    membership_info = await discord_service.check_server_membership(user_id)

    return {
        "user_id": user_id,
        "server_id": DiscordConfig.SERVER_ID,
        **membership_info
    }

@router.get("/status")
async def discord_auth_status(current_user: Optional[DiscordUser] = Depends(get_current_user)):
    """Get Discord authentication status"""
    if current_user:
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
        return {
            "authenticated": False,
            "user": None
        }