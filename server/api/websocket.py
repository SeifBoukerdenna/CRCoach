# server/api/websocket.py - Memory leak fixes
import json
import uuid
import time
import asyncio
import weakref
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

# Use WeakSet to automatically clean up dead websocket references
active_websockets = weakref.WeakSet()

async def ping_loop(websocket: WebSocket, connection_id: str):
    """Ping loop with automatic cleanup"""
    try:
        while websocket.is_alive:
            await asyncio.sleep(30)
            if not websocket.is_alive:
                break
            try:
                await websocket.send_text(json.dumps({"type": "ping", "timestamp": time.time() * 1000}))
            except:
                websocket.is_alive = False
                break
    except asyncio.CancelledError:
        pass
    finally:
        websocket.is_alive = False

async def websocket_endpoint(websocket: WebSocket, session_code: str):
    """Enhanced WebSocket handler with memory leak fixes"""
    await websocket.accept()

    # Generate unique connection ID and initialize
    connection_id = str(uuid.uuid4())[:8]
    websocket.connection_id = connection_id
    websocket.is_alive = True
    websocket.messages_sent = 0
    websocket.connect_time = time.time() * 1000
    websocket.connection_attempts = 0

    # Add to weak reference set for automatic cleanup
    active_websockets.add(websocket)

    current_session = None
    role = None
    ping_task = None

    print(f"🔌 New WebSocket connection (ID: {connection_id}) for session {session_code}")

    try:
        # Set up ping interval with proper task management
        ping_task = asyncio.create_task(ping_loop(websocket, connection_id))

        async for data in websocket.iter_text():
            websocket.is_alive = True
            message_receive_time = time.time() * 1000

            try:
                msg = json.loads(data)

                # Rate limiting with reset mechanism
                websocket.messages_sent += 1
                if websocket.messages_sent > 2000:
                    await send_error(websocket, 'Rate limit exceeded')
                    break

                # Reset counter every minute to prevent permanent blocks
                if websocket.messages_sent % 100 == 0:
                    current_time = time.time() * 1000
                    if current_time - websocket.connect_time > 60000:  # 1 minute
                        websocket.messages_sent = max(0, websocket.messages_sent - 50)

                msg['server_receive_time'] = message_receive_time
                message_type = msg.get('type')

                # Only log important messages to reduce memory usage
                if message_type not in ['frame_data', 'ping', 'pong']:
                    print(f"📨 Received: {message_type} from {role or 'unknown'} {connection_id}")

                # Handle different message types
                if message_type == 'connect':
                    current_session, role = await handle_connect(websocket, msg, session_manager)
                    if not current_session:
                        break

                elif message_type == 'offer' or message_type == 'answer' or message_type == 'ice-candidate':
                    if current_session:
                        await handle_signaling(current_session, websocket, msg, role)

                elif message_type == 'ping':
                    await handle_ping(websocket, msg)

                elif message_type == 'frame_timing':
                    if current_session:
                        await handle_frame_timing(current_session, msg)

                elif message_type == 'frame_data':
                    if current_session:
                        await handle_frame_data(current_session, msg)

                elif message_type == 'get_status':
                    if current_session:
                        status_response = {
                            'type': 'status_response',
                            'session_code': current_session.session_code,
                            'role': role,
                            'connection_id': connection_id,
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
        # Critical cleanup section
        websocket.is_alive = False

        # Cancel ping task first
        if ping_task:
            ping_task.cancel()
            try:
                await ping_task
            except asyncio.CancelledError:
                pass

        # Calculate session duration
        disconnect_time = time.time() * 1000
        session_duration = disconnect_time - websocket.connect_time

        print(f"🧹 Starting cleanup for {role or 'unknown'} {connection_id} (duration: {session_duration:.1f}ms)")

        # Handle session cleanup
        if current_session:
            await handle_disconnect(current_session, websocket, session_manager)

        # Force cleanup of any references
        try:
            active_websockets.discard(websocket)
        except:
            pass

        print(f"✅ Cleanup completed for {connection_id}")

        # Log final session state for debugging
        if current_session and current_session.session_code in session_manager.sessions:
            remaining_session = session_manager.get_session(current_session.session_code)
            if remaining_session:
                print(f"📊 Session {current_session.session_code} state: "
                      f"broadcaster={'yes' if remaining_session.broadcaster else 'no'}, "
                      f"viewers={len(remaining_session.viewers)}")

# Add cleanup function for active websockets
async def cleanup_dead_websockets():
    """Remove dead websocket references - called by background task"""
    dead_count = 0
    for ws in list(active_websockets):
        if not getattr(ws, 'is_alive', False):
            try:
                active_websockets.discard(ws)
                dead_count += 1
            except:
                pass

    if dead_count > 0:
        print(f"🧹 Cleaned up {dead_count} dead websocket references")

# Export cleanup function for use in background tasks
__all__ = ['websocket_endpoint', 'cleanup_dead_websockets']