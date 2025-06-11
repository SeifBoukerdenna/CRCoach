"""
server/handlers/websocket_handlers.py - Enhanced for single viewer enforcement
"""

import json
import uuid
import time
from datetime import datetime
from typing import Tuple, Optional
from fastapi import WebSocket
from models.session import Session
from services.session_manager import SessionManager
from services.frame_capture import get_frame_capture_service
from api.inference_routes import session_inference_states

async def send_error(ws: WebSocket, message: str):
    """Send error message to client"""
    try:
        error_msg = {
            'type': 'error',
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'server_timestamp': time.time() * 1000
        }
        await ws.send_text(json.dumps(error_msg))
        print(f"❌ Sent error to client: {message}")
    except Exception as e:
        print(f"❌ Failed to send error message: {e}")

async def handle_connect(ws: WebSocket, msg: dict, session_manager: SessionManager) -> Tuple[Optional[Session], Optional[str]]:
    """Handle connection request with STRICT single viewer enforcement"""
    session_code = msg.get('sessionCode')
    role = msg.get('role')
    client_timestamp = msg.get('timestamp', time.time() * 1000)
    server_receive_time = time.time() * 1000

    print(f"🔌 Connection request: session={session_code}, role={role}")

    signaling_latency = server_receive_time - client_timestamp if client_timestamp else 0
    print(f"📊 Signaling latency: {signaling_latency:.1f}ms")

    if not session_code or not role:
        await send_error(ws, 'Missing sessionCode or role')
        return None, None

    if not session_code.isdigit() or len(session_code) != 4:
        await send_error(ws, 'Session code must be 4 digits')
        return None, None

    if role not in ['broadcaster', 'viewer']:
        await send_error(ws, 'Role must be broadcaster or viewer')
        return None, None

    # Get or create session with SINGLE VIEWER LIMIT
    current_session = session_manager.create_session(session_code, max_viewers=1)
    current_session.connection_attempts += 1

    # Set WebSocket connection info
    connection_id = getattr(ws, 'connection_id', str(uuid.uuid4())[:8])
    ws.connection_id = connection_id
    ws.connect_time = server_receive_time
    ws.signaling_latency = signaling_latency
    ws.connection_attempts = getattr(ws, 'connection_attempts', 0) + 1
    ws.role = role

    success = False

    if role == 'broadcaster':
        if current_session.broadcaster is not None:
            await send_error(ws, f'Session {session_code} already has a broadcaster')
            return None, None

        success = await current_session.add_broadcaster(ws)

        if success:
            # Notify the single viewer (if any) that broadcaster joined
            if current_session.viewers:
                broadcaster_joined_msg = {
                    'type': 'broadcaster_joined',
                    'sessionCode': session_code,
                    'timestamp': datetime.now().isoformat()
                }
                await current_session.broadcast_to_viewers(broadcaster_joined_msg)
                print(f"📢 Notified single viewer that broadcaster {connection_id} joined")

    elif role == 'viewer':
        # STRICT SINGLE VIEWER ENFORCEMENT
        if len(current_session.viewers) >= 1:
            error_msg = f'Session {session_code} already has a viewer! Only one viewer allowed per broadcast.'
            print(f"❌ REJECTED: {error_msg}")
            await send_error(ws, error_msg)
            return None, None

        success = await current_session.add_viewer(ws)

        if not success:
            await send_error(ws, f'Failed to join session {session_code} - session may be full')
            return None, None

        # Request broadcaster to create offer for this viewer
        if current_session.broadcaster is not None:
            print(f"🎥 Requesting offer for single viewer {connection_id}")

            request_offer_msg = {
                'type': 'request_viewer_offer',
                'viewer_id': connection_id,
                'sessionCode': session_code,
                'timestamp': time.time() * 1000
            }

            try:
                await current_session.broadcaster.send_text(json.dumps(request_offer_msg))
                print(f"✅ Requested offer from broadcaster for single viewer {connection_id}")
            except Exception as e:
                print(f"❌ Failed to request offer: {e}")

    if success:
        response = {
            'type': 'connected',
            'sessionCode': session_code,
            'role': role,
            'viewerCount': len(current_session.viewers),
            'maxViewers': 1,  # Always 1 for single viewer sessions
            'hasBroadcaster': current_session.broadcaster is not None,
            'timestamp': datetime.now().isoformat(),
            'connectionId': connection_id,
            'server_timestamp': time.time() * 1000,
            'signaling_latency': signaling_latency,
            'inference_enabled': session_inference_states.get(session_code, False),
            'single_viewer_session': True,  # Flag indicating single viewer limit
            'session_available_for_viewers': current_session.is_available_for_viewer(),
            'latency_info': {
                'client_timestamp': client_timestamp,
                'server_receive_time': server_receive_time,
                'signaling_latency_ms': signaling_latency
            }
        }

        await ws.send_text(json.dumps(response))
        print(f"✅ {role} {connection_id} connected - Single viewer session: {len(current_session.viewers)}/1")

    return current_session, role

