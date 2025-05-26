import asyncio
import json
from typing import Dict, Set, Optional
from collections import defaultdict
from fastapi import WebSocket
from core.logging import setup_logging
from core.config import settings
from core.exceptions import ConnectionLimitExceededException
from models.connection import Connection, ConnectionRole, ConnectionState
from services.rate_limiter import RateLimiter

logger = setup_logging(settings.debug)

class ConnectionManager:
    """Manages WebSocket connections and enforces limits"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connections_by_ip: Dict[str, Set[str]] = defaultdict(set)
        self.rate_limiter = RateLimiter(
            settings.max_messages_per_connection,
            settings.rate_limit_window_seconds
        )

    async def connect(self, websocket: WebSocket, connection: Connection) -> bool:
        """Add new WebSocket connection"""

        # Check IP-based connection limit
        ip_connections = len(self.connections_by_ip[connection.client_ip])
        if ip_connections >= settings.max_connections_per_ip:
            logger.warning(f"🚫 Connection limit exceeded for IP {connection.client_ip}")
            await websocket.close(code=1013, reason="Too many connections from this IP")
            raise ConnectionLimitExceededException(f"Too many connections from {connection.client_ip}")

        # Accept WebSocket connection
        await websocket.accept()

        # Store connection
        self.active_connections[connection.id] = websocket
        self.connections_by_ip[connection.client_ip].add(connection.id)

        connection.state = ConnectionState.CONNECTED
        logger.info(f"🔌 Connection {connection.id} established from {connection.client_ip}")

        return True

    async def disconnect(self, connection: Connection):
        """Remove WebSocket connection"""

        # Remove from active connections
        if connection.id in self.active_connections:
            websocket = self.active_connections.pop(connection.id)
            try:
                await websocket.close()
            except:
                pass  # Connection might already be closed

        # Remove from IP tracking
        self.connections_by_ip[connection.client_ip].discard(connection.id)
        if not self.connections_by_ip[connection.client_ip]:
            del self.connections_by_ip[connection.client_ip]

        connection.state = ConnectionState.DISCONNECTED
        logger.info(f"🔌❌ Connection {connection.id} disconnected")

    async def send_message(self, connection_id: str, message: dict) -> bool:
        """Send message to specific connection"""
        if connection_id not in self.active_connections:
            return False

        websocket = self.active_connections[connection_id]
        try:
            await websocket.send_text(json.dumps(message))
            return True
        except Exception as e:
            logger.error(f"❌ Failed to send message to {connection_id}: {e}")
            return False

    def check_rate_limit(self, connection: Connection) -> bool:
        """Check if connection is within rate limits"""
        allowed, remaining = self.rate_limiter.is_allowed(connection.id)
        if not allowed:
            logger.warning(f"🚫 Rate limit exceeded for connection {connection.id}")
        return allowed

    def get_websocket(self, connection_id: str) -> Optional[WebSocket]:
        """Get WebSocket for connection ID"""
        return self.active_connections.get(connection_id)
