# server/api/inference_routes.py - Memory leak fixes
import asyncio
import json
import logging
import time
from collections import deque
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from services.yolo_inference import get_inference_service
from services.session_manager import SessionManager

router = APIRouter()

# Session inference states with cleanup
session_inference_states: Dict[str, bool] = {}
session_websockets: Dict[str, list] = {}

# Store latest inference results with size limits and TTL
MAX_STORED_RESULTS = 100
RESULT_TTL_SECONDS = 300  # 5 minutes
latest_inference_results: Dict[str, Dict[str, Any]] = {}
result_timestamps: Dict[str, float] = {}

def cleanup_old_results():
    """Remove old inference results to prevent memory bloat"""
    current_time = time.time()
    expired_keys = [
        key for key, timestamp in result_timestamps.items()
        if current_time - timestamp > RESULT_TTL_SECONDS
    ]

    for key in expired_keys:
        latest_inference_results.pop(key, None)
        result_timestamps.pop(key, None)

    # Also limit total stored results
    if len(latest_inference_results) > MAX_STORED_RESULTS:
        # Remove oldest results
        sorted_by_time = sorted(result_timestamps.items(), key=lambda x: x[1])
        to_remove = len(latest_inference_results) - MAX_STORED_RESULTS

        for key, _ in sorted_by_time[:to_remove]:
            latest_inference_results.pop(key, None)
            result_timestamps.pop(key, None)

class InferenceToggleRequest(BaseModel):
    enabled: bool

class InferenceRequest(BaseModel):
    image_data: str
    session_code: str

@router.post("/inference/{session_code}")
def toggle_inference(session_code: str, request: InferenceToggleRequest):
    """Toggle inference for a session"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    inference_service = get_inference_service()
    if not inference_service.is_ready():
        raise HTTPException(
            status_code=503,
            detail="Inference service not ready. Check if model file exists at models/best.pt"
        )

    session_inference_states[session_code] = request.enabled

    # Clean up old results periodically
    cleanup_old_results()

    logging.info(f"🔄 Inference {'enabled' if request.enabled else 'disabled'} for session {session_code}")

    return {
        "status": "ok",
        "inference_enabled": request.enabled,
        "session_code": session_code,
        "message": f"Inference {'started' if request.enabled else 'stopped'} for session {session_code}"
    }

@router.get("/inference/{session_code}/status")
async def get_inference_status(session_code: str):
    """Get inference status for a session"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    inference_service = get_inference_service()

    # Clean up periodically
    cleanup_old_results()

    return {
        "session_code": session_code,
        "inference_enabled": session_inference_states.get(session_code, False),
        "has_yolo_service": inference_service.is_ready(),
        "service_stats": inference_service.get_stats()
    }

@router.post("/inference/{session_code}/run")
async def run_inference(session_code: str, request: InferenceRequest):
    """Run inference on image data"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    inference_service = get_inference_service()
    if not inference_service.is_ready():
        raise HTTPException(
            status_code=503,
            detail="Inference service not ready"
        )

    try:
        result = await inference_service.run_inference(request.image_data)

        # Store result with timestamp for cleanup
        result_key = f"{session_code}_{int(time.time())}"
        latest_inference_results[result_key] = result
        result_timestamps[result_key] = time.time()

        # Broadcast to connected WebSockets
        await broadcast_inference_result(session_code, result)

        # Clean up old results
        cleanup_old_results()

        return result

    except Exception as e:
        logging.error(f"❌ Inference error for session {session_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/inference/{session_code}/ws")
async def inference_websocket(websocket: WebSocket, session_code: str):
    """WebSocket endpoint for inference updates with proper cleanup"""
    if not session_code.isdigit() or len(session_code) != 4:
        await websocket.close(code=1000, reason="Invalid session code")
        return

    await websocket.accept()

    # Add to session websockets with proper initialization
    if session_code not in session_websockets:
        session_websockets[session_code] = []
    session_websockets[session_code].append(websocket)

    logging.info(f"🔌 Inference WebSocket connected for session {session_code}")

    try:
        while True:
            # Keep connection alive with periodic cleanup
            await asyncio.sleep(30)
            cleanup_old_results()

            # Send ping to keep connection alive
            try:
                await websocket.send_text(json.dumps({"type": "ping"}))
            except:
                break

    except WebSocketDisconnect:
        logging.info(f"🔌❌ Inference WebSocket disconnected for session {session_code}")
    except Exception as e:
        logging.error(f"❌ Inference WebSocket error for session {session_code}: {e}")
    finally:
        # Critical cleanup - ensure WebSocket is removed
        if session_code in session_websockets:
            try:
                session_websockets[session_code].remove(websocket)
                if not session_websockets[session_code]:
                    del session_websockets[session_code]
            except ValueError:
                pass

        # Clean up session inference state if no more connections
        if session_code not in session_websockets:
            session_inference_states.pop(session_code, None)

async def broadcast_inference_result(session_code: str, result: Dict[str, Any]):
    """Broadcast inference result with proper cleanup of dead connections"""
    if session_code not in session_websockets:
        return

    message = {
        "type": "inference_update",
        "data": result
    }

    # Send to all connected WebSockets and track dead ones
    dead_websockets = []
    for websocket in session_websockets[session_code][:]:  # Create copy to iterate safely
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logging.warning(f"⚠️ Failed to send inference update: {e}")
            dead_websockets.append(websocket)

    # Remove dead WebSockets
    for websocket in dead_websockets:
        try:
            session_websockets[session_code].remove(websocket)
        except ValueError:
            pass

    # Clean up empty session
    if not session_websockets[session_code]:
        del session_websockets[session_code]
        session_inference_states.pop(session_code, None)

# Add cleanup endpoint for admin use
@router.post("/inference/cleanup")
async def force_cleanup():
    """Force cleanup of old inference data - admin endpoint"""
    initial_results = len(latest_inference_results)
    initial_states = len(session_inference_states)
    initial_websockets = len(session_websockets)

    cleanup_old_results()

    # Clean up orphaned states (no active websockets)
    orphaned_states = []
    for session_code in session_inference_states:
        if session_code not in session_websockets:
            orphaned_states.append(session_code)

    for session_code in orphaned_states:
        session_inference_states.pop(session_code, None)

    return {
        "status": "cleanup_completed",
        "results_before": initial_results,
        "results_after": len(latest_inference_results),
        "states_before": initial_states,
        "states_after": len(session_inference_states),
        "websockets_before": initial_websockets,
        "websockets_after": len(session_websockets),
        "orphaned_states_removed": len(orphaned_states)
    }