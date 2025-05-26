import json
import uuid
from datetime import datetime
from typing import Tuple, Optional
from fastapi import WebSocket
from models.session import Session
from services.session_manager import SessionManager

async def send_error(ws: WebSocket, message: str):
    """Send error message to client"""
    try:
        error_msg = {
            'type': 'error',
            'message': message,
            'timestamp': datetime.now().isoformat()
        }
        await ws.send_text(json.dumps(error_msg))
        print(f"❌ Sent error to client: {message}")
    except Exception as e:
        print(f"❌ Failed to send error message: {e}")

async def handle_connect(ws: WebSocket, msg: dict, session_manager: SessionManager) -> Tuple[Optional[Session], Optional[str]]:
    """Handle connection request"""
    session_code = msg.get('sessionCode')
    role = msg.get('role')

    print(f"🔌 Connection request: session={session_code}, role={role}")

    if not session_code or not role:
        await send_error(ws, 'Missing sessionCode or role')
        return None, None

    if not session_code.isdigit() or len(session_code) != 4:
        await send_error(ws, 'Session code must be 4 digits')
        return None, None

    if role not in ['broadcaster', 'viewer']:
        await send_error(ws, 'Role must be broadcaster or viewer')
        return None, None

    # Create session if it doesn't exist
    current_session = session_manager.create_session(session_code)
    current_session.connection_attempts += 1

    success = False
    if role == 'broadcaster':
        await current_session.add_broadcaster(ws)
        success = True
    elif role == 'viewer':
        success = await current_session.add_viewer(ws)

    if success:
        response = {
            'type': 'connected',
            'sessionCode': session_code,
            'role': role,
            'viewerCount': len(current_session.viewers),
            'maxViewers': current_session.max_viewers,
            'timestamp': datetime.now().isoformat(),
            'connectionId': getattr(ws, 'connection_id', 'unknown')
        }

        await ws.send_text(json.dumps(response))
        print(f"✅ {role} connected to session {session_code} - sent response: {response}")

    return current_session, role

async def handle_signaling(current_session: Session, ws: WebSocket, msg: dict):
    """Handle WebRTC signaling messages"""
    if not current_session:
        await send_error(ws, 'Not in a session')
        return

    msg_type = msg.get('type', 'unknown')
    role = getattr(ws, 'role', 'unknown')

    print(f"🔄 Handling {msg_type} from {role} in session {current_session.session_code}")

    # Log detailed message info
    if msg_type == 'offer':
        sdp = msg.get('sdp', '')
        print(f"📤 Offer SDP length: {len(sdp)} chars")
        if 'video' in sdp.lower():
            print("✅ SDP contains video")
        if 'audio' in sdp.lower():
            print("✅ SDP contains audio")
    elif msg_type == 'answer':
        sdp = msg.get('sdp', '')
        print(f"📤 Answer SDP length: {len(sdp)} chars")
    elif msg_type == 'ice':
        candidate = msg.get('candidate', '')
        print(f"🧊 ICE candidate: {candidate[:50]}...")

    # Forward immediately
    await current_session.broadcast_message(msg, ws)

async def handle_ping(ws: WebSocket):
    """Handle ping message"""
    connection_id = getattr(ws, 'connection_id', 'unknown')
    pong_msg = {
        'type': 'pong',
        'timestamp': datetime.now().isoformat(),
        'connectionId': connection_id
    }
    await ws.send_text(json.dumps(pong_msg))
    print(f"🏓 Pong sent to {connection_id}")

async def handle_disconnect(current_session: Session, ws: WebSocket, session_manager: SessionManager):
    """Handle connection cleanup"""
    if not current_session:
        return

    role = getattr(ws, 'role', 'unknown')
    connection_id = getattr(ws, 'connection_id', 'unknown')

    print(f"🧹 Cleaning up {role} connection {connection_id} from session {current_session.session_code}")

    # Only clean up once
    if role == 'broadcaster' and current_session.broadcaster == ws:
        await current_session.remove_broadcaster()
    elif role == 'viewer' and ws in current_session.viewers:
        await current_session.remove_viewer(ws)

    # Clean up empty sessions
    if current_session.is_empty():
        session_manager.remove_session(current_session.session_code)
