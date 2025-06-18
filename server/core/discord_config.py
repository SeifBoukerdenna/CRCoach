# server/core/discord_config.py
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DiscordConfig:
    """Discord OAuth2 and API configuration"""

    # Discord OAuth2
    CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
    CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
    REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI", "http://localhost:8080/auth/discord/callback")

    # Discord Bot Token (for server API calls)
    BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")

    # Your Discord Server
    SERVER_ID = os.getenv("DISCORD_SERVER_ID", "1383863618482995280")

    # Discord API URLs
    DISCORD_API_BASE = "https://discord.com/api/v10"
    OAUTH2_BASE = "https://discord.com/api/oauth2"

    # OAuth2 Scopes
    OAUTH2_SCOPES = ["identify", "guilds"]

    # JWT Configuration

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days

    @classmethod
    def validate_config(cls):
        """Validate that required Discord config is present"""
        required_vars = [
            ("DISCORD_CLIENT_ID", cls.CLIENT_ID),
            ("DISCORD_CLIENT_SECRET", cls.CLIENT_SECRET),
            ("DISCORD_BOT_TOKEN", cls.BOT_TOKEN),
        ]

        missing = [name for name, value in required_vars if not value]

        if missing:
            raise ValueError(f"Missing required Discord environment variables: {', '.join(missing)}")

        return True

    @classmethod
    def get_oauth2_url(cls):
        """Get Discord OAuth2 authorization URL"""
        scopes = "%20".join(cls.OAUTH2_SCOPES)
        return (
            f"{cls.OAUTH2_BASE}/authorize"
            f"?client_id={cls.CLIENT_ID}"
            f"&redirect_uri={cls.REDIRECT_URI}"
            f"&response_type=code"
            f"&scope={scopes}"
        )