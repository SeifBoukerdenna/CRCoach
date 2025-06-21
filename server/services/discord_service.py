"""
server/services/discord_service.py - Discord API Service
"""

import asyncio
import httpx
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from urllib.parse import urlencode

from core.auth_config import auth_config
from models.auth_models import (
    DiscordUser,
    DiscordGuild,
    DiscordOAuthTokens,
    AuthenticatedUser
)

logger = logging.getLogger(__name__)


class DiscordAPIError(Exception):
    """Discord API error"""
    def __init__(self, message: str, status_code: int = 400, response_data: Dict = None):
        self.message = message
        self.status_code = status_code
        self.response_data = response_data or {}
        super().__init__(self.message)


class DiscordService:
    """Service for Discord API interactions"""

    def __init__(self):
        self.client_id = auth_config.DISCORD_CLIENT_ID
        self.client_secret = auth_config.DISCORD_CLIENT_SECRET
        self.api_base = auth_config.DISCORD_API_BASE

        if not self.client_id or not self.client_secret:
            logger.warning("🔐 Discord OAuth not configured - set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET")

    async def exchange_code_for_tokens(self, code: str) -> DiscordOAuthTokens:
        """Exchange authorization code for access tokens"""
        if not self.client_id or not self.client_secret:
            raise DiscordAPIError("Discord OAuth not configured", 500)

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": auth_config.DISCORD_REDIRECT_URI,
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    auth_config.DISCORD_OAUTH_TOKEN_URL,
                    data=data,
                    headers=headers,
                    timeout=10.0
                )

                if response.status_code != 200:
                    error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                    raise DiscordAPIError(
                        f"Failed to exchange code for tokens: {response.status_code}",
                        response.status_code,
                        error_data
                    )

                token_data = response.json()
                return DiscordOAuthTokens(**token_data)

            except httpx.RequestError as e:
                logger.error(f"❌ Discord token exchange request error: {e}")
                raise DiscordAPIError("Failed to connect to Discord API", 503)
            except Exception as e:
                logger.error(f"❌ Discord token exchange error: {e}")
                raise DiscordAPIError(f"Token exchange failed: {str(e)}", 500)

    async def refresh_access_token(self, refresh_token: str) -> DiscordOAuthTokens:
        """Refresh Discord access token"""
        if not self.client_id or not self.client_secret:
            raise DiscordAPIError("Discord OAuth not configured", 500)

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    auth_config.DISCORD_OAUTH_TOKEN_URL,
                    data=data,
                    headers=headers,
                    timeout=10.0
                )

                if response.status_code != 200:
                    error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                    raise DiscordAPIError(
                        f"Failed to refresh token: {response.status_code}",
                        response.status_code,
                        error_data
                    )

                token_data = response.json()
                return DiscordOAuthTokens(**token_data)

            except httpx.RequestError as e:
                logger.error(f"❌ Discord token refresh request error: {e}")
                raise DiscordAPIError("Failed to connect to Discord API", 503)
            except Exception as e:
                logger.error(f"❌ Discord token refresh error: {e}")
                raise DiscordAPIError(f"Token refresh failed: {str(e)}", 500)

    async def get_user_info(self, access_token: str) -> DiscordUser:
        """Get Discord user information"""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.api_base}/users/@me",
                    headers=headers,
                    timeout=10.0
                )

                if response.status_code != 200:
                    error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                    raise DiscordAPIError(
                        f"Failed to get user info: {response.status_code}",
                        response.status_code,
                        error_data
                    )

                user_data = response.json()
                return DiscordUser(**user_data)

            except httpx.RequestError as e:
                logger.error(f"❌ Discord user info request error: {e}")
                raise DiscordAPIError("Failed to connect to Discord API", 503)
            except Exception as e:
                logger.error(f"❌ Discord user info error: {e}")
                raise DiscordAPIError(f"Failed to get user info: {str(e)}", 500)

    async def get_user_guilds(self, access_token: str) -> List[DiscordGuild]:
        """Get user's Discord guilds (servers)"""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.api_base}/users/@me/guilds",
                    headers=headers,
                    timeout=10.0
                )

                if response.status_code != 200:
                    error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                    logger.warning(f"⚠️ Failed to get user guilds: {response.status_code}")
                    return []  # Return empty list instead of failing

                guilds_data = response.json()
                return [DiscordGuild(**guild) for guild in guilds_data]

            except httpx.RequestError as e:
                logger.error(f"❌ Discord guilds request error: {e}")
                return []  # Return empty list instead of failing
            except Exception as e:
                logger.error(f"❌ Discord guilds error: {e}")
                return []  # Return empty list instead of failing

    def check_guild_membership(self, guilds: List[DiscordGuild], required_guild_id: str) -> bool:
        """Check if user is in the required Discord server"""
        if not required_guild_id:
            return True  # No requirement set

        for guild in guilds:
            if guild.id == required_guild_id:
                return True

        return False

    async def authenticate_user(self, code: str) -> Tuple[AuthenticatedUser, bool]:
        """Complete Discord authentication flow"""
        try:
            # Exchange code for tokens
            logger.info("🔄 Exchanging Discord authorization code for tokens...")
            tokens = await self.exchange_code_for_tokens(code)

            # Get user info
            logger.info("👤 Fetching Discord user information...")
            user = await self.get_user_info(tokens.access_token)

            # Get user guilds
            logger.info("🏰 Fetching user Discord servers...")
            guilds = await self.get_user_guilds(tokens.access_token)

            # Check guild membership
            is_in_required_guild = True
            if auth_config.DISCORD_GUILD_ID:
                is_in_required_guild = self.check_guild_membership(guilds, auth_config.DISCORD_GUILD_ID)
                logger.info(f"🏰 Guild membership check: {'✅ PASSED' if is_in_required_guild else '❌ FAILED'}")

            # Calculate token expiry
            token_expires_at = datetime.utcnow() + timedelta(seconds=tokens.expires_in)

            # Create authenticated user
            auth_user = AuthenticatedUser(
                discord_user=user,
                guilds=guilds,
                is_in_required_guild=is_in_required_guild,
                access_token=tokens.access_token,
                refresh_token=tokens.refresh_token,
                token_expires_at=token_expires_at
            )

            logger.info(f"✅ Discord authentication successful for {user.get_display_name()}")
            return auth_user, is_in_required_guild

        except DiscordAPIError:
            raise
        except Exception as e:
            logger.error(f"❌ Discord authentication error: {e}")
            raise DiscordAPIError(f"Authentication failed: {str(e)}", 500)

    def get_oauth_url(self, state: str = "") -> str:
        """Get Discord OAuth authorization URL"""
        return auth_config.get_discord_oauth_url(state)


# Global Discord service instance
discord_service = DiscordService()