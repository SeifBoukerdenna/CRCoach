"""
server/services/jwt_service.py - JWT Authentication Service
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from jose import JWTError, jwt
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.auth_config import auth_config
from models.auth_models import DiscordUser, JWTTokens

logger = logging.getLogger(__name__)

# Security scheme for FastAPI
security = HTTPBearer(auto_error=False)


class JWTService:
    """Service for JWT token management"""

    def __init__(self):
        self.secret_key = auth_config.JWT_SECRET_KEY
        self.algorithm = auth_config.JWT_ALGORITHM
        self.access_token_expire_minutes = auth_config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = auth_config.JWT_REFRESH_TOKEN_EXPIRE_DAYS

    def create_access_token(self, data: Dict[str, Any]) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({
            "exp": expire,
            "type": "access"
        })

        try:
            encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
            return encoded_jwt
        except Exception as e:
            logger.error(f"❌ Failed to create access token: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create access token"
            )

    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({
            "exp": expire,
            "type": "refresh"
        })

        try:
            encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
            return encoded_jwt
        except Exception as e:
            logger.error(f"❌ Failed to create refresh token: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create refresh token"
            )

    def create_token_pair(self, user: DiscordUser) -> JWTTokens:
        """Create access and refresh token pair"""
        # Token payload
        token_data = {
            "sub": user.id,  # Subject (user ID)
            "username": user.username,
            "discriminator": user.discriminator,
            "email": user.email,
            "avatar": user.avatar,
            "iat": datetime.utcnow()  # Issued at
        }

        access_token = self.create_access_token(token_data)
        refresh_token = self.create_refresh_token({"sub": user.id})

        return JWTTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.access_token_expire_minutes * 60
        )

    def verify_token(self, token: str, token_type: str = "access") -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            # Check token type
            if payload.get("type") != token_type:
                raise JWTError(f"Invalid token type: expected {token_type}")

            # Check if token is expired
            exp = payload.get("exp")
            if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
                raise JWTError("Token has expired")

            return payload

        except JWTError as e:
            logger.warning(f"🔐 JWT verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    def get_user_from_token(self, token: str) -> DiscordUser:
        """Extract user info from valid JWT token"""
        payload = self.verify_token(token, "access")

        # Reconstruct user from token data
        user_data = {
            "id": payload.get("sub"),
            "username": payload.get("username"),
            "discriminator": payload.get("discriminator"),
            "email": payload.get("email"),
            "avatar": payload.get("avatar"),
        }

        # Remove None values
        user_data = {k: v for k, v in user_data.items() if v is not None}

        return DiscordUser(**user_data)

    def refresh_access_token(self, refresh_token: str) -> str:
        """Create new access token from refresh token"""
        # Verify refresh token
        payload = self.verify_token(refresh_token, "refresh")
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        # Create new access token
        token_data = {
            "sub": user_id,
            "iat": datetime.utcnow()
        }

        return self.create_access_token(token_data)


class AuthMiddleware:
    """Authentication middleware for FastAPI"""

    def __init__(self, jwt_service: JWTService):
        self.jwt_service = jwt_service

    async def get_current_user(self, credentials: Optional[HTTPAuthorizationCredentials] = None) -> Optional[DiscordUser]:
        """Get current authenticated user from JWT token"""
        if not credentials:
            return None

        try:
            user = self.jwt_service.get_user_from_token(credentials.credentials)
            return user
        except HTTPException:
            return None

    async def require_auth(self, credentials: Optional[HTTPAuthorizationCredentials] = None) -> DiscordUser:
        """Require authentication - raises exception if not authenticated"""
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = self.jwt_service.get_user_from_token(credentials.credentials)
        return user


# Global instances
jwt_service = JWTService()
auth_middleware = AuthMiddleware(jwt_service)