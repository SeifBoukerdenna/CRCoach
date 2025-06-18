# server/core/discord_config.py - QUICK FIX

import os
from typing import List
import logging

logger = logging.getLogger(__name__)

class DiscordConfig:
    """Discord OAuth2 and API configuration"""

    # OAuth2 Configuration
    CLIENT_ID: str = os.getenv('DISCORD_CLIENT_ID', '1384713368971120690')
    CLIENT_SECRET: str = os.getenv('DISCORD_CLIENT_SECRET', 'Rf6pQKhytE-TMzwK4Mv_ddBx6iD-7Iwl')

    # Redirect URI with environment-aware defaults
    REDIRECT_URI: str = os.getenv(
        'DISCORD_REDIRECT_URI',
        'http://www.api.tormentor.dev/auth/discord/callback'  # Default for development

    )

    # Optional server configuration
    SERVER_ID: str = os.getenv('DISCORD_SERVER_ID', '1383863618482995280')
    BOT_TOKEN: str = os.getenv('DISCORD_BOT_TOKEN', 'MTM4NDcxMzM2ODk3MTEyMDY5MA.GEzzLc.igazG0hIYmGERtVn4CJ2w87XvqSslca_3-c4WI')

    # OAuth2 Scopes - THIS WAS MISSING!
    OAUTH_SCOPES: List[str] = ['identify', 'guilds']

    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv('JWT_SECRET_KEY', 'D_IUI!6pUQ{W^S+e5&}Y5>pCctpU50kH@nUx-7rQ(xvm^{rjTfYVP^Pn(iRMnvJk')
    JWT_ALGORITHM: str = 'HS256'
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '10080'))  # 7 days default

    # Environment detection
    ENVIRONMENT: str = os.getenv('ENVIRONMENT', 'development')

    @classmethod
    def get_redirect_uri(cls) -> str:
        """Get the appropriate redirect URI based on environment - THIS WAS MISSING!"""
        redirect_uri = cls.REDIRECT_URI
        logger.info(f"🔗 Using Discord redirect URI: {redirect_uri}")
        return redirect_uri

    @classmethod
    def validate_config(cls) -> None:
        """Validate required Discord configuration"""
        missing_vars = []

        if not cls.CLIENT_ID:
            missing_vars.append('DISCORD_CLIENT_ID')

        if not cls.CLIENT_SECRET:
            missing_vars.append('DISCORD_CLIENT_SECRET')

        if not cls.JWT_SECRET_KEY or cls.JWT_SECRET_KEY == 'your-secret-key-change-this':
            missing_vars.append('JWT_SECRET_KEY')

        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

        logger.info("✅ Discord configuration validated successfully")
        logger.info(f"🔗 Client ID: {cls.CLIENT_ID[:8]}...")
        logger.info(f"🔗 Redirect URI: {cls.get_redirect_uri()}")
        logger.info(f"🔗 Scopes: {', '.join(cls.OAUTH_SCOPES)}")
        if cls.SERVER_ID:
            logger.info(f"🔗 Server ID: {cls.SERVER_ID}")

        return True

    @classmethod
    def is_configured(cls) -> bool:
        """Check if Discord is properly configured"""
        try:
            cls.validate_config()
            return True
        except ValueError as e:
            logger.warning(f"⚠️ Discord configuration incomplete: {e}")
            return False