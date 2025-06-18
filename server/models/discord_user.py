# server/models/discord_user.py
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
from jose import JWTError, jwt
from core.discord_config import DiscordConfig

class DiscordUser(BaseModel):
    """Discord user data model"""
    id: str
    username: str
    discriminator: str
    avatar: Optional[str] = None
    email: Optional[str] = None
    verified: Optional[bool] = None
    locale: Optional[str] = None
    mfa_enabled: Optional[bool] = None

    # Server membership info
    is_in_server: bool = False
    server_roles: List[str] = []
    server_nickname: Optional[str] = None

    # Session info
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None

class DiscordTokenData(BaseModel):
    """Discord OAuth2 token response"""
    access_token: str
    refresh_token: str
    expires_in: int
    scope: str
    token_type: str = "Bearer"

class JWTToken(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int

# JWT Utility Functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=DiscordConfig.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, DiscordConfig.JWT_SECRET_KEY, algorithm=DiscordConfig.JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, DiscordConfig.JWT_SECRET_KEY, algorithms=[DiscordConfig.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def extract_user_from_token(token: str) -> Optional[str]:
    """Extract user ID from JWT token"""
    payload = verify_token(token)
    if payload:
        return payload.get("sub")  # Subject = user ID
    return None