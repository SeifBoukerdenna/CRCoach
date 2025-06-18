# server/services/discord_service.py
import httpx
import logging
from typing import Optional, Dict, Any
from models.discord_user import DiscordUser, DiscordTokenData
from core.discord_config import DiscordConfig

logger = logging.getLogger(__name__)

class DiscordService:
    """Discord OAuth2 and API service"""

    def __init__(self):
        self.client = httpx.AsyncClient()
        self.config = DiscordConfig

    async def exchange_code_for_token(self, code: str) -> Optional[DiscordTokenData]:
        """Exchange OAuth2 code for access token"""
        token_url = f"{self.config.OAUTH2_BASE}/token"

        data = {
            "client_id": self.config.CLIENT_ID,
            "client_secret": self.config.CLIENT_SECRET,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.config.REDIRECT_URI,
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        try:
            response = await self.client.post(token_url, data=data, headers=headers)
            response.raise_for_status()

            token_data = response.json()
            logger.info("✅ Successfully exchanged Discord code for token")

            return DiscordTokenData(**token_data)

        except httpx.HTTPError as e:
            logger.error(f"❌ Discord token exchange failed: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Unexpected error in token exchange: {e}")
            return None

    async def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get user information from Discord API"""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            response = await self.client.get(
                f"{self.config.DISCORD_API_BASE}/users/@me",
                headers=headers
            )
            response.raise_for_status()

            user_data = response.json()
            logger.info(f"✅ Retrieved Discord user info for {user_data.get('username')}")

            return user_data

        except httpx.HTTPError as e:
            logger.error(f"❌ Failed to get Discord user info: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Unexpected error getting user info: {e}")
            return None

    async def get_user_guilds(self, access_token: str) -> Optional[list]:
        """Get user's Discord servers"""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            response = await self.client.get(
                f"{self.config.DISCORD_API_BASE}/users/@me/guilds",
                headers=headers
            )
            response.raise_for_status()

            guilds = response.json()
            logger.info(f"✅ Retrieved {len(guilds)} Discord servers for user")

            return guilds

        except httpx.HTTPError as e:
            logger.error(f"❌ Failed to get Discord guilds: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Unexpected error getting guilds: {e}")
            return None

    async def check_server_membership(self, user_id: str) -> Dict[str, Any]:
        """Check if user is member of our Discord server using bot token"""
        if not self.config.BOT_TOKEN:
            logger.error("❌ No Discord bot token configured")
            return {"is_member": False, "error": "Bot token not configured"}

        headers = {
            "Authorization": f"Bot {self.config.BOT_TOKEN}",
            "Content-Type": "application/json"
        }

        try:
            # Get guild member info
            response = await self.client.get(
                f"{self.config.DISCORD_API_BASE}/guilds/{self.config.SERVER_ID}/members/{user_id}",
                headers=headers
            )

            if response.status_code == 200:
                member_data = response.json()
                logger.info(f"✅ User {user_id} is a member of server {self.config.SERVER_ID}")

                return {
                    "is_member": True,
                    "nickname": member_data.get("nick"),
                    "roles": member_data.get("roles", []),
                    "joined_at": member_data.get("joined_at")
                }
            elif response.status_code == 404:
                logger.info(f"ℹ️ User {user_id} is not a member of server {self.config.SERVER_ID}")
                return {"is_member": False}
            else:
                logger.error(f"❌ Error checking server membership: {response.status_code}")
                return {"is_member": False, "error": f"HTTP {response.status_code}"}

        except httpx.HTTPError as e:
            logger.error(f"❌ Failed to check server membership: {e}")
            return {"is_member": False, "error": str(e)}
        except Exception as e:
            logger.error(f"❌ Unexpected error checking membership: {e}")
            return {"is_member": False, "error": str(e)}

    async def create_discord_user(self, token_data: DiscordTokenData) -> Optional[DiscordUser]:
        """Create DiscordUser object with full user info and server membership"""
        # Get user info
        user_info = await self.get_user_info(token_data.access_token)
        if not user_info:
            return None

        # Check server membership
        membership_info = await self.check_server_membership(user_info["id"])

        # Create user object
        discord_user = DiscordUser(
            id=user_info["id"],
            username=user_info["username"],
            discriminator=user_info.get("discriminator", "0"),
            avatar=user_info.get("avatar"),
            email=user_info.get("email"),
            verified=user_info.get("verified"),
            locale=user_info.get("locale"),
            mfa_enabled=user_info.get("mfa_enabled"),

            # Server membership
            is_in_server=membership_info.get("is_member", False),
            server_roles=membership_info.get("roles", []),
            server_nickname=membership_info.get("nickname"),

            # Token info
            access_token=token_data.access_token,
            refresh_token=token_data.refresh_token,
        )

        logger.info(f"✅ Created Discord user: {discord_user.username} (Server member: {discord_user.is_in_server})")
        return discord_user

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()

# Global service instance
_discord_service = None

def get_discord_service() -> DiscordService:
    """Get Discord service singleton"""
    global _discord_service
    if _discord_service is None:
        _discord_service = DiscordService()
    return _discord_service