async def handle_signaling(current_session: Session, ws: WebSocket, msg: dict):
    """Enhanced signaling handler optimized for single viewer"""
    if not current_session:
        await send_error(ws, 'Not in a session')
        return

    msg_type = msg.get('type', 'unknown')
    role = getattr(ws, 'role', 'unknown')
    connection_id = getattr(ws, 'connection_id', 'unknown')

    # Add timing and connection info
    msg['server_timestamp'] = time.time() * 1000
    msg['connection_id'] = connection_id

    print(f"🔄 {msg_type} from {role} {connection_id} (Single Viewer Session)")

    if msg_type == 'offer':
        # Broadcaster sending offer to the single viewer
        target_viewer_id = msg.get('target_viewer_id') or msg.get('for_viewer')

        if target_viewer_id and current_session.viewers:
            # Send to specific viewer (should be the only one)
            target_viewer = current_session.get_viewer_by_id(target_viewer_id)
            if target_viewer:
                try:
                    await target_viewer.send_text(json.dumps(msg))
                    print(f"✅ Offer sent to single viewer {target_viewer_id}")
                except Exception as e:
                    print(f"❌ Failed to send offer to single viewer {target_viewer_id}: {e}")
                    await current_session.remove_viewer(target_viewer)
            else:
                print(f"❌ Single viewer {target_viewer_id} not found")
        elif current_session.viewers:
            # Send to the single viewer (fallback)
            viewer = current_session.viewers[0]
            try:
                await viewer.send_text(json.dumps(msg))
                print(f"✅ Offer sent to single viewer")
            except Exception as e:
                viewer_id = getattr(viewer, 'connection_id', 'unknown')
                print(f"❌ Failed to send offer to single viewer {viewer_id}: {e}")
                await current_session.remove_viewer(viewer)
        else:
            print(f"❌ No viewer to receive offer")

    elif msg_type == 'answer':
        # Single viewer sending answer
        msg['from_viewer_id'] = connection_id

        if current_session.broadcaster:
            try:
                await current_session.broadcaster.send_text(json.dumps(msg))
                print(f"✅ Answer from single viewer {connection_id} sent to broadcaster")
            except Exception as e:
                print(f"❌ Failed to send answer to broadcaster: {e}")
                await current_session.remove_broadcaster()

    elif msg_type == 'ice':
        # Route ICE candidates between broadcaster and single viewer
        if role == 'broadcaster':
            # Send to single viewer
            target_viewer_id = msg.get('target_viewer_id')

            if target_viewer_id and current_session.viewers:
                target_viewer = current_session.get_viewer_by_id(target_viewer_id)
                if target_viewer:
                    try:
                        await target_viewer.send_text(json.dumps(msg))
                        print(f"✅ ICE sent to single viewer {target_viewer_id}")
                    except Exception as e:
                        print(f"❌ Failed to send ICE to single viewer {target_viewer_id}: {e}")
                        await current_session.remove_viewer(target_viewer)
            elif current_session.viewers:
                # Send to the single viewer (fallback)
                viewer = current_session.viewers[0]
                try:
                    await viewer.send_text(json.dumps(msg))
                    print(f"✅ ICE sent to single viewer")
                except Exception as e:
                    viewer_id = getattr(viewer, 'connection_id', 'unknown')
                    print(f"❌ Failed to send ICE to single viewer {viewer_id}: {e}")
                    await current_session.remove_viewer(viewer)

        elif role == 'viewer':
            # Send to broadcaster
            msg['from_viewer_id'] = connection_id
            if current_session.broadcaster:
                try:
                    await current_session.broadcaster.send_text(json.dumps(msg))
                    print(f"✅ ICE from single viewer {connection_id} sent to broadcaster")
                except Exception as e:
                    print(f"❌ Failed to send ICE to broadcaster: {e}")
                    await current_session.remove_broadcaster()

