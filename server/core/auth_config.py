"""
server/core/auth_config.py - Discord OAuth Configuration
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class AuthConfig(BaseSettings):
    """Authentication configuration settings"""

    # Discord OAuth Settings
    DISCORD_CLIENT_ID: str = os.getenv("DISCORD_CLIENT_ID", "")
    DISCORD_CLIENT_SECRET: str = os.getenv("DISCORD_CLIENT_SECRET", "")
    DISCORD_REDIRECT_URI: str = os.getenv("DISCORD_REDIRECT_URI", "http://localhost:3000/auth/callback")

    # Discord Server Settings (optional - set if you want to check server membership)
    DISCORD_GUILD_ID: Optional[str] = os.getenv("DISCORD_GUILD_ID", None)  # Your Discord server ID

    # JWT Settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-this-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Frontend URL
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Discord API URLs
    DISCORD_API_BASE: str = "https://discord.com/api/v10"
    DISCORD_OAUTH_AUTHORIZE_URL: str = f"{DISCORD_API_BASE}/oauth2/authorize"
    DISCORD_OAUTH_TOKEN_URL: str = f"{DISCORD_API_BASE}/oauth2/token"

    class Config:
        env_file = ".env"
        case_sensitive = True

    def get_discord_oauth_url(self, state: str = "") -> str:
        """Generate Discord OAuth authorization URL"""
        scopes = "identify email guilds"

        return (
            f"{self.DISCORD_OAUTH_AUTHORIZE_URL}"
            f"?client_id={self.DISCORD_CLIENT_ID}"
            f"&redirect_uri={self.DISCORD_REDIRECT_URI}"
            f"&response_type=code"
            f"&scope={scopes.replace(' ', '%20')}"
            f"&state={state}"
        )

    def log_config(self):
        """Log the current auth configuration (without sensitive data)"""
        print("🔐 Discord OAuth Configuration:")
        print(f"   Discord Client ID: {self.DISCORD_CLIENT_ID[:8]}..." if self.DISCORD_CLIENT_ID else "   ❌ Discord Client ID: NOT SET")
        print(f"   Discord Redirect URI: {self.DISCORD_REDIRECT_URI}")
        print(f"   Discord Guild ID: {self.DISCORD_GUILD_ID or 'None (server check disabled)'}")
        print(f"   Frontend URL: {self.FRONTEND_URL}")
        print(f"   JWT Token Expiry: {self.JWT_ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
        print(f"   Refresh Token Expiry: {self.JWT_REFRESH_TOKEN_EXPIRE_DAYS} days")


# Global auth config instance
auth_config = AuthConfig()