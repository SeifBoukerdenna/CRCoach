# server/core/discord_service.py

import aiohttp
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass
from urllib.parse import urlencode

from .discord_config import DiscordConfig

logger = logging.getLogger(__name__)

@dataclass
class DiscordUser:
    """Discord user data model"""
    id: str
    username: str
    discriminator: str
    avatar: Optional[str]
    is_in_server: bool = False
    server_nickname: Optional[str] = None

class DiscordService:
    """Service for Discord OAuth2 and API interactions"""

    def __init__(self):
        self.base_url = "https://discord.com/api/v10"
        self.oauth_url = "https://discord.com/oauth2/authorize"
        self.token_url = "https://discord.com/api/oauth2/token"

    async def get_oauth_url(self) -> str:
        """Generate Discord OAuth2 authorization URL"""
        # Validate configuration first
        DiscordConfig.validate_config()

        params = {
            'client_id': DiscordConfig.CLIENT_ID,
            'redirect_uri': DiscordConfig.get_redirect_uri(),  # Use the method instead of direct access
            'response_type': 'code',
            'scope': ' '.join(DiscordConfig.OAUTH_SCOPES),
            'state': 'secure_random_state'  # You should generate a proper random state
        }

        auth_url = f"{self.oauth_url}?{urlencode(params)}"
        logger.info(f"🔗 Generated Discord OAuth URL with redirect: {DiscordConfig.get_redirect_uri()}")
        return auth_url

    async def exchange_code_for_token(self, code: str) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access token"""
        data = {
            'client_id': DiscordConfig.CLIENT_ID,
            'client_secret': DiscordConfig.CLIENT_SECRET,
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': DiscordConfig.get_redirect_uri(),  # Use the method
            'scope': ' '.join(DiscordConfig.OAUTH_SCOPES)
        }

        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.token_url, data=data, headers=headers) as response:
                    if response.status == 200:
                        token_data = await response.json()
                        logger.info("✅ Successfully exchanged code for token")
                        return token_data
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Token exchange failed: {response.status} - {error_text}")
                        return None
        except Exception as e:
            logger.error(f"❌ Token exchange error: {e}")
            return None

    async def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get Discord user information"""
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/users/@me", headers=headers) as response:
                    if response.status == 200:
                        user_data = await response.json()
                        logger.info(f"✅ Retrieved user info for {user_data.get('username')}")
                        return user_data
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to get user info: {response.status} - {error_text}")
                        return None
        except Exception as e:
            logger.error(f"❌ Get user info error: {e}")
            return None

    async def check_server_membership(self, access_token: str, user_id: str) -> tuple[bool, Optional[str]]:
        """Check if user is a member of the configured Discord server"""
        if not DiscordConfig.SERVER_ID:
            logger.warning("⚠️ No Discord server ID configured, skipping membership check")
            return False, None

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        try:
            async with aiohttp.ClientSession() as session:
                # Get user's guilds
                async with session.get(f"{self.base_url}/users/@me/guilds", headers=headers) as response:
                    if response.status == 200:
                        guilds = await response.json()

                        # Check if user is in the target server
                        for guild in guilds:
                            if guild['id'] == DiscordConfig.SERVER_ID:
                                logger.info(f"✅ User is member of server {guild['name']}")
                                return True, None

                        logger.info("❌ User is not a member of the target server")
                        return False, None
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to check server membership: {response.status} - {error_text}")
                        return False, None
        except Exception as e:
            logger.error(f"❌ Server membership check error: {e}")
            return False, None

    async def get_server_member_info(self, bot_token: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed server member information (requires bot token)"""
        if not DiscordConfig.SERVER_ID or not bot_token:
            return None

        headers = {
            'Authorization': f'Bot {bot_token}',
            'Content-Type': 'application/json'
        }

        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/guilds/{DiscordConfig.SERVER_ID}/members/{user_id}"
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        member_data = await response.json()
                        logger.info(f"✅ Retrieved server member info for user {user_id}")
                        return member_data
                    else:
                        logger.warning(f"⚠️ Could not get server member info: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"❌ Get server member info error: {e}")
            return None

    async def create_discord_user(self, token_data: Dict[str, Any]) -> Optional[DiscordUser]:
        """Create DiscordUser object with complete information"""
        access_token = token_data.get('access_token')
        if not access_token:
            logger.error("❌ No access token in token data")
            return None

        # Get basic user info
        user_info = await self.get_user_info(access_token)
        if not user_info:
            return None

        # Check server membership
        is_in_server, server_nickname = await self.check_server_membership(
            access_token,
            user_info['id']
        )

        # Create DiscordUser object
        discord_user = DiscordUser(
            id=user_info['id'],
            username=user_info['username'],
            discriminator=user_info.get('discriminator', '0'),
            avatar=user_info.get('avatar'),
            is_in_server=is_in_server,
            server_nickname=server_nickname
        )

        logger.info(f"✅ Created DiscordUser for {discord_user.username} (Server member: {is_in_server})")
        return discord_user

# Singleton instance
_discord_service: Optional[DiscordService] = None

def get_discord_service() -> DiscordService:
    """Get Discord service singleton"""
    global _discord_service
    if _discord_service is None:
        _discord_service = DiscordService()
        logger.info("🔐 Discord service initialized")
    return _discord_service