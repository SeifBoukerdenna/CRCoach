"""
server/handlers/websocket_handlers.py - Fixed for multiple viewers support
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
    """Handle connection request with enhanced multiple viewer support"""
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

    # Get or create session
    current_session = session_manager.create_session(session_code)
    current_session.connection_attempts += 1

    # Set WebSocket connection info
    connection_id = getattr(ws, 'connection_id', str(uuid.uuid4())[:8])
    ws.connection_id = connection_id
    ws.connect_time = server_receive_time
    ws.signaling_latency = signaling_latency
    ws.connection_attempts = getattr(ws, 'connection_attempts', 0) + 1

    success = False

    if role == 'broadcaster':
        # Only allow one broadcaster per session
        if current_session.broadcaster is not None:
            await send_error(ws, f'Session {session_code} already has a broadcaster')
            return None, None

        success = await current_session.add_broadcaster(ws)

        if success:
            # If inference is enabled, start frame capture
            if session_inference_states.get(session_code, False):
                frame_capture_service = get_frame_capture_service()
                await frame_capture_service.start_capture(session_code, fps=5.0)

    elif role == 'viewer':
        # Allow multiple viewers up to the limit
        success = await current_session.add_viewer(ws)

        if not success:
            if len(current_session.viewers) >= current_session.max_viewers:
                await send_error(ws, f'Session {session_code} is at maximum viewer capacity ({current_session.max_viewers})')
            else:
                await send_error(ws, f'Failed to join session {session_code}')
            return None, None

    if success:
        # Send connection confirmation
        response = {
            'type': 'connected',
            'sessionCode': session_code,
            'role': role,
            'viewerCount': len(current_session.viewers),
            'maxViewers': current_session.max_viewers,
            'hasBroadcaster': current_session.broadcaster is not None,
            'timestamp': datetime.now().isoformat(),
            'connectionId': connection_id,
            'server_timestamp': time.time() * 1000,
            'signaling_latency': signaling_latency,
            'inference_enabled': session_inference_states.get(session_code, False),
            'latency_info': {
                'client_timestamp': client_timestamp,
                'server_receive_time': server_receive_time,
                'signaling_latency_ms': signaling_latency
            },
            'session_stats': {
                'total_viewers_ever': current_session.total_viewers_ever,
                'session_uptime': (datetime.now() - current_session.created_at).total_seconds()
            }
        }

        await ws.send_text(json.dumps(response))
        print(f"✅ {role} {connection_id} connected to session {session_code} - viewers: {len(current_session.viewers)}/{current_session.max_viewers}")

        # For viewers joining an existing session with broadcaster
        if role == 'viewer' and current_session.broadcaster is not None:
            print(f"🎥 Viewer {connection_id} joining active broadcast in session {session_code}")

    return current_session, role

async def handle_signaling(current_session: Session, ws: WebSocket, msg: dict):
    """Handle WebRTC signaling messages with enhanced multi-viewer support"""
    if not current_session:
        await send_error(ws, 'Not in a session')
        return

    msg_type = msg.get('type', 'unknown')
    role = getattr(ws, 'role', 'unknown')
    connection_id = getattr(ws, 'connection_id', 'unknown')
    server_receive_time = time.time() * 1000
    client_timestamp = msg.get('timestamp', server_receive_time)

    # Add server timing info
    msg['server_receive_time'] = server_receive_time
    msg['server_forward_time'] = time.time() * 1000
    msg['signaling_hop_latency'] = server_receive_time - client_timestamp if client_timestamp else 0
    msg['connection_id'] = connection_id

    print(f"🔄 Handling {msg_type} from {role} {connection_id} in session {current_session.session_code}")

    # Enhanced logging for debugging
    if msg_type == 'offer':
        sdp = msg.get('sdp', '')
        hop_latency = msg.get('signaling_hop_latency', 0)
        print(f"📤 Offer from broadcaster - SDP length: {len(sdp)} chars, latency: {hop_latency:.1f}ms")
        if 'video' in sdp.lower():
            print("✅ SDP contains video track")
        if 'audio' in sdp.lower():
            print("✅ SDP contains audio track")

        # Log viewer count when offer is sent
        print(f"📊 Broadcasting offer to {len(current_session.viewers)} viewers")

    elif msg_type == 'answer':
        sdp = msg.get('sdp', '')
        hop_latency = msg.get('signaling_hop_latency', 0)
        print(f"📤 Answer from viewer {connection_id} - SDP length: {len(sdp)} chars, latency: {hop_latency:.1f}ms")

    elif msg_type == 'ice':
        candidate = msg.get('candidate', '')
        hop_latency = msg.get('signaling_hop_latency', 0)
        print(f"🧊 ICE from {role} {connection_id}: {candidate[:50]}..., latency: {hop_latency:.1f}ms")

    # Broadcast the signaling message
    try:
        await current_session.broadcast_message(msg, ws)

        # Log successful broadcast
        if role == 'broadcaster':
            print(f"✅ Signaling message broadcast to {len(current_session.viewers)} viewers")
        elif role == 'viewer':
            print(f"✅ Signaling message sent to broadcaster")

    except Exception as e:
        print(f"❌ Error broadcasting signaling message: {e}")
        await send_error(ws, f'Failed to relay {msg_type} message')

async def handle_frame_data(ws: WebSocket, msg: dict):
    """Handle frame data for inference"""
    session_code = msg.get('sessionCode')
    frame_data = msg.get('frameData')  # base64 encoded frame

    if not session_code or not frame_data:
        print("⚠️ Incomplete frame data received")
        return

    # Update frame capture service with latest frame
    frame_capture_service = get_frame_capture_service()
    await frame_capture_service.update_frame(session_code, frame_data)

    # Don't log every frame to avoid spam
    if hasattr(handle_frame_data, 'last_log_time'):
        if time.time() - handle_frame_data.last_log_time > 5:  # Log every 5 seconds
            print(f"🎞️ Frame data updated for session {session_code}")
            handle_frame_data.last_log_time = time.time()
    else:
        handle_frame_data.last_log_time = time.time()
        print(f"🎞️ Frame data updated for session {session_code}")

async def handle_ping(ws: WebSocket):
    """Handle ping message with enhanced latency tracking"""
    connection_id = getattr(ws, 'connection_id', 'unknown')
    role = getattr(ws, 'role', 'unknown')
    server_time = time.time() * 1000

    pong_msg = {
        'type': 'pong',
        'timestamp': datetime.now().isoformat(),
        'connectionId': connection_id,
        'role': role,
        'server_timestamp': server_time,
        'latency_info': {
            'server_receive_time': server_time,
            'server_send_time': time.time() * 1000
        }
    }

    try:
        await ws.send_text(json.dumps(pong_msg))
        # Only log pings occasionally to avoid spam
        if not hasattr(handle_ping, 'last_log_time') or time.time() - handle_ping.last_log_time > 30:
            print(f"🏓 Pong sent to {role} {connection_id}")
            handle_ping.last_log_time = time.time()
    except Exception as e:
        print(f"❌ Failed to send pong to {connection_id}: {e}")

async def handle_frame_timing(ws: WebSocket, msg: dict, session_manager: SessionManager):
    """Handle frame timing messages for end-to-end latency tracking"""
    frame_id = msg.get('frameId')
    capture_timestamp = msg.get('captureTimestamp')
    display_timestamp = msg.get('displayTimestamp')
    session_code = msg.get('sessionCode')

    if not all([frame_id, capture_timestamp, display_timestamp, session_code]):
        print("⚠️ Incomplete frame timing data received")
        return

    end_to_end_latency = display_timestamp - capture_timestamp
    server_process_time = time.time() * 1000

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
            'server_process_time': server_process_time,
            'role': role,
            'connection_id': connection_id
        }

        current_session.latency_data.append(latency_record)

        # Keep only last 100 measurements
        if len(current_session.latency_data) > 100:
            current_session.latency_data = current_session.latency_data[-100:]

        recent_latencies = [record['end_to_end_latency'] for record in current_session.latency_data[-10:]]
        avg_latency = sum(recent_latencies) / len(recent_latencies) if recent_latencies else 0

        # Only log occasionally to avoid spam
        if not hasattr(handle_frame_timing, 'last_log_time') or time.time() - handle_frame_timing.last_log_time > 10:
            print(f"📊 Frame timing from {role} {connection_id} - E2E: {end_to_end_latency:.1f}ms, Avg: {avg_latency:.1f}ms")
            handle_frame_timing.last_log_time = time.time()

        # Broadcast latency update to all participants
        latency_update = {
            'type': 'latency_update',
            'session_code': session_code,
            'frame_id': frame_id,
            'end_to_end_latency': end_to_end_latency,
            'average_latency': avg_latency,
            'min_latency': min(recent_latencies) if recent_latencies else 0,
            'max_latency': max(recent_latencies) if recent_latencies else 0,
            'total_frames': len(current_session.latency_data),
            'reporting_viewer': connection_id,
            'server_timestamp': server_process_time
        }

        # Broadcast to all participants except sender
        await current_session.broadcast_message(latency_update, ws, exclude_sender=True)

async def handle_disconnect(current_session: Session, ws: WebSocket, session_manager: SessionManager):
    """Handle connection cleanup with frame capture cleanup"""
    if not current_session:
        return

    role = getattr(ws, 'role', 'unknown')
    connection_id = getattr(ws, 'connection_id', 'unknown')
    connect_time = getattr(ws, 'connect_time', time.time() * 1000)
    disconnect_time = time.time() * 1000
    session_duration = disconnect_time - connect_time

    print(f"🧹 Cleaning up {role} {connection_id} from session {current_session.session_code}")
    print(f"📊 Session duration: {session_duration:.1f}ms")

    # Handle role-specific cleanup
    if role == 'broadcaster':
        # Stop frame capture if broadcaster disconnects
        frame_capture_service = get_frame_capture_service()
        await frame_capture_service.stop_capture(current_session.session_code)

        await current_session.remove_broadcaster()
        print(f"🎥 Broadcaster {connection_id} removed from session {current_session.session_code}")

    elif role == 'viewer':
        await current_session.remove_viewer(ws)
        print(f"👥 Viewer {connection_id} removed from session {current_session.session_code}")

    # Log final latency stats if available
    if hasattr(current_session, 'latency_data') and current_session.latency_data:
        # Filter latency data for this specific connection
        connection_latencies = [
            record['end_to_end_latency']
            for record in current_session.latency_data
            if record.get('connection_id') == connection_id
        ]

        if connection_latencies:
            avg_latency = sum(connection_latencies) / len(connection_latencies)
            min_latency = min(connection_latencies)
            max_latency = max(connection_latencies)
            print(f"📊 Final latency stats for {connection_id} - Avg: {avg_latency:.1f}ms, Min: {min_latency:.1f}ms, Max: {max_latency:.1f}ms, Frames: {len(connection_latencies)}")

    # Remove empty session
    if current_session.is_empty():
        session_manager.remove_session(current_session.session_code)
        print(f"🗑️ Empty session {current_session.session_code} removed")

async def get_session_latency_stats(session_code: str, session_manager: SessionManager) -> dict:
    """Get latency statistics for a session"""
    current_session = session_manager.get_session(session_code)
    if not current_session or not hasattr(current_session, 'latency_data'):
        return {
            'session_code': session_code,
            'total_frames': 0,
            'average_latency': 0,
            'min_latency': 0,
            'max_latency': 0,
            'recent_latencies': [],
            'viewer_count': 0
        }

    latencies = [record['end_to_end_latency'] for record in current_session.latency_data]
    recent_latencies = latencies[-20:]

    # Get per-viewer stats
    viewer_stats = {}
    for record in current_session.latency_data:
        conn_id = record.get('connection_id', 'unknown')
        if conn_id not in viewer_stats:
            viewer_stats[conn_id] = []
        viewer_stats[conn_id].append(record['end_to_end_latency'])

    return {
        'session_code': session_code,
        'total_frames': len(latencies),
        'average_latency': sum(latencies) / len(latencies) if latencies else 0,
        'min_latency': min(latencies) if latencies else 0,
        'max_latency': max(latencies) if latencies else 0,
        'recent_latencies': recent_latencies,
        'p50_latency': sorted(latencies)[len(latencies)//2] if latencies else 0,
        'p95_latency': sorted(latencies)[int(len(latencies)*0.95)] if latencies else 0,
        'p99_latency': sorted(latencies)[int(len(latencies)*0.99)] if latencies else 0,
        'viewer_count': len(current_session.viewers),
        'max_viewers': current_session.max_viewers,
        'has_broadcaster': current_session.broadcaster is not None,
        'viewer_stats': {
            conn_id: {
                'average_latency': sum(latencies) / len(latencies),
                'frame_count': len(latencies)
            }
            for conn_id, latencies in viewer_stats.items()
        }
    }