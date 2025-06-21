"""
server/models/auth_models.py - Authentication Pydantic Models
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DiscordUser(BaseModel):
    """Discord user information"""
    id: str
    username: str
    discriminator: str
    email: Optional[str] = None
    verified: bool = False
    avatar: Optional[str] = None
    banner: Optional[str] = None
    accent_color: Optional[int] = None
    locale: Optional[str] = None
    mfa_enabled: bool = False
    premium_type: Optional[int] = None
    public_flags: Optional[int] = None
    flags: Optional[int] = None

    def get_avatar_url(self, size: int = 128) -> Optional[str]:
        """Get the user's avatar URL"""
        if not self.avatar:
            # Default avatar based on discriminator
            default_avatar = int(self.discriminator) % 5
            return f"https://cdn.discordapp.com/embed/avatars/{default_avatar}.png"

        # Check if avatar is animated (starts with a_)
        extension = "gif" if self.avatar.startswith("a_") else "png"
        return f"https://cdn.discordapp.com/avatars/{self.id}/{self.avatar}.{extension}?size={size}"

    def get_display_name(self) -> str:
        """Get the user's display name"""
        if self.discriminator == "0":
            # New username system
            return self.username
        else:
            # Legacy username#discriminator system
            return f"{self.username}#{self.discriminator}"


class DiscordGuild(BaseModel):
    """Discord guild (server) information"""
    id: str
    name: str
    icon: Optional[str] = None
    owner: bool = False
    permissions: str
    features: List[str] = []

    def get_icon_url(self, size: int = 128) -> Optional[str]:
        """Get the guild's icon URL"""
        if not self.icon:
            return None

        extension = "gif" if self.icon.startswith("a_") else "png"
        return f"https://cdn.discordapp.com/icons/{self.id}/{self.icon}.{extension}?size={size}"


class DiscordOAuthTokens(BaseModel):
    """Discord OAuth token response"""
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str
    scope: str


class AuthenticatedUser(BaseModel):
    """Authenticated user with session info"""
    discord_user: DiscordUser
    guilds: List[DiscordGuild] = []
    is_in_required_guild: bool = False
    access_token: str
    refresh_token: str
    token_expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)


class JWTTokens(BaseModel):
    """JWT token pair"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class LoginResponse(BaseModel):
    """Login response with user info and tokens"""
    user: DiscordUser
    tokens: JWTTokens
    is_in_required_guild: bool = False
    guilds: List[DiscordGuild] = []


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str


class AuthCallbackQuery(BaseModel):
    """OAuth callback query parameters"""
    code: str
    state: Optional[str] = None
    error: Optional[str] = None
    error_description: Optional[str] = None


class UserInfoResponse(BaseModel):
    """User info response"""
    user: DiscordUser
    is_in_required_guild: bool = False
    guilds: List[DiscordGuild] = []
    session_info: Dict[str, Any] = {}


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    detail: str
    status_code: int = 400