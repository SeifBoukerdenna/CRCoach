"""
server/api/websocket.py - Fixed WebSocket handler with better connection management
"""

import json
import uuid
import time
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from handlers.websocket_handlers import (
    handle_connect,
    handle_signaling,
    handle_ping,
    handle_disconnect,
    handle_frame_timing,
    handle_frame_data,
    send_error
)
from api.routes import session_manager
from core.config import Config

async def websocket_endpoint(websocket: WebSocket, session_code: str):
    """Enhanced WebSocket handler with improved error handling and connection management"""
    await websocket.accept()

    # Generate unique connection ID
    connection_id = str(uuid.uuid4())[:8]
    websocket.connection_id = connection_id
    websocket.is_alive = True
    websocket.messages_sent = 0
    websocket.connect_time = time.time() * 1000
    websocket.connection_attempts = 0

    current_session = None
    role = None

    print(f"🔌 New WebSocket connection (ID: {connection_id}) for session {session_code}")

    try:
        # Set up ping interval to keep connection alive
        ping_task = asyncio.create_task(ping_loop(websocket, connection_id))

        async for data in websocket.iter_text():
            websocket.is_alive = True
            message_receive_time = time.time() * 1000

            try:
                msg = json.loads(data)

                # Basic rate limiting
                websocket.messages_sent += 1
                if websocket.messages_sent > 2000:  # Increased limit
                    await send_error(websocket, 'Rate limit exceeded')
                    break

                # Add server timing info
                msg['server_receive_time'] = message_receive_time
                message_type = msg.get('type')

                # Don't log frame_data and ping messages to avoid spam
                if message_type not in ['frame_data', 'ping']:
                    print(f"📨 Received: {message_type} from {role or 'unknown'} ({connection_id})")

                if message_type == 'connect':
                    # Handle initial connection
                    current_session, role = await handle_connect(websocket, msg, session_manager)

                    if not current_session or not role:
                        print(f"❌ Connection failed for {connection_id}")
                        break

                    print(f"✅ {role} {connection_id} successfully connected to session {session_code}")

                elif message_type in ['offer', 'answer', 'ice']:
                    # Handle WebRTC signaling
                    if not current_session:
                        await send_error(websocket, 'Must connect to session first')
                        continue

                    await handle_signaling(current_session, websocket, msg)
                    websocket.messages_sent += 1

                elif message_type == 'ping':
                    # Handle keep-alive ping
                    await handle_ping(websocket)

                elif message_type == 'frame_timing':
                    # Handle latency measurement
                    if not current_session:
                        await send_error(websocket, 'Must connect to session first')
                        continue

                    await handle_frame_timing(websocket, msg, session_manager)

                elif message_type == 'frame_data':
                    # Handle frame data for inference - ALLOW BOTH BROADCASTERS AND VIEWERS
                    if role not in ['broadcaster', 'viewer']:
                        await send_error(websocket, 'Only broadcasters and viewers can send frame data')
                        continue

                    # Viewers send frame data for AI inference, broadcasters send for streaming
                    await handle_frame_data(websocket, msg)

                elif message_type == 'latency_test':
                    # Handle latency test request
                    client_timestamp = msg.get('timestamp', message_receive_time)
                    latency_response = {
                        'type': 'latency_response',
                        'client_timestamp': client_timestamp,
                        'server_receive_time': message_receive_time,
                        'server_send_time': time.time() * 1000,
                        'connection_id': connection_id,
                        'role': role,
                        'round_trip_start': client_timestamp
                    }
                    await websocket.send_text(json.dumps(latency_response))

                elif message_type == 'canvas_frame':
                    # Handle canvas frame data from React client - ALLOW VIEWERS
                    if role not in ['broadcaster', 'viewer']:
                        await send_error(websocket, 'Only broadcasters and viewers can send canvas frames')
                        continue

                    frame_data = msg.get('frameData')
                    if frame_data and current_session:
                        await handle_frame_data(websocket, {
                            'sessionCode': session_code,
                            'frameData': frame_data,
                            'timestamp': message_receive_time
                        })

                elif message_type == 'viewer_status_request':
                    # Handle viewer status request
                    if current_session:
                        status_response = {
                            'type': 'viewer_status_response',
                            'session_code': session_code,
                            'viewer_count': len(current_session.viewers),
                            'max_viewers': current_session.max_viewers,
                            'has_broadcaster': current_session.broadcaster is not None,
                            'webrtc_established': current_session.webrtc_established,
                            'your_role': role,
                            'your_connection_id': connection_id,
                            'session_uptime': (current_session.last_activity - current_session.created_at).total_seconds(),
                            'timestamp': time.time() * 1000
                        }
                        await websocket.send_text(json.dumps(status_response))

                else:
                    print(f"❓ Unknown message type: {message_type} from {connection_id}")
                    await send_error(websocket, f'Unknown message type: {message_type}')

            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error from {connection_id}: {e}")
                await send_error(websocket, 'Invalid JSON format')
            except Exception as e:
                print(f"❌ Error handling message from {connection_id}: {e}")
                await send_error(websocket, 'Internal server error')

    except WebSocketDisconnect:
        print(f"🔌❌ Connection {connection_id} disconnected normally")
    except Exception as e:
        print(f"❌ WebSocket error from {connection_id}: {e}")
    finally:
        # Cancel ping task
        if 'ping_task' in locals():
            ping_task.cancel()
            try:
                await ping_task
            except asyncio.CancelledError:
                pass

        # Cleanup
        disconnect_time = time.time() * 1000
        session_duration = disconnect_time - websocket.connect_time

        print(f"🧹 Starting cleanup for {role or 'unknown'} {connection_id} (duration: {session_duration:.1f}ms)")

        if current_session:
            await handle_disconnect(current_session, websocket, session_manager)

        print(f"✅ Cleanup completed for {connection_id}")

        # Log final session state if it still exists
        if current_session and current_session.session_code in session_manager.sessions:
            remaining_session = session_manager.get_session(current_session.session_code)
            if remaining_session:
                print(f"📊 Session {session_code} after cleanup: {len(remaining_session.viewers)} viewers, "
                      f"broadcaster: {'✅' if remaining_session.broadcaster else '❌'}")
            else:
                print(f"📊 Session {session_code} was removed during cleanup")

