"""
server/api/inference_routes.py - Updated with Discord Authentication Requirements
"""

import asyncio
import json
import logging
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any
from services.yolo_inference import get_inference_service
from services.session_manager import SessionManager

# ✅ Import authentication services
from services.jwt_service import auth_middleware, security
from services.user_session_manager import user_session_manager
from core.auth_config import auth_config

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

class AuthCheckResponse(BaseModel):
    authenticated: bool
    in_required_guild: bool
    user_id: Optional[str] = None
    username: Optional[str] = None
    error_message: Optional[str] = None
    discord_invite_url: Optional[str] = None

async def check_discord_auth_for_inference(credentials: Optional[HTTPAuthorizationCredentials]) -> AuthCheckResponse:
    """
    Server-side authentication check for inference access
    Returns detailed auth status for client-side handling
    """
    try:
        # Check if Discord auth is configured
        if not auth_config.DISCORD_CLIENT_ID:
            return AuthCheckResponse(
                authenticated=False,
                in_required_guild=False,
                error_message="Discord authentication not configured"
            )

        # Check if user is authenticated
        if not credentials:
            return AuthCheckResponse(
                authenticated=False,
                in_required_guild=False,
                error_message="Authentication required. Please log in with Discord.",
                discord_invite_url=auth_config.DISCORD_INVITE_URL
            )

        # Verify JWT token and get user
        user = await auth_middleware.get_current_user(credentials)
        if not user:
            return AuthCheckResponse(
                authenticated=False,
                in_required_guild=False,
                error_message="Invalid or expired token. Please log in again.",
                discord_invite_url=auth_config.DISCORD_INVITE_URL
            )

        # Check user session
        session = user_session_manager.get_session(user.id)
        if not session:
            return AuthCheckResponse(
                authenticated=False,
                in_required_guild=False,
                error_message="Session expired. Please log in again.",
                discord_invite_url=auth_config.DISCORD_INVITE_URL
            )

        # Update session activity
        session.refresh_activity()

        # Check if guild membership is required and verified
        if auth_config.DISCORD_GUILD_ID and not session.user.is_in_required_guild:
            return AuthCheckResponse(
                authenticated=True,
                in_required_guild=False,
                user_id=user.id,
                username=user.get_display_name(),
                error_message="You must be a member of our Discord server to use inference features.",
                discord_invite_url=auth_config.DISCORD_INVITE_URL
            )

        # All checks passed
        return AuthCheckResponse(
            authenticated=True,
            in_required_guild=True,
            user_id=user.id,
            username=user.get_display_name()
        )

    except Exception as e:
        logging.error(f"❌ Auth check error for inference: {e}")
        return AuthCheckResponse(
            authenticated=False,
            in_required_guild=False,
            error_message="Authentication verification failed. Please try logging in again.",
            discord_invite_url=auth_config.DISCORD_INVITE_URL
        )

@router.post("/inference/{session_code}/toggle")
async def toggle_inference(
    session_code: str,
    request: InferenceToggleRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Toggle inference for a session - NOW WITH DISCORD AUTH REQUIREMENT
    """
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    # ✅ MANDATORY AUTH CHECK - Cannot be bypassed
    auth_check = await check_discord_auth_for_inference(credentials)

    if not auth_check.authenticated or not auth_check.in_required_guild:
        # Return 401 with detailed auth info for frontend handling
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": auth_check.error_message,
                "auth_required": True,
                "discord_invite_url": auth_check.discord_invite_url,
                "user_authenticated": auth_check.authenticated,
                "in_required_guild": auth_check.in_required_guild
            }
        )

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
        logging.info(f"🔄 Inference enabled for session {session_code} by user {auth_check.username} ({auth_check.user_id})")
    else:
        # Stop frame capture and clear stored data
        await frame_capture_service.stop_capture(session_code)
        if session_code in latest_inference_results:
            del latest_inference_results[session_code]
        logging.info(f"🔄 Inference disabled for session {session_code} by user {auth_check.username} ({auth_check.user_id})")

    return {
        "status": "ok",
        "inference_enabled": request.enabled,
        "session_code": session_code,
        "frame_capture_active": frame_capture_service.is_capture_active(session_code),
        "authenticated_user": auth_check.username,
        "message": f"Inference {'started' if request.enabled else 'stopped'} for session {session_code}"
    }

@router.get("/inference/{session_code}/status")
async def get_inference_status(
    session_code: str,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Get inference status for a session - with auth check"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    # ✅ Auth check for status as well
    auth_check = await check_discord_auth_for_inference(credentials)

    inference_service = get_inference_service()

    return {
        "session_code": session_code,
        "inference_enabled": session_inference_states.get(session_code, False),
        "has_yolo_service": inference_service.is_ready(),
        "service_stats": inference_service.get_stats(),
        "auth_status": {
            "authenticated": auth_check.authenticated,
            "in_required_guild": auth_check.in_required_guild,
            "username": auth_check.username,
            "auth_required_for_inference": True
        }
    }

@router.post("/inference/{session_code}")
async def run_inference(
    session_code: str,
    request: InferenceRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Run inference on image data - with auth requirement"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    # ✅ MANDATORY AUTH CHECK for running inference
    auth_check = await check_discord_auth_for_inference(credentials)

    if not auth_check.authenticated or not auth_check.in_required_guild:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": auth_check.error_message,
                "auth_required": True,
                "discord_invite_url": auth_check.discord_invite_url,
                "user_authenticated": auth_check.authenticated,
                "in_required_guild": auth_check.in_required_guild
            }
        )

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

        logging.info(f"🧠 Inference completed for session {session_code} by user {auth_check.username}")

        return result

    except Exception as e:
        logging.error(f"❌ Inference error for session {session_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/inference/{session_code}")
async def get_latest_inference(
    session_code: str,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Get latest inference result for a session (polling endpoint) - with auth"""
    if not session_code.isdigit() or len(session_code) != 4:
        raise HTTPException(status_code=400, detail="Invalid session code")

    # ✅ Auth check for accessing inference results
    auth_check = await check_discord_auth_for_inference(credentials)

    if not auth_check.authenticated or not auth_check.in_required_guild:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "Authentication required to access inference results",
                "auth_required": True,
                "discord_invite_url": auth_check.discord_invite_url
            }
        )

    # Check if we have recent inference data
    if session_code in latest_inference_results:
        result = latest_inference_results[session_code]
        return result
    else:
        raise HTTPException(status_code=404, detail="No recent inference data available")

