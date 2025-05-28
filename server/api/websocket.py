import json
import uuid
import time
from fastapi import WebSocket, WebSocketDisconnect
from handlers.websocket_handlers import (
    handle_connect,
    handle_signaling,
    handle_ping,
    handle_disconnect,
    handle_frame_timing,
    send_error
)
from api.routes import session_manager

async def websocket_endpoint(websocket: WebSocket, session_code: str):
    """Enhanced WebSocket handler with detailed latency logging"""
    await websocket.accept()

    connection_id = str(uuid.uuid4())[:8]
    websocket.connection_id = connection_id
    websocket.is_alive = True
    websocket.messages_sent = 0
    websocket.connect_time = time.time() * 1000  # Store connection time

    current_session = None
    role = None

    print(f"🔌 New WebSocket connection (ID: {connection_id}) for session {session_code}")

    try:
        async for data in websocket.iter_text():
            websocket.is_alive = True
            message_receive_time = time.time() * 1000

            try:
                msg = json.loads(data)

                # Rate limiting
                if websocket.messages_sent > 1000:
                    await send_error(websocket, 'Rate limit exceeded')
                    break

                # Add server timing to message for latency tracking
                msg['server_receive_time'] = message_receive_time

                message_type = msg.get('type')
                print(f"📨 Received: {message_type} from {role or 'unknown'} ({connection_id})")

                if message_type == 'connect':
                    current_session, role = await handle_connect(websocket, msg, session_manager)

                elif message_type in ['offer', 'answer', 'ice']:
                    await handle_signaling(current_session, websocket, msg)
                    websocket.messages_sent += 1

                elif message_type == 'ping':
                    await handle_ping(websocket)

                elif message_type == 'frame_timing':
                    # Handle end-to-end latency measurements
                    await handle_frame_timing(websocket, msg, session_manager)

                elif message_type == 'latency_test':
                    # Handle latency test messages
                    client_timestamp = msg.get('timestamp', message_receive_time)
                    latency_response = {
                        'type': 'latency_response',
                        'client_timestamp': client_timestamp,
                        'server_receive_time': message_receive_time,
                        'server_send_time': time.time() * 1000,
                        'connection_id': connection_id,
                        'round_trip_start': client_timestamp
                    }
                    await websocket.send_text(json.dumps(latency_response))

                    # Calculate one-way latency estimate
                    one_way_latency = message_receive_time - client_timestamp
                    print(f"🏓 Latency test from {connection_id}: ~{one_way_latency:.1f}ms one-way")

                # else:
                #     print(f"❓ Unknown message type: {message_type} from {connection_id}")

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
        # Calculate total session time
        disconnect_time = time.time() * 1000
        session_duration = disconnect_time - websocket.connect_time
        print(f"🧹 Starting cleanup for connection {connection_id} (session duration: {session_duration:.1f}ms)")

        await handle_disconnect(current_session, websocket, session_manager)
        print(f"✅ Cleanup completed for connection {connection_id}")