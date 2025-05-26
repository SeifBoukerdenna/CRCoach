import re
from typing import Dict, Any, Optional

def validate_session_code(session_code: str) -> bool:
    """Validate session code format"""
    if not session_code:
        return False

    # Must be exactly 4 digits
    return bool(re.match(r'^\d{4}'
, session_code))

def validate_role(role: str) -> bool:
    """Validate connection role"""
    return role in ['broadcaster', 'viewer']

def validate_message(message: Dict[str, Any]) -> bool:
    """Validate message format"""
    if not isinstance(message, dict):
        return False

    # Must have type field
    if 'type' not in message:
        return False

    message_type = message['type']

    # Validate based on message type
    if message_type == 'connect':
        return all(key in message for key in ['sessionCode', 'role'])

    elif message_type in ['offer', 'answer']:
        return 'sdp' in message

    elif message_type == 'ice':
        return all(key in message for key in ['candidate', 'sdpMLineIndex', 'sdpMid'])

    elif message_type == 'ping':
        return True

    return False

def validate_ip_address(ip: str) -> bool:
    """Validate IP address format"""
    if not ip:
        return False

    # Simple IPv4/IPv6 validation
    parts = ip.split('.')
    if len(parts) == 4:
        # IPv4
        try:
            return all(0 <= int(part) <= 255 for part in parts)
        except ValueError:
            return False

    # IPv6 (basic check)
    return ':' in ip and len(ip.split(':')) >= 3