async def handle_ping(ws: WebSocket):
    """Handle ping message"""
    connection_id = getattr(ws, 'connection_id', 'unknown')
    role = getattr(ws, 'role', 'unknown')
    server_time = time.time() * 1000

    pong_msg = {
        'type': 'pong',
        'timestamp': datetime.now().isoformat(),
        'connectionId': connection_id,
        'role': role,
        'server_timestamp': server_time,
        'single_viewer_session': True
    }

    try:
        await ws.send_text(json.dumps(pong_msg))
    except Exception as e:
        print(f"❌ Failed to send pong to {connection_id}: {e}")

async def handle_frame_timing(ws: WebSocket, msg: dict, session_manager: SessionManager):
    """Handle frame timing for latency measurement"""
    frame_id = msg.get('frameId')
    capture_timestamp = msg.get('captureTimestamp')
    display_timestamp = msg.get('displayTimestamp')
    session_code = msg.get('sessionCode')

    if not all([frame_id, capture_timestamp, display_timestamp, session_code]):
        return

    end_to_end_latency = display_timestamp - capture_timestamp

    current_session = session_manager.get_session(session_code)
    if current_session:
        if not hasattr(current_session, 'latency_data'):
            current_session.latency_data = []

        connection_id = getattr(ws, 'connection_id', 'unknown')
        role = getattr(ws, 'role', 'unknown')

        latency_record = {
            'frame_id': frame_id,
            'capture_timestamp': capture_timestamp,
            'display_timestamp': display_timestamp,
            'end_to_end_latency': end_to_end_latency,
            'role': role,
            'connection_id': connection_id,
            'server_timestamp': time.time() * 1000,
            'single_viewer_session': True
        }

        current_session.latency_data.append(latency_record)
        if len(current_session.latency_data) > 100:
            current_session.latency_data = current_session.latency_data[-100:]

async def handle_frame_data(ws: WebSocket, msg: dict):
    """Handle frame data for inference"""
    session_code = msg.get('sessionCode')
    frame_data = msg.get('frameData')

    if not session_code or not frame_data:
        return

    from services.frame_capture import get_frame_capture_service
    frame_capture_service = get_frame_capture_service()
    await frame_capture_service.update_frame(session_code, frame_data)

async def handle_disconnect(current_session: Session, ws: WebSocket, session_manager: SessionManager):
    """Handle connection cleanup with single viewer awareness"""
    if not current_session:
        return

    role = getattr(ws, 'role', 'unknown')
    connection_id = getattr(ws, 'connection_id', 'unknown')

    print(f"🧹 Cleaning up {role} {connection_id} from single viewer session")

    if role == 'broadcaster':
        await current_session.remove_broadcaster()

        # Notify the single viewer (if any)
        if current_session.viewers:
            disconnect_msg = {
                'type': 'broadcaster_disconnected',
                'sessionCode': current_session.session_code,
                'timestamp': datetime.now().isoformat(),
                'single_viewer_session': True
            }
            await current_session.broadcast_to_viewers(disconnect_msg)
            print(f"📢 Notified single viewer of broadcaster disconnect")

    elif role == 'viewer':
        await current_session.remove_viewer(ws)
        print(f"👥 Single viewer {connection_id} disconnected - session now available for new viewer")

    # Remove empty session
    if current_session.is_empty():
        print(f"🗑️ Removing empty single viewer session {current_session.session_code}")
        session_manager.remove_session(current_session.session_code)

async def get_session_latency_stats(session_code: str, session_manager: SessionManager) -> dict:
    """Get latency statistics for a single viewer session"""
    current_session = session_manager.get_session(session_code)
    if not current_session or not hasattr(current_session, 'latency_data'):
        return {
            'session_code': session_code,
            'total_frames': 0,
            'average_latency': 0,
            'min_latency': 0,
            'max_latency': 0,
            'recent_latencies': [],
            'viewer_count': 0,
            'max_viewers': 1,
            'single_viewer_session': True
        }

    latencies = [record['end_to_end_latency'] for record in current_session.latency_data]

    return {
        'session_code': session_code,
        'total_frames': len(latencies),
        'average_latency': sum(latencies) / len(latencies) if latencies else 0,
        'min_latency': min(latencies) if latencies else 0,
        'max_latency': max(latencies) if latencies else 0,
        'recent_latencies': latencies[-20:],
        'viewer_count': len(current_session.viewers),
        'max_viewers': 1,
        'has_broadcaster': current_session.broadcaster is not None,
        'single_viewer_session': True,
        'available_for_viewer': current_session.is_available_for_viewer()
    }