@router.get("/inference/service/stats")
async def get_service_stats(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Get inference service statistics - admin only"""
    # ✅ Require authentication for service stats
    auth_check = await check_discord_auth_for_inference(credentials)

    if not auth_check.authenticated or not auth_check.in_required_guild:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view service statistics"
        )

    inference_service = get_inference_service()
    return {
        "service": inference_service.get_stats(),
        "sessions": {
            "total_active": len([s for s in session_inference_states.values() if s]),
            "session_states": session_inference_states,
            "sessions_with_data": list(latest_inference_results.keys())
        },
        "requested_by": auth_check.username
    }

@router.post("/inference/service/config")
async def update_service_config(
    confidence_threshold: Optional[float] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Update inference service configuration - admin only"""
    # ✅ Require authentication for config changes
    auth_check = await check_discord_auth_for_inference(credentials)

    if not auth_check.authenticated or not auth_check.in_required_guild:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to modify service configuration"
        )

    inference_service = get_inference_service()

    if confidence_threshold is not None:
        inference_service.set_confidence_threshold(confidence_threshold)

    logging.info(f"🔧 Service config updated by user {auth_check.username}")

    return {
        "status": "ok",
        "config": inference_service.get_stats(),
        "updated_by": auth_check.username
    }

# ✅ Enhanced auth check endpoint specifically for inference
@router.get("/inference/auth/check")
async def check_inference_auth(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Check authentication status specifically for inference features"""
    auth_check = await check_discord_auth_for_inference(credentials)

    return {
        "can_use_inference": auth_check.authenticated and auth_check.in_required_guild,
        "authenticated": auth_check.authenticated,
        "in_required_guild": auth_check.in_required_guild,
        "username": auth_check.username,
        "error_message": auth_check.error_message,
        "discord_invite_url": auth_check.discord_invite_url,
        "auth_requirements": {
            "discord_login_required": True,
            "guild_membership_required": bool(auth_config.DISCORD_GUILD_ID),
            "guild_id": auth_config.DISCORD_GUILD_ID
        }
    }

async def broadcast_inference_result(session_code: str, result: Dict[str, Any]):
    """Broadcast inference result to WebSocket connections"""
    if session_code in session_websockets:
        websockets_to_remove = []

        for websocket in session_websockets[session_code]:
            try:
                await websocket.send_text(json.dumps({
                    "type": "inference_result",
                    "session_code": session_code,
                    "data": result
                }))
            except:
                websockets_to_remove.append(websocket)

        # Remove dead websockets
        for ws in websockets_to_remove:
            session_websockets[session_code].remove(ws)

        # Clean up empty lists
        if not session_websockets[session_code]:
            del session_websockets[session_code]

@router.websocket("/inference/ws/{session_code}")
async def inference_websocket(websocket: WebSocket, session_code: str):
    """WebSocket endpoint for real-time inference updates - with auth"""
    await websocket.accept()

    # Add to session websockets
    if session_code not in session_websockets:
        session_websockets[session_code] = []
    session_websockets[session_code].append(websocket)

    logging.info(f"🔌 Inference WebSocket connected for session {session_code}")

    try:
        while True:
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
                        "stats": inference_service.get_stats(),
                        "auth_required": True  # ✅ Always indicate auth is required
                    }
                    await websocket.send_text(json.dumps(status))
            except asyncio.TimeoutError:
                try:
                    await websocket.send_text(json.dumps({"type": "ping"}))
                except:
                    break
    except WebSocketDisconnect:
        logging.info(f"🔌 Inference WebSocket disconnected for session {session_code}")
    except Exception as e:
        logging.error(f"❌ Inference WebSocket error for session {session_code}: {e}")
    finally:
        # Clean up
        if session_code in session_websockets and websocket in session_websockets[session_code]:
            session_websockets[session_code].remove(websocket)
            if not session_websockets[session_code]:
                del session_websockets[session_code]