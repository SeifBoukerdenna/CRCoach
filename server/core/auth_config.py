"""
server/core/auth_config.py - Updated with Discord Invite URL for Inference Access
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class AuthConfig:
    """Authentication configuration with Discord integration"""

    def __init__(self):
        # Discord OAuth2 Configuration
        self.DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
        self.DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
        self.DISCORD_REDIRECT_URI = os.getenv(
            "DISCORD_REDIRECT_URI",
            "http://localhost:3000/api/auth/callback"
        )

        # Discord Guild/Server Configuration
        self.DISCORD_GUILD_ID = os.getenv("DISCORD_GUILD_ID")

        # ✅ Discord Invite URL for users who need to join the server
        self.DISCORD_INVITE_URL = os.getenv(
            "DISCORD_INVITE_URL",
            "https://discord.gg/your-server-invite"  # Replace with your actual invite
        )

        # JWT Configuration
        self.JWT_SECRET_KEY = os.getenv(
            "JWT_SECRET_KEY",
            "your-super-secret-jwt-key-change-in-production"
        )
        self.JWT_ALGORITHM = "HS256"
        self.JWT_ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_HOURS", "24"))
        self.JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "30"))

        # Frontend Configuration
        self.FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

        # Session Configuration
        self.USER_SESSION_TIMEOUT_MINUTES = int(os.getenv("USER_SESSION_TIMEOUT_MINUTES", "60"))
        self.MAX_SESSIONS_PER_USER = int(os.getenv("MAX_SESSIONS_PER_USER", "3"))

        # ✅ Inference Access Control
        self.REQUIRE_DISCORD_FOR_INFERENCE = os.getenv("REQUIRE_DISCORD_FOR_INFERENCE", "true").lower() == "true"
        self.REQUIRE_GUILD_MEMBERSHIP_FOR_INFERENCE = os.getenv("REQUIRE_GUILD_MEMBERSHIP_FOR_INFERENCE", "true").lower() == "true"

        # Validate configuration
        self._validate_config()

    def _validate_config(self):
        """Validate authentication configuration"""
        if self.DISCORD_CLIENT_ID and not self.DISCORD_CLIENT_SECRET:
            logger.warning("⚠️ Discord Client ID provided but missing Client Secret")

        if self.DISCORD_CLIENT_SECRET and not self.DISCORD_CLIENT_ID:
            logger.warning("⚠️ Discord Client Secret provided but missing Client ID")

        if self.DISCORD_GUILD_ID and not (self.DISCORD_CLIENT_ID and self.DISCORD_CLIENT_SECRET):
            logger.warning("⚠️ Discord Guild ID provided but Discord OAuth not configured")

        # ✅ Validate inference access requirements
        if self.REQUIRE_GUILD_MEMBERSHIP_FOR_INFERENCE and not self.DISCORD_GUILD_ID:
            logger.warning("⚠️ Guild membership required for inference but no Guild ID configured")

        if self.REQUIRE_DISCORD_FOR_INFERENCE and not (self.DISCORD_CLIENT_ID and self.DISCORD_CLIENT_SECRET):
            logger.warning("⚠️ Discord required for inference but Discord OAuth not configured")

    @property
    def is_discord_configured(self) -> bool:
        """Check if Discord OAuth is properly configured"""
        return bool(self.DISCORD_CLIENT_ID and self.DISCORD_CLIENT_SECRET)

    @property
    def is_guild_check_enabled(self) -> bool:
        """Check if Discord guild membership checking is enabled"""
        return bool(self.DISCORD_GUILD_ID and self.is_discord_configured)

    @property
    def inference_requires_auth(self) -> bool:
        """Check if inference features require authentication"""
        return self.REQUIRE_DISCORD_FOR_INFERENCE and self.is_discord_configured

    @property
    def inference_requires_guild(self) -> bool:
        """Check if inference features require guild membership"""
        return (self.REQUIRE_GUILD_MEMBERSHIP_FOR_INFERENCE and
                self.is_guild_check_enabled)

    def get_discord_oauth_url(self, state: str) -> str:
        """Generate Discord OAuth URL"""
        if not self.is_discord_configured:
            raise ValueError("Discord OAuth not configured")

        scope = "identify email guilds"

        return (
            f"https://discord.com/api/oauth2/authorize"
            f"?client_id={self.DISCORD_CLIENT_ID}"
            f"&redirect_uri={self.DISCORD_REDIRECT_URI}"
            f"&response_type=code"
            f"&scope={scope.replace(' ', '%20')}"
            f"&state={state}"
        )

    def get_inference_access_info(self) -> dict:
        """Get information about inference access requirements"""
        return {
            "requires_authentication": self.inference_requires_auth,
            "requires_guild_membership": self.inference_requires_guild,
            "discord_configured": self.is_discord_configured,
            "guild_configured": self.is_guild_check_enabled,
            "guild_id": self.DISCORD_GUILD_ID,
            "discord_invite_url": self.DISCORD_INVITE_URL,
            "can_use_inference_without_auth": not self.inference_requires_auth
        }

    def log_config(self):
        """Log current authentication configuration"""
        logger.info("🔐 Discord Authentication Configuration:")
        logger.info(f"   Discord OAuth Configured: {self.is_discord_configured}")
        logger.info(f"   Discord Guild Check: {self.is_guild_check_enabled}")

        if self.DISCORD_GUILD_ID:
            logger.info(f"   Required Guild ID: {self.DISCORD_GUILD_ID}")

        logger.info(f"   Frontend URL: {self.FRONTEND_URL}")
        logger.info(f"   Session Timeout: {self.USER_SESSION_TIMEOUT_MINUTES} minutes")

        # ✅ Log inference access requirements
        logger.info("🤖 Inference Access Control:")
        logger.info(f"   Requires Discord Auth: {self.inference_requires_auth}")
        logger.info(f"   Requires Guild Membership: {self.inference_requires_guild}")
        logger.info(f"   Discord Invite URL: {self.DISCORD_INVITE_URL}")

        if not self.is_discord_configured:
            logger.warning("⚠️ Discord authentication not configured - inference may be unrestricted")

        if self.inference_requires_guild and not self.DISCORD_GUILD_ID:
            logger.warning("⚠️ Guild membership required for inference but no guild configured")

# Global configuration instance
auth_config = AuthConfig()