async def ping_loop(websocket: WebSocket, connection_id: str):
    """Send periodic pings to keep WebSocket connection alive - STABLE VERSION"""
    try:
        while True:
            # Use Config.PING_INTERVAL (now 30 seconds) for stable connections
            await asyncio.sleep(Config.PING_INTERVAL)

            if hasattr(websocket, 'is_alive') and websocket.is_alive:
                try:
                    ping_msg = {
                        'type': 'server_ping',
                        'timestamp': time.time() * 1000,
                        'connection_id': connection_id,
                        'interval': Config.PING_INTERVAL  # Let client know our interval
                    }
                    await websocket.send_text(json.dumps(ping_msg))

                    # Only log occasionally to avoid spam
                    if not hasattr(ping_loop, '_last_log'):
                        ping_loop._last_log = {}

                    current_time = time.time()
                    if connection_id not in ping_loop._last_log or current_time - ping_loop._last_log[connection_id] > 120:
                        print(f"📡 Sent stable ping to {connection_id} (interval: {Config.PING_INTERVAL}s)")
                        ping_loop._last_log[connection_id] = current_time

                except Exception as e:
                    print(f"❌ Failed to send ping to {connection_id}: {e}")
                    break
            else:
                print(f"🔌 Connection {connection_id} no longer alive, stopping ping loop")
                break

    except asyncio.CancelledError:
        print(f"🔌 Ping loop cancelled for {connection_id}")
    except Exception as e:
        print(f"❌ Ping loop error for {connection_id}: {e}")