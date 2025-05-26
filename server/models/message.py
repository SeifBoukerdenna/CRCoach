from typing import Any, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class MessageType(str, Enum):
    """WebRTC message types"""
    CONNECT = "connect"
    CONNECTED = "connected"
    OFFER = "offer"
    ANSWER = "answer"
    ICE = "ice"
    PING = "ping"
    PONG = "pong"
    ERROR = "error"
    BROADCASTER_DISCONNECTED = "broadcaster_disconnected"

class WebRTCMessage(BaseModel):
    """Base WebRTC message model"""
    type: MessageType
    timestamp: datetime = Field(default_factory=datetime.now)
    session_code: Optional[str] = None
    connection_id: Optional[str] = None

    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

class ConnectMessage(WebRTCMessage):
    """Connection request message"""
    type: MessageType = MessageType.CONNECT
    role: ConnectionRole
    metadata: Dict[str, Any] = Field(default_factory=dict)

class SignalingMessage(WebRTCMessage):
    """WebRTC signaling message (offer/answer/ice)"""
    sdp: Optional[str] = None
    candidate: Optional[str] = None
    sdp_mid: Optional[str] = None
    sdp_mline_index: Optional[int] = None

class ErrorMessage(WebRTCMessage):
    """Error message"""
    type: MessageType = MessageType.ERROR
    message: str
    code: Optional[str] = None
