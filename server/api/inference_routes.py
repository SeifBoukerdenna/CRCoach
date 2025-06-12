"""
server/api/inference_routes.py - Fixed inference routes with proper data storage
"""

import asyncio
import json
import logging
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from services.yolo_inference import get_inference_service
from services.session_manager import SessionManager

router = APIRouter()

# Session inference states
session_inference_states: Dict[str, bool] = {}
session_websockets: Dict[str, list] = {}
# Store latest inference results for HTTP polling
latest_inference_results: Dict[str, Dict[str, Any]] = {}

class InferenceToggleRequest(BaseModel):
    enabled: bool

class InferenceRequest(BaseModel):
    image_data: str
    session_code: str

def inference(session_code: str, request: InferenceToggleRequest):
    """Toggle inference for a session"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    # Get inference service
    inference_service = get_inference_service()

    if not inference_service.is_ready():
        raise HTTPException(
            status_code=503,
            detail="Inference service not ready. Check if model file exists at models/best.pt"
        )

    session_inference_states[session_code] = request.enabled

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

    return {
        "session_code": session_code,
        "inference_enabled": session_inference_states.get(session_code, False),
        "has_yolo_service": inference_service.is_ready(),
        "service_stats": inference_service.get_stats()
    }

@router.post("/inference/{session_code}")
async def run_inference(session_code: str, request: InferenceRequest):
    """Run inference on image data"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    # Check if inference is enabled for this session
    if not session_inference_states.get(session_code, False):
        raise HTTPException(status_code=423, detail="Inference not enabled for this session")

    inference_service = get_inference_service()

    if not inference_service.is_ready():
        raise HTTPException(status_code=503, detail="Inference service not ready")

    try:
        result = await inference_service.run_inference(request.image_data, session_code)

        if result is None:
            raise HTTPException(status_code=500, detail="Inference failed")

        # Store result for HTTP polling
        latest_inference_results[session_code] = result

        # Broadcast to WebSocket connections if any
        await broadcast_inference_result(session_code, result)

        return result

    except Exception as e:
        logging.error(f"❌ Inference error for session {session_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/inference/{session_code}")
async def get_latest_inference(session_code: str):
    """Get latest inference result for a session (polling endpoint)"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    # Check if we have recent inference data
    if session_code in latest_inference_results:
        result = latest_inference_results[session_code]
        # Return the stored result
        return result
    else:
        # Return 404 if no recent inference
        raise HTTPException(status_code=404, detail="No recent inference data available")

@router.get("/inference/service/stats")
async def get_service_stats():
    """Get inference service statistics"""
    inference_service = get_inference_service()
    return {
        "service": inference_service.get_stats(),
        "sessions": {
            "total_active": len([s for s in session_inference_states.values() if s]),
            "session_states": session_inference_states,
            "sessions_with_data": list(latest_inference_results.keys())
        }
    }

@router.post("/inference/{session_code}/toggle")
async def toggle_inference(session_code: str, request: InferenceToggleRequest):
    """Toggle inference for a session"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    # Get inference service
    inference_service = get_inference_service()

    if not inference_service.is_ready():
        raise HTTPException(
            status_code=503,
            detail="Inference service not ready. Check if model file exists at models/best.pt"
        )

    # Import frame capture service
    from services.frame_capture import get_frame_capture_service
    frame_capture_service = get_frame_capture_service()

    session_inference_states[session_code] = request.enabled

    if request.enabled:
        # Start frame capture for inference
        await frame_capture_service.start_capture(session_code, fps=5.0)
        logging.info(f"🔄 Inference and frame capture enabled for session {session_code}")
    else:
        # Stop frame capture and clear stored data
        await frame_capture_service.stop_capture(session_code)
        if session_code in latest_inference_results:
            del latest_inference_results[session_code]
        logging.info(f"🔄 Inference and frame capture disabled for session {session_code}")

    return {
        "status": "ok",
        "inference_enabled": request.enabled,
        "session_code": session_code,
        "frame_capture_active": frame_capture_service.is_capture_active(session_code),
        "message": f"Inference {'started' if request.enabled else 'stopped'} for session {session_code}"
    }

@router.post("/inference/service/config")
async def update_service_config(confidence_threshold: Optional[float] = None):
    """Update inference service configuration"""
    inference_service = get_inference_service()

    if confidence_threshold is not None:
        inference_service.set_confidence_threshold(confidence_threshold)

    return {
        "status": "ok",
        "config": inference_service.get_stats()
    }

@router.websocket("/inference/ws/{session_code}")
async def inference_websocket(websocket: WebSocket, session_code: str):
    """WebSocket endpoint for real-time inference updates"""
    await websocket.accept()

    # Add to session websockets
    if session_code not in session_websockets:
        session_websockets[session_code] = []
    session_websockets[session_code].append(websocket)

    logging.info(f"🔌 Inference WebSocket connected for session {session_code}")

    try:
        while True:
            # Keep connection alive and handle any incoming messages
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                message = json.loads(data)

                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif message.get("type") == "status_request":
                    inference_service = get_inference_service()
                    status = {
                        "type": "status_update",
                        "inference_enabled": session_inference_states.get(session_code, False),
                        "service_ready": inference_service.is_ready(),
                        "stats": inference_service.get_stats()
                    }
                    await websocket.send_text(json.dumps(status))
            except asyncio.TimeoutError:
                # Send periodic ping to keep connection alive
                try:
                    await websocket.send_text(json.dumps({"type": "ping"}))
                except:
                    break

    except WebSocketDisconnect:
        logging.info(f"🔌❌ Inference WebSocket disconnected for session {session_code}")
    except Exception as e:
        logging.error(f"❌ Inference WebSocket error for session {session_code}: {e}")
    finally:
        # Remove from session websockets
        if session_code in session_websockets:
            try:
                session_websockets[session_code].remove(websocket)
                if not session_websockets[session_code]:
                    del session_websockets[session_code]
            except ValueError:
                pass

async def broadcast_inference_result(session_code: str, result: Dict[str, Any]):
    """Broadcast inference result to all WebSocket connections for a session"""
    if session_code not in session_websockets:
        return

    message = {
        "type": "inference_update",
        "data": result
    }

    # Send to all connected WebSockets for this session
    disconnected_websockets = []
    for websocket in session_websockets[session_code]:
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logging.warning(f"⚠️ Failed to send inference update to WebSocket: {e}")
            disconnected_websockets.append(websocket)

    # Clean up disconnected WebSockets
    for websocket in disconnected_websockets:
        try:
            session_websockets[session_code].remove(websocket)
        except ValueError:
            pass

    if not session_websockets[session_code]:
        del session_websockets[session